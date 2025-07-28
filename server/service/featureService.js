const featureModel = require('../model/featureModel');

async function getAllFeatures() {
  return await featureModel.getAllFeatures();
}

module.exports = { getAllFeatures };