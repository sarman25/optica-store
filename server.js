const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db/database.js');
const productsRouter = require('./routes/products.js');
const ordersRouter = require('./routes/orders.js');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = '12345';
function checkAdminPassword(req, res, next) {
  const password = req.headers['x-admin-password'];
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Неверный пароль' });
  }
  next();
}

app.use(cors());
app.use(express.json());
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Отдаём сайт для покупателей
app.use('/', express.static(path.join(__dirname, 'public')));

// Отдаём панель менеджера
app.use('/admin', express.static(path.join(__dirname, 'admin')));

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
  console.log(`Панель менеджера: http://localhost:${PORT}/admin`);
});