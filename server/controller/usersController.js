const usersService = require('../service/usersService');

/**
 * Controller per la gestione degli utenti
 */

// GET /api/users/search - Cerca utenti per username
async function searchUsersByUsername(req, res) {
  try {
    const { search } = req.query;

    if (!search || !search.trim()) {
      return res.status(200).json([]);
    }

    const users = await usersService.searchUsersByUsername(search.trim());
    res.status(200).json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/users/:id - Dettagli utente per ID
async function getUserById(req, res) {
  try {
    const userId = req.params.id;

    const user = await usersService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error getting user by ID:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: error.message });
  }
}

// GET /api/users/batch - Ottenere più utenti per ID
async function getUsersByIds(req, res) {
  try {
    const { ids } = req.query;

    if (!ids) {
      return res.status(200).json([]);
    }

    const userIds = ids.split(',').filter(id => id.trim());
    if (userIds.length === 0) {
      return res.status(200).json([]);
    }

    const users = await usersService.getUsersByIds(userIds);
    res.status(200).json(users);
  } catch (error) {
    console.error('Error getting users by IDs:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/users/exists - Verifica se username esiste
async function checkUsernameExists(req, res) {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const exists = await usersService.checkUsernameExists(username);
    res.status(200).json({ exists });
  } catch (error) {
    console.error('Error checking username:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  searchUsersByUsername,
  getUserById,
  getUsersByIds,
  checkUsernameExists
};