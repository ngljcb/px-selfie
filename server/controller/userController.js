const userService = require('../service/userService');

async function getUsers(req, res) {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: 'Errore durante il recupero degli utenti', detail: err.message });
  }
}

module.exports = {
  getUsers,
};
