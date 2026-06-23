/**
 * Database initialization for Railway
 * Connects to Railway Postgres using DATABASE_URL and creates tables
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function initDatabaseRailway() {
  // Railway provides DATABASE_URL with full connection string
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not found');
    console.error('Please set DATABASE_URL in Railway Variables');
    process.exit(1);
  }

  console.log('📦 Connecting to Railway PostgreSQL...');
  console.log(`🔗 Using DATABASE_URL: ${databaseUrl.substring(0, 50)}...`);

  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false, // Railway requires this
    },
  });

  try {
    await client.connect();
    console.log('✓ Connected to Railway PostgreSQL successfully');

    // Read SQL file
    console.log('\n📋 Reading database schema...');
    const sqlPath = path.join(__dirname, 'database.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolon and execute each statement
    console.log('📝 Creating tables...');
    const statements = sql.split(';').filter(s => s.trim());

    let successCount = 0;
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await client.query(statement);
          successCount++;
        } catch (e) {
          // Ignore "already exists" errors - tables may already be created
          if (e.message.includes('already exists')) {
            console.log(`  ⚠️  ${e.message.split('\n')[0]}`);
          } else if (e.message.includes('does not exist')) {
            // Table references that don't exist yet - ignore
            console.log(`  ⚠️  ${e.message.split('\n')[0]}`);
          } else {
            throw e;
          }
        }
      }
    }

    console.log(`✓ Executed ${successCount} SQL statements`);

    // Insert default admin user if it doesn't exist
    console.log('\n👤 Setting up default admin user...');
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('Admin@123456', 10);

    try {
      await client.query(
        `INSERT INTO users (email, password, name, role, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (email) DO NOTHING`,
        ['admin@longhung.com', hashedPassword, 'Admin', 'admin']
      );
      console.log('✓ Default admin user created/verified');
    } catch (e) {
      console.warn('⚠️  Could not create admin user:', e.message.split('\n')[0]);
    }

    // Verify tables were created
    console.log('\n📊 Verifying database...');
    const tables = ['users', 'categories', 'products', 'articles', 'orders'];
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  ✓ ${table}: ${result.rows[0].count} rows`);
      } catch (e) {
        console.log(`  ❌ ${table}: NOT FOUND`);
      }
    }

    console.log('\n✨ Railway database initialization complete!');
    console.log('\n🚀 Next steps:');
    console.log('   1. Redeploy backend on Railway');
    console.log('   2. Login should work now!');

    await client.end();
  } catch (error) {
    console.error('\n❌ Database initialization failed:');
    console.error(error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check DATABASE_URL is set correctly in Railway Variables');
    console.error('   2. Verify SSL connection is enabled for Railway Postgres');
    console.error('   3. Check that Postgres service is running');
    process.exit(1);
  }
}

// Run
initDatabaseRailway();
