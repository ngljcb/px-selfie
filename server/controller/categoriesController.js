const categoriesService = require('../service/categoriesService');

/**
 * Controller per la gestione delle categorie
 */

// GET /api/categories - Lista tutte le categorie predefinite
async function getCategories(req, res) {
  try {
    const categories = await categoriesService.getCategories();
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getCategories
};