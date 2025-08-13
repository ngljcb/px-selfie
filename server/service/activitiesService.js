const activitiesModel = require('../model/activitiesModel');

function toISODateOnly(d) {
  // Expect input like 'YYYY-MM-DD' or Date; always return YYYY-MM-DD
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  const dt = new Date(d);
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${m}-${day}`;
}

function sanitizeCreate(input = {}) {
  const out = {};
  out.title = String(input.title).trim();
  out.due_date = toISODateOnly(input.due_date); // DATE
  out.status = input.status != null ? String(input.status) : null;
  out.finished_at = input.finished_at ? new Date(input.finished_at).toISOString() : null; // TIMESTAMPTZ
  return out;
}

function sanitizeUpdate(input = {}) {
  const out = {};
  if (input.title != null) out.title = String(input.title).trim();
  if (input.due_date != null) out.due_date = toISODateOnly(input.due_date);
  if (input.status != null) out.status = String(input.status);
  if (input.finished_at !== undefined) {
    out.finished_at = input.finished_at ? new Date(input.finished_at).toISOString() : null;
  }
  return out;
}

/**
 * Business rule:
 * - If status transitions to 'done' and finished_at is null -> set finished_at = now().
 * - If status is not 'done' -> finished_at = null (unless explicitly provided).
 */
function applyStatusRules(currentRow, patch) {
  const next = { ...patch };
  const nextStatus = next.status ?? currentRow?.status;

  if (next.status != null) {
    if (nextStatus === 'done' && (next.finished_at == null)) {
      next.finished_at = new Date().toISOString();
    } else if (nextStatus !== 'done' && next.finished_at === undefined) {
      next.finished_at = null;
    }
  }
  return next;
}

async function list(userId, filters) {
  return activitiesModel.listByUser(userId, filters);
}

async function get(userId, id) {
  return activitiesModel.getById(userId, id);
}

async function create(userId, payload) {
  const data = sanitizeCreate(payload);
  // status rule on create
  if (data.status === 'done' && !data.finished_at) {
    data.finished_at = new Date().toISOString();
  }
  return activitiesModel.insert(userId, data);
}

async function update(userId, id, payload) {
  const patch = sanitizeUpdate(payload);
  const current = await activitiesModel.getById(userId, id);
  if (!current) return null;
  const patched = applyStatusRules(current, patch);
  if (Object.keys(patched).length === 0) return current;
  return activitiesModel.update(userId, id, patched);
}

async function remove(userId, id) {
  return activitiesModel.remove(userId, id);
}

module.exports = { list, get, create, update, remove };