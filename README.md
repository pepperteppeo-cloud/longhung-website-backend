# Long Hưng E-Commerce Backend API

Professional-grade REST API backend for **Long Hưng** (stationery shop) built with Node.js, Express.js, and PostgreSQL.

## 📋 Quick Overview

- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **ORM**: Sequelize v6
- **Authentication**: JWT (jsonwebtoken + bcryptjs)
- **File Upload**: Multer + Sharp (auto-compress images)
- **API Documentation**: RESTful with consistent JSON responses

## 🚀 Quick Start

### 1. Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **PostgreSQL** 15+ ([Download](https://www.postgresql.org/download/)) OR **Docker**
- **npm** (comes with Node.js)

### 2. Setup Database

#### Option A: PostgreSQL Direct

```bash
# Open PostgreSQL terminal
psql -U postgres

# Create database and user
CREATE DATABASE vpp_db;
CREATE USER vpp_user WITH PASSWORD 'vpp_pass_123';
GRANT ALL PRIVILEGES ON DATABASE vpp_db TO vpp_user;
\q
```

#### Option B: Docker (Recommended)

```bash
docker run --name vpp-db \
  -e POSTGRES_PASSWORD=postgres123 \
  -e POSTGRES_DB=vpp_db \
  -p 5432:5432 \
  -d postgres:15
```

### 3. Initialize Database Schema

```bash
# From back-end directory
psql -U vpp_user -d vpp_db -f database.sql
```

Or using npm script:
```bash
npm run db:init
```

### 4. Environment Configuration

The `.env` file is pre-configured with defaults:

```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vpp_db
DB_USER=vpp_user
DB_PASSWORD=vpp_pass_123
JWT_SECRET=vpplonghung_secret_2024
CORS_ORIGIN=http://localhost:3000,http://localhost:4321,https://vpplonghung.com
```

**For production**, update these values:
- Change `JWT_SECRET` to a strong random string
- Update `DB_PASSWORD` to a secure password
- Set `NODE_ENV=production`

### 5. Start Server

**Development** (with auto-reload):
```bash
npm run dev
```

**Production**:
```bash
npm start
```

Server runs on `http://localhost:5000`

## 📚 API Endpoints

### Public Endpoints (No Authentication)

#### Health Check
```
GET /api/health
```

#### Products
```
GET    /api/products              # List all products (paginated, searchable)
GET    /api/products/:slug        # Get single product by slug
```

Query parameters for products:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 12, max: 100)
- `search` - Search in name/description
- `category` - Filter by category ID

#### Categories
```
GET    /api/categories            # List all active categories
```

#### Articles (Blog Posts)
```
GET    /api/articles              # List all published articles (paginated, searchable)
GET    /api/articles/:slug        # Get single article by slug
```

Query parameters for articles:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `search` - Search in title/content

#### Orders
```
POST   /api/orders                # Create new order (no auth required)
```

### Protected Endpoints (Admin Only - Bearer JWT Required)

#### Products Management
```
POST   /api/products              # Create product (with image upload)
PUT    /api/products/:id          # Update product (with image upload)
DELETE /api/products/:id          # Delete product
```

#### Categories Management
```
POST   /api/categories            # Create category
PUT    /api/categories/:id        # Update category
DELETE /api/categories/:id        # Delete category
```

#### Articles Management
```
GET    /api/articles/admin/list   # List all articles (including unpublished)
POST   /api/articles              # Create article (with featured image upload)
PUT    /api/articles/:id          # Update article (with featured image upload)
PATCH  /api/articles/:id/publish  # Toggle publish status
DELETE /api/articles/:id          # Delete article
```

#### Orders Management
```
GET    /api/orders                # List all orders (paginated)
GET    /api/orders/:id            # Get single order
PUT    /api/orders/:id            # Update order
PATCH  /api/orders/:id/status     # Update order status only
DELETE /api/orders/:id            # Delete order
```

#### Authentication
```
POST   /api/auth/login            # Login (returns JWT token)
GET    /api/auth/me               # Get current user profile
```

## 📝 API Examples

### Login to Get JWT Token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vpplonghung.com",
    "password": "your_password"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "email": "admin@vpplonghung.com",
      "name": "Admin",
      "role": "admin"
    }
  },
  "message": "Login successful"
}
```

### Get All Products

```bash
curl http://localhost:5000/api/products?page=1&limit=12
```

### Search Products

```bash
curl "http://localhost:5000/api/products?search=bút&category=1"
```

### Create Product (with image upload)

```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@product.jpg" \
  -F "name=Bút Gel Thiên Long" \
  -F "description=Bút viết mượt, chống rỉ vết" \
  -F "price=5000" \
  -F "stock=100" \
  -F "category_id=1"
```

### Get All Published Articles

```bash
curl http://localhost:5000/api/articles?page=1&limit=10
```

### Get Single Article

```bash
curl http://localhost:5000/api/articles/tong-quan-san-pham-van-phong-pham
```

### Create Article (with featured image)

```bash
curl -X POST http://localhost:5000/api/articles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@featured.jpg" \
  -F "title=Tổng Quan Về Sản Phẩm Văn Phòng Phẩm" \
  -F "content=Chúng tôi cung cấp các sản phẩm văn phòng phẩm chất lượng cao..." \
  -F "excerpt=Tìm hiểu về các sản phẩm văn phòng phẩm" \
  -F "is_published=true"
```

### List All Articles (Admin)

```bash
curl http://localhost:5000/api/articles/admin/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Publish/Unpublish Article

```bash
curl -X PATCH http://localhost:5000/api/articles/1/publish \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "is_published": true }'
```

### Create Order

```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Nguyễn Văn A",
    "customer_email": "customer@example.com",
    "customer_phone": "0912345678",
    "customer_address": "123 Đường ABC, TP.HCM",
    "total_amount": 500000,
    "payment_method": "bank_transfer",
    "notes": "Giao vào tối"
  }'
```

## 📂 Project Structure

```
back-end/
├── server.js                  # Entry point
├── .env                       # Environment variables
├── package.json               # Dependencies
├── database.sql               # Database schema
├── public/
│   └── uploads/               # Uploaded images (served statically)
└── src/
    ├── app.js                 # Express app setup
    ├── config/
    │   └── database.js        # Sequelize configuration
    ├── models/
    │   ├── User.js
    │   ├── Category.js
    │   ├── Product.js
    │   ├── ProductImage.js
    │   ├── Article.js
    │   └── Order.js
    ├── controllers/
    │   ├── authController.js
    │   ├── productController.js
    │   ├── categoryController.js
    │   ├── articleController.js
    │   └── orderController.js
    ├── routes/
    │   ├── auth.js
    │   ├── products.js
    │   ├── categories.js
    │   ├── articles.js
    │   └── orders.js
    ├── middleware/
    │   ├── auth.js            # JWT verification
    │   └── upload.js          # Multer + Sharp pipeline
    └── utils/
        ├── helpers.js         # Utility functions
        ├── imageProcessor.js  # Image optimization
        └── slugify.js         # URL-safe slug generator
```

## 🔐 Authentication

### JWT Flow

1. **Login**: POST `/api/auth/login` → Get JWT token
2. **Store Token**: Save in browser localStorage or session
3. **Use Token**: Add to request headers: `Authorization: Bearer TOKEN`
4. **Verify**: Middleware validates token and sets `req.user`

### Protected Routes

All admin endpoints require:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

If token is invalid or expired → **401 Unauthorized**  
If user is not admin → **403 Forbidden**

## 🖼️ Image Upload

### Automatic Optimization

- Maximum file size: **5MB**
- Allowed formats: **JPEG, PNG, WebP, GIF**
- Output format: **WebP** (modern, compressed)
- Maximum dimensions: **800x800px** (fits inside, no enlargement)
- Compression quality: **80%** (optimal balance)

### Uploaded Images

Saved to: `public/uploads/`  
Access at: `http://localhost:5000/uploads/filename.webp`

## 🗄️ Database Schema

### Tables

- **users** - Admin accounts
- **categories** - Product categories
- **products** - Product catalog
- **product_images** - Multiple images per product
- **orders** - Customer orders
- **order_items** - Items in each order *(for future expansion)*

### Key Relationships

```
Product → Category (many-to-one)
Product ← ProductImage (one-to-many)
Order ← OrderItems (one-to-many, not used yet)
```

## 📊 Response Format

All API responses follow consistent format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "total": 100,
  "pages": 5
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

## 🛠️ NPM Scripts

```bash
npm start       # Start production server
npm run dev     # Start with nodemon (development)
npm run db:init # Initialize database from SQL file
npm list        # Show installed dependencies
```

## 🔍 Debugging

### Enable Verbose Logging

In production, errors stack traces are hidden. To debug:

```env
NODE_ENV=development
```

Then errors include full stack traces.

### Check Logs

The server logs all requests and errors to console. Look for:
- `✅` - Database connected successfully
- `❌` - Errors in bold red
- `🚀` - Server startup info

## 🚢 Deployment Checklist

Before going live:

- [ ] Update `.env` with production values
- [ ] Change `JWT_SECRET` to random strong string
- [ ] Set `NODE_ENV=production`
- [ ] Update `CORS_ORIGIN` to production domains only
- [ ] Use PM2 or Docker to manage process
- [ ] Setup PostgreSQL with proper backups
- [ ] Enable HTTPS (via Nginx or Cloudflare)
- [ ] Configure environment variables on server
- [ ] Test all endpoints on staging
- [ ] Monitor logs and performance

## 📞 Support & Issues

### Common Issues

**Cannot connect to database**
- Check PostgreSQL is running
- Verify credentials in `.env`
- Ensure database and user exist
- Check firewall/port 5432

**Port 5000 already in use**
- Change `PORT` in `.env`
- Or kill process: `lsof -ti:5000 | xargs kill -9`

**JWT token expired**
- Get new token via login endpoint
- Token expires in 7 days (configurable)

**Image upload fails**
- Check file size < 5MB
- Ensure file format is jpg/png/webp/gif
- Verify `public/uploads/` directory exists

## 📄 License

MIT License - Built for Long Hưng

---

**Last Updated**: 2026-06-23  
**Version**: 1.0.0
#   l o n g h u n g - w e b s i t e - b a c k e n d  
 