const supabase = require('../persistence/supabase');

async function getAllFeatures() {
  const { data, error } = await supabase
    .from('features')
    .select('*')
    .order('order', { ascending: true });
  
  if (error) throw error;
  return data;
}

module.exports = {
  getAllFeatures,
};
