const featureService = require('../service/featureService');

async function getFeatures(req, res) {
  try {
    const features = await featureService.getAllFeatures();
    res.status(200).json(features);
  } catch (err) {
    res.status(500).json({ error: 'Errore durante il recupero delle features', detail: err.message });
  }
}

module.exports = {
  getFeatures,
};