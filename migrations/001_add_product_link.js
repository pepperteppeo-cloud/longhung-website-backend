/**
 * Migration: Add product_link column to products table
 * This adds support for custom product/order links per product
 */

const { Client } = require('pg');
require('dotenv').config();

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 
      `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Check if column already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'product_link'
    `);

    if (checkResult.rows.length > 0) {
      console.log('ℹ Column product_link already exists, skipping migration');
      return;
    }

    // Add product_link column
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN product_link VARCHAR(500)
    `);

    console.log('✓ Column product_link added successfully');

    // Verify
    const verifyResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'product_link'
    `);

    if (verifyResult.rows.length > 0) {
      console.log(`✓ Verified: ${verifyResult.rows[0].column_name} (${verifyResult.rows[0].data_type})`);
    }

  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run migration
runMigration();
