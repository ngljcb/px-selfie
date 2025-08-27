const gradesService = require('../service/gradesService');

function requireUser(req, res) {
  const userId = req?.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return userId;
}

async function listGrades(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;

  try {
    const {
      year,
      search,          // match in course_name
      from,            // date from (ISO)
      to,              // date to   (ISO)
      min_grade,
      max_grade,
      limit = 50,
      offset = 0
    } = req.query;

    const result = await gradesService.list(userId, {
      year,
      search,
      from,
      to,
      min_grade: min_grade != null ? +min_grade : undefined,
      max_grade: max_grade != null ? +max_grade : undefined,
      limit: +limit,
      offset: +offset
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getGrade(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;

  try {
    const { id } = req.params;
    const grade = await gradesService.get(userId, id);
    if (!grade) return res.status(404).json({ error: 'Grade not found' });
    res.status(200).json(grade);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createGrade(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;

  try {
    const {
      year,
      course_name,
      cfu,
      grade,
      date
    } = req.body || {};

    if (!year || !course_name || !cfu || !grade || !date) {
      return res.status(400).json({ error: 'Required fields: year, course_name, cfu, grade, date' });
    }

    const created = await gradesService.create(userId, {
      year,
      course_name,
      cfu,
      grade,
      date
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateGrade(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;

  try {
    const { id } = req.params;
    const patch = req.body || {};
    const updated = await gradesService.update(userId, id, patch);
    if (!updated) return res.status(404).json({ error: 'Grade not found' });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteGrade(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;

  try {
    const { id } = req.params;
    const ok = await gradesService.remove(userId, id);
    if (!ok) return res.status(404).json({ error: 'Grade not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listGrades, getGrade, createGrade, updateGrade, deleteGrade };