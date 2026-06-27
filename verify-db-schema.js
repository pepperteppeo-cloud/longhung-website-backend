/**
 * Verify database schema
 * Ensures product_link column EXISTS in products table
 */

const { Client } = require('pg');
require('dotenv').config();

async function verifySchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 
      `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Check if product_link column exists
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'product_link'
    `);

    if (result.rows.length > 0) {
      console.log('✓ product_link column exists (correct state)');
    } else {
      console.log('⚠️  product_link column does not exist - adding it...');
      
      await client.query(`ALTER TABLE products ADD COLUMN product_link VARCHAR(500)`);
      console.log('✓ Column product_link added successfully');
    }

    // Verify all products table columns
    const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products'
      ORDER BY ordinal_position
    `);

    console.log('\n✓ Current products table columns:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    process.exit(0);
  }
}

verifySchema();
