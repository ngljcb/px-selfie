const express = require('express');
const router = express.Router();

const userController = require('./controller/userController');
const featureController = require('./controller/featureController');

router.get('/users', userController.getUsers);
router.get('/features', featureController.getFeatures);

module.exports = router;