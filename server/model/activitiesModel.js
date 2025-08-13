const supabase = require('../persistence/supabase');

/**
 * Expected table schema: activities
 * columns:
 *  - id: int8 (auto)
 *  - user_id: uuid (fk to auth.users.id), not null
 *  - title: text not null
 *  - due_date: date not null
 *  - status: text
 *  - finished_at: timestamptz
 *  - created_at: timestamptz default now()
 */

function baseSelect() {
  return `id, user_id, title, due_date, status, finished_at, created_at`;
}

async function listByUser(
  userId,
  { from, to, status, limit = 50, offset = 0, search } = {}
) {
  let query = supabase
    .from('activities')
    .select(baseSelect(), { count: 'exact' })
    .eq('user_id', userId);

  if (from) query = query.gte('due_date', String(from).slice(0, 10));
  if (to) query = query.lte('due_date', String(to).slice(0, 10));
  if (status) query = query.eq('status', status);
  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  query = query.order('due_date', { ascending: true }).order('id', { ascending: true })
               .range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { items: data, count, limit, offset };
}

async function getById(userId, id) {
  const { data, error } = await supabase
    .from('activities')
    .select(baseSelect())
    .eq('user_id', userId)
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

async function insert(userId, payload) {
  const row = { ...payload, user_id: userId };
  const { data, error } = await supabase
    .from('activities')
    .insert(row)
    .select(baseSelect())
    .single();
  if (error) throw error;
  return data;
}

async function update(userId, id, patch) {
  const { data, error } = await supabase
    .from('activities')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select(baseSelect())
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

async function remove(userId, id) {
  const { error, count } = await supabase
    .from('activities')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

module.exports = {
  listByUser,
  getById,
  insert,
  update,
  remove,
};