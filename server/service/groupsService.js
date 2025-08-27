const supabase = require('../persistence/supabase');

const RESERVED_GROUP_NAMES = ['admin', 'system', 'public', 'private', 'all', 'none'];

async function getAllGroups(userId, filters) {
  let query = supabase
    .from('groups')
    .select('name, creator, created_at');

  if (filters.onlyJoined) {
    const { data: userGroupMemberships } = await supabase
      .from('group_users')
      .select('group_name')
      .eq('user_id', userId);
    
    if (userGroupMemberships && userGroupMemberships.length > 0) {
      const groupNames = userGroupMemberships.map(m => m.group_name);
      query = query.in('name', groupNames);
    } else {
      return {
        groups: [],
        total: 0,
        hasMore: false
      };
    }
  }

  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  const ascending = filters.sortOrder === 'asc';
  query = query.order('name', { ascending });

  if (filters.limit) {
    query = query.range(filters.offset || 0, (filters.offset || 0) + filters.limit - 1);
  }

  const { data: groups, error, count } = await query;

  if (error) {
    throw new Error(`Error fetching groups: ${error.message}`);
  }

  const enrichedGroups = await Promise.all(
    (groups || []).map(group => enrichGroupWithDetails(group, userId))
  );

  return {
    groups: enrichedGroups,
    total: count || enrichedGroups.length,
    hasMore: false
  };
}

async function getUserGroups(userId) {
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

  const { data: groups, error } = await supabase
    .from('groups')
    .select('name, creator, created_at')
    .in('name', groupNames)
    .order('name');

  if (error) {
    throw new Error(`Error fetching user groups: ${error.message}`);
  }

  const enrichedGroups = await Promise.all(
    (groups || []).map(group => enrichGroupWithDetails(group, userId))
  );

  return enrichedGroups;
}

async function createGroup(userId, groupData) {

  const { name, createdAt } = groupData;

  await validateGroupName(name);

  const exists = await checkGroupNameExists(name);
  if (exists) {
    throw new Error('A group with this name already exists');
  }

  const creationDate = createdAt || new Date().toISOString();

  const { data: group, error } = await supabase
    .from('groups')
    .insert({
      name: name.trim(),
      creator: userId,
      created_at: creationDate 
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating group: ${error.message}`);
  }

  await addGroupMember(name, userId);

  return await enrichGroupWithDetails(group, userId);
}

async function deleteGroup(userId, groupName) {
  const group = await getGroupByName(userId, groupName);
  if (!group) {
    throw new Error('Group not found');
  }

  if (group.creator !== userId) {
    throw new Error('Access denied');
  }

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

  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('name', groupName);

  if (error) {
    throw new Error(`Error deleting group: ${error.message}`);
  }
}

async function joinGroup(userId, groupName) {
  const group = await getGroupByName(userId, groupName);
  if (!group) {
    throw new Error('Group not found');
  }

  const isMember = await isGroupMember(userId, groupName);
  if (isMember) {
    throw new Error('Already a member');
  }

  await addGroupMember(groupName, userId);
}

async function leaveGroup(userId, groupName) {

  const group = await getGroupByName(userId, groupName);
  if (!group) {
    throw new Error('Group not found');
  }

  const isMember = await isGroupMember(userId, groupName);
  if (!isMember) {
    throw new Error('Not a member');
  }

  if (group.creator === userId) {
    throw new Error('Cannot leave as owner');
  }

  await removeGroupMember(groupName, userId);
}

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

async function enrichGroupWithDetails(group, userId) {

  const { data: members, error: membersError } = await supabase
    .from('group_users')
    .select('user_id', { count: 'exact' })
    .eq('group_name', group.name);

  const memberCount = members?.length || 0;

  const isMember = await isGroupMember(userId, group.name);

  const isOwner = group.creator === userId;

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

async function getGroupByName(userId, groupName) {
  const { data: group, error } = await supabase
    .from('groups')
    .select('name, creator, created_at')
    .eq('name', groupName)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Error fetching group: ${error.message}`);
  }

  return group;
}

async function addGroupMember(groupName, userId) {
  const { error } = await supabase
    .from('group_users')
    .insert({
      group_name: groupName,
      user_id: userId
    });

  if (error) {
    throw new Error(`Error adding group member: ${error.message}`);
  }
}

async function removeGroupMember(groupName, userId) {
  const { error } = await supabase
    .from('group_users')
    .delete()
    .eq('group_name', groupName)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Error removing group member: ${error.message}`);
  }
}

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