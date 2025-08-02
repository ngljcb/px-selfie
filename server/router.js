const express = require('express');
const router = express.Router();

const authController = require('./controller/authController');
const userController = require('./controller/userController');
const featureController = require('./controller/featureController');

router.post('/auth/register', authController.register);
router.get('/users', userController.getUsers);
router.get('/features', featureController.getFeatures);

module.exports = router;