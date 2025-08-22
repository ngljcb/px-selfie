const supabase = require('../persistence/supabase');

async function getCategories() {
  const { data: categories, error } = await supabase
    .from('category')
    .select('name')
    .order('name');

  if (error) {
    throw new Error(`Error fetching categories: ${error.message}`);
  }

  return (categories || []).map(category => ({
    name: category.name
  }));
}

module.exports = {
  getCategories
};