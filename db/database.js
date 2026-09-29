const Database = require('better-sqlite3');
const path = require('path');

// Файл базы данных появится в корне проекта как shop.db
const db = new Database(path.join(__dirname, '..', 'shop.db'));

// Таблица товаров (очков)
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT,
    image_url TEXT,
    in_stock INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Таблица заказов
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT,
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Добавляем колонку is_hit, если её ещё нет (для уже существующей базы)
try {
  db.exec(`ALTER TABLE products ADD COLUMN is_hit INTEGER DEFAULT 0`);
} catch (e) {
  // колонка уже есть — ничего страшного, пропускаем
}

// Таблица товаров внутри заказа (один заказ может содержать несколько очков)
db.exec(`
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price_at_order REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )
`);

// Таблица дополнительных фото товара (галерея)
db.exec(`
  CREATE TABLE IF NOT EXISTS product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
  )
`);

module.exports = db;