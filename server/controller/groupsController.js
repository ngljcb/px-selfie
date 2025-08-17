const groupsService = require('../service/groupsService');

/**
 * Controller per la gestione dei gruppi
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

// GET /api/groups/:name - Dettagli specifici di un gruppo
async function getGroupByName(req, res) {
  try {
    const userId = req.user.id;
    const groupName = decodeURIComponent(req.params.name);

    const group = await groupsService.getGroupByName(userId, groupName);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.status(200).json(group);
  } catch (error) {
    console.error('Error getting group by name:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/groups - Crea nuovo gruppo
async function createGroup(req, res) {
  try {
    const userId = req.user.id;
    const { name, userIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const group = await groupsService.createGroup(userId, { name: name.trim(), userIds });
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

// POST /api/groups/:name/members - Gestione membri (solo per proprietari)
async function manageGroupMembers(req, res) {
  try {
    const userId = req.user.id;
    const groupName = decodeURIComponent(req.params.name);
    const { addUserIds, removeUserIds } = req.body;

    const result = await groupsService.manageGroupMembers(userId, {
      groupName,
      addUserIds,
      removeUserIds
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error managing group members:', error);
    if (error.message === 'Group not found') {
      return res.status(404).json({ error: 'Group not found' });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: 'Only group owners can manage members' });
    }
    res.status(400).json({ error: error.message });
  }
}

// GET /api/groups/:name/members - Lista membri del gruppo
async function getGroupMembers(req, res) {
  try {
    const userId = req.user.id;
    const groupName = decodeURIComponent(req.params.name);

    const members = await groupsService.getGroupMembers(userId, groupName);
    res.status(200).json(members);
  } catch (error) {
    console.error('Error getting group members:', error);
    if (error.message === 'Group not found') {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.status(500).json({ error: error.message });
  }
}

// GET /api/groups/:name/membership - Verifica appartenenza al gruppo
async function checkGroupMembership(req, res) {
  try {
    const userId = req.user.id;
    const groupName = decodeURIComponent(req.params.name);

    const isMember = await groupsService.isGroupMember(userId, groupName);
    res.status(200).json({ isMember });
  } catch (error) {
    console.error('Error checking group membership:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/groups/search - Cerca gruppi per nome
async function searchGroups(req, res) {
  try {
    const userId = req.user.id;
    const { search } = req.query;

    if (!search || !search.trim()) {
      return res.status(200).json([]);
    }

    const groups = await groupsService.searchGroups(userId, search.trim());
    res.status(200).json(groups);
  } catch (error) {
    console.error('Error searching groups:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/groups/popular - Gruppi più popolari
async function getPopularGroups(req, res) {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const groups = await groupsService.getPopularGroups(userId, limit);
    res.status(200).json(groups);
  } catch (error) {
    console.error('Error getting popular groups:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/groups/recent - Gruppi creati di recente
async function getRecentGroups(req, res) {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const groups = await groupsService.getRecentGroups(userId, limit);
    res.status(200).json(groups);
  } catch (error) {
    console.error('Error getting recent groups:', error);
    res.status(500).json({ error: error.message });
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

// GET /api/groups/:name/stats - Statistiche del gruppo
async function getGroupStats(req, res) {
  try {
    const userId = req.user.id;
    const groupName = decodeURIComponent(req.params.name);

    const stats = await groupsService.getGroupStats(userId, groupName);
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting group stats:', error);
    if (error.message === 'Group not found') {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.status(500).json({ error: error.message });
  }
}

// GET /api/groups/overall-stats - Statistiche generali dei gruppi
async function getOverallGroupsStats(req, res) {
  try {
    const userId = req.user.id;

    const stats = await groupsService.getOverallGroupsStats(userId);
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting overall groups stats:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/groups/bulk-join - Unisciti a più gruppi
async function joinMultipleGroups(req, res) {
  try {
    const userId = req.user.id;
    const { groupNames } = req.body;

    if (!groupNames || !Array.isArray(groupNames)) {
      return res.status(400).json({ error: 'groupNames array is required' });
    }

    const result = await groupsService.joinMultipleGroups(userId, groupNames);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error joining multiple groups:', error);
    res.status(400).json({ error: error.message });
  }
}

// POST /api/groups/bulk-leave - Lascia più gruppi
async function leaveMultipleGroups(req, res) {
  try {
    const userId = req.user.id;
    const { groupNames } = req.body;

    if (!groupNames || !Array.isArray(groupNames)) {
      return res.status(400).json({ error: 'groupNames array is required' });
    }

    const result = await groupsService.leaveMultipleGroups(userId, groupNames);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error leaving multiple groups:', error);
    res.status(400).json({ error: error.message });
  }
}

module.exports = {
  getAllGroups,
  getUserGroups,
  getGroupByName,
  createGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
  manageGroupMembers,
  getGroupMembers,
  checkGroupMembership,
  searchGroups,
  getPopularGroups,
  getRecentGroups,
  checkGroupNameExists,
  getGroupStats,
  getOverallGroupsStats,
  joinMultipleGroups,
  leaveMultipleGroups
};