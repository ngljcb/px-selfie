const express = require('express');
const authController = require('./controller/authController');
const featureController = require('./controller/featureController');
const checkAuth = require('./middleware/checkAuth');
const statisticsController = require('./controller/statisticsController');
const activitiesController = require('./controller/activitiesController');
const eventsController = require('./controller/eventsController');
const notesController = require('./controller/notesController');
const groupsController = require('./controller/groupsController');
const usersController = require('./controller/usersController');
const categoriesController = require('./controller/categoriesController');
const chatController = require('./controller/chatController');

const router = express.Router();

/* ---- AUTH ---- */
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);
router.get('/auth/me', authController.me);

/* ---- FEATURES ---- */
router.get('/features', checkAuth, featureController.getFeatures);

/* ---- STATISTICS ---- */
router.get('/statistics', checkAuth, statisticsController.getStatistics);
router.post('/statistics/session-completed', checkAuth, statisticsController.updateSessionStats);
router.post('/statistics/login-check', checkAuth, statisticsController.checkLoginStreak);
router.get('/statistics/history', checkAuth, statisticsController.getStatisticsHistory);

/* ---- ACTIVITIES ---- */
router.get('/activities', checkAuth, activitiesController.listActivities);
router.get('/activities/:id', checkAuth, activitiesController.getActivity);
router.post('/activities', checkAuth, activitiesController.createActivity);
router.put('/activities/:id', checkAuth, activitiesController.updateActivity);
router.delete('/activities/:id', checkAuth, activitiesController.deleteActivity);

/* ---- EVENTS ---- */
router.get('/events', checkAuth, eventsController.listEvents);
router.get('/events/:id', checkAuth, eventsController.getEvent);
router.post('/events', checkAuth, eventsController.createEvent);
router.patch('/events/:id', checkAuth, eventsController.updateEvent);
router.delete('/events/:id', checkAuth, eventsController.deleteEvent);

/* ---- NOTES ---- */
// Main CRUD operations
router.get('/notes', checkAuth, notesController.getNotes);
router.get('/notes/previews', checkAuth, notesController.getNotePreviews);
router.get('/notes/stats', checkAuth, notesController.getNotesStats);
router.get('/notes/count-by-accessibility', checkAuth, notesController.getNotesCountByAccessibility);
router.post('/notes', checkAuth, notesController.createNote);
router.post('/notes/bulk', checkAuth, notesController.bulkOperation);

// Individual note operations
router.get('/notes/:id', checkAuth, notesController.getNoteById);
router.put('/notes/:id', checkAuth, notesController.updateNote);
router.delete('/notes/:id', checkAuth, notesController.deleteNote);
router.post('/notes/:id/duplicate', checkAuth, notesController.duplicateNote);
router.post('/notes/:id/share', checkAuth, notesController.shareNote);
router.get('/notes/:id/permissions', checkAuth, notesController.getNotePermissions);

/* ---- GROUPS ---- */
// Main group operations
router.get('/groups', checkAuth, groupsController.getAllGroups);
router.get('/groups/my-groups', checkAuth, groupsController.getUserGroups);
router.get('/groups/check-name', checkAuth, groupsController.checkGroupNameExists);
router.post('/groups', checkAuth, groupsController.createGroup);

// Individual group operations
router.delete('/groups/:name', checkAuth, groupsController.deleteGroup);
router.post('/groups/:name/join', checkAuth, groupsController.joinGroup);
router.post('/groups/:name/leave', checkAuth, groupsController.leaveGroup);

/* ---- USERS ---- */
router.get('/users/search', checkAuth, usersController.searchUsersByUsername);
router.get('/users/exists', checkAuth, usersController.checkUsernameExists);
router.get('/users/batch', checkAuth, usersController.getUsersByIds);
router.get('/users/:id', checkAuth, usersController.getUserById);

/* ---- CATEGORIES ---- */
router.get('/categories', checkAuth, categoriesController.getCategories);

/* ---- CHAT AI ---- */
router.post('/chat', checkAuth, chatController.sendMessage);

module.exports = router;