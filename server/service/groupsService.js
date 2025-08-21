const supabase = require('../persistence/supabase');

/**
 * Service per la gestione dei gruppi - FIXED VERSION
 */

// Nomi riservati che non possono essere usati per i gruppi
const RESERVED_GROUP_NAMES = ['admin', 'system', 'public', 'private', 'all', 'none'];

/**
 * Ottiene tutti i gruppi con filtri
 */
async function getAllGroups(userId, filters) {
  // FIXED: Simplified query without complex relations that cause issues
  let query = supabase
    .from('groups')
    .select('name, creator');

  // Se onlyJoined è true, filtra solo i gruppi di cui l'utente è membro
  if (filters.onlyJoined) {
    // Get user groups separately
    const { data: userGroupMemberships } = await supabase
      .from('group_users')
      .select('group_name')
      .eq('user_id', userId);
    
    if (userGroupMemberships && userGroupMemberships.length > 0) {
      const groupNames = userGroupMemberships.map(m => m.group_name);
      query = query.in('name', groupNames);
    } else {
      // User has no groups
      return {
        groups: [],
        total: 0,
        hasMore: false
      };
    }
  }

  // Filtro di ricerca
  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  // Ordinamento
  const ascending = filters.sortOrder === 'asc';
  query = query.order('name', { ascending });

  // Paginazione
  if (filters.limit) {
    query = query.range(filters.offset || 0, (filters.offset || 0) + filters.limit - 1);
  }

  const { data: groups, error, count } = await query;

  if (error) {
    throw new Error(`Error fetching groups: ${error.message}`);
  }

  // Arricchimento dati per ogni gruppo
  const enrichedGroups = await Promise.all(
    (groups || []).map(group => enrichGroupWithDetails(group, userId))
  );

  return {
    groups: enrichedGroups,
    total: count || enrichedGroups.length,
    hasMore: false
  };
}

/**
 * Ottiene i gruppi dell'utente corrente
 */
async function getUserGroups(userId) {
  // FIXED: First get user's group memberships, then get group details
  const { data: memberships, error: membershipError } = await supabase
    .from('group_users')
    .select('group_name')
    .eq('user_id', userId);

  if (membershipError) {
    throw new Error(`Error fetching user group memberships: ${membershipError.message}`);
  }

  if (!memberships || memberships.length === 0) {
    return [];
  }

  const groupNames = memberships.map(m => m.group_name);

  // Get group details
  const { data: groups, error } = await supabase
    .from('groups')
    .select('name, creator')
    .in('name', groupNames)
    .order('name');

  if (error) {
    throw new Error(`Error fetching user groups: ${error.message}`);
  }

  // Arricchimento dati
  const enrichedGroups = await Promise.all(
    (groups || []).map(group => enrichGroupWithDetails(group, userId))
  );

  return enrichedGroups;
}

/**
 * Ottiene dettagli di un gruppo specifico
 */
async function getGroupByName(userId, groupName) {
  // FIXED: Simplified query without complex joins
  const { data: group, error } = await supabase
    .from('groups')
    .select('name, creator')
    .eq('name', groupName)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Error fetching group: ${error.message}`);
  }

  return await enrichGroupWithDetails(group, userId);
}

/**
 * Crea un nuovo gruppo
 */
async function createGroup(userId, groupData) {
  const { name } = groupData;

  // Validazione nome gruppo
  await validateGroupName(name);

  // Verifica che il nome non sia già in uso
  const exists = await checkGroupNameExists(name);
  if (exists) {
    throw new Error('A group with this name already exists');
  }

  // Crea il gruppo
  const { data: group, error } = await supabase
    .from('groups')
    .insert({
      name: name.trim(),
      creator: userId
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating group: ${error.message}`);
  }

  // Aggiungi il creatore come membro
  await addGroupMember(name, userId);

  return await enrichGroupWithDetails(group, userId);
}

/**
 * Elimina un gruppo
 */
async function deleteGroup(userId, groupName) {
  // Verifica che il gruppo esista e che l'utente sia il creatore
  const group = await getGroupByName(userId, groupName);
  if (!group) {
    throw new Error('Group not found');
  }

  if (group.creator !== userId) {
    throw new Error('Access denied');
  }

  // Verifica che il gruppo non abbia note associate
  const { data: notes, error: notesError } = await supabase
    .from('notes')
    .select('id')
    .eq('group_name', groupName)
    .limit(1);

  if (notesError) {
    throw new Error('Error checking group notes');
  }

  if (notes && notes.length > 0) {
    throw new Error('Cannot delete group that contains notes');
  }

  // Elimina il gruppo (i membri vengono eliminati automaticamente per CASCADE)
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('name', groupName);

  if (error) {
    throw new Error(`Error deleting group: ${error.message}`);
  }
}

/**
 * Unisciti a un gruppo
 */
async function joinGroup(userId, groupName) {
  // Verifica che il gruppo esista
  const group = await getGroupByName(userId, groupName);
  if (!group) {
    throw new Error('Group not found');
  }

  // Verifica che l'utente non sia già membro
  const isMember = await isGroupMember(userId, groupName);
  if (isMember) {
    throw new Error('Already a member');
  }

  await addGroupMember(groupName, userId);
}

/**
 * Lascia un gruppo
 */
async function leaveGroup(userId, groupName) {
  // Verifica che il gruppo esista
  const group = await getGroupByName(userId, groupName);
  if (!group) {
    throw new Error('Group not found');
  }

  // Verifica che l'utente sia membro
  const isMember = await isGroupMember(userId, groupName);
  if (!isMember) {
    throw new Error('Not a member');
  }

  // Il creatore non può lasciare il proprio gruppo
  if (group.creator === userId) {
    throw new Error('Cannot leave as owner');
  }

  await removeGroupMember(groupName, userId);
}

/**
 * Gestisce membri del gruppo (solo per proprietari)
 */
async function manageGroupMembers(userId, request) {
  const { groupName, addUserIds, removeUserIds } = request;

  // Verifica che il gruppo esista e che l'utente sia il creatore
  const group = await getGroupByName(userId, groupName);
  if (!group) {
    throw new Error('Group not found');
  }

  if (group.creator !== userId) {
    throw new Error('Access denied');
  }

  const results = {
    added: [],
    removed: [],
    errors: []
  };

  // Aggiungi membri
  if (addUserIds && addUserIds.length > 0) {
    for (const userIdToAdd of addUserIds) {
      try {
        const isAlreadyMember = await isGroupMember(userIdToAdd, groupName);
        if (!isAlreadyMember) {
          await addGroupMember(groupName, userIdToAdd);
          results.added.push(userIdToAdd);
        }
      } catch (error) {
        results.errors.push(`Failed to add user ${userIdToAdd}: ${error.message}`);
      }
    }
  }

  // Rimuovi membri
  if (removeUserIds && removeUserIds.length > 0) {
    for (const userIdToRemove of removeUserIds) {
      try {
        // Il creatore non può essere rimosso
        if (userIdToRemove === userId) {
          results.errors.push('Cannot remove group owner');
          continue;
        }

        const isMember = await isGroupMember(userIdToRemove, groupName);
        if (isMember) {
          await removeGroupMember(groupName, userIdToRemove);
          results.removed.push(userIdToRemove);
        }
      } catch (error) {
        results.errors.push(`Failed to remove user ${userIdToRemove}: ${error.message}`);
      }
    }
  }

  return results;
}

/**
 * Ottiene membri del gruppo
 */
async function getGroupMembers(userId, groupName) {
  // Verifica che il gruppo esista
  const group = await getGroupByName(userId, groupName);
  if (!group) {
    throw new Error('Group not found');
  }

  // FIXED: Get members without complex joins
  const { data: memberships, error: membershipError } = await supabase
    .from('group_users')
    .select('user_id')
    .eq('group_name', groupName);

  if (membershipError) {
    throw new Error(`Error fetching group memberships: ${membershipError.message}`);
  }

  if (!memberships || memberships.length === 0) {
    return [];
  }

  // Get user details separately
  const userIds = memberships.map(m => m.user_id);
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, username, email')
    .in('id', userIds);

  if (usersError) {
    throw new Error(`Error fetching user details: ${usersError.message}`);
  }

  return (users || []).map(user => ({
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.username || user.email
  }));
}

/**
 * Verifica se un utente è membro di un gruppo
 */
async function isGroupMember(userId, groupName) {
  const { data: membership, error } = await supabase
    .from('group_users')
    .select('user_id')
    .eq('group_name', groupName)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error checking group membership: ${error.message}`);
  }

  return !!membership;
}

/**
 * Cerca gruppi per nome
 */
async function searchGroups(userId, searchQuery) {
  const { data: groups, error } = await supabase
    .from('groups')
    .select('name, creator')
    .ilike('name', `%${searchQuery}%`)
    .order('name')
    .limit(20);

  if (error) {
    throw new Error(`Error searching groups: ${error.message}`);
  }

  // Arricchimento dati
  const enrichedGroups = await Promise.all(
    (groups || []).map(group => enrichGroupWithDetails(group, userId))
  );

  return enrichedGroups;
}

/**
 * Ottiene gruppi più popolari
 */
async function getPopularGroups(userId, limit) {
  const { data: groups, error } = await supabase
    .from('groups')
    .select('name, creator')
    .order('name')
    .limit(limit);

  if (error) {
    throw new Error(`Error fetching popular groups: ${error.message}`);
  }

  // Arricchimento dati e ordinamento per numero membri
  const enrichedGroups = await Promise.all(
    (groups || []).map(group => enrichGroupWithDetails(group, userId))
  );

  // Ordina per numero di membri (decrescente)
  return enrichedGroups.sort((a, b) => b.memberCount - a.memberCount);
}

/**
 * Ottiene gruppi creati di recente
 */
async function getRecentGroups(userId, limit) {
  const { data: groups, error } = await supabase
    .from('groups')
    .select('name, creator, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Error fetching recent groups: ${error.message}`);
  }

  // Arricchimento dati
  const enrichedGroups = await Promise.all(
    (groups || []).map(group => enrichGroupWithDetails(group, userId))
  );

  return enrichedGroups;
}

/**
 * Verifica se un nome gruppo esiste già
 */
async function checkGroupNameExists(name) {
  const { data: group, error } = await supabase
    .from('groups')
    .select('name')
    .eq('name', name.trim())
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error checking group name: ${error.message}`);
  }

  return !!group;
}

// ==================== FUNZIONI HELPER ====================

/**
 * Arricchisce un gruppo con dettagli aggiuntivi
 */
async function enrichGroupWithDetails(group, userId) {
  // Conta membri
  const { data: members, error: membersError } = await supabase
    .from('group_users')
    .select('user_id', { count: 'exact' })
    .eq('group_name', group.name);

  const memberCount = members?.length || 0;

  // Verifica se l'utente è membro
  const isMember = await isGroupMember(userId, group.name);

  // Verifica se l'utente è il proprietario
  const isOwner = group.creator === userId;

  // Conta note (se necessario)
  const { data: notes, error: notesError } = await supabase
    .from('notes')
    .select('id', { count: 'exact' })
    .eq('group_name', group.name);

  const noteCount = notes?.length || 0;

  return {
    name: group.name,
    creator: group.creator,
    memberCount,
    isOwner,
    isMember,
    noteCount,
    createdAt: group.created_at,
    members: []
  };
}

/**
 * Valida il nome del gruppo
 */
async function validateGroupName(name) {
  if (!name || !name.trim()) {
    throw new Error('Group name is required');
  }

  const trimmedName = name.trim();

  if (trimmedName.length > 100) {
    throw new Error('Group name cannot exceed 100 characters');
  }
}

module.exports = {
  getAllGroups,
  getUserGroups,
  getGroupByName,
  createGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
  manageGroupMembers,
  getGroupMembers,
  isGroupMember,
  searchGroups,
  getPopularGroups,
  getRecentGroups,
  checkGroupNameExists,
};