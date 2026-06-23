const express = require('express');
const categoryController = require('../controllers/categoryController');
const { authenticateToken, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', categoryController.getAllCategories);

// Protected routes (admin only)
router.post('/', authenticateToken, adminOnly, categoryController.createCategory);
router.put('/:id', authenticateToken, adminOnly, categoryController.updateCategory);
router.delete('/:id', authenticateToken, adminOnly, categoryController.deleteCategory);

module.exports = router;
