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
  createGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
  isGroupMember,
  checkGroupNameExists,
};