-- init.sql
CREATE DATABASE IF NOT EXISTS product_tool CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE product_tool;

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attributes
CREATE TABLE IF NOT EXISTS attributes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  data_type ENUM('string','number','boolean','enum','text','date') NOT NULL DEFAULT 'string',
  is_required TINYINT(1) NOT NULL DEFAULT 0,
  options_json JSON NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(255) UNIQUE,
  price DECIMAL(10,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Product attribute values (normalized)
CREATE TABLE IF NOT EXISTS product_attribute_values (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  attribute_id INT NOT NULL,
  value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (attribute_id) REFERENCES attributes(id) ON DELETE CASCADE,
  INDEX idx_prod_attr (product_id, attribute_id)
);

-- Insert initial categories: dresses and shoes
INSERT INTO categories (name, description) VALUES
  ('Dresses','Fashion dresses'),
  ('Shoes','Footwear');

-- Example attribute for smartphones (if you want to pre-add)
-- (You can add new categories and attributes later using the app)
