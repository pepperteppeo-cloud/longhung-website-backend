#!/bin/bash
# Initialize database schema before starting the server

echo "🔄 Ensuring database schema is up to date..."
node add-product-link-column.js

if [ $? -eq 0 ]; then
  echo "✅ Database initialization completed successfully"
  node server.js
else
  echo "❌ Database initialization failed"
  exit 1
fi
