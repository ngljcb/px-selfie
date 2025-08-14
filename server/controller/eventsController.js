const eventsService = require('../service/eventsService');

function requireUser(req, res) {
  const userId = req?.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return userId;
}

async function listEvents(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;

  try {
    const events = await eventsService.list(userId);
    res.status(200).json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getEvent(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;

  try {
    const { id } = req.params;
    const event = await eventsService.getById(userId, id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.status(200).json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createEvent(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;

  try {
    const {
      title,
      place,
      start_date,
      end_date,
      start_time,
      end_time,
      days_recurrence,
      recurrence_type,
      number_recurrence,
      due_date
    } = req.body || {};

    if (!title || !start_date) {
      return res.status(400).json({ error: 'Required fields: title, start_date' });
    }

    const created = await eventsService.create(userId, {
      title,
      place,
      start_date,
      end_date,
      start_time,
      end_time,
      days_recurrence,
      recurrence_type,
      number_recurrence,
      due_date
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateEvent(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;

  try {
    const { id } = req.params;
    const patch = req.body || {};
    const updated = await eventsService.update(userId, id, patch);
    if (!updated) return res.status(404).json({ error: 'Event not found' });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteEvent(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;

  try {
    const { id } = req.params;
    const ok = await eventsService.remove(userId, id);
    if (!ok) return res.status(404).json({ error: 'Event not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent
};
