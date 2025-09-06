const notesService = require('../service/notesService');

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
    res.status(500).json({ error: error.message });
  }
}

async function getNotePreviews(req, res) {
  try {
    const userId = req.user.id;
    const sortBy = req.query.sortBy || 'last_modify';
    const limit = parseInt(req.query.limit) || 50;

    const previews = await notesService.getNotePreviews(userId, sortBy, limit);
    res.status(200).json(previews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

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
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(500).json({ error: error.message });
  }
}

async function createNote(req, res) {
  try {
    const userId = req.user.id;
    const { 
      title, 
      text, 
      category, 
      accessibility, 
      groupName, 
      authorizedUserIds,
      createdAt,
      lastModifyAt  // Aggiungiamo lastModifyAt
    } = req.body;

    // Validazione campi obbligatori
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    if (!accessibility) {
      return res.status(400).json({ error: 'Accessibility type is required' });
    }

    const noteData = {
      title: title.trim(),
      text: text.trim(),
      category,
      accessibility,
      groupName,
      authorizedUserIds,
      createdAt: createdAt ? new Date(createdAt).toISOString() : undefined,
      lastModifyAt: lastModifyAt ? new Date(lastModifyAt).toISOString() : undefined  // Aggiunto supporto per lastModifyAt
    };

    const note = await notesService.createNote(userId, noteData);
    res.status(201).json(note);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function updateNote(req, res) {
  try {
    const userId = req.user.id;
    const noteId = req.params.id;
    
    const {
      title,
      text,
      category,
      accessibility,
      groupName,
      authorizedUserIds,
      lastModifyAt
    } = req.body;

    if (title !== undefined && (!title || !title.trim())) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }

    if (text !== undefined && (!text || !text.trim())) {
      return res.status(400).json({ error: 'Text content cannot be empty' });
    }

    const updateData = {
      title: title ? title.trim() : undefined,
      text: text ? text.trim() : undefined,
      category,
      accessibility,
      groupName,
      authorizedUserIds,
      lastModifyAt: lastModifyAt ? new Date(lastModifyAt).toISOString() : undefined 
    };

    const note = await notesService.updateNote(userId, noteId, updateData);
    res.status(200).json(note);
  } catch (error) {
    if (error.message === 'Note not found') {
      return res.status(404).json({ error: 'Note not found' });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(400).json({ error: error.message });
  }
}

async function deleteNote(req, res) {
  try {
    const userId = req.user.id;
    const noteId = req.params.id;

    await notesService.deleteNote(userId, noteId);
    res.status(200).json({ message: 'Note deleted successfully' });
  } catch (error) {
    if (error.message === 'Note not found') {
      return res.status(404).json({ error: 'Note not found' });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(500).json({ error: error.message });
  }
}

async function duplicateNote(req, res) {
  try {
    const userId = req.user.id;
    const sourceNoteId = req.params.id;
    const { 
      newTitle, 
      accessibility, 
      groupName, 
      authorizedUserIds,
      createdAt,
      lastModifyAt  // Aggiungiamo lastModifyAt
    } = req.body;

    const duplicateData = {
      newTitle,
      accessibility,
      groupName,
      authorizedUserIds,
      createdAt: createdAt ? new Date(createdAt).toISOString() : undefined,
      lastModifyAt: lastModifyAt ? new Date(lastModifyAt).toISOString() : undefined  // Aggiunto supporto per lastModifyAt
    };

    const duplicatedNote = await notesService.duplicateNote(userId, sourceNoteId, duplicateData);
    res.status(201).json(duplicatedNote);
  } catch (error) {
    if (error.message === 'Note not found') {
      return res.status(404).json({ error: 'Note not found' });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(400).json({ error: error.message });
  }
}

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
    if (error.message === 'Note not found') {
      return res.status(404).json({ error: 'Note not found' });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(400).json({ error: error.message });
  }
}

async function getNotePermissions(req, res) {
  try {
    const userId = req.user.id;
    const noteId = req.params.id;

    const permissions = await notesService.getNotePermissions(userId, noteId);
    res.status(200).json(permissions);
  } catch (error) {
    if (error.message === 'Note not found') {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.status(500).json({ error: error.message });
  }
}

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
    res.status(400).json({ error: error.message });
  }
}

async function getNotesStats(req, res) {
  try {
    const userId = req.user.id;

    const stats = await notesService.getNotesStats(userId);
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getNotesCountByAccessibility(req, res) {
  try {
    const userId = req.user.id;

    const counts = await notesService.getNotesCountByAccessibility(userId);
    res.status(200).json(counts);
  } catch (error) {
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