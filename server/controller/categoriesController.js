const categoriesService = require('../service/categoriesService');

async function getCategories(req, res) {
  try {
    const categories = await categoriesService.getCategories();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getCategories
};