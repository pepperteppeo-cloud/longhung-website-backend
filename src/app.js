require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// ========== SEQUELIZE MODELS & ASSOCIATIONS ==========
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const ProductImage = require('./models/ProductImage');
const Order = require('./models/Order');
const Article = require('./models/Article');

// Setup associations
Product.belongsTo(Category, { foreignKey: 'category_id' });
Category.hasMany(Product, { foreignKey: 'category_id' });

Product.hasMany(ProductImage, { foreignKey: 'product_id', onDelete: 'CASCADE' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id' });

Article.belongsTo(User, { foreignKey: 'author_id' });
User.hasMany(Article, { foreignKey: 'author_id' });

// ========== MIDDLEWARE ==========
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:4321',
  'http://localhost:4323',
  'http://localhost:5173',
  'https://vpplonghung.com',
  'https://www.vpplonghung.com'
];

const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowOrigins = new Set(corsOrigins.length > 0 ? corsOrigins : defaultOrigins);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve static files (uploads)
app.use(express.static('public'));

// ========== ROUTES ==========
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/articles', require('./routes/articles'));
app.use('/api/orders', require('./routes/orders'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// ========== 404 HANDLER ==========
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ========== GLOBAL ERROR HANDLER ==========
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);

  // Multer errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`
    });
  }

  // Validation errors
  if (err.message === 'Only JPEG, PNG, WebP, and GIF images allowed') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  // Default error response
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
