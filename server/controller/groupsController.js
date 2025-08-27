const groupsService = require('../service/groupsService');

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
    res.status(500).json({ error: error.message });
  }
}

async function getUserGroups(req, res) {
  try {
    const userId = req.user.id;
    const groups = await groupsService.getUserGroups(userId);
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createGroup(req, res) {
  try {
    const userId = req.user.id;
    const { name, userIds, createdAt } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const groupData = { 
      name: name.trim(), 
      userIds,
      createdAt: createdAt ? new Date(createdAt).toISOString() : undefined
    };

    const group = await groupsService.createGroup(userId, groupData);
    res.status(201).json(group);
  } catch (error) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
}

async function deleteGroup(req, res) {
  try {
    const userId = req.user.id;
    const groupName = decodeURIComponent(req.params.name);

    await groupsService.deleteGroup(userId, groupName);
    res.status(200).json({ message: 'Group deleted successfully' });
  } catch (error) {
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

async function joinGroup(req, res) {
  try {
    const userId = req.user.id;
    const groupName = decodeURIComponent(req.params.name);

    await groupsService.joinGroup(userId, groupName);
    res.status(200).json({ message: 'Successfully joined group' });
  } catch (error) {
    if (error.message === 'Group not found') {
      return res.status(404).json({ error: 'Group not found' });
    }
    if (error.message === 'Already a member') {
      return res.status(409).json({ error: 'You are already a member of this group' });
    }
    res.status(400).json({ error: error.message });
  }
}

async function leaveGroup(req, res) {
  try {
    const userId = req.user.id;
    const groupName = decodeURIComponent(req.params.name);

    await groupsService.leaveGroup(userId, groupName);
    res.status(200).json({ message: 'Successfully left group' });
  } catch (error) {
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

async function checkGroupNameExists(req, res) {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const exists = await groupsService.checkGroupNameExists(name);
    res.status(200).json({ exists });
  } catch (error) {
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