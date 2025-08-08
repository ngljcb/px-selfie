const express = require('express');
const authController = require('./controller/authController');
const featureController = require('./controller/featureController');
const checkAuth = require('./middleware/checkAuth');
const statisticsController = require('./controller/statisticsController');

const router = express.Router();

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);
router.get('/auth/me', authController.me);

router.get('/features', checkAuth, featureController.getFeatures);

router.get('/statistics', checkAuth, statisticsController.getStatistics);
router.post('/statistics/session-completed', checkAuth, statisticsController.updateSessionStats);
router.post('/statistics/login-check', checkAuth, statisticsController.checkLoginStreak);

module.exports = router;