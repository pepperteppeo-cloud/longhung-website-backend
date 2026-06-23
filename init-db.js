/**
 * Database initialization script for Long Hưng Backend
 * Creates tables and inserts sample data
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const slugify = require('./src/utils/slugify');
require('dotenv').config();

function buildPublicImageUrl(rawPath) {
  if (!rawPath) {
    return null;
  }

  const normalizedPath = String(rawPath).trim().replace(/^\/+/, '');
  if (!normalizedPath) {
    return null;
  }

  return normalizedPath.startsWith('products/') ? `/${normalizedPath}` : `/products/${normalizedPath}`;
}

async function syncFrontendCatalog(mainClient) {
  const frontendDataPath = path.resolve(__dirname, '..', 'longhung-website-dev', 'public', 'products', 'danh-sach-san-pham.txt');
  const frontendImageMapPath = path.resolve(__dirname, '..', 'longhung-website-dev', 'public', 'products', 'PRODUCT_IMAGE_MAP.json');

  if (!fs.existsSync(frontendDataPath) || !fs.existsSync(frontendImageMapPath)) {
    console.warn('⚠️ Frontend catalog files were not found, keeping SQL seed data.');
    return;
  }

  const frontendData = JSON.parse(fs.readFileSync(frontendDataPath, 'utf8'));
  const frontendImageMap = JSON.parse(fs.readFileSync(frontendImageMapPath, 'utf8'));

  const imageByStt = new Map();
  for (const entry of frontendImageMap.products || []) {
    if (!Number.isFinite(entry.stt)) {
      continue;
    }

    const imagePath = buildPublicImageUrl(entry.webpFile || entry.image);
    if (imagePath) {
      imageByStt.set(entry.stt, imagePath);
    }
  }

  await mainClient.query('TRUNCATE TABLE product_images, products, categories RESTART IDENTITY CASCADE');

  const categoryIdByKey = new Map();
  for (const [index, category] of (frontendData.categories || []).entries()) {
    const result = await mainClient.query(
      'INSERT INTO categories (name, slug, description, is_active, display_order) VALUES ($1, $2, $3, TRUE, $4) RETURNING id',
      [category.name, category.slug, null, index + 1]
    );

    categoryIdByKey.set(category.id, result.rows[0].id);
  }

  for (const product of frontendData.products || []) {
    const categoryId = categoryIdByKey.get(product.categoryId) || null;
    const publicImageUrl = imageByStt.get(product.stt) || null;
    const productSlug = `${slugify(product.name)}-${product.stt}`;
    const sku = `LH-${String(product.stt).padStart(4, '0')}`;
    const description = `${product.name} - ${product.unit} - VAT ${product.vatPercent}%`;

    const insertedProduct = await mainClient.query(
      `INSERT INTO products
        (name, description, price, stock, unit, vat_percent, category_id, image_url, is_featured, is_active, slug, sku)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, $11)
       RETURNING id`,
      [
        product.name,
        description,
        product.unitPriceVnd,
        0,
        product.unit,
        product.vatPercent,
        categoryId,
        publicImageUrl,
        product.stt <= 12,
        productSlug,
        sku
      ]
    );

    if (publicImageUrl) {
      await mainClient.query(
        'INSERT INTO product_images (product_id, image_url, alt_text, display_order) VALUES ($1, $2, $3, 0)',
        [insertedProduct.rows[0].id, publicImageUrl, product.name]
      );
    }
  }

  console.log(`✓ Synced ${frontendData.products.length} products from public/products catalog`);
}

async function initDatabase() {
  const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
  });

  try {
    // Connect to PostgreSQL
    console.log('📦 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✓ Connected successfully');

    // Create database if it doesn't exist
    console.log('\n📚 Creating database...');
    await client.query(`CREATE DATABASE ${process.env.DB_NAME} ENCODING 'UTF8'`).catch(e => {
      if (e.message.includes('already exists')) {
        console.log(`✓ Database ${process.env.DB_NAME} already exists`);
      } else {
        throw e;
      }
    });

    // Disconnect and reconnect to the new database
    await client.end();

    const mainClient = new Client({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
    });

    await mainClient.connect();
    console.log(`✓ Connected to ${process.env.DB_NAME}`);

    // Read and execute database.sql
    console.log('\n📋 Creating tables and inserting sample data...');
    const sqlPath = path.join(__dirname, 'database.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await mainClient.query(statement);
        } catch (e) {
          // Ignore "already exists" errors
          if (!e.message.includes('already exists')) {
            console.warn('⚠️ Statement error (may be expected):', e.message.split('\n')[0]);
          }
        }
      }
    }

    console.log('✓ Tables created successfully');
    console.log('✓ Sample data inserted');

    console.log('\n🔄 Syncing storefront catalog from frontend data...');
    await syncFrontendCatalog(mainClient);

    // Verify data
    console.log('\n📊 Database summary:');
    const counts = {
      users: await mainClient.query('SELECT COUNT(*) FROM users'),
      categories: await mainClient.query('SELECT COUNT(*) FROM categories'),
      products: await mainClient.query('SELECT COUNT(*) FROM products'),
      articles: await mainClient.query('SELECT COUNT(*) FROM articles'),
      orders: await mainClient.query('SELECT COUNT(*) FROM orders'),
    };

    console.log(`  Users: ${counts.users.rows[0].count}`);
    console.log(`  Categories: ${counts.categories.rows[0].count}`);
    console.log(`  Products: ${counts.products.rows[0].count}`);
    console.log(`  Articles: ${counts.articles.rows[0].count}`);
    console.log(`  Orders: ${counts.orders.rows[0].count}`);

    console.log('\n✨ Database initialization complete!');
    console.log('\n🚀 Next steps:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Backend will start on http://localhost:5000');
    console.log('   3. In another terminal, start frontend: npm run dev');

    await mainClient.end();
  } catch (error) {
    console.error('\n❌ Database initialization failed:');
    console.error(error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 PostgreSQL might not be running. Please:');
      console.error('   1. Start PostgreSQL service');
      console.error('   2. Verify connection details in .env');
      console.error('   3. Run this script again');
    }
    
    process.exit(1);
  }
}

// Run initialization
initDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
