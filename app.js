// app.js
const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Flower@123',     // set your db password
  database: process.env.DB_NAME || 'product_tool',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;
async function initDb(){
  pool = mysql.createPool(DB_CONFIG);
  // simple test
  const [rows] = await pool.query('SELECT 1 + 1 as result');
  console.log('DB connected:', rows[0].result === 2);
}

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Helper: query
async function query(sql, params){
  const [rows] = await pool.query(sql, params);
  return rows;
}

/* Categories */
app.get('/api/categories', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM categories ORDER BY id');
    res.json(rows);
  } catch(err){ console.error(err); res.status(500).json({error:err.message}); }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name, description } = req.body;
    const result = await query('INSERT INTO categories (name, description) VALUES (?, ?)', [name, description]);
    const id = result.insertId;
    const [cat] = await query('SELECT * FROM categories WHERE id = ?', [id]);
    res.json(cat);
  } catch(err){ console.error(err); res.status(500).json({error:err.message}); }
});

/* Attributes */
app.get('/api/categories/:categoryId/attributes', async (req,res) => {
  try {
    const cats = await query('SELECT * FROM attributes WHERE category_id = ? ORDER BY sort_order, id', [req.params.categoryId]);
    res.json(cats);
  } catch(err){ console.error(err); res.status(500).json({error:err.message}); }
});

app.post('/api/categories/:categoryId/attributes', async (req,res) => {
  try {
    const { name, data_type='string', is_required=false, options_json=null, sort_order=0 } = req.body;
    const category_id = req.params.categoryId;
    const result = await query(
      'INSERT INTO attributes (category_id, name, data_type, is_required, options_json, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [category_id, name, data_type, is_required ? 1 : 0, options_json ? JSON.stringify(options_json) : null, sort_order]
    );
    const id = result.insertId;
    const [attr] = await query('SELECT * FROM attributes WHERE id = ?', [id]);
    res.json(attr);
  } catch(err){ console.error(err); res.status(500).json({error:err.message}); }
});

/* Products */
app.get('/api/categories/:categoryId/products', async (req,res) => {
  try {
    const rows = await query('SELECT * FROM products WHERE category_id = ? ORDER BY id DESC', [req.params.categoryId]);
    res.json(rows);
  } catch(err){ console.error(err); res.status(500).json({error:err.message}); }
});

app.post('/api/categories/:categoryId/products', async (req,res) => {
  const conn = await pool.getConnection();
  try {
    const category_id = req.params.categoryId;
    const { name, sku, price, description, attributes } = req.body; // attributes: [{attribute_id, value}, ...]
    await conn.beginTransaction();

    const [insertRes] = await conn.query('INSERT INTO products (category_id, name, sku, price, description) VALUES (?, ?, ?, ?, ?)', [category_id, name, sku, price || 0, description || null]);
    const product_id = insertRes.insertId;

    if (Array.isArray(attributes)) {
      for (const a of attributes) {
        await conn.query('INSERT INTO product_attribute_values (product_id, attribute_id, value) VALUES (?, ?, ?)', [product_id, a.attribute_id, a.value]);
      }
    }

    await conn.commit();
    const [prod] = await conn.query('SELECT * FROM products WHERE id = ?', [product_id]);
    res.json(prod[0]);
  } catch(err){
    await conn.rollback();
    console.error(err);
    res.status(500).json({error:err.message});
  } finally {
    conn.release();
  }
});

app.get('/api/products/:productId', async (req,res) => {
  try {
    const [pRows] = await query('SELECT * FROM products WHERE id = ?', [req.params.productId]);
    if (!pRows || pRows.length === 0) return res.status(404).json({error:'Not found'});
    const product = pRows[0];
    const attrs = await query(
      `SELECT pav.*, a.name as attr_name, a.data_type 
       FROM product_attribute_values pav
       JOIN attributes a ON a.id = pav.attribute_id
       WHERE pav.product_id = ?`, [product.id]
    );
    product.attributes = attrs;
    res.json(product);
  } catch(err){ console.error(err); res.status(500).json({error:err.message}); }
});

// fallback to index.html for SPA
app.get('*', (req,res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDb().then(() => {
  app.listen(PORT, () => console.log('Server started on port', PORT));
}).catch(err => {
  console.error('DB init failed', err);
  process.exit(1);
});