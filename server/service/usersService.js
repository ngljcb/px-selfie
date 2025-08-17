const supabase = require('../persistence/supabase');

/**
 * Service per la gestione degli utenti
 */

/**
 * Cerca utenti per username
 */
async function searchUsersByUsername(searchQuery) {
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, username, email')
    .or(`username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
    .order('username')
    .limit(10);

  if (error) {
    throw new Error(`Error searching users: ${error.message}`);
  }

  return (users || []).map(user => ({
    id: user.id,
    email: user.email,
    displayName: user.username || user.email || user.id
  }));
}

/**
 * Ottiene utente per ID
 */
async function getUserById(userId) {
  const { data: user, error } = await supabase
    .from('profiles')
    .select('id, username, email')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('User not found');
    }
    throw new Error(`Error fetching user: ${error.message}`);
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.username || user.email || user.id
  };
}

/**
 * Ottiene più utenti per array di ID
 */
async function getUsersByIds(userIds) {
  if (!userIds || userIds.length === 0) {
    return [];
  }

  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, username, email')
    .in('id', userIds);

  if (error) {
    throw new Error(`Error fetching users: ${error.message}`);
  }

  return (users || []).map(user => ({
    id: user.id,
    email: user.email,
    displayName: user.username || user.email || user.id
  }));
}

/**
 * Verifica se un username esiste
 */
async function checkUsernameExists(username) {
  const { data: user, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error checking username: ${error.message}`);
  }

  return !!user;
}

module.exports = {
  searchUsersByUsername,
  getUserById,
  getUsersByIds,
  checkUsernameExists
};