const express = require('express');
const articleController = require('../controllers/articleController');
const { authenticateToken, adminOnly } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/', articleController.getAllArticles);

// Protected routes (admin only)
router.get('/admin/list', authenticateToken, adminOnly, articleController.getAllArticlesAdmin);
router.post('/upload-image', authenticateToken, adminOnly, uploadSingle, articleController.uploadArticleImage);
router.post('/', authenticateToken, adminOnly, uploadSingle, articleController.createArticle);
router.put('/:id', authenticateToken, adminOnly, uploadSingle, articleController.updateArticle);
router.patch('/:id/publish', authenticateToken, adminOnly, articleController.togglePublish);
router.delete('/:id', authenticateToken, adminOnly, articleController.deleteArticle);

// Public route placed after admin-prefixed routes to avoid collisions
router.get('/:slug', articleController.getArticleBySlug);

module.exports = router;
