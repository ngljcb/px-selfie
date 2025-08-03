const express = require('express');
const authController = require('./controller/authController');
const featureController = require('./controller/featureController');
const checkAuth = require('./middleware/checkAuth');

const router = express.Router();

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authController.me);

router.get('/features', checkAuth, featureController.getFeatures);

module.exports = router;