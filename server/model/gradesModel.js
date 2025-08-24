const supabase = require('../persistence/supabase');

/**
 * table name: grades
 * columns:
 *  - id int8 PK
 *  - user_id uuid (fk -> auth.users.id)
 *  - year varchar
 *  - course_name varchar
 *  - cfu int8
 *  - grade int8
 *  - date timestamptz
 *  - created_at timestamptz default now()
 */

function baseSelect() {
  return `id, user_id, year, course_name, cfu, grade, date, created_at`;
}

async function listByUser(
  userId,
  { year, search, from, to, min_grade, max_grade, limit = 50, offset = 0 } = {}
) {
  let q = supabase
    .from('grades')
    .select(baseSelect(), { count: 'exact' })
    .eq('user_id', userId);

  if (year) q = q.eq('year', year);
  if (search) q = q.ilike('course_name', `%${search}%`);
  if (from) q = q.gte('date', new Date(from).toISOString());
  if (to) q = q.lte('date', new Date(to).toISOString());
  if (min_grade != null) q = q.gte('grade', +min_grade);
  if (max_grade != null) q = q.lte('grade', +max_grade);

  q = q.order('date', { ascending: false }).order('id', { ascending: false })
       .range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  return { items: data || [], count: count ?? 0, limit, offset };
}

async function getById(userId, id) {
  const { data, error } = await supabase
    .from('grades')
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
    .from('grades')
    .insert(row)
    .select(baseSelect())
    .single();

  if (error) throw error;
  return data;
}

async function update(userId, id, patch) {
  const { data, error } = await supabase
    .from('grades')
    .update(patch)
    .eq('user_id', userId)
    .eq('id', id)
    .select(baseSelect())
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

async function remove(userId, id) {
  const { error, count } = await supabase
    .from('grades')
    .delete({ count: 'exact' })
    .eq('user_id', userId)
    .eq('id', id);

  if (error) throw error;
  return (count ?? 0) > 0;
}

module.exports = { listByUser, getById, insert, update, remove };