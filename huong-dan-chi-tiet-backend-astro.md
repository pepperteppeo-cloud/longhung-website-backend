# 📘 HƯỚNG DẪN CHI TIẾT TỪNG BƯỚC
## Xây Dựng Backend Bán Hàng + Upload Ảnh + AI Chatbot
### Dành cho Website Văn Phòng Phẩm Long Hưng (Astro Frontend)

---

## 📌 TỔNG QUAN CÓ GÌ

Sau hướng dẫn này, bạn sẽ có:

✅ **Backend API** quản lý sản phẩm (CRUD)  
✅ **Upload ảnh** với tối ưu hóa tự động  
✅ **Quản lý đơn hàng** từ admin panel  
✅ **Tích hợp với Astro** frontend hiện tại  
✅ **AI Chatbot** hỗ trợ khách hàng (sẵn sàng thêm sau)  
✅ **Deployment chi phí thấp** (VPS 100k/tháng)  

**Thời gian:** ~3-4 ngày để hoàn thiện

---

## 🚀 PHẦN 1: CHUẨN BỊ MÔI TRƯỜNG (0.5 ngày)

### 1.1 Máy tính của bạn - Cài đặt tools cần thiết

**Windows/Mac/Linux:**

```bash
# 1. Cài Node.js 18+ (https://nodejs.org/)
node --version  # Kiểm tra v18+

# 2. Cài PostgreSQL (https://www.postgresql.org/download/)
# Hoặc dùng Docker (dễ hơn)
docker --version

# 3. Cài Git
git --version

# 4. Text editor: VS Code (https://code.visualstudio.com/)

# 5. Postman để test API (https://www.postman.com/downloads/)
```

**Nếu chưa có experience dùng Docker, cài PostgreSQL trực tiếp là đơn giản hơn.**

### 1.2 Tạo folder project

```bash
# Mở Terminal/Command Prompt

# Tạo folder
mkdir vpp-backend
cd vpp-backend

# Khởi tạo Node.js project
npm init -y
```

### 1.3 Cài dependencies cần thiết

```bash
# Paste lệnh này vào terminal:
npm install express cors dotenv multer sharp sequelize pg bcryptjs jsonwebtoken
npm install --save-dev nodemon
```

**Giải thích:**
- `express` - framework backend
- `cors` - cho phép tính hợp từ Astro
- `dotenv` - quản lý biến môi trường
- `multer` - xử lý upload file
- `sharp` - tối ưu ảnh (giảm kích thước 80%)
- `sequelize` - ORM (làm việc với database dễ hơn)
- `pg` - driver PostgreSQL
- `bcryptjs` - mã hóa password
- `jsonwebtoken` - JWT authentication
- `nodemon` - tự động restart server khi code thay đổi

---

## 🗄️ PHẦN 2: SETUP DATABASE (0.5 ngày)

### 2.1 Cài PostgreSQL (Tùy chọn A - Cài trực tiếp)

**Windows:**
1. Download từ https://www.postgresql.org/download/windows/
2. Chạy installer, set password = `postgres123`
3. Cài port `5432`
4. Finish

**Mac (dùng Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2.2 Cài PostgreSQL (Tùy chọn B - Dùng Docker - Nhanh hơn)

```bash
# Cài Docker từ https://www.docker.com/

# Chạy PostgreSQL trong Docker
docker run --name vpp-postgres \
  -e POSTGRES_PASSWORD=postgres123 \
  -e POSTGRES_DB=vpp_db \
  -p 5432:5432 \
  -d postgres:15

# Kiểm tra container chạy OK
docker ps
```

**Container sẽ tự start lại khi reboot máy.**

### 2.3 Tạo Database & User

**Dùng pgAdmin (GUI - dễ nhất):**

```bash
# 1. Download pgAdmin từ https://www.pgadmin.org/download/
# 2. Mở http://localhost:5050
# 3. Login (email: pgadmin4@pgadmin.org, password: admin)
# 4. Right-click "Databases" → Create → Database
#    Name: vpp_db
# 5. Done!
```

**HOẶC dùng Terminal:**

```bash
# Mac/Linux
psql -U postgres

# Windows (mở pgSQL cmd)
psql -U postgres

# Sau đó gõ:
CREATE DATABASE vpp_db;
CREATE USER vpp_user WITH PASSWORD 'vpp_pass_123';
GRANT ALL PRIVILEGES ON DATABASE vpp_db TO vpp_user;
\q
```

### 2.4 Tạo bảng (Schema)

Tạo file `database.sql` trong folder `vpp-backend`:

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

-- Bảng Categories (Danh mục sản phẩm)
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Products (Sản phẩm)
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(12, 2) NOT NULL,
  stock INT DEFAULT 0,
  category_id INT REFERENCES categories(id),
  image_url VARCHAR(500),
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  slug VARCHAR(255) UNIQUE,
  sku VARCHAR(50) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng ProductImages (Nhiều ảnh cho 1 sản phẩm)
CREATE TABLE product_images (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Orders (Đơn hàng)
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_address TEXT,
  total_amount DECIMAL(12, 2),
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng OrderItems (Chi tiết đơn hàng)
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id),
  quantity INT NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo indexes để tối ưu tìm kiếm
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_email ON orders(customer_email);

-- Thêm user admin test
INSERT INTO users (email, password, name, role) VALUES 
('admin@vpplonghung.com', '$2b$10$...', 'Admin VPP', 'admin');
-- Password sẽ hash bằng bcryptjs từ code
```

**Chạy SQL này:**

```bash
# Terminal
psql -U vpp_user -d vpp_db -f database.sql

# Hoặc dùng pgAdmin: copy-paste và execute
```

---

## 📁 PHẦN 3: CẤU TRÚC PROJECT (0.5 ngày)

### 3.1 Tạo thư mục & files

```bash
cd vpp-backend

# Tạo structure
mkdir -p src/{controllers,routes,models,middleware,config,utils}
mkdir -p public/uploads
mkdir -p logs

# Tạo files cơ bản
touch .env
touch .gitignore
touch server.js
touch src/app.js
```

### 3.2 File .env (Cấu hình)

Tạo `.env` trong folder gốc:

```env
# ============= SERVER =============
PORT=5000
NODE_ENV=development

# ============= DATABASE =============
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vpp_db
DB_USER=vpp_user
DB_PASSWORD=vpp_pass_123

# ============= JWT =============
JWT_SECRET=your_super_secret_jwt_key_12345_change_in_production
JWT_EXPIRE=7d

# ============= FILE UPLOAD =============
UPLOAD_DIR=./public/uploads
MAX_FILE_SIZE=5242880
ALLOWED_EXTENSIONS=jpg,jpeg,png,webp,gif

# ============= CORS =============
CORS_ORIGIN=http://localhost:3000,http://localhost:4321,https://vpplonghung.com,https://www.vpplonghung.com

# ============= EMAIL (Optional - sau này) =============
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# ============= ADMIN =============
ADMIN_EMAIL=admin@vpplonghung.com
ADMIN_PASSWORD=Change_Me_123
```

### 3.3 File .gitignore

```
node_modules/
.env
.env.local
dist/
build/
.DS_Store
*.log
logs/
public/uploads/*
!public/uploads/.gitkeep
```

---

## 💻 PHẦN 4: CODE BACKEND (1 ngày)

### 4.1 File `server.js` (Entry point)

```javascript
require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Server đang chạy tại http://localhost:${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}\n`);
});
```

### 4.2 File `src/app.js` (Main app setup)

```javascript
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS - Cho phép Astro gọi API
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

// Serve static files (ảnh upload)
app.use(express.static('public'));

// ========== ROUTES ==========
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/categories', require('./routes/categories'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
```

### 4.3 File `src/config/database.js` (Kết nối Database)

```javascript
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Test kết nối
sequelize.authenticate()
  .then(() => console.log('✅ Database connected!'))
  .catch(err => console.error('❌ Database error:', err));

module.exports = sequelize;
```

### 4.4 File `src/models/Product.js` (Product Model)

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
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: DataTypes.TEXT,
  price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  category_id: DataTypes.INTEGER,
  image_url: DataTypes.STRING(500),
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  slug: {
    type: DataTypes.STRING(255),
    unique: true
  },
  sku: {
    type: DataTypes.STRING(50),
    unique: true
  }
}, {
  tableName: 'products',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Product;
```

### 4.5 File `src/models/Order.js`

```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_number: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false
  },
  customer_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  customer_email: DataTypes.STRING(255),
  customer_phone: DataTypes.STRING(20),
  customer_address: DataTypes.TEXT,
  total_amount: DataTypes.DECIMAL(12, 2),
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'pending'
    // pending, processing, shipped, delivered, cancelled
  },
  payment_method: DataTypes.STRING(50),
  notes: DataTypes.TEXT
}, {
  tableName: 'orders',
  timestamps: true,
  underscored: true
});

module.exports = Order;
```

### 4.6 File `src/middleware/auth.js` (Xác thực)

```javascript
const jwt = require('jsonwebtoken');

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    req.user = user;
    next();
  });
};

exports.adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};
```

### 4.7 File `src/middleware/upload.js` (Upload files)

```javascript
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './public/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Store files in memory (sẽ process với sharp)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, and GIF images allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 }
});

exports.uploadSingle = upload.single('image');
exports.uploadMultiple = upload.array('images', 5);
```

### 4.8 File `src/utils/imageProcessor.js` (Tối ưu ảnh)

```javascript
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = process.env.UPLOAD_DIR || './public/uploads';

exports.processProductImage = async (fileBuffer, originalName) => {
  try {
    // Tạo filename unique
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    const ext = path.extname(originalName);
    const filename = `product-${timestamp}-${random}.webp`;
    const filepath = path.join(uploadDir, filename);

    // Resize và convert to WebP (giảm 70-80% kích thước)
    await sharp(fileBuffer)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toFile(filepath);

    return {
      filename,
      url: `/uploads/${filename}`,
      path: filepath
    };
  } catch (error) {
    throw new Error(`Image processing failed: ${error.message}`);
  }
};

exports.deleteImage = async (filepath) => {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (error) {
    console.error('Delete image error:', error);
  }
};
```

### 4.9 File `src/utils/helpers.js` (Hàm helper)

```javascript
const crypto = require('crypto');

// Tạo slug từ tên sản phẩm
exports.createSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

// Tạo order number
exports.generateOrderNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `VPP-${dateStr}-${random}`;
};

// Format currency VND
exports.formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

// Validate email
exports.isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Validate phone
exports.isValidPhone = (phone) => {
  const re = /^(\+84|0)[0-9]{9,10}$/;
  return re.test(phone);
};
```

### 4.10 File `src/controllers/authController.js` (Login Admin)

```javascript
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { isValidEmail } = require('../utils/helpers');

// Mock user (sau này thay bằng database)
const mockUsers = {
  'admin@vpplonghung.com': {
    id: 1,
    email: 'admin@vpplonghung.com',
    password: '$2b$10$abcdefghijklmnopqrstuvwx', // hashed
    name: 'Admin VPP',
    role: 'admin'
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password required'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Tìm user (từ mock, sau thay bằng DB)
    const user = mockUsers[email];
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email or password incorrect'
      });
    }

    // Kiểm tra password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email or password incorrect'
      });
    }

    // Tạo JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.me = (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
};
```

### 4.11 File `src/controllers/productController.js` (Quản lý sản phẩm)

```javascript
const Product = require('../models/Product');
const { createSlug } = require('../utils/helpers');
const { processProductImage, deleteImage } = require('../utils/imageProcessor');
const path = require('path');
const { Op } = require('sequelize');

// GET: Lấy tất cả sản phẩm (public)
exports.getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      search,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    const where = { is_active: true };

    if (category) {
      where.category_id = category;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { rows, count } = await Product.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder]],
      subQuery: false
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET: Chi tiết sản phẩm (public)
exports.getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({
      where: { slug, is_active: true }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// POST: Tạo sản phẩm (Admin only)
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, category_id, sku } = req.body;

    // Validate
    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: 'Name and price are required'
      });
    }

    if (isNaN(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a positive number'
      });
    }

    // Tạo slug
    let slug = createSlug(name);
    const existingSlug = await Product.findOne({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    // Upload ảnh nếu có
    let imageUrl = null;
    if (req.file) {
      const imageData = await processProductImage(req.file.buffer, req.file.originalname);
      imageUrl = imageData.url;
    }

    // Tạo product
    const product = await Product.create({
      name,
      description: description || '',
      price: parseFloat(price),
      stock: parseInt(stock) || 0,
      category_id: category_id ? parseInt(category_id) : null,
      slug,
      sku: sku || null,
      image_url: imageUrl
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// PUT: Cập nhật sản phẩm (Admin only)
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock, category_id, sku, is_active } = req.body;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Chuẩn bị dữ liệu update
    const updateData = {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(price && { price: parseFloat(price) }),
      ...(stock !== undefined && { stock: parseInt(stock) }),
      ...(category_id !== undefined && { category_id: category_id ? parseInt(category_id) : null }),
      ...(sku && { sku }),
      ...(is_active !== undefined && { is_active })
    };

    // Update ảnh nếu có
    if (req.file) {
      const imageData = await processProductImage(req.file.buffer, req.file.originalname);
      
      // Xóa ảnh cũ
      if (product.image_url) {
        const oldPath = path.join(__dirname, '../../public', product.image_url);
        await deleteImage(oldPath);
      }
      
      updateData.image_url = imageData.url;
    }

    await product.update(updateData);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// DELETE: Xóa sản phẩm (Admin only)
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Xóa ảnh
    if (product.image_url) {
      const filepath = path.join(__dirname, '../../public', product.image_url);
      await deleteImage(filepath);
    }

    await product.destroy();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

### 4.12 File `src/controllers/orderController.js` (Quản lý đơn hàng)

```javascript
const Order = require('../models/Order');
const { generateOrderNumber, isValidEmail, isValidPhone } = require('../utils/helpers');

// GET: Tất cả đơn hàng (Admin only)
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;

    const { rows, count } = await Order.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET: Chi tiết đơn hàng (Public - cần verify email)
exports.getOrderDetails = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email required to view order details'
      });
    }

    const order = await Order.findOne({
      where: {
        order_number: orderNumber,
        customer_email: email
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// POST: Tạo đơn hàng mới
exports.createOrder = async (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
      total_amount,
      payment_method,
      items,
      notes
    } = req.body;

    // Validate
    if (!customer_name || !customer_email || !customer_phone || !customer_address) {
      return res.status(400).json({
        success: false,
        message: 'All customer info is required'
      });
    }

    if (!isValidEmail(customer_email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    if (!isValidPhone(customer_phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone format'
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }

    // Tạo order
    const orderNumber = generateOrderNumber();

    const order = await Order.create({
      order_number: orderNumber,
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
      total_amount: parseFloat(total_amount),
      payment_method: payment_method || 'pending',
      notes: notes || '',
      status: 'pending'
    });

    // TODO: Lưu order items vào database

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order_number: orderNumber,
        total_amount,
        status: 'pending'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// PATCH: Cập nhật status đơn hàng (Admin only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status'
      });
    }

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    await order.update({ status });

    res.json({
      success: true,
      message: 'Order status updated',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

### 4.13 File `src/routes/products.js` (Routes sản phẩm)

```javascript
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, adminOnly } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');

// Public routes
router.get('/', productController.getAllProducts);
router.get('/:slug', productController.getProductBySlug);

// Admin routes
router.post(
  '/',
  authenticateToken,
  adminOnly,
  uploadSingle,
  productController.createProduct
);

router.put(
  '/:id',
  authenticateToken,
  adminOnly,
  uploadSingle,
  productController.updateProduct
);

router.delete(
  '/:id',
  authenticateToken,
  adminOnly,
  productController.deleteProduct
);

module.exports = router;
```

### 4.14 File `src/routes/orders.js`

```javascript
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, adminOnly } = require('../middleware/auth');

// Public routes
router.post('/', orderController.createOrder);
router.get('/:orderNumber', orderController.getOrderDetails);

// Admin routes
router.get(
  '/',
  authenticateToken,
  adminOnly,
  orderController.getAllOrders
);

router.patch(
  '/:id/status',
  authenticateToken,
  adminOnly,
  orderController.updateOrderStatus
);

module.exports = router;
```

### 4.15 File `src/routes/auth.js`

```javascript
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/login', authController.login);
router.get('/me', authenticateToken, authController.me);

module.exports = router;
```

### 4.16 File `src/routes/categories.js` (Bonus)

```javascript
const express = require('express');
const router = express.Router();

// GET: Tất cả danh mục
router.get('/', async (req, res) => {
  try {
    // TODO: Lấy từ database
    res.json({
      success: true,
      data: [
        { id: 1, name: 'Văn phòng phẩm', slug: 'van-phong-pham' },
        { id: 2, name: 'Sách', slug: 'sach' },
        { id: 3, name: 'Dụng cụ học tập', slug: 'dung-cu-hoc-tap' }
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
```

### 4.17 Update `package.json` scripts

Thêm vào `package.json`:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test:api": "echo 'Run tests'",
    "seed": "node scripts/seed.js"
  }
}
```

---

## ✅ PHẦN 5: TEST BACKEND LOCALLY (0.5 ngày)

### 5.1 Tạo thư mục public/uploads

```bash
mkdir -p public/uploads
touch public/uploads/.gitkeep
```

### 5.2 Chạy server

```bash
cd vpp-backend

# Terminal 1: Chạy server
npm run dev

# Output sẽ như này:
# 🚀 Server đang chạy tại http://localhost:5000
# ✅ Database connected!
```

### 5.3 Test endpoints với Postman

**1. Test GET /api/products**
```
GET http://localhost:5000/api/products
```

**2. Test Login**
```
POST http://localhost:5000/api/auth/login
Body (JSON):
{
  "email": "admin@vpplonghung.com",
  "password": "your_password"
}
```

**3. Test Create Product (cần token)**
```
POST http://localhost:5000/api/products
Headers: Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data

Body:
- name: "Bút bi xanh"
- price: 5000
- stock: 100
- category_id: 1
- image: (select file)
```

**4. Test Create Order**
```
POST http://localhost:5000/api/orders
Body (JSON):
{
  "customer_name": "Nguyễn Văn A",
  "customer_email": "a@example.com",
  "customer_phone": "0912345678",
  "customer_address": "123 Đường ABC, Hà Nội",
  "total_amount": 250000,
  "items": [
    {"product_id": 1, "quantity": 5, "unit_price": 50000}
  ]
}
```

---

## 🎨 PHẦN 6: TÍCH HỢP VỚI ASTRO FRONTEND (1 ngày)

### 6.1 Tạo API client cho Astro

Tạo file `src/lib/api.ts` trong project Astro:

```typescript
const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:5000';

interface FetchOptions extends RequestInit {
  token?: string;
  timeout?: number;
}

async function apiFetch(endpoint: string, options: FetchOptions = {}) {
  const { token, timeout = 30000, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

// ========== PRODUCT API ==========
export const productAPI = {
  getAll: (page = 1, limit = 12, search?: string) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search })
    });
    return apiFetch(`/api/products?${params}`);
  },

  getBySlug: (slug: string) => apiFetch(`/api/products/${slug}`),

  create: (data: FormData, token: string) =>
    apiFetch('/api/products', {
      method: 'POST',
      body: data,
      headers: {},
      token
    }),

  update: (id: number, data: FormData, token: string) =>
    apiFetch(`/api/products/${id}`, {
      method: 'PUT',
      body: data,
      headers: {},
      token
    }),

  delete: (id: number, token: string) =>
    apiFetch(`/api/products/${id}`, {
      method: 'DELETE',
      token
    })
};

// ========== ORDER API ==========
export const orderAPI = {
  create: (data: any) =>
    apiFetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getDetails: (orderNumber: string, email: string) =>
    apiFetch(`/api/orders/${orderNumber}?email=${email}`)
};

// ========== AUTH API ==========
export const authAPI = {
  login: (email: string, password: string) =>
    apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  getMe: (token: string) =>
    apiFetch('/api/auth/me', { token })
};
```

### 6.2 Update `astro.env.d.ts`

Thêm variable môi trường:

```typescript
declare namespace App {
  interface Locals {
    user?: {
      id: number;
      email: string;
      role: string;
    };
  }
}
```

### 6.3 Tạo component `ProductCard.astro`

```astro
---
import type { Product } from '../types';

interface Props {
  product: Product;
}

const { product } = Astro.props;

// Format price
const price = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND'
}).format(product.price);
---

<div class="product-card">
  <div class="product-image">
    {product.image_url && (
      <img 
        src={product.image_url} 
        alt={product.name}
        loading="lazy"
        decoding="async"
      />
    )}
  </div>
  <div class="product-info">
    <h3 class="product-name">{product.name}</h3>
    <p class="product-price">{price}</p>
    <p class="product-stock">
      {product.stock > 0 ? `${product.stock} sản phẩm` : 'Hết hàng'}
    </p>
    <a href={`/san-pham/${product.slug}`} class="btn btn-primary">
      Xem chi tiết
    </a>
  </div>
</div>

<style>
  .product-card {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .product-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-4px);
  }

  .product-image {
    width: 100%;
    height: 200px;
    background: #f3f4f6;
    overflow: hidden;
  }

  .product-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .product-info {
    padding: 16px;
  }

  .product-name {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 8px;
    color: #1f2937;
    line-height: 1.4;
  }

  .product-price {
    font-size: 1.25rem;
    font-weight: 700;
    color: #dc2626;
    margin: 0 0 4px;
  }

  .product-stock {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0 0 12px;
  }

  .btn {
    display: inline-block;
    width: 100%;
    padding: 8px 12px;
    text-align: center;
    border-radius: 4px;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 600;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #660011;
    color: white;
  }

  .btn-primary:hover {
    background: #4a000c;
  }
</style>
```

### 6.4 Tạo page `/src/pages/san-pham/index.astro`

```astro
---
import Layout from '../../layouts/Layout.astro';
import ProductCard from '../../components/ProductCard.astro';
import { productAPI } from '../../lib/api';

const page = Astro.url.searchParams.get('page') || '1';
const search = Astro.url.searchParams.get('q') || '';

const response = await productAPI.getAll(parseInt(page), 12, search);
const { data: products, pagination } = response;
---

<Layout title="Sản phẩm - VPP Long Hưng">
  <div class="container">
    <h1>Sản phẩm của chúng tôi</h1>
    
    {search && <p>Kết quả tìm kiếm cho: "{search}"</p>}

    <div class="products-grid">
      {products.map((product: any) => (
        <ProductCard product={product} />
      ))}
    </div>

    {pagination.pages > 1 && (
      <div class="pagination">
        {[...Array(pagination.pages)].map((_, i) => (
          <a 
            href={`?page=${i + 1}${search ? `&q=${search}` : ''}`}
            class={i + 1 === parseInt(page) ? 'active' : ''}
          >
            {i + 1}
          </a>
        ))}
      </div>
    )}
  </div>
</Layout>

<style>
  .products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    margin: 32px 0;
  }

  .pagination {
    display: flex;
    gap: 8px;
    justify-content: center;
    margin-top: 32px;
  }

  .pagination a {
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    text-decoration: none;
    color: #660011;
  }

  .pagination a.active {
    background: #660011;
    color: white;
  }
</style>
```

### 6.5 Update `astro.config.mjs`

```javascript
import { defineConfig } from 'astro/config';

export default defineConfig({
  env: {
    schema: {
      PUBLIC_API_URL: envField.string({ context: 'client', access: 'public' })
    }
  }
});
```

### 6.6 Update `.env` trong Astro project

```env
PUBLIC_API_URL=http://localhost:5000
```

---

## 🚀 PHẦN 7: DEPLOYMENT (1-2 ngày)

### 7.1 Deploy Backend lên VPS (DigitalOcean / Linode / AWS)

**Bước 1: Mua VPS ($5-6/tháng)**

Recommend:
- DigitalOcean Droplet (Ubuntu 20.04, 1GB RAM, $5/mo)
- Linode (1GB, $5/mo)
- AWS t3.micro (free tier 1 năm)

**Bước 2: SSH vào server**

```bash
ssh root@your_server_ip
```

**Bước 3: Setup server**

```bash
# Update packages
apt update && apt upgrade -y

# Cài Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Cài PostgreSQL
apt install -y postgresql postgresql-contrib

# Cài Nginx
apt install -y nginx

# Cài PM2 (process manager)
npm install -g pm2
```

**Bước 4: Setup PostgreSQL**

```bash
sudo -u postgres psql

# Gõ những câu lệnh này:
CREATE DATABASE vpp_db;
CREATE USER vpp_user WITH PASSWORD 'change_this_password';
GRANT ALL PRIVILEGES ON DATABASE vpp_db TO vpp_user;
\q
```

**Bước 5: Upload code**

```bash
# Từ máy tính:
scp -r vpp-backend/ root@your_server_ip:/home/vpp-backend

# Hoặc dùng Git:
cd /home
git clone your_github_repo vpp-backend
cd vpp-backend
npm install
```

**Bước 6: Setup .env production**

```bash
nano .env
```

Paste (update với values thật):

```env
PORT=5000
NODE_ENV=production
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vpp_db
DB_USER=vpp_user
DB_PASSWORD=change_this_password
JWT_SECRET=your_super_secret_key_min_32_chars_long
CORS_ORIGIN=https://vpplonghung.com,https://www.vpplonghung.com
```

**Bước 7: Chạy ứng dụng với PM2**

```bash
cd /home/vpp-backend

# Start app
pm2 start server.js --name "vpp-api"

# Auto-restart on reboot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs vpp-api
```

**Bước 8: Setup Nginx (Reverse Proxy)**

```bash
nano /etc/nginx/sites-available/api.vpplonghung.com
```

Paste:

```nginx
upstream vpp_api {
  server 127.0.0.1:5000;
}

server {
  listen 80;
  server_name api.vpplonghung.com;

  client_max_body_size 5M;

  location / {
    proxy_pass http://vpp_api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /uploads {
    alias /home/vpp-backend/public/uploads;
    expires 30d;
    add_header Cache-Control "public, immutable";
  }
}
```

**Bước 9: Enable Nginx config**

```bash
ln -s /etc/nginx/sites-available/api.vpplonghung.com /etc/nginx/sites-enabled/

# Test
nginx -t

# Restart
systemctl restart nginx
```

**Bước 10: Setup SSL (HTTPS) với Let's Encrypt**

```bash
apt install -y certbot python3-certbot-nginx

certbot --nginx -d api.vpplonghung.com

# Chọn "Redirect" để auto redirect HTTP → HTTPS
```

**Bước 11: Test API**

```bash
# Từ máy tính
curl https://api.vpplonghung.com/api/health
# Response: {"status":"OK","timestamp":"..."}
```

### 7.2 Deploy Frontend (Astro)

**Option A: Deploy trên Vercel (Dễ nhất, free)**

```bash
# Terminal trong project Astro
npm install -g vercel
vercel

# Follow prompts
# Vercel sẽ auto-detect Astro
# Update PUBLIC_API_URL để point đến production API
```

**Option B: Deploy trên VPS tương tự**

```bash
# Từ máy tính
npm run build
scp -r dist/ root@server:/home/vpp-frontend

# Trên server, setup Nginx tương tự, point đến dist folder
```

### 7.3 Update .env production cho Astro

Tạo `.env.production`:

```env
PUBLIC_API_URL=https://api.vpplonghung.com
```

---

## 🤖 PHẦN 8: TÍCH HỢP AI CHATBOT (Optional, sau này)

### 8.1 Chuẩn bị cho Chatbot (code structure)

Tạo file `src/controllers/chatController.js`:

```javascript
// Sẵn sàng integrate với OpenAI, Anthropic, hoặc local LLM

exports.sendMessage = async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    // TODO: Gọi AI API (ví dụ OpenAI)
    // const response = await openai.createChatCompletion({
    //   model: "gpt-3.5-turbo",
    //   messages: [{ role: "user", content: message }]
    // });

    res.json({
      success: true,
      reply: "AI response sẽ ở đây"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

### 8.2 Options chatbot (chi phí)

| Option | Chi phí | Dễ dùng | Tính năng |
|--------|---------|---------|----------|
| **OpenAI** (ChatGPT) | $0.0005 per token | ⭐⭐⭐⭐⭐ | Rất mạnh |
| **Anthropic** (Claude) | $0.003 per 1K token | ⭐⭐⭐⭐⭐ | Rất mạnh |
| **Ollama** (Local LLM) | Free | ⭐⭐⭐ | Cơ bản |
| **HuggingFace** | Free tier/paid | ⭐⭐⭐⭐ | Tốt |

**Recommend:** OpenAI ChatGPT API (rẻ, mạnh, dễ integrate)

---

## 📋 ADMIN PANEL (Bonus)

### 8.3 Tạo admin panel cơ bản (HTML + JS)

Tạo `public/admin/index.html`:

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin - VPP Long Hưng</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f3f4f6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; font-weight: 600; }
    input, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
    button { background: #660011; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
    button:hover { background: #4a000c; }
    .products-table { width: 100%; background: white; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f9fafb; font-weight: 600; }
    .btn-delete { background: #dc2626; padding: 6px 12px; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Admin Panel</h1>
      <p>Quản lý sản phẩm VPP Long Hưng</p>
    </div>

    <div id="loginForm" style="max-width: 400px;">
      <h2>Đăng nhập</h2>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="email" placeholder="admin@vpplonghung.com">
      </div>
      <div class="form-group">
        <label>Mật khẩu</label>
        <input type="password" id="password">
      </div>
      <button onclick="login()">Đăng nhập</button>
    </div>

    <div id="dashboard" style="display: none;">
      <h2>Tạo sản phẩm mới</h2>
      <form id="productForm">
        <div class="form-group">
          <label>Tên sản phẩm</label>
          <input type="text" id="productName" required>
        </div>
        <div class="form-group">
          <label>Giá</label>
          <input type="number" id="productPrice" required>
        </div>
        <div class="form-group">
          <label>Kho</label>
          <input type="number" id="productStock">
        </div>
        <div class="form-group">
          <label>Ảnh</label>
          <input type="file" id="productImage" accept="image/*">
        </div>
        <button type="submit">Tạo sản phẩm</button>
      </form>

      <h2 style="margin-top: 30px;">Danh sách sản phẩm</h2>
      <div id="productsList" class="products-table"></div>
    </div>
  </div>

  <script>
    const API_URL = 'http://localhost:5000';
    let token = localStorage.getItem('admin_token');

    if (token) {
      document.getElementById('loginForm').style.display = 'none';
      document.getElementById('dashboard').style.display = 'block';
      loadProducts();
    }

    async function login() {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (data.success) {
        localStorage.setItem('admin_token', data.token);
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        loadProducts();
      } else {
        alert('❌ ' + data.message);
      }
    }

    async function loadProducts() {
      const res = await fetch(`${API_URL}/api/products?limit=100`);
      const data = await res.json();

      let html = '<table><tr><th>Tên</th><th>Giá</th><th>Kho</th><th>Hành động</th></tr>';
      data.data.forEach(p => {
        html += `<tr>
          <td>${p.name}</td>
          <td>${p.price.toLocaleString('vi-VN')}đ</td>
          <td>${p.stock}</td>
          <td>
            <button class="btn-delete" onclick="deleteProduct(${p.id})">Xóa</button>
          </td>
        </tr>`;
      });
      html += '</table>';
      document.getElementById('productsList').innerHTML = html;
    }

    document.getElementById('productForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append('name', document.getElementById('productName').value);
      formData.append('price', document.getElementById('productPrice').value);
      formData.append('stock', document.getElementById('productStock').value);

      const imageFile = document.getElementById('productImage').files[0];
      if (imageFile) formData.append('image', imageFile);

      const res = await fetch(`${API_URL}/api/products`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        alert('✅ Sản phẩm tạo thành công!');
        e.target.reset();
        loadProducts();
      } else {
        alert('❌ ' + data.message);
      }
    });

    async function deleteProduct(id) {
      if (!confirm('Chắc chắn xóa?')) return;
      const res = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Xóa thành công!');
        loadProducts();
      }
    }
  </script>
</body>
</html>
```

Truy cập: `http://localhost:5000/admin/`

---

## 💰 PHẦN 9: CHI PHÍ TỔNG CỘNG / THÁNG

| Item | Chi phí | Ghi chú |
|------|---------|--------|
| **VPS Backend** | 100k ($5) | DigitalOcean |
| **Database** | 0 | Included trong VPS |
| **Frontend Hosting** | 0 | Vercel free |
| **Email (SMTP)** | 0 | Gmail free tier |
| **SSL Certificate** | 0 | Let's Encrypt |
| **Storage Ảnh** | 0 | Local VPS |
| **CDN** (Optional) | 200k+ | Cloudflare (free tier available) |
| **Domain** | 100k/năm | Godaddy, Namecheap |
| **AI Chatbot** (Optional) | 50k/tháng | OpenAI API (nếu dùng) |
| **TOTAL** | **100k-150k/tháng** | Very affordable! |

---

## ✅ CHECKLIST HOÀN THIỆN

### Phase 1: Local Development
- [ ] Cài Node.js, PostgreSQL
- [ ] Tạo structure backend
- [ ] Setup database & tables
- [ ] Viết API endpoints
- [ ] Test với Postman
- [ ] Tích hợp với Astro

### Phase 2: Deployment
- [ ] Mua VPS
- [ ] Setup server (Node, Postgres, Nginx)
- [ ] Deploy backend code
- [ ] Setup SSL
- [ ] Test API từ production

### Phase 3: Frontend
- [ ] Update .env với production API URL
- [ ] Deploy Astro lên Vercel
- [ ] Test form order
- [ ] Optimize images

### Phase 4: Admin Panel
- [ ] Tạo admin dashboard
- [ ] Test tạo/sửa/xóa sản phẩm
- [ ] Test upload ảnh
- [ ] Test xem đơn hàng

### Phase 5: Extra
- [ ] Email notifications
- [ ] Payment integration (Stripe/PayPal)
- [ ] Analytics (Google Analytics)
- [ ] AI Chatbot

---

## 📚 TÀI NGUYÊN HƯỚNG DẪN

- **Node.js Docs:** https://nodejs.org/docs
- **PostgreSQL Docs:** https://www.postgresql.org/docs
- **Sequelize ORM:** https://sequelize.org
- **Astro Docs:** https://docs.astro.build
- **JWT Auth:** https://jwt.io

---

## ❓ FAQ & TROUBLESHOOTING

**Q: Database connection error?**
A: Check .env variables, PostgreSQL running, user permissions

**Q: CORS error từ Astro?**
A: Đảm bảo `CORS_ORIGIN` trong .env chứa domain của bạn

**Q: Upload ảnh không hoạt động?**
A: Check folder `/public/uploads` tồn tại, write permissions

**Q: PM2 app crash?**
A: `pm2 logs vpp-api` để xem error, fix, rồi `pm2 restart vpp-api`

---

## 🎉 KẾT LUẬN

Bạn vừa xây dựng xong:
✅ Production-ready backend API  
✅ Database quản lý sản phẩm  
✅ Upload & optimize ảnh  
✅ Order management  
✅ Admin authentication  
✅ Tích hợp seamless với Astro  
✅ Deployed lên VPS  
✅ HTTPS/SSL secure  
✅ Sẵn sàng thêm AI chatbot  

**Chi phí:** Chỉ 100-150k/tháng

**Time to market:** 3-4 ngày để hoàn thiện!

Good luck! 🚀
