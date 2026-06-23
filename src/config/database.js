const { Sequelize } = require('sequelize');

const commonOptions = {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

const connectionUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRESQL_URL ||
  process.env.POSTGRES_PRIVATE_URL ||
  '';

const isProduction = process.env.NODE_ENV === 'production';

const sequelize = connectionUrl
  ? new Sequelize(connectionUrl, {
      ...commonOptions,
      dialectOptions: isProduction
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: false
            }
          }
        : {}
    })
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        ...commonOptions,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT
      }
    );

// Test connection
sequelize.authenticate()
  .then(() => console.log('✅ Database connected successfully!'))
  .catch(err => console.error('❌ Database connection error:', err));

module.exports = sequelize;
