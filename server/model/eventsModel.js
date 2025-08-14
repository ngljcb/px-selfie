const supabase = require('../persistence/supabase');

/**
 * table name: activities
 * columns:
 *  - id int8 PK
 *  - user_id uuid (fk -> auth.users.id)
 *  - title text
 *  - place text
 *  - start_date date
 *  - end_date date
 *  - start_time time
 *  - end_time time
 *  - days_recurrence text        (stringa dei giorni p.es. "Monday,Tuesday")
 *  - recurrence_type text        (es. "none" | "weekly" | "monthly")
 *  - number_recurrence int8      (n° di ricorrenze)
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

  if (error) throw error;
  return data;
}

// delete (solo dell'utente proprietario)
async function remove(userId, id) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('user_id', userId)
    .eq('id', id);

  if (error) throw error;
}

module.exports = { listByUser, getById, insert, update, remove };
