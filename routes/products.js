const express = require('express');
const router = express.Router();
const db = require('../db/database.js');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });
const uploadMultiple = multer({ storage }).array('photos', 8);


function checkAdminPassword(req, res, next) {
  const password = req.headers['x-admin-password'];
  if (password !== '12345') { // тот же пароль, что и в server.js
    return res.status(401).json({ error: 'Неверный пароль' });
  }
  next();
}

// Получить все товары
router.get('/', (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
  res.json(products);
});

// Получить один товар по id (вместе с галереей доп. фото)
router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  const images = db.prepare('SELECT id, image_url FROM product_images WHERE product_id = ? ORDER BY id').all(product.id);
  res.json({ ...product, images });
});

// Загрузить несколько доп. фото для товара
router.post('/:id/images', checkAdminPassword, uploadMultiple, (req, res) => {
  const productId = req.params.id;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Файлы не загружены' });
  }

  const insert = db.prepare('INSERT INTO product_images (product_id, image_url) VALUES (?, ?)');
  const inserted = [];
  for (const file of req.files) {
    const url = '/uploads/' + file.filename;
    const result = insert.run(productId, url);
    inserted.push({ id: result.lastInsertRowid, image_url: url });
  }
  res.status(201).json(inserted);
});

// Удалить одно доп. фото
router.delete('/:id/images/:imageId', checkAdminPassword, (req, res) => {
  const existing = db.prepare('SELECT * FROM product_images WHERE id = ? AND product_id = ?')
    .get(req.params.imageId, req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Фото не найдено' });
  }
  db.prepare('DELETE FROM product_images WHERE id = ?').run(req.params.imageId);
  res.json({ success: true });
});

// Загрузить фото товара
router.post('/upload', checkAdminPassword, upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен' });
  }
  res.json({ image_url: '/uploads/' + req.file.filename });
});

// Создать новый товар
router.post('/', checkAdminPassword, (req, res) => {
  const { name, description, price, category, image_url, in_stock, is_hit } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: 'Название и цена обязательны' });
  }

  const stmt = db.prepare(`
    INSERT INTO products (name, description, price, category, image_url, in_stock, is_hit)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(name, description || '', price, category || '', image_url || '', in_stock ?? 1, is_hit ?? 0);

  const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newProduct);
});

// Обновить товар
router.put('/:id', checkAdminPassword, (req, res) => {
  const { name, description, price, category, image_url, in_stock, is_hit } = req.body;
  const id = req.params.id;

  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Товар не найден' });
  }

  db.prepare(`
    UPDATE products
    SET name = ?, description = ?, price = ?, category = ?, image_url = ?, in_stock = ?, is_hit = ?
    WHERE id = ?
  `).run(
    name ?? existing.name,
    description ?? existing.description,
    price ?? existing.price,
    category ?? existing.category,
    image_url ?? existing.image_url,
    in_stock ?? existing.in_stock,
    is_hit ?? existing.is_hit,
    id
  );

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.json(updated);
});

// Удалить товар
router.delete('/:id', checkAdminPassword, (req, res) => {
  const id = req.params.id;
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Товар не найден' });
  }

  const hasOrders = db.prepare('SELECT COUNT(*) AS count FROM order_items WHERE product_id = ?').get(id);
  if (hasOrders.count > 0) {
    return res.status(409).json({
      error: 'У этого товара уже есть заказы, поэтому его нельзя удалить полностью — историю заказов нужно сохранить. Вместо удаления используйте кнопку "Скрыть".'
    });
  }

  // Сначала удаляем связанные доп. фото, иначе база не даст удалить сам товар
  db.prepare('DELETE FROM product_images WHERE product_id = ?').run(id);

  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  res.json({ success: true });
});

module.exports = router;