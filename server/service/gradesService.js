const gradesModel = require('../model/gradesModel');

function toInt(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toTimestamp(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString(); // timestamptz
}

function sanitizeCreate(input = {}) {
  const out = {};
  out.year = String(input.year).trim();
  out.course_name = String(input.course_name).trim();
  out.cfu = toInt(input.cfu);
  out.grade = toInt(input.grade);
  out.date = toTimestamp(input.date);
  return out;
}

function sanitizeUpdate(input = {}) {
  const out = {};
  if (input.year != null) out.year = String(input.year).trim();
  if (input.course_name != null) out.course_name = String(input.course_name).trim();
  if (input.cfu != null) out.cfu = toInt(input.cfu);
  if (input.grade != null) out.grade = toInt(input.grade);
  if (input.date !== undefined) out.date = toTimestamp(input.date);
  return out;
}

async function list(userId, filters) {
  return gradesModel.listByUser(userId, filters);
}

async function get(userId, id) {
  return gradesModel.getById(userId, id);
}

async function create(userId, payload) {
  const data = sanitizeCreate(payload);
  // simple validation
  if (data.cfu == null || data.grade == null || !data.date) {
    throw new Error('Invalid payload');
  }
  return gradesModel.insert(userId, data);
}

async function update(userId, id, payload) {
  const patch = sanitizeUpdate(payload);
  if (Object.keys(patch).length === 0) {
    const current = await gradesModel.getById(userId, id);
    return current; // nothing to update
  }
  return gradesModel.update(userId, id, patch);
}

async function remove(userId, id) {
  return gradesModel.remove(userId, id);
}

module.exports = { list, get, create, update, remove };