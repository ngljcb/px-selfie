const groupsService = require('../service/groupsService');

/**
 * Controller per la gestione dei gruppi - UPDATED WITH TIME MACHINE INTEGRATION
 */

// GET /api/groups - Lista tutti i gruppi con filtri
async function getAllGroups(req, res) {
  try {
    const userId = req.user.id;
    const filters = {
      search: req.query.search,
      sortBy: req.query.sortBy || 'name',
      sortOrder: req.query.sortOrder || 'asc',
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0,
      onlyJoined: req.query.onlyJoined === 'true'
    };

    const result = await groupsService.getAllGroups(userId, filters);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting groups:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/groups/my-groups - Gruppi dell'utente corrente
async function getUserGroups(req, res) {
  try {
    const userId = req.user.id;
    const groups = await groupsService.getUserGroups(userId);
    res.status(200).json(groups);
  } catch (error) {
    console.error('Error getting user groups:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/groups - Crea nuovo gruppo - UPDATED WITH TIME MACHINE INTEGRATION
async function createGroup(req, res) {
  try {
    const userId = req.user.id;
    const { name, userIds, createdAt } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // UPDATED: Pass createdAt from Time Machine if provided
    const groupData = { 
      name: name.trim(), 
      userIds,
      createdAt: createdAt ? new Date(createdAt).toISOString() : undefined
    };

    const group = await groupsService.createGroup(userId, groupData);
    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
}

// DELETE /api/groups/:name - Elimina gruppo (solo per il creatore)
async function deleteGroup(req, res) {
  try {
    const userId = req.user.id;
    const groupName = decodeURIComponent(req.params.name);

    await groupsService.deleteGroup(userId, groupName);
    res.status(200).json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    if (error.message === 'Group not found') {
      return res.status(404).json({ error: 'Group not found' });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: 'Only group owners can delete groups' });
    }
    if (error.message.includes('has members') || error.message.includes('contains notes')) {
      return res.status(422).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
}

// POST /api/groups/:name/join - Unisciti a un gruppo
async function joinGroup(req, res) {
  try {
    const userId = req.user.id;
    const groupName = decodeURIComponent(req.params.name);

    await groupsService.joinGroup(userId, groupName);
    res.status(200).json({ message: 'Successfully joined group' });
  } catch (error) {
    console.error('Error joining group:', error);
    if (error.message === 'Group not found') {
      return res.status(404).json({ error: 'Group not found' });
    }
    if (error.message === 'Already a member') {
      return res.status(409).json({ error: 'You are already a member of this group' });
    }
    res.status(400).json({ error: error.message });
  }
}

// POST /api/groups/:name/leave - Lascia un gruppo
async function leaveGroup(req, res) {
  try {
    const userId = req.user.id;
    const groupName = decodeURIComponent(req.params.name);

    await groupsService.leaveGroup(userId, groupName);
    res.status(200).json({ message: 'Successfully left group' });
  } catch (error) {
    console.error('Error leaving group:', error);
    if (error.message === 'Group not found') {
      return res.status(404).json({ error: 'Group not found' });
    }
    if (error.message === 'Not a member') {
      return res.status(409).json({ error: 'You are not a member of this group' });
    }
    if (error.message === 'Cannot leave as owner') {
      return res.status(422).json({ error: 'Group owners cannot leave their own group. Delete the group instead.' });
    }
    res.status(400).json({ error: error.message });
  }
}

// GET /api/groups/check-name - Verifica disponibilità nome gruppo
async function checkGroupNameExists(req, res) {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const exists = await groupsService.checkGroupNameExists(name);
    res.status(200).json({ exists });
  } catch (error) {
    console.error('Error checking group name:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAllGroups,
  getUserGroups,
  createGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
  checkGroupNameExists,
};