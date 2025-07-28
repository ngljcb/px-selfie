const userModel = require('../model/userModel');

async function getAllUsers() {
  return await userModel.getAllUsers();
}

module.exports = { getAllUsers };
