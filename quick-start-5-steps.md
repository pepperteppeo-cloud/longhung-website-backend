# ⚡ QUICK START - 5 BƯỚC BẮT ĐẦU (Ngay hôm nay!)

## Bước 1️⃣: Chuẩn Bị (15 phút)

```bash
# 1. Cài Node.js 18+
# Download từ https://nodejs.org/

# 2. Cài PostgreSQL hoặc Docker
# Download từ https://www.postgresql.org/
# Hoặc: docker pull postgres:15

# 3. Tạo folder project
mkdir vpp-backend
cd vpp-backend

# 4. Khởi tạo
npm init -y

# 5. Cài dependencies
npm install express cors dotenv multer sharp sequelize pg bcryptjs jsonwebtoken
npm install --save-dev nodemon
```

---

## Bước 2️⃣: Setup Database (10 phút)

**Nếu cài PostgreSQL trực tiếp:**

```bash
# Windows: Mở pgSQL cmd, hoặc Mac/Linux:
psql -U postgres

# Gõ những dòng này:
CREATE DATABASE vpp_db;
CREATE USER vpp_user WITH PASSWORD 'vpp_pass_123';
GRANT ALL PRIVILEGES ON DATABASE vpp_db TO vpp_user;
\q
```

**HOẶC dùng Docker (nhanh hơn):**

```bash
docker run --name vpp-db \
  -e POSTGRES_PASSWORD=postgres123 \
  -e POSTGRES_DB=vpp_db \
  -p 5432:5432 \
  -d postgres:15
```

---

## Bước 3️⃣: Tạo Cấu Trúc Project (5 phút)

```bash
# Trong folder vpp-backend:

# Tạo các thư mục
mkdir -p src/{controllers,routes,models,middleware,config,utils}
mkdir -p public/uploads

# Tạo file .env
cat > .env << 'EOF'
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vpp_db
DB_USER=vpp_user
DB_PASSWORD=vpp_pass_123
JWT_SECRET=your_secret_key_here_change_in_production
CORS_ORIGIN=http://localhost:3000,http://localhost:4321,https://vpplonghung.com
EOF

# Tạo server.js
cat > server.js << 'EOF'
require('dotenv').config();
const app = require('./src/app');
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});
EOF
```

---

## Bước 4️⃣: Copy Code từ Tài Liệu (30 phút)

### Tạo `src/app.js`:

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*' }));
app.use(express.static('public'));

// Routes (sẽ thêm sau)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: err.message });
});

module.exports = app;
```

### Tạo `src/config/database.js`:

```javascript
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres'
  }
);

sequelize.authenticate()
  .then(() => console.log('✅ Database OK'))
  .catch(err => console.error('❌ DB Error:', err));

module.exports = sequelize;
```

### Tạo `src/models/Product.js`:

```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  stock: { type: DataTypes.INTEGER, defaultValue: 0 },
  image_url: DataTypes.STRING(500),
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  slug: { type: DataTypes.STRING(255), unique: true }
}, {
  tableName: 'products',
  timestamps: true,
  underscored: true
});

module.exports = Product;
```

### Tạo `src/controllers/productController.js` (công việc chính):

```javascript
const Product = require('../models/Product');
const { Op } = require('sequelize');

exports.getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 12, search } = req.query;
    const offset = (page - 1) * limit;

    const where = { is_active: true };
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
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: rows,
      total: count,
      pages: Math.ceil(count / limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({
      where: { slug: req.params.slug, is_active: true }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, price, stock, category_id } = req.body;

    if (!name || !price) {
      return res.status(400).json({ success: false, message: 'Name and price required' });
    }

    const slug = name.toLowerCase().replace(/\s+/g, '-');

    const product = await Product.create({
      name,
      price: parseFloat(price),
      stock: parseInt(stock) || 0,
      category_id,
      slug,
      image_url: req.file ? `/uploads/${req.file.filename}` : null
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    await product.update(req.body);
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    await product.destroy();
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

### Tạo `src/routes/products.js`:

```javascript
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.get('/', productController.getAllProducts);
router.get('/:slug', productController.getProductBySlug);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
```

### Update `src/app.js` - thêm route:

```javascript
// Thêm dòng này vào app.js
app.use('/api/products', require('./routes/products'));
```

---

## Bước 5️⃣: Chạy & Test (5 phút)

```bash
# Terminal 1: Chạy server
npm run dev

# Output:
# 🚀 Server chạy tại http://localhost:5000
# ✅ Database OK

# Terminal 2: Test API
curl http://localhost:5000/api/health
# Response: {"status":"OK"}

curl http://localhost:5000/api/products
# Response: {"success":true,"data":[],...}
```

---

## 🎯 NEXT STEPS

Sau khi chạy OK:

1. **Tạo bảng Database** → Copy SQL từ tài liệu chi tiết
2. **Thêm upload ảnh** → Copy `src/middleware/upload.js`
3. **Thêm auth** → Copy `src/middleware/auth.js`
4. **Tích hợp Astro** → Copy API client từ tài liệu
5. **Deploy lên VPS** → Follow hướng dẫn deployment

---

## 📋 TIMELINE

| Giai đoạn | Thời gian | Việc cần làm |
|-----------|-----------|-------------|
| Setup | 30 phút | Cài tools, tạo DB |
| Core API | 2 giờ | Tạo endpoints sản phẩm |
| Upload & Auth | 2 giờ | Upload ảnh, JWT |
| Admin Panel | 2 giờ | UI đơn giản |
| Astro Integration | 2 giờ | Component sản phẩm |
| Testing | 1 giờ | Test toàn bộ |
| Deployment | 3-4 giờ | VPS + Nginx + SSL |
| **TOTAL** | **3-4 ngày** | Live! 🎉 |

---

## ❓ CẦN GIÚP?

- **Database error?** → Check .env, PostgreSQL chạy chưa
- **Module not found?** → Chạy `npm install` lại
- **Port 5000 bị dùng?** → Thay `PORT=5001` trong .env
- **CORS error?** → Update `CORS_ORIGIN` trong .env

---

**🚀 Bắt đầu ngay! Mở terminal và gõ lệnh bước 1.**

(Tài liệu chi tiết có trong file `huong-dan-chi-tiet-backend-astro.md`)
