-- ============================================
-- Long Hưng E-commerce Database Schema
-- PostgreSQL 15
-- ============================================

-- Drop existing tables if they exist (for fresh setup)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS product_images CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS articles CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- TABLE: users (Admin users)
-- ============================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- TABLE: categories (Product categories)
-- ============================================
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active);

-- ============================================
-- TABLE: articles (Blog posts/articles)
-- ============================================
CREATE TABLE articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  excerpt VARCHAR(500),
  author_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  featured_image VARCHAR(500),
  slug VARCHAR(255) UNIQUE NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP,
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_published ON articles(is_published);
CREATE INDEX idx_articles_author ON articles(author_id);
CREATE INDEX idx_articles_created_at ON articles(created_at);

-- ============================================
-- TABLE: products (Product catalog)
-- ============================================
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(12, 2) NOT NULL,
  stock INT DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'Chiếc',
  vat_percent INT DEFAULT 0,
  category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  image_url VARCHAR(500),
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  slug VARCHAR(255) UNIQUE NOT NULL,
  sku VARCHAR(50) UNIQUE,
  product_link VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_featured ON products(is_featured);
CREATE INDEX idx_products_sku ON products(sku);

-- ============================================
-- TABLE: product_images (Multiple images per product)
-- ============================================
CREATE TABLE product_images (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_images_product ON product_images(product_id);

-- ============================================
-- TABLE: orders (Customer orders)
-- ============================================
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  customer_address TEXT NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- ============================================
-- TABLE: order_items (Individual items in an order)
-- ============================================
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================

-- Insert sample categories
INSERT INTO categories (name, slug, description, display_order) VALUES 
('Bút Viết', 'but-viet', 'Bút các loại (bút chì, bút bi, bút gel)', 1),
('Giấy & Sổ', 'giay-va-so', 'Giấy in, sổ tay, sổ sinh viên', 2),
('Dụng Cụ Học Tập', 'dung-cu-hoc-tap', 'Thước, cây bút chì, tẩy', 3),
('Túi Xách', 'tui-xach', 'Túi học tập, cặp sách', 4),
('Khác', 'khac', 'Các sản phẩm khác', 5);

-- Insert sample products
INSERT INTO products (name, description, price, stock, unit, vat_percent, category_id, slug, sku, is_featured) VALUES 
(
  'Bút Gel Thiên Long 0.5mm',
  'Bút gel viết mượt, chống rỉ vết, có nắp bảo vệ',
  5000,
  100,
  'Chiếc',
  8,
  1,
  'but-gel-thien-long-05mm',
  'TL-GEL-005',
  TRUE
),
(
  'Sổ Tay Kẻ Ngang A4',
  'Sổ tay kẻ ngang 200 trang, bìa cứng chắc chắn',
  35000,
  50,
  'Chiếc',
  8,
  2,
  'so-tay-ke-ngang-a4',
  'NT-A4-NGANG',
  TRUE
),
(
  'Thước Kẻ 30cm Bằng Nhựa',
  'Thước kẻ 30cm, chất liệu nhựa PVC bền đẹp',
  8000,
  150,
  'Chiếc',
  8,
  3,
  'thuoc-ke-30cm',
  'TK-30-PVC',
  FALSE
),
(
  'Cặp Sách Sinh Viên Màu Đen',
  'Cặp sách dành cho sinh viên, màu đen, khoá an toàn',
  150000,
  30,
  'Chiếc',
  8,
  4,
  'cap-sach-sinh-vien-den',
  'CS-DEN-001',
  TRUE
),
(
  'Bút Chì Staedtler HB',
  'Bút chì gỗ Staedtler độ cứng HB, tẩy đầu bút',
  3000,
  200,
  'Chiếc',
  8,
  1,
  'but-chi-staedtler-hb',
  'SD-HB-001',
  FALSE
);

-- Insert sample product images (linking to products)
INSERT INTO product_images (product_id, image_url, alt_text, display_order) VALUES 
(1, '/uploads/but-gel-thien-long-1.webp', 'Bút Gel Thiên Long góc 1', 0),
(2, '/uploads/so-tay-a4-1.webp', 'Sổ Tay A4 góc 1', 0),
(3, '/uploads/thuoc-ke-30cm-1.webp', 'Thước Kẻ 30cm', 0),
(4, '/uploads/cap-sach-den-1.webp', 'Cặp Sách Sinh Viên', 0),
(5, '/uploads/but-chi-hb-1.webp', 'Bút Chì Staedtler', 0);

-- Insert default admin user
-- Password: Admin@123456 (hash: $2b$10$2/K2Pt8jaoxLE5cT1mVW/OjEEnvrN/IsdGQUikvI/uap.MXTUmEVa)
INSERT INTO users (email, password, name, role, is_active) VALUES 
('admin@vpplonghung.com', '$2b$10$2/K2Pt8jaoxLE5cT1mVW/OjEEnvrN/IsdGQUikvI/uap.MXTUmEVa', 'Quản Trị Viên', 'admin', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Insert sample articles
INSERT INTO articles (title, content, excerpt, author_id, slug, is_published, published_at) VALUES 
(
  'Tổng Quan Về Sản Phẩm Văn Phòng Phẩm Chất Lượng Cao',
  'Chúng tôi cung cấp các sản phẩm văn phòng phẩm chất lượng cao từ các thương hiệu uy tín trên thế giới. Mỗi sản phẩm đều được kiểm tra kỹ lưỡng để đảm bảo chất lượng tốt nhất cho khách hàng.',
  'Tìm hiểu về các sản phẩm văn phòng phẩm chất lượng cao',
  1,
  'tong-quan-san-pham-van-phong-pham',
  TRUE,
  CURRENT_TIMESTAMP
),
(
  'Cách Chọn Bút Viết Phù Hợp Cho Công Việc',
  'Việc chọn bút viết phù hợp có thể ảnh hưởng đến hiệu suất công việc và sức khỏe của bạn. Bài viết này sẽ giúp bạn hiểu rõ về các loại bút khác nhau và cách chọn bút phù hợp.',
  'Hướng dẫn chọn bút viết phù hợp cho công việc',
  1,
  'cach-chon-but-viet-phu-hop',
  TRUE,
  CURRENT_TIMESTAMP
),
(
  'Mẹo Sắp Xếp Không Gian Làm Việc Hiệu Quả',
  'Một không gian làm việc gọn gàng và được sắp xếp hợp lý có thể giúp tăng năng suất làm việc. Chúng tôi chia sẻ các mẹo sắp xếp không gian làm việc một cách hiệu quả.',
  'Mẹo sắp xếp không gian làm việc để tăng năng suất',
  1,
  'meo-sap-xep-khong-gian-lam-viec',
  FALSE,
  NULL
);

-- ============================================
-- VERIFY SETUP
-- ============================================
-- Run these queries to verify setup:
-- SELECT * FROM categories;
-- SELECT * FROM products;
-- SELECT COUNT(*) FROM products;
