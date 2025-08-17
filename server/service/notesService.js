const supabase = require('../persistence/supabase');

/**
 * Service per la gestione delle note
 */

// Costanti
const PREVIEW_LENGTH = 200;
const ACCESSIBILITY_TYPES = {
  PRIVATE: 'private',
  PUBLIC: 'public',
  AUTHORIZED: 'authorized',
  GROUP: 'group'
};

/**
 * Ottiene lista note con filtri e paginazione
 */
async function getNotes(userId, filters) {
  // FIXED: Simplified approach - get notes and count them directly
  let query = supabase
    .from('notes')
    .select('*')
    .or(`creator.eq.${userId},accessibility.eq.public`);

  // Filtri aggiuntivi
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,text.ilike.%${filters.search}%`);
  }

  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  if (filters.accessibility) {
    query = query.eq('accessibility', filters.accessibility);
  }

  if (filters.group) {
    query = query.eq('group_name', filters.group);
  }

  // Ordinamento
  const orderColumn = getOrderColumn(filters.sortBy);
  query = query.order(orderColumn, { ascending: filters.sortOrder === 'asc' });

  const { data: notes, error } = await query;

  if (error) {
    throw new Error(`Error fetching notes: ${error.message}`);
  }

  // Post-elaborazione per filtrare note di gruppo e autorizzate
  const accessibleNotes = await filterAccessibleNotes(notes || [], userId);

  // Load categories for each note separately
  const enrichedNotes = await Promise.all(
    accessibleNotes.map(async (note) => {
      let categoryDetails = null;
      if (note.category) {
        const { data: category } = await supabase
          .from('category')
          .select('name')
          .eq('name', note.category)
          .single();
        categoryDetails = category;
      }

      return enrichNoteWithMetadata({
        ...note,
        category_details: categoryDetails
      }, userId);
    })
  );

  // Apply pagination to enriched notes
  const startIndex = filters.offset || 0;
  const endIndex = startIndex + (filters.limit || 50);
  const paginatedNotes = enrichedNotes.slice(startIndex, endIndex);

  const totalCount = enrichedNotes.length;

  return {
    notes: paginatedNotes,
    total: totalCount, 
    hasMore: endIndex < totalCount
  };
}

/**
 * Ottiene preview delle note per la home page
 */
async function getNotePreviews(userId, sortBy, limit) {
  const orderColumn = getOrderColumn(sortBy);
  
  let query = supabase
    .from('notes')
    .select('id, title, text, created_at, last_modify, category, accessibility, group_name')
    .or(`creator.eq.${userId},accessibility.eq.public`)
    .order(orderColumn, { ascending: false })
    .limit(limit);

  const { data: notes, error } = await query;

  if (error) {
    throw new Error(`Error fetching note previews: ${error.message}`);
  }

  // Filtra note accessibili
  const accessibleNotes = await filterAccessibleNotes(notes || [], userId);

  // Genera preview
  return accessibleNotes.map(note => ({
    id: note.id,
    title: note.title,
    preview: generatePreview(note.text || ''),
    createdAt: note.created_at,
    lastModify: note.last_modify,
    categoryName: note.category,
    accessibility: note.accessibility,
    contentLength: (note.text || '').length,
    canEdit: note.creator === userId,
    canDelete: note.creator === userId
  }));
}

/**
 * Ottiene una singola nota per ID
 */
async function getNoteById(userId, noteId) {
  // FIXED: Simplified query without complex relations
  const { data: note, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', noteId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Note not found');
    }
    throw new Error(`Error fetching note: ${error.message}`);
  }

  // Verifica permessi di accesso
  const hasAccess = await checkNoteAccess(note, userId);
  if (!hasAccess) {
    throw new Error('Access denied');
  }

  // FIXED: Load related data separately to avoid relation issues
  let categoryDetails = null;
  if (note.category) {
    const { data: category } = await supabase
      .from('category')
      .select('name')
      .eq('name', note.category)
      .single();
    categoryDetails = category;
  }

  let groupDetails = null;
  if (note.group_name) {
    const { data: group } = await supabase
      .from('groups')
      .select('name, creator')
      .eq('name', note.group_name)
      .single();
    groupDetails = group;
  }

  let authorizedUsers = [];
  if (note.accessibility === 'authorized') {
    const { data: authUsers } = await supabase
      .from('note_authorized_users')
      .select('id, user_id, granted_at')
      .eq('note_id', noteId);
    
    if (authUsers && authUsers.length > 0) {
      // Get user details separately
      const userIds = authUsers.map(au => au.user_id);
      const { data: users } = await supabase
        .from('profiles')
        .select('id, username, email')
        .in('id', userIds);
      
      authorizedUsers = authUsers.map(authUser => ({
        ...authUser,
        user: users?.find(u => u.id === authUser.user_id) || null
      }));
    }
  }

  // Combine all data
  const enrichedNote = {
    ...note,
    category_details: categoryDetails,
    group_details: groupDetails,
    authorized_users: authorizedUsers
  };

  return enrichNoteWithMetadata(enrichedNote, userId);
}

/**
 * Crea una nuova nota
 */
async function createNote(userId, noteData) {
  // Validazione
  await validateNoteData(noteData, userId);

  const noteToInsert = {
    creator: userId,
    title: noteData.title,
    text: noteData.text,
    category: noteData.category || null,
    accessibility: noteData.accessibility,
    group_name: noteData.groupName || null
  };

  const { data: note, error } = await supabase
    .from('notes')
    .insert(noteToInsert)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Error creating note: ${error.message}`);
  }

  // Aggiungi utenti autorizzati se specificati
  if (noteData.accessibility === ACCESSIBILITY_TYPES.AUTHORIZED && noteData.authorizedUserIds?.length > 0) {
    await addAuthorizedUsers(note.id, noteData.authorizedUserIds);
  }

  // FIXED: Load category details separately
  let categoryDetails = null;
  if (note.category) {
    const { data: category } = await supabase
      .from('category')
      .select('name')
      .eq('name', note.category)
      .single();
    categoryDetails = category;
  }

  // Combine data
  const enrichedNote = {
    ...note,
    category_details: categoryDetails
  };

  return enrichNoteWithMetadata(enrichedNote, userId);
}

/**
 * Aggiorna una nota esistente
 */
async function updateNote(userId, noteId, updateData) {
  // Verifica che l'utente possa modificare la nota
  const existingNote = await getNoteById(userId, noteId);
  if (existingNote.creator !== userId) {
    throw new Error('Access denied');
  }

  // Validazione
  await validateNoteData(updateData, userId);

  const updateFields = {
    title: updateData.title,
    text: updateData.text,
    category: updateData.category || null,
    accessibility: updateData.accessibility,
    group_name: updateData.groupName || null,
    last_modify: new Date().toISOString()
  };

  const { data: note, error } = await supabase
    .from('notes')
    .update(updateFields)
    .eq('id', noteId)
    .select(`
      *,
      category_details:category(*),
      group_details:groups(*)
    `)
    .single();

  if (error) {
    throw new Error(`Error updating note: ${error.message}`);
  }

  // Gestione utenti autorizzati
  if (updateData.accessibility === ACCESSIBILITY_TYPES.AUTHORIZED) {
    // Rimuovi tutti gli utenti autorizzati esistenti
    await removeAllAuthorizedUsers(noteId);
    
    // Aggiungi i nuovi utenti autorizzati
    if (updateData.authorizedUserIds?.length > 0) {
      await addAuthorizedUsers(noteId, updateData.authorizedUserIds);
    }
  } else {
    // Se non è più una nota autorizzata, rimuovi tutti gli utenti autorizzati
    await removeAllAuthorizedUsers(noteId);
  }

  return enrichNoteWithMetadata(note, userId);
}

/**
 * Elimina una nota
 */
async function deleteNote(userId, noteId) {
  // Verifica che l'utente possa eliminare la nota
  const note = await getNoteById(userId, noteId);
  if (note.creator !== userId) {
    throw new Error('Access denied');
  }

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId);

  if (error) {
    throw new Error(`Error deleting note: ${error.message}`);
  }
}

/**
 * Duplica una nota
 */
async function duplicateNote(userId, sourceNoteId, duplicateData) {
  // Ottieni la nota originale
  const sourceNote = await getNoteById(userId, sourceNoteId);

  // Crea i dati per la nuova nota
  const newNoteData = {
    title: duplicateData.newTitle || `Copy of ${sourceNote.title || 'Untitled'}`,
    text: sourceNote.text,
    category: sourceNote.category,
    accessibility: duplicateData.accessibility || ACCESSIBILITY_TYPES.PRIVATE,
    groupName: duplicateData.groupName,
    authorizedUserIds: duplicateData.authorizedUserIds
  };

  return await createNote(userId, newNoteData);
}

/**
 * Condivide una nota con specifici utenti
 */
async function shareNote(userId, noteId, userIds) {
  // Verifica che l'utente possa condividere la nota
  const note = await getNoteById(userId, noteId);
  if (note.creator !== userId) {
    throw new Error('Access denied');
  }

  // Aggiorna la nota come "authorized" se non lo è già
  if (note.accessibility !== ACCESSIBILITY_TYPES.AUTHORIZED) {
    await supabase
      .from('notes')
      .update({ 
        accessibility: ACCESSIBILITY_TYPES.AUTHORIZED,
        last_modify: new Date().toISOString()
      })
      .eq('id', noteId);
  }

  // Aggiungi gli utenti autorizzati
  await addAuthorizedUsers(noteId, userIds);
}

/**
 * Ottiene i permessi di una nota per l'utente corrente
 */
async function getNotePermissions(userId, noteId) {
  const note = await getNoteById(userId, noteId);
  
  return {
    canView: true, // Se siamo qui, l'utente può vedere la nota
    canEdit: note.creator === userId,
    canDelete: note.creator === userId,
    canShare: note.creator === userId
  };
}

/**
 * Operazioni bulk sulle note
 */
async function bulkOperation(userId, operationData) {
  const { operation, noteIds, newCategoryName, newAccessibility, newGroupName } = operationData;

  // Verifica che l'utente possa modificare tutte le note
  for (const noteId of noteIds) {
    const note = await getNoteById(userId, noteId);
    if (note.creator !== userId) {
      throw new Error(`Access denied for note ${noteId}`);
    }
  }

  let updateFields = {
    last_modify: new Date().toISOString()
  };

  switch (operation) {
    case 'delete':
      const { error: deleteError } = await supabase
        .from('notes')
        .delete()
        .in('id', noteIds);
      
      if (deleteError) {
        throw new Error(`Error deleting notes: ${deleteError.message}`);
      }
      break;

    case 'changeCategory':
      updateFields.category = newCategoryName || null;
      break;

    case 'changeAccessibility':
      updateFields.accessibility = newAccessibility;
      if (newAccessibility === ACCESSIBILITY_TYPES.GROUP) {
        updateFields.group_name = newGroupName;
      }
      break;

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  if (operation !== 'delete') {
    const { error } = await supabase
      .from('notes')
      .update(updateFields)
      .in('id', noteIds);

    if (error) {
      throw new Error(`Error updating notes: ${error.message}`);
    }
  }

  return { success: true, processed: noteIds.length };
}

/**
 * Ottiene statistiche delle note dell'utente
 */
async function getNotesStats(userId) {
  const { data: notes, error } = await supabase
    .from('notes')
    .select('accessibility, text, category')
    .eq('creator', userId);

  if (error) {
    throw new Error(`Error fetching notes stats: ${error.message}`);
  }

  const stats = {
    totalNotes: notes.length,
    privateNotes: notes.filter(n => n.accessibility === ACCESSIBILITY_TYPES.PRIVATE).length,
    publicNotes: notes.filter(n => n.accessibility === ACCESSIBILITY_TYPES.PUBLIC).length,
    groupNotes: notes.filter(n => n.accessibility === ACCESSIBILITY_TYPES.GROUP).length,
    authorizedNotes: notes.filter(n => n.accessibility === ACCESSIBILITY_TYPES.AUTHORIZED).length,
    categoriesCount: new Set(notes.map(n => n.category).filter(Boolean)).size,
    averageNoteLength: notes.length > 0 ? 
      Math.round(notes.reduce((sum, n) => sum + (n.text?.length || 0), 0) / notes.length) : 0
  };

  return stats;
}

/**
 * Esporta nota come Markdown
 */
async function exportNoteAsMarkdown(userId, noteId) {
  const note = await getNoteById(userId, noteId);
  
  const title = note.title || 'Untitled';
  const content = note.text || '';
  
  return `# ${title}\n\n${content}`;
}

/**
 * Esporta nota come HTML
 */
async function exportNoteAsHTML(userId, noteId) {
  const note = await getNoteById(userId, noteId);
  
  const title = note.title || 'Untitled';
  const content = note.text || '';
  
  // Conversione base Markdown -> HTML
  let html = content
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`(.*?)`/gim, '<code>$1</code>')
    .replace(/\n\n/gim, '</p><p>')
    .replace(/\n/gim, '<br>');

  if (html && !html.startsWith('<h')) {
    html = `<p>${html}</p>`;
  }

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #333; }
        code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${html}
</body>
</html>
  `;
}

/**
 * Conta note per tipo di accessibilità
 */
async function getNotesCountByAccessibility(userId) {
  const { data: counts, error } = await supabase
    .from('notes')
    .select('accessibility')
    .eq('creator', userId);

  if (error) {
    throw new Error(`Error counting notes: ${error.message}`);
  }

  const result = {
    [ACCESSIBILITY_TYPES.PRIVATE]: 0,
    [ACCESSIBILITY_TYPES.PUBLIC]: 0,
    [ACCESSIBILITY_TYPES.AUTHORIZED]: 0,
    [ACCESSIBILITY_TYPES.GROUP]: 0
  };

  counts.forEach(note => {
    result[note.accessibility] = (result[note.accessibility] || 0) + 1;
  });

  return result;
}

// ==================== FUNZIONI HELPER ====================

/**
 * Filtra le note accessibili all'utente
 */
async function filterAccessibleNotes(notes, userId) {
  const accessibleNotes = [];

  for (const note of notes) {
    const hasAccess = await checkNoteAccess(note, userId);
    if (hasAccess) {
      accessibleNotes.push(note);
    }
  }

  return accessibleNotes;
}

/**
 * Verifica se l'utente ha accesso alla nota
 */
async function checkNoteAccess(note, userId) {
  // Il creatore può sempre accedere
  if (note.creator === userId) {
    return true;
  }

  // Note pubbliche sono accessibili a tutti
  if (note.accessibility === ACCESSIBILITY_TYPES.PUBLIC) {
    return true;
  }

  // Note di gruppo: verifica se l'utente è membro del gruppo
  if (note.accessibility === ACCESSIBILITY_TYPES.GROUP && note.group_name) {
    const { data: membership } = await supabase
      .from('group_users')
      .select('group_name')
      .eq('group_name', note.group_name)
      .eq('user_id', userId)
      .single();
    
    return !!membership;
  }

  // Note autorizzate: verifica se l'utente è nella lista degli autorizzati
  if (note.accessibility === ACCESSIBILITY_TYPES.AUTHORIZED) {
    const { data: authorization } = await supabase
      .from('note_authorized_users')
      .select('note_id')
      .eq('note_id', note.id)
      .eq('user_id', userId)
      .single();
    
    return !!authorization;
  }

  return false;
}

/**
 * Arricchisce una nota con metadati computati
 */
function enrichNoteWithMetadata(note, userId) {
  const preview = generatePreview(note.text || '');
  const contentLength = (note.text || '').length;
  
  return {
    ...note,
    preview,
    contentLength,
    canEdit: note.creator === userId,
    canDelete: note.creator === userId,
    createdAt: note.created_at,
    lastModify: note.last_modify
  };
}

/**
 * Genera anteprima del testo
 */
function generatePreview(text) {
  if (!text) return '';
  
  const cleanText = text
    .replace(/<[^>]*>/g, '') // Rimuove tag HTML
    .replace(/[#*_`]/g, '') // Rimuove formattazione markdown
    .trim();
  
  if (cleanText.length <= PREVIEW_LENGTH) {
    return cleanText;
  }
  
  // Trova l'ultima parola completa entro il limite
  const truncated = cleanText.substring(0, PREVIEW_LENGTH);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  if (lastSpaceIndex > PREVIEW_LENGTH * 0.8) {
    return truncated.substring(0, lastSpaceIndex) + '...';
  }
  
  return truncated + '...';
}

/**
 * Ottiene la colonna per l'ordinamento
 */
function getOrderColumn(sortBy) {
  switch (sortBy) {
    case 'alphabetical':
      return 'title';
    case 'creation_date':
      return 'created_at';
    case 'last_modify':
      return 'last_modify';
    case 'content_length':
      return 'text'; // Dovremo ordinare per lunghezza lato client
    default:
      return 'last_modify';
  }
}

/**
 * Valida i dati della nota
 */
async function validateNoteData(noteData, userId) {
  // Validazione base
  if (!noteData.accessibility || !Object.values(ACCESSIBILITY_TYPES).includes(noteData.accessibility)) {
    throw new Error('Invalid accessibility type');
  }

  // Validazione per note di gruppo
  if (noteData.accessibility === ACCESSIBILITY_TYPES.GROUP) {
    if (!noteData.groupName) {
      throw new Error('Group name is required for group notes');
    }

    // Verifica che l'utente sia membro del gruppo
    const { data: membership } = await supabase
      .from('group_users')
      .select('group_name')
      .eq('group_name', noteData.groupName)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      throw new Error('You must be a member of the group to create group notes');
    }
  }

  // Validazione per note autorizzate
  if (noteData.accessibility === ACCESSIBILITY_TYPES.AUTHORIZED) {
    if (!noteData.authorizedUserIds || noteData.authorizedUserIds.length === 0) {
      throw new Error('At least one authorized user is required for authorized notes');
    }

    // Verifica che tutti gli utenti autorizzati esistano
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id')
      .in('id', noteData.authorizedUserIds);

    if (error) {
      throw new Error('Error validating authorized users');
    }

    if (users.length !== noteData.authorizedUserIds.length) {
      throw new Error('Some authorized users do not exist');
    }
  }

  // Validazione categoria
  if (noteData.category) {
    const { data: category } = await supabase
      .from('category')
      .select('name')
      .eq('name', noteData.category)
      .single();

    if (!category) {
      throw new Error('Invalid category');
    }
  }
}

/**
 * Aggiunge utenti autorizzati a una nota
 */
async function addAuthorizedUsers(noteId, userIds) {
  const authorizations = userIds.map(userId => ({
    note_id: noteId,
    user_id: userId
  }));

  const { error } = await supabase
    .from('note_authorized_users')
    .insert(authorizations);

  if (error) {
    throw new Error(`Error adding authorized users: ${error.message}`);
  }
}

/**
 * Rimuove tutti gli utenti autorizzati da una nota
 */
async function removeAllAuthorizedUsers(noteId) {
  const { error } = await supabase
    .from('note_authorized_users')
    .delete()
    .eq('note_id', noteId);

  if (error) {
    throw new Error(`Error removing authorized users: ${error.message}`);
  }
}

module.exports = {
  getNotes,
  getNotePreviews,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  duplicateNote,
  shareNote,
  getNotePermissions,
  bulkOperation,
  getNotesStats,
  exportNoteAsMarkdown,
  exportNoteAsHTML,
  getNotesCountByAccessibility
};