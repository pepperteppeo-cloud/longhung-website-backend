require('dotenv').config();
const sequelize = require('./src/config/database');

async function addProductLinkColumn() {
  try {
    console.log('🔄 Adding product_link column to products table...');
    
    // Check if column exists
    const columnExists = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'product_link'
    `);

    if (columnExists[0].length > 0) {
      console.log('✓ Column product_link already exists');
      process.exit(0);
    }

    // Add column
    await sequelize.query(`
      ALTER TABLE products 
      ADD COLUMN product_link VARCHAR(500)
    `);

    console.log('✓ Column product_link added successfully');
    
    // Verify
    const result = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'product_link'
    `);

    if (result[0].length > 0) {
      console.log('✓ Verification: Column exists with type:', result[0][0].data_type);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addProductLinkColumn();
