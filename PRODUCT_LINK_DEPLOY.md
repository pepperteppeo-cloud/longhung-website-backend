## Deploy Product Link Feature

### Backend Changes
- ✅ Model: Added `product_link` field to Product
- ✅ API: Updated POST/PUT handlers to accept `product_link`, `order_url`, `product_url`
- ✅ Migration: Created `migrations/001_add_product_link.js`

### How to Apply Migration

**Option 1: Run Migration Script (Recommended)**
```bash
cd back-end
npm install  # if needed
node migrations/001_add_product_link.js
```

The script will:
1. Connect to your DATABASE_URL
2. Check if column already exists
3. Add `product_link` column if needed
4. Verify the change

**Option 2: Manual SQL (if above fails)**
```sql
ALTER TABLE products 
ADD COLUMN product_link VARCHAR(500);
```

### After Migration
1. Backend will auto-detect new column via Sequelize
2. Create/Update product endpoints will accept `product_link`
3. API responses will include `product_link` field
4. Frontend dashboard can now save custom order links

### Test
After migration, edit a product in dashboard:
1. Set "Product link / Order link" field
2. Click Save
3. Check Network tab - PUT request should include `product_link`
4. Response should include `product_link` field
5. Reload page to verify it persists
