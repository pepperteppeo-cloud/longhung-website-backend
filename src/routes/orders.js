const express = require('express');
const orderController = require('../controllers/orderController');
const { authenticateToken, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/', orderController.createOrder);

// Protected routes (admin only)
router.get('/', authenticateToken, adminOnly, orderController.getAllOrders);
router.get('/:id', authenticateToken, adminOnly, orderController.getOrderById);
router.put('/:id', authenticateToken, adminOnly, orderController.updateOrder);
router.patch('/:id/status', authenticateToken, adminOnly, orderController.updateOrderStatus);
router.delete('/:id', authenticateToken, adminOnly, orderController.deleteOrder);

module.exports = router;
