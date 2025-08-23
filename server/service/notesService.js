const supabase = require('../persistence/supabase');

const PREVIEW_LENGTH = 200;
const ACCESSIBILITY_TYPES = {
  PRIVATE: 'private',
  PUBLIC: 'public',
  AUTHORIZED: 'authorized',
  GROUP: 'group'
};

async function getNotes(userId, filters) {

  let query = supabase
    .from('notes')
    .select('*');

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

  const orderColumn = getOrderColumn(filters.sortBy);
  query = query.order(orderColumn, { ascending: filters.sortOrder === 'asc' });

  const { data: allNotes, error } = await query;

  if (error) {
    throw new Error(`Error fetching notes: ${error.message}`);
  }

  const accessibleNotes = await filterAccessibleNotes(allNotes || [], userId);

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

async function getNotePreviews(userId, sortBy, limit) {
  const orderColumn = getOrderColumn(sortBy);
  
  let query = supabase
    .from('notes')
    .select('id, title, text, created_at, category, accessibility, group_name, creator')
    .order(orderColumn, { ascending: false })
    .limit(limit * 3); 

  const { data: notes, error } = await query;

  if (error) {
    throw new Error(`Error fetching note previews: ${error.message}`);
  }

  const accessibleNotes = await filterAccessibleNotes(notes || [], userId);

  const limitedNotes = accessibleNotes.slice(0, limit);

  return limitedNotes.map(note => ({
    id: note.id,
    title: note.title,
    preview: generatePreview(note.text || ''),
    createdAt: note.created_at,
    categoryName: note.category,
    accessibility: note.accessibility,
    contentLength: (note.text || '').length,
    canEdit: false, 
    canDelete: note.creator === userId
  }));
}

async function getNoteById(userId, noteId) {
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

  const hasAccess = await checkNoteAccess(note, userId);
  if (!hasAccess) {
    throw new Error('Access denied');
  }

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

  const enrichedNote = {
    ...note,
    category_details: categoryDetails,
    group_details: groupDetails,
    authorized_users: authorizedUsers
  };

  return enrichNoteWithMetadata(enrichedNote, userId);
}

async function createNote(userId, noteData) {

  await validateNoteData(noteData, userId);

  const createdAt = noteData.createdAt || new Date().toISOString();

  const noteToInsert = {
    creator: userId,
    title: noteData.title,
    text: noteData.text,
    category: noteData.category || null,
    accessibility: noteData.accessibility,
    group_name: noteData.groupName || null,
    created_at: createdAt 
  };

  const { data: note, error } = await supabase
    .from('notes')
    .insert(noteToInsert)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Error creating note: ${error.message}`);
  }

  if (noteData.accessibility === ACCESSIBILITY_TYPES.AUTHORIZED && noteData.authorizedUserIds?.length > 0) {
    await addAuthorizedUsers(note.id, noteData.authorizedUserIds);
  }

  let categoryDetails = null;
  if (note.category) {
    const { data: category } = await supabase
      .from('category')
      .select('name')
      .eq('name', note.category)
      .single();
    categoryDetails = category;
  }

  const enrichedNote = {
    ...note,
    category_details: categoryDetails
  };

  return enrichNoteWithMetadata(enrichedNote, userId);
}

async function deleteNote(userId, noteId) {

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

async function duplicateNote(userId, sourceNoteId, duplicateData) {

  const sourceNote = await getNoteById(userId, sourceNoteId);

  const createdAt = duplicateData.createdAt || new Date().toISOString();

  const newNoteData = {
    title: duplicateData.newTitle || `Copy of ${sourceNote.title || 'Untitled'}`,
    text: sourceNote.text,
    category: sourceNote.category,
    accessibility: duplicateData.accessibility || ACCESSIBILITY_TYPES.PRIVATE,
    groupName: duplicateData.groupName,
    authorizedUserIds: duplicateData.authorizedUserIds,
    createdAt: createdAt 
  };

  return await createNote(userId, newNoteData);
}

async function shareNote(userId, noteId, userIds) {

  const note = await getNoteById(userId, noteId);
  if (note.creator !== userId) {
    throw new Error('Access denied');
  }

  if (note.accessibility !== ACCESSIBILITY_TYPES.AUTHORIZED) {
    await supabase
      .from('notes')
      .update({ 
        accessibility: ACCESSIBILITY_TYPES.AUTHORIZED
      })
      .eq('id', noteId);
  }

  await addAuthorizedUsers(noteId, userIds);
}

async function getNotePermissions(userId, noteId) {
  const note = await getNoteById(userId, noteId);
  
  return {
    canView: true, 
    canDelete: note.creator === userId,
    canShare: note.creator === userId
  };
}


async function bulkOperation(userId, operationData) {
  const { operation, noteIds } = operationData;

  for (const noteId of noteIds) {
    const note = await getNoteById(userId, noteId);
    if (note.creator !== userId) {
      throw new Error(`Access denied for note ${noteId}`);
    }
  }

  if (operation === 'delete') {
    const { error: deleteError } = await supabase
      .from('notes')
      .delete()
      .in('id', noteIds);
    
    if (deleteError) {
      throw new Error(`Error deleting notes: ${deleteError.message}`);
    }
  } else {
    throw new Error(`Unsupported operation: ${operation}. Only 'delete' is supported.`);
  }

  return { success: true, processed: noteIds.length };
}

async function getNotesStats(userId) {
  const accessibleNotes = await filterAccessibleNotes(
    (await supabase.from('notes').select('accessibility, text, category, creator')).data || [],
    userId
  );

  const stats = {
    totalNotes: accessibleNotes.length,
    privateNotes: accessibleNotes.filter(n => n.accessibility === ACCESSIBILITY_TYPES.PRIVATE && n.creator === userId).length,
    publicNotes: accessibleNotes.filter(n => n.accessibility === ACCESSIBILITY_TYPES.PUBLIC).length,
    groupNotes: accessibleNotes.filter(n => n.accessibility === ACCESSIBILITY_TYPES.GROUP).length,
    authorizedNotes: accessibleNotes.filter(n => n.accessibility === ACCESSIBILITY_TYPES.AUTHORIZED).length,
    ownedNotes: accessibleNotes.filter(n => n.creator === userId).length,
    sharedNotes: accessibleNotes.filter(n => n.creator !== userId).length,
    categoriesCount: new Set(accessibleNotes.map(n => n.category).filter(Boolean)).size,
    averageNoteLength: accessibleNotes.length > 0 ? 
      Math.round(accessibleNotes.reduce((sum, n) => sum + (n.text?.length || 0), 0) / accessibleNotes.length) : 0
  };

  return stats;
}

async function getNotesCountByAccessibility(userId) {

  const accessibleNotes = await filterAccessibleNotes(
    (await supabase.from('notes').select('accessibility, creator')).data || [],
    userId
  );

  const result = {
    [ACCESSIBILITY_TYPES.PRIVATE]: 0,
    [ACCESSIBILITY_TYPES.PUBLIC]: 0,
    [ACCESSIBILITY_TYPES.AUTHORIZED]: 0,
    [ACCESSIBILITY_TYPES.GROUP]: 0
  };

  accessibleNotes.forEach(note => {
    result[note.accessibility] = (result[note.accessibility] || 0) + 1;
  });

  return result;
}

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

async function checkNoteAccess(note, userId) {

  if (note.creator === userId) {
    return true;
  }

  if (note.accessibility === ACCESSIBILITY_TYPES.PUBLIC) {
    return true;
  }

  if (note.accessibility === ACCESSIBILITY_TYPES.PRIVATE) {
    return false;
  }

  if (note.accessibility === ACCESSIBILITY_TYPES.GROUP && note.group_name) {
    const { data: membership } = await supabase
      .from('group_users')
      .select('group_name')
      .eq('group_name', note.group_name)
      .eq('user_id', userId)
      .single();
    
    return !!membership;
  }

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

function enrichNoteWithMetadata(note, userId) {
  const preview = generatePreview(note.text || '');
  const contentLength = (note.text || '').length;
  
  return {
    ...note,
    preview,
    contentLength,
    canDelete: note.creator === userId,
    createdAt: note.created_at
  };
}

function generatePreview(text) {
  if (!text) return '';
  
  const cleanText = text
    .replace(/<[^>]*>/g, '')
    .replace(/[#*_`]/g, '') 
    .trim();
  
  if (cleanText.length <= PREVIEW_LENGTH) {
    return cleanText;
  }

  const truncated = cleanText.substring(0, PREVIEW_LENGTH);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  if (lastSpaceIndex > PREVIEW_LENGTH * 0.8) {
    return truncated.substring(0, lastSpaceIndex) + '...';
  }
  
  return truncated + '...';
}

function getOrderColumn(sortBy) {
  switch (sortBy) {
    case 'alphabetical':
      return 'title';
    case 'creation_date':
      return 'created_at';
    case 'content_length':
      return 'text'; 
    default:
      return 'created_at';
  }
}

async function validateNoteData(noteData, userId) {

  if (!noteData.accessibility || !Object.values(ACCESSIBILITY_TYPES).includes(noteData.accessibility)) {
    throw new Error('Invalid accessibility type');
  }

  if (noteData.accessibility === ACCESSIBILITY_TYPES.GROUP) {
    if (!noteData.groupName) {
      throw new Error('Group name is required for group notes');
    }

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

  if (noteData.accessibility === ACCESSIBILITY_TYPES.AUTHORIZED) {
    if (!noteData.authorizedUserIds || noteData.authorizedUserIds.length === 0) {
      throw new Error('At least one authorized user is required for authorized notes');
    }

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

module.exports = {
  getNotes,
  getNotePreviews,
  getNoteById,
  createNote,
  deleteNote,
  duplicateNote,
  shareNote,
  getNotePermissions,
  bulkOperation,
  getNotesStats,
  getNotesCountByAccessibility
};