const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_number: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false
  },
  customer_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  customer_email: DataTypes.STRING(255),
  customer_phone: DataTypes.STRING(20),
  customer_address: DataTypes.TEXT,
  total_amount: DataTypes.DECIMAL(12, 2),
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'pending'
  },
  payment_method: DataTypes.STRING(50),
  notes: DataTypes.TEXT
}, {
  tableName: 'orders',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Order;
