const crypto = require('crypto');

// Generate unique order number
const generateOrderNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `VPP-${dateStr}-${random}`;
};

// Format currency to Vietnamese Dong
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

// Validate email format
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Validate Vietnamese phone number
const isValidPhone = (phone) => {
  const re = /^(\+84|0)[0-9]{9,10}$/;
  return re.test(phone);
};

// Sanitize input (trim and prevent injection)
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

// Pagination helper
const getPaginationParams = (page = 1, limit = 12) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 12));
  const offset = (pageNum - 1) * limitNum;
  
  return { pageNum, limitNum, offset };
};

module.exports = {
  generateOrderNumber,
  formatCurrency,
  isValidEmail,
  isValidPhone,
  sanitizeInput,
  getPaginationParams
};
