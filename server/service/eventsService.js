const eventsModel = require('../model/eventsModel');

function toNullIfEmpty(v) {
  return v === '' ? null : v;
}

function normTime(t) {
  if (!t) return null;
  if (/^\d{2}:\d{2}$/.test(t)) return t + ':00'; // HH:mm → HH:mm:00
  return t;
}

function toRow(userId, p = {}) {
  return {
    user_id: userId,
    title: toNullIfEmpty(p.title),
    place: toNullIfEmpty(p.place),
    start_date: toNullIfEmpty(p.start_date),
    end_date: toNullIfEmpty(p.end_date),
    start_time: normTime(p.start_time),
    end_time: normTime(p.end_time),
    days_recurrence: toNullIfEmpty(p.days_recurrence),
    recurrence_type: toNullIfEmpty(p.recurrence_type),
    number_recurrence: p.number_recurrence ?? null,
    due_date: toNullIfEmpty(p.due_date)
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
