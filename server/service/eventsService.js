const eventsModel = require('../model/eventsModel');

function toRow(userId, p = {}) {
  return {
    user_id: userId,
    title: p.title ?? null,
    place: p.place ?? null,
    start_date: p.start_date ?? null,
    end_date: p.end_date ?? null,
    start_time: p.start_time ?? null,
    end_time: p.end_time ?? null,
    days_recurrence: p.days_recurrence ?? null,
    recurrence_type: p.recurrence_type ?? null,
    number_recurrence: p.number_recurrence ?? null,
    due_date: p.due_date ?? null
  };
}

async function list(userId) {
  return eventsModel.listByUser(userId);
}

async function getById(userId, id) {
  return eventsModel.getById(userId, id);
}

async function create(userId, payload) {
  const row = toRow(userId, payload);
  return eventsModel.insert(row);
}

async function update(userId, id, patch) {
  const row = toRow(userId, patch);
  delete row.user_id;
  return eventsModel.update(userId, id, row);
}

async function remove(userId, id) {
  return eventsModel.remove(userId, id);
}

module.exports = { list, getById, create, update, remove };