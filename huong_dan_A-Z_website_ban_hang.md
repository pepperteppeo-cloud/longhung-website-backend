# Quy Trình A-Z Xây Dựng Website Landing Page & Bán Hàng Cơ Bản

## PHẦN 1: THIẾT KẾ & KIẾN TRÚC HỆ THỐNG

### 1.1 Xác định Kiến Trúc
```
Frontend (Astro)
      ↓
API Gateway (Nginx/Cloudflare)
      ↓
Backend Server (Node.js + Express / Python + FastAPI)
      ↓
Database (PostgreSQL / MongoDB)
      ↓
File Storage (Local/Minio/S3)
```

### 1.2 Các Công Nghệ Khuyến Nghị

**Backend:**
- **Node.js + Express** (Nhanh, dễ setup)
- Hoặc **Python + FastAPI** (Mạnh mẽ, flexible)
- Hoặc **Bun + Elysia** (Hiệu suất cao)

**Database:**
- **PostgreSQL** (Recommended - tốt cho e-commerce)
- Hoặc **MongoDB** (Nếu muốn NoSQL)

**File Storage:**
- Local filesystem (Server nội bộ)
- Minio (S3 tương thích)
- AWS S3 (Nếu mở rộng)

---

## PHẦN 2: SETUP BACKEND SERVER

### 2.1 Chuẩn Bị Môi Trường

**Yêu cầu hệ thống:**
- VPS/Server (Ubuntu 20.04 hoặc CentOS 8+)
- Node.js 18+ hoặc Python 3.9+
- PostgreSQL 12+
- Nginx (reverse proxy)
- PM2 hoặc systemd (process manager)

### 2.2 Cấu Trúc Dự Án Backend

```
backend/
├── src/
│   ├── controllers/
│   │   ├── productController.js
│   │   ├── authController.js
│   │   └── uploadController.js
│   ├── routes/
│   │   ├── products.js
│   │   ├── auth.js
│   │   └── upload.js
│   ├── models/
│   │   ├── Product.js
│   │   └── User.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── upload.js
│   ├── config/
│   │   ├── database.js
│   │   └── env.js
│   ├── utils/
│   │   ├── imageProcessor.js
│   │   └── validators.js
│   └── app.js
├── .env
├── package.json
└── server.js
```

### 2.3 Cài Đặt Backend (Node.js + Express)

**Bước 1: Tạo dự án**
```bash
mkdir backend && cd backend
npm init -y
npm install express cors dotenv multer sharp postgres pg sequelize
npm install --save-dev nodemon
```

**Bước 2: Tạo file .env**
```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce_db
DB_USER=postgres
DB_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your_jwt_secret_key_here

# File Upload
UPLOAD_DIR=./public/uploads
MAX_FILE_SIZE=5242880  # 5MB

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4321,yourdomain.com
```

**Bước 3: Tạo file server.js**
```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true
}));
app.use(express.static('public'));

// Routes
app.use('/api/products', require('./src/routes/products'));
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/upload', require('./src/routes/upload'));

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
```

---

## PHẦN 3: SETUP DATABASE

### 3.1 Cài Đặt PostgreSQL

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Login
sudo -u postgres psql
```

### 3.2 Tạo Database & User

```sql
CREATE DATABASE ecommerce_db;
CREATE USER ecommerce_user WITH PASSWORD 'secure_password';
ALTER ROLE ecommerce_user SET client_encoding TO 'utf8';
GRANT ALL PRIVILEGES ON DATABASE ecommerce_db TO ecommerce_user;
\q
```

### 3.3 Tạo Schema (Bảng)

```sql
-- Bảng Users (Admin)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Products
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock INT DEFAULT 0,
  category VARCHAR(100),
  image_url VARCHAR(500),
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  slug VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Product Images (untuk nhiều ảnh)
CREATE TABLE product_images (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL,
  image_url VARCHAR(500),
  alt_text VARCHAR(255),
  display_order INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Bảng Orders
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  shipping_address TEXT,
  total_amount DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Order Items
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT,
  unit_price DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id)
);

-- Tạo indexes
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_orders_status ON orders(status);
```

---

## PHẦN 4: XÂY DỰNG API ENDPOINTS

### 4.1 Models (Sequelize ORM)

**src/models/Product.js**
```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  category: DataTypes.STRING,
  image_url: DataTypes.STRING,
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  slug: {
    type: DataTypes.STRING,
    unique: true
  }
}, {
  timestamps: true,
  underscored: true
});

module.exports = Product;
```

### 4.2 Controllers

**src/controllers/productController.js**
```javascript
const Product = require('../models/Product');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

// Get all products
exports.getProducts = async (req, res) => {
  try {
    const { category, page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    const where = { is_active: true };
    if (category) where.category = category;

    const products = await Product.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: products.rows,
      total: products.count,
      pages: Math.ceil(products.count / limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get product by slug
exports.getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const product = await Product.findOne({ where: { slug } });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create product (Admin)
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, category } = req.body;
    
    // Validate
    if (!name || !price) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and price are required' 
      });
    }

    // Create slug
    const slug = name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');

    const product = await Product.create({
      name,
      description,
      price: parseFloat(price),
      stock: parseInt(stock) || 0,
      category,
      slug,
      image_url: req.file ? `/uploads/${req.file.filename}` : null
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update product (Admin)
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock, category, is_active } = req.body;

    let updateData = { name, description, price, stock, category, is_active };

    // Update image if provided
    if (req.file) {
      updateData.image_url = `/uploads/${req.file.filename}`;
    }

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await product.update(updateData);
    
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete product (Admin)
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Delete image file
    if (product.image_url) {
      const filePath = path.join(__dirname, '../../public', product.image_url);
      await fs.unlink(filePath).catch(() => {});
    }

    await product.destroy();
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

**src/controllers/uploadController.js**
```javascript
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const uploadDir = path.join(__dirname, '../../public/uploads');
    const filename = `${Date.now()}-${req.file.originalname}`;
    const filepath = path.join(uploadDir, filename);

    // Optimize image
    await sharp(req.file.buffer)
      .resize(1200, 800, { fit: 'cover', position: 'center' })
      .webp({ quality: 80 })
      .toFile(filepath.replace(/\.[^.]*$/, '.webp'));

    res.json({
      success: true,
      filename: filename.replace(/\.[^.]*$/, '.webp'),
      url: `/uploads/${filename.replace(/\.[^.]*$/, '.webp')}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

### 4.3 Routes

**src/routes/products.js**
```javascript
const express = require('express');
const productController = require('../controllers/productController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { uploadMiddleware } = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/', productController.getProducts);
router.get('/:slug', productController.getProductBySlug);

// Admin routes
router.post('/', authMiddleware, adminMiddleware, uploadMiddleware, productController.createProduct);
router.put('/:id', authMiddleware, adminMiddleware, uploadMiddleware, productController.updateProduct);
router.delete('/:id', authMiddleware, adminMiddleware, productController.deleteProduct);

module.exports = router;
```

**src/routes/upload.js**
```javascript
const express = require('express');
const uploadController = require('../controllers/uploadController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { uploadMiddleware } = require('../middleware/upload');

const router = express.Router();

router.post('/', authMiddleware, adminMiddleware, uploadMiddleware, uploadController.uploadImage);

module.exports = router;
```

### 4.4 Middleware

**src/middleware/upload.js**
```javascript
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = './public/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage(); // Store in memory, process with sharp

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

exports.uploadMiddleware = upload.single('image');
```

**src/middleware/auth.js**
```javascript
const jwt = require('jsonwebtoken');

exports.authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

exports.adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};
```

---

## PHẦN 5: KẾT NỐI VỚI FRONTEND (ASTRO)

### 5.1 Cấu Hình Environment

**Frontend .env**
```env
PUBLIC_API_URL=http://localhost:3000
PUBLIC_API_TIMEOUT=30000
```

### 5.2 Tạo API Client

**src/utils/api.ts**
```typescript
interface FetchOptions extends RequestInit {
  timeout?: number;
}

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
const DEFAULT_TIMEOUT = import.meta.env.PUBLIC_API_TIMEOUT || 30000;

async function apiFetch(endpoint: string, options: FetchOptions = {}) {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

// Product API
export const productAPI = {
  getAll: (category?: string, page?: number) => 
    apiFetch(`/api/products${category ? `?category=${category}&page=${page || 1}` : ''}`),
  
  getBySlug: (slug: string) => 
    apiFetch(`/api/products/${slug}`),
  
  create: (data: any, token: string) =>
    apiFetch('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Authorization': `Bearer ${token}` }
    }),
  
  update: (id: number, data: any, token: string) =>
    apiFetch(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: { 'Authorization': `Bearer ${token}` }
    }),
  
  delete: (id: number, token: string) =>
    apiFetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
};

// Upload API
export const uploadAPI = {
  uploadImage: (file: File, token: string) => {
    const formData = new FormData();
    formData.append('image', file);
    
    return fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      body: formData,
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json());
  }
};
```

### 5.3 Component để Hiển Thị Sản Phẩm

**src/components/ProductList.astro**
```astro
---
import { productAPI } from '../utils/api';

const products = await productAPI.getAll();
---

<div class="products-grid">
  {products.data.map((product) => (
    <div class="product-card">
      <img src={product.image_url} alt={product.name} />
      <h3>{product.name}</h3>
      <p class="price">{product.price.toLocaleString('vi-VN')}đ</p>
      <a href={`/products/${product.slug}`}>Xem chi tiết</a>
    </div>
  ))}
</div>

<style>
  .products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
  }
  
  .product-card {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 15px;
    text-align: center;
    transition: transform 0.3s;
  }
  
  .product-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .price {
    font-size: 1.3em;
    color: #e74c3c;
    font-weight: bold;
  }
</style>
```

### 5.4 Admin Panel Component

**src/components/AdminProductForm.tsx** (React component trong Astro)
```typescript
import { useState } from 'react';
import { productAPI, uploadAPI } from '../utils/api';

export default function AdminProductForm() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    image_url: ''
  });
  
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      
      // Upload image
      const token = localStorage.getItem('admin_token');
      if (token) {
        try {
          const result = await uploadAPI.uploadImage(file, token);
          setFormData({ ...formData, image_url: result.url });
        } catch (error) {
          console.error('Upload failed:', error);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      await productAPI.create(formData, token);
      setFormData({
        name: '',
        description: '',
        price: '',
        stock: '',
        category: '',
        image_url: ''
      });
      alert('Sản phẩm tạo thành công!');
    } catch (error) {
      alert('Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      <div className="form-group">
        <label>Tên sản phẩm</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label>Mô tả</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Giá (VND)</label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Kho</label>
          <input
            type="number"
            value={formData.stock}
            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Danh mục</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        >
          <option value="">-- Chọn danh mục --</option>
          <option value="electronics">Điện tử</option>
          <option value="clothing">Quần áo</option>
          <option value="home">Nhà cửa</option>
        </select>
      </div>

      <div className="form-group">
        <label>Ảnh sản phẩm</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
        />
        {formData.image_url && (
          <img src={formData.image_url} alt="Preview" style={{ maxWidth: '200px', marginTop: '10px' }} />
        )}
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Đang tạo...' : 'Tạo sản phẩm'}
      </button>
    </form>
  );
}

<style>
  .admin-form {
    max-width: 600px;
    margin: 0 auto;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
  }

  .form-group input,
  .form-group textarea,
  .form-group select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1em;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }

  button {
    background: #3498db;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1em;
  }

  button:hover {
    background: #2980b9;
  }

  button:disabled {
    background: #bdc3c7;
    cursor: not-allowed;
  }
</style>
```

---

## PHẦN 6: DEPLOYMENT

### 6.1 Deploy Backend (Ubuntu Server)

**Bước 1: SSH vào server**
```bash
ssh user@your_server_ip
```

**Bước 2: Chuẩn bị server**
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Cài Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Cài Nginx
sudo apt-get install -y nginx

# Cài PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Cài PM2
sudo npm install -g pm2
```

**Bước 3: Setup project**
```bash
# Clone repo hoặc upload code
git clone your_repo backend
cd backend

# Cài dependencies
npm install

# Tạo .env file
nano .env
# Paste nội dung .env đã chuẩn bị

# Start application
pm2 start server.js --name "ecommerce-api"
pm2 save
pm2 startup
```

**Bước 4: Cấu hình Nginx**
```bash
sudo nano /etc/nginx/sites-available/default
```

Thêm config:
```nginx
upstream backend {
  server 127.0.0.1:3000;
}

server {
  listen 80;
  server_name yourdomain.com www.yourdomain.com;

  location /api {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  location /uploads {
    alias /home/user/backend/public/uploads;
  }

  location / {
    proxy_pass http://frontend_url;
  }
}
```

**Bước 5: SSL Certificate (Let's Encrypt)**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Bước 6: Restart Nginx**
```bash
sudo systemctl restart nginx
```

### 6.2 Deploy Frontend (Astro)

**Bước 1: Build**
```bash
npm run build
```

**Bước 2: Upload dist folder**
```bash
# Sử dụng SCP hoặc FTP
scp -r dist/ user@your_server:/home/user/frontend
```

**Bước 3: Serve với Nginx hoặc Node.js**

---

## PHẦN 7: TÍNH NĂNG BỔ SUNG

### 7.1 Xác Thực Admin (JWT)

```javascript
// src/controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ where: { email } });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

### 7.2 Carts & Orders

Thêm endpoints cho:
- POST /api/orders (tạo đơn hàng)
- GET /api/orders/:id (lấy chi tiết đơn)
- PATCH /api/orders/:id (cập nhật trạng thái)

### 7.3 Search & Filter

```javascript
exports.searchProducts = async (req, res) => {
  const { q, minPrice, maxPrice, category } = req.query;
  
  const where = { is_active: true };
  
  if (q) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${q}%` } },
      { description: { [Op.iLike]: `%${q}%` } }
    ];
  }
  
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price[Op.gte] = minPrice;
    if (maxPrice) where.price[Op.lte] = maxPrice;
  }
  
  if (category) where.category = category;
  
  const products = await Product.findAll({ where });
  res.json({ success: true, data: products });
};
```

---

## PHẦN 8: BACKUP & MAINTENANCE

### 8.1 Backup Database

```bash
# Backup
pg_dump -U postgres ecommerce_db > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres ecommerce_db < backup.sql
```

### 8.2 Monitor & Logs

```bash
# Xem PM2 logs
pm2 logs ecommerce-api

# Monitor
pm2 monit
```

### 8.3 Update Code

```bash
cd backend
git pull
npm install
pm2 restart ecommerce-api
```

---

## PHẦN 9: SECURITY BEST PRACTICES

- ✅ Sử dụng HTTPS (SSL/TLS)
- ✅ Hash password với bcrypt
- ✅ Validate input dữ liệu
- ✅ Rate limiting API
- ✅ CORS configuration
- ✅ Secure JWT secrets
- ✅ Regular backups
- ✅ Monitor server logs
- ✅ Firewall rules (UFW)

```bash
# UFW Firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## PHẦN 10: TESTING CHECKLIST

- [ ] Hiển thị tất cả sản phẩm trên homepage
- [ ] Tìm kiếm theo danh mục
- [ ] Xem chi tiết sản phẩm
- [ ] Thêm sản phẩm mới (Admin)
- [ ] Cập nhật sản phẩm (Admin)
- [ ] Xóa sản phẩm (Admin)
- [ ] Upload ảnh sản phẩm
- [ ] Tạo đơn hàng
- [ ] Kiểm tra responsive design
- [ ] Performance testing
- [ ] Security audit

---

## TỔNG KẾT

Bạn đã có đủ framework để:
1. ✅ Xây dựng backend API hoàn chỉnh
2. ✅ Quản lý database sản phẩm
3. ✅ Upload & optimize ảnh
4. ✅ Xác thực admin
5. ✅ Deploy production
6. ✅ Tích hợp với frontend Astro

**Bước tiếp theo:**
- Thêm payment gateway (Stripe, PayPal)
- Trao đổi email notifications
- Analytics & reporting
- Multi-language support
- SEO optimization
