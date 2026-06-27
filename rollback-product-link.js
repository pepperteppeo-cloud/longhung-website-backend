/**
 * Rollback: Remove product_link column from database
 * Run this if migration causes API issues
 */

const { Client } = require('pg');
require('dotenv').config();

async function rollback() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 
      `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Check if column exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'product_link'
    `);

    if (checkResult.rows.length === 0) {
      console.log('ℹ Column product_link does not exist, nothing to rollback');
      return;
    }

    // Drop product_link column
    await client.query(`
      ALTER TABLE products 
      DROP COLUMN IF EXISTS product_link
    `);

    console.log('✓ Column product_link removed successfully');

    // Verify
    const verifyResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'product_link'
    `);

    if (verifyResult.rows.length === 0) {
      console.log('✓ Verified: product_link column no longer exists');
    }

  } catch (error) {
    console.error('✗ Rollback failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run rollback
rollback();
