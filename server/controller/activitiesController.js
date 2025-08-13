const activitiesService = require('../service/activitiesService');

function requireUser(req, res) {
  const userId = req?.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return userId;
}

async function listActivities(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;

  try {
    const { from, to, status, limit = 50, offset = 0, search } = req.query;
    const result = await activitiesService.list(userId, {
      from,
      to,
      status,
      limit: +limit,
      offset: +offset,
      search,
    });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getActivity(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;

  try {
    const { id } = req.params;
    const activity = await activitiesService.get(userId, id);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    res.status(200).json(activity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createActivity(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;

  try {
    const { title, due_date, status, finished_at } = req.body || {};
    if (!title || !due_date) {
      return res.status(400).json({ error: 'Required fields: title, due_date' });
    }
    const created = await activitiesService.create(userId, {
      title,
      due_date,
      status,
      finished_at,
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateActivity(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;

  try {
    const { id } = req.params;
    const patch = req.body || {};
    const updated = await activitiesService.update(userId, id, patch);
    if (!updated) return res.status(404).json({ error: 'Activity not found' });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteActivity(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;

  try {
    const { id } = req.params;
    const ok = await activitiesService.remove(userId, id);
    if (!ok) return res.status(404).json({ error: 'Activity not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listActivities,
  getActivity,
  createActivity,
  updateActivity,
  deleteActivity,
};