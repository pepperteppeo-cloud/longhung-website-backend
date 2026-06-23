const Order = require('../models/Order');
const Product = require('../models/Product');
const { generateOrderNumber, isValidPhone, isValidEmail, sanitizeInput, getPaginationParams } = require('../utils/helpers');
const { Op } = require('sequelize');

// GET: All orders (admin only)
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '' } = req.query;
    const { pageNum, limitNum, offset } = getPaginationParams(page, limit);

    const where = {};
    if (status) {
      where.status = sanitizeInput(status);
    }

    const { rows, count } = await Order.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: rows,
      total: count,
      pages: Math.ceil(count / limitNum),
      message: 'Orders retrieved successfully'
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET: Single order by ID
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order,
      message: 'Order retrieved successfully'
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// POST: Create order (public - for customers)
exports.createOrder = async (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
      total_amount,
      payment_method,
      notes
    } = req.body;

    // Validate required fields
    if (!customer_name || !customer_email || !customer_address || !total_amount) {
      return res.status(400).json({
        success: false,
        message: 'customer_name, customer_email, customer_address, and total_amount are required'
      });
    }

    if (!isValidEmail(customer_email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    if (customer_phone && !isValidPhone(customer_phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    const totalAmount = parseFloat(total_amount);
    if (totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Total amount must be greater than 0'
      });
    }

    // Generate order number
    const orderNumber = generateOrderNumber();

    const order = await Order.create({
      order_number: orderNumber,
      customer_name: sanitizeInput(customer_name),
      customer_email: sanitizeInput(customer_email),
      customer_phone: customer_phone ? sanitizeInput(customer_phone) : null,
      customer_address: sanitizeInput(customer_address),
      total_amount: totalAmount,
      payment_method: payment_method ? sanitizeInput(payment_method) : null,
      notes: notes ? sanitizeInput(notes) : null,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// PATCH: Update order status (admin only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const updateData = { status };
    if (notes) {
      updateData.notes = sanitizeInput(notes);
    }

    await order.update(updateData);

    res.json({
      success: true,
      data: order,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// PUT: Update order (admin only)
exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, customer_email, customer_phone, customer_address, payment_method } = req.body;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Validate email if provided
    if (customer_email && !isValidEmail(customer_email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate phone if provided
    if (customer_phone && !isValidPhone(customer_phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    const updateData = {
      ...(customer_name && { customer_name: sanitizeInput(customer_name) }),
      ...(customer_email && { customer_email: sanitizeInput(customer_email) }),
      ...(customer_phone && { customer_phone: sanitizeInput(customer_phone) }),
      ...(customer_address && { customer_address: sanitizeInput(customer_address) }),
      ...(payment_method && { payment_method: sanitizeInput(payment_method) })
    };

    await order.update(updateData);

    res.json({
      success: true,
      data: order,
      message: 'Order updated successfully'
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// DELETE: Delete order (admin only)
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    await order.destroy();

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
