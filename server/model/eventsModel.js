const supabase = require('../persistence/supabase');
/**
 * table name: events
 * columns:
 *  - id int8 PK
 *  - user_id uuid (fk -> auth.users.id)
 *  - title text
 *  - place text
 *  - start_date date
 *  - end_date date
 *  - start_time time
 *  - end_time time
 *  - days_recurrence text
 *  - recurrence_type text
 *  - number_recurrence int8
 *  - due_date date
 *  - created_at timestamptz default now()
 */

// ritorna array di eventi dell'utente
async function listByUser(userId) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ritorna singolo evento (vincolato a user_id)
async function getById(userId, id) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .eq('id', id)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // not found
  return data || null;
}

// insert
async function insert(row) {
  const { data, error } = await supabase
    .from('events')
    .insert([row])
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

// update (solo dell'utente proprietario)
async function update(userId, id, patch) {
  const { data, error } = await supabase
    .from('events')
    .update(patch)
    .eq('user_id', userId)
    .eq('id', id)
    .select('*')
    .single();

  if (error && error.code === 'PGRST116') return null; // not found
  if (error) throw error;
  return data;
}

// delete (solo dell'utente proprietario)
async function remove(userId, id) {
  const { error, count } = await supabase
    .from('events')
    .delete({ count: 'exact' })
    .eq('user_id', userId)
    .eq('id', id);

  if (error) throw error;
  return count > 0;
}

module.exports = { listByUser, getById, insert, update, remove };
