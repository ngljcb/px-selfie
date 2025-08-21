const notesService = require('../service/notesService');

/**
 * Controller per la gestione delle note
 */

// GET /api/notes - Lista note con filtri e paginazione
async function getNotes(req, res) {
  try {
    const userId = req.user.id;
    const filters = {
      search: req.query.search,
      category: req.query.category,
      accessibility: req.query.accessibility,
      group: req.query.group,
      sortBy: req.query.sortBy || 'last_modify',
      sortOrder: req.query.sortOrder || 'desc',
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const result = await notesService.getNotes(userId, filters);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting notes:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/notes/previews - Note preview per home page
async function getNotePreviews(req, res) {
  try {
    const userId = req.user.id;
    const sortBy = req.query.sortBy || 'last_modify';
    const limit = parseInt(req.query.limit) || 50;

    const previews = await notesService.getNotePreviews(userId, sortBy, limit);
    res.status(200).json(previews);
  } catch (error) {
    console.error('Error getting note previews:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/notes/:id - Singola nota
async function getNoteById(req, res) {
  try {
    const userId = req.user.id;
    const noteId = req.params.id;

    const note = await notesService.getNoteById(userId, noteId);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.status(200).json(note);
  } catch (error) {
    console.error('Error getting note by ID:', error);
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(500).json({ error: error.message });
  }
}

// POST /api/notes - Crea nuova nota
async function createNote(req, res) {
  try {
    const userId = req.user.id;
    const noteData = {
      title: req.body.title,
      text: req.body.text,
      category: req.body.category,
      accessibility: req.body.accessibility,
      groupName: req.body.groupName,
      authorizedUserIds: req.body.authorizedUserIds
    };

    // Validazione base
    if (!noteData.accessibility) {
      return res.status(400).json({ error: 'Accessibility type is required' });
    }

    const note = await notesService.createNote(userId, noteData);
    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(400).json({ error: error.message });
  }
}

// PUT /api/notes/:id - Aggiorna nota esistente
async function updateNote(req, res) {
  try {
    const userId = req.user.id;
    const noteId = req.params.id;
    const updateData = {
      title: req.body.title,
      text: req.body.text,
      category: req.body.category,
      accessibility: req.body.accessibility,
      groupName: req.body.groupName,
      authorizedUserIds: req.body.authorizedUserIds
    };

    const note = await notesService.updateNote(userId, noteId, updateData);
    res.status(200).json(note);
  } catch (error) {
    console.error('Error updating note:', error);
    if (error.message === 'Note not found') {
      return res.status(404).json({ error: 'Note not found' });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(400).json({ error: error.message });
  }
}

// DELETE /api/notes/:id - Elimina nota
async function deleteNote(req, res) {
  try {
    const userId = req.user.id;
    const noteId = req.params.id;

    await notesService.deleteNote(userId, noteId);
    res.status(200).json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    if (error.message === 'Note not found') {
      return res.status(404).json({ error: 'Note not found' });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(500).json({ error: error.message });
  }
}

// POST /api/notes/:id/duplicate - Duplica nota
async function duplicateNote(req, res) {
  try {
    const userId = req.user.id;
    const sourceNoteId = req.params.id;
    const duplicateData = {
      newTitle: req.body.newTitle,
      accessibility: req.body.accessibility,
      groupName: req.body.groupName,
      authorizedUserIds: req.body.authorizedUserIds
    };

    const duplicatedNote = await notesService.duplicateNote(userId, sourceNoteId, duplicateData);
    res.status(201).json(duplicatedNote);
  } catch (error) {
    console.error('Error duplicating note:', error);
    if (error.message === 'Note not found') {
      return res.status(404).json({ error: 'Note not found' });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(400).json({ error: error.message });
  }
}

// POST /api/notes/:id/share - Condividi nota con utenti
async function shareNote(req, res) {
  try {
    const userId = req.user.id;
    const noteId = req.params.id;
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array is required' });
    }

    await notesService.shareNote(userId, noteId, userIds);
    res.status(200).json({ message: 'Note shared successfully' });
  } catch (error) {
    console.error('Error sharing note:', error);
    if (error.message === 'Note not found') {
      return res.status(404).json({ error: 'Note not found' });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(400).json({ error: error.message });
  }
}

// GET /api/notes/:id/permissions - Permessi nota per utente corrente
async function getNotePermissions(req, res) {
  try {
    const userId = req.user.id;
    const noteId = req.params.id;

    const permissions = await notesService.getNotePermissions(userId, noteId);
    res.status(200).json(permissions);
  } catch (error) {
    console.error('Error getting note permissions:', error);
    if (error.message === 'Note not found') {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.status(500).json({ error: error.message });
  }
}

// POST /api/notes/bulk - Operazioni bulk sulle note
async function bulkOperation(req, res) {
  try {
    const userId = req.user.id;
    const { operation, noteIds, newCategoryName, newAccessibility, newGroupName } = req.body;

    if (!operation || !noteIds || !Array.isArray(noteIds)) {
      return res.status(400).json({ error: 'operation and noteIds array are required' });
    }

    const result = await notesService.bulkOperation(userId, {
      operation,
      noteIds,
      newCategoryName,
      newAccessibility,
      newGroupName
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    res.status(400).json({ error: error.message });
  }
}

// GET /api/notes/stats - Statistiche note dell'utente
async function getNotesStats(req, res) {
  try {
    const userId = req.user.id;

    const stats = await notesService.getNotesStats(userId);
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting notes stats:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/notes/count-by-accessibility - Conta note per tipo di accessibilità
async function getNotesCountByAccessibility(req, res) {
  try {
    const userId = req.user.id;

    const counts = await notesService.getNotesCountByAccessibility(userId);
    res.status(200).json(counts);
  } catch (error) {
    console.error('Error getting notes count by accessibility:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getNotes,
  getNotePreviews,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  duplicateNote,
  shareNote,
  getNotePermissions,
  bulkOperation,
  getNotesStats,
  getNotesCountByAccessibility
};