const express = require('express');
const router = express.Router();
const db = require('../db/database.js');
const { sendTelegramNotification } = require('../notify/telegram.js');
const { sendVkNotification } = require('../notify/vk.js');


function checkAdminPassword(req, res, next) {
  const password = req.headers['x-admin-password'];
  if (password !== '12345') { // тот же пароль, что и в server.js
    return res.status(401).json({ error: 'Неверный пароль' });
  }
  next();
}

// Получить все заказы (с товарами внутри каждого)
router.get('/', checkAdminPassword, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();

  const ordersWithItems = orders.map(order => {
    const items = db.prepare(`
      SELECT oi.*, p.name AS product_name, p.image_url
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
    `).all(order.id);
    return { ...order, items };
  });

  res.json(ordersWithItems);
});

// Получить один заказ
router.get('/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Заказ не найден' });
  }
  const items = db.prepare(`
    SELECT oi.*, p.name AS product_name, p.image_url
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
  `).all(order.id);

  res.json({ ...order, items });
});

// Создать новый заказ (покупатель оформляет корзину)
router.post('/', (req, res) => {
  const { customer_name, customer_phone, customer_address, items } = req.body;

  if (!customer_name || !customer_phone || !items || items.length === 0) {
    return res.status(400).json({ error: 'Не хватает данных для заказа' });
  }

  const insertOrder = db.prepare(`
    INSERT INTO orders (customer_name, customer_phone, customer_address, status)
    VALUES (?, ?, ?, 'new')
  `);
  const orderResult = insertOrder.run(customer_name, customer_phone, customer_address || '');
  const orderId = orderResult.lastInsertRowid;

  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, quantity, price_at_order)
    VALUES (?, ?, ?, ?)
  `);

  const itemsText = [];
  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
    if (product) {
      insertItem.run(orderId, item.product_id, item.quantity, product.price);
      itemsText.push(`${product.name} x${item.quantity} (${product.price} ₽)`);
    }
  }

  const message =
    `🛍 Новый заказ #${orderId}\n\n` +
    `Имя: ${customer_name}\n` +
    `Телефон: ${customer_phone}\n` +
    `Адрес: ${customer_address || 'не указан'}\n\n` +
    `Товары:\n${itemsText.join('\n')}`;

  sendTelegramNotification(message);
  sendVkNotification(message);

  res.status(201).json({ success: true, order_id: orderId });
});

// Изменить статус заказа (менеджер меняет: new -> processing -> shipped и т.д.)
router.put('/:id/status', checkAdminPassword, (req, res) => {
  const { status } = req.body;
  const id = req.params.id;

  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Заказ не найден' });
  }

  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  res.json(updated);
});

module.exports = router;