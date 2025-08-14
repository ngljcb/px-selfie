const express = require('express');
const authController = require('./controller/authController');
const featureController = require('./controller/featureController');
const checkAuth = require('./middleware/checkAuth');
const statisticsController = require('./controller/statisticsController');
const activitiesController = require('./controller/activitiesController');
const eventsController = require('./controller/eventsController');

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

module.exports = router;