const express = require('express');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/login', authController.login);

// Protected routes
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
