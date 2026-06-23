const express = require('express');
const productController = require('../controllers/productController');
const { authenticateToken, adminOnly } = require('../middleware/auth');
const { uploadSingle, uploadSpreadsheet } = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/', productController.getAllProducts);
router.get('/:slug', productController.getProductBySlug);

// Protected routes (admin only)
router.post('/', authenticateToken, adminOnly, uploadSingle, productController.createProduct);
router.post('/import', authenticateToken, adminOnly, uploadSpreadsheet, productController.importProductsFromTemplate);
router.post('/bulk-delete', authenticateToken, adminOnly, productController.bulkDeleteProducts);
router.put('/:id', authenticateToken, adminOnly, uploadSingle, productController.updateProduct);
router.delete('/:id', authenticateToken, adminOnly, productController.deleteProduct);

module.exports = router;
