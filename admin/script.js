const API = '/api';

let adminPassword = '';

// ===== Экран входа =====
document.getElementById('login-btn').addEventListener('click', tryLogin);
document.getElementById('login-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') tryLogin();
});

async function tryLogin() {
  const password = document.getElementById('login-password').value;

  // Проверяем пароль тестовым запросом к заказам
  const res = await fetch(`${API}/orders`, {
    headers: { 'x-admin-password': password }
  });

  if (res.ok) {
    adminPassword = password;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-content').style.display = 'block';
    loadProducts();
  } else {
    document.getElementById('login-error').style.display = 'block';
  }
}

// ===== Переключение вкладок =====
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab + '-tab').classList.add('active');
    if (btn.dataset.tab === 'orders') loadOrders();
  });
});

// ===== Товары =====
async function loadProducts() {
  const res = await fetch(`${API}/products`);
  const products = await res.json();
  const list = document.getElementById('products-list');
  list.innerHTML = '';

  products.forEach(p => {
    const div = document.createElement('div');
    div.className = 'product-card' + (p.in_stock ? '' : ' out-of-stock');
    div.innerHTML = `
      <div class="product-info">
        <strong>${p.name}</strong> — ${p.price} ₽ (${p.category || 'без категории'})
        <br><small>${p.in_stock ? 'В наличии' : 'Нет в наличии'}</small>
      </div>
      <div class="product-actions">
        <button onclick="editProduct(${p.id})">Изменить</button>
        <button onclick="toggleStock(${p.id}, ${p.in_stock ? 0 : 1})">
          ${p.in_stock ? 'Скрыть' : 'Показать'}
        </button>
        <button class="delete-btn" onclick="deleteProduct(${p.id})">Удалить</button>
      </div>
    `;
    list.appendChild(div);
  });
}

document.getElementById('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const fileInput = document.getElementById('p-image-file');
  const files = Array.from(fileInput.files);

  // Первое фото — главное (если выбрано новое)
  if (files.length > 0) {
    const formData = new FormData();
    formData.append('photo', files[0]);

    const uploadRes = await fetch(`${API}/products/upload`, {
      method: 'POST',
      headers: { 'x-admin-password': adminPassword },
      body: formData
    });
    const uploadData = await uploadRes.json();
    document.getElementById('p-image').value = uploadData.image_url;
  }

  const product = {
    name: document.getElementById('p-name').value,
    description: document.getElementById('p-description').value,
    price: parseFloat(document.getElementById('p-price').value),
    category: document.getElementById('p-category').value,
    image_url: document.getElementById('p-image').value,
    in_stock: document.getElementById('p-instock').checked ? 1 : 0,
    is_hit: document.getElementById('p-ishit').checked ? 1 : 0
  };

  let savedProduct;

  if (editingId) {
    const res = await fetch(`${API}/products/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
      body: JSON.stringify(product)
    });
    savedProduct = await res.json();
  } else {
    const res = await fetch(`${API}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
      body: JSON.stringify(product)
    });
    savedProduct = await res.json();
  }

    // Остальные выбранные фото (кроме первого) — сразу в галерею
  if (files.length > 1) {
    const galleryFormData = new FormData();
    for (let i = 1; i < files.length; i++) {
      galleryFormData.append('photos', files[i]);
    }
    await fetch(`${API}/products/${savedProduct.id}/images`, {
      method: 'POST',
      headers: { 'x-admin-password': adminPassword },
      body: galleryFormData
    });
  }

  fileInput.value = ''; // очищаем выбор файлов, чтобы при следующем сохранении не загрузились повторно

  loadProducts();
  editProduct(savedProduct.id);
});

let editingId = null; // если не null — форма работает в режиме редактирования
let galleryProductId = null;

async function editProduct(id) {
  const res = await fetch(`${API}/products/${id}`);
  const p = await res.json();

  document.getElementById('p-name').value = p.name;
  document.getElementById('p-description').value = p.description || '';
  document.getElementById('p-price').value = p.price;
  document.getElementById('p-category').value = p.category || '';
  document.getElementById('p-image').value = p.image_url || '';
  document.getElementById('p-instock').checked = !!p.in_stock;
  document.getElementById('p-ishit').checked = !!p.is_hit;

  editingId = id;
  document.querySelector('#product-form button[type="submit"]').textContent = 'Сохранить изменения';
  document.getElementById('product-form').scrollIntoView({ behavior: 'smooth' });
  showGalleryManager(id, p.name);
}

// ===== Галерея доп. фото =====
async function showGalleryManager(id, name) {
  galleryProductId = id;
  document.getElementById('gallery-manager').style.display = 'block';
  document.getElementById('gallery-product-name').textContent = name || '';
  await loadGalleryImages();
}

async function loadGalleryImages() {
  const res = await fetch(`${API}/products/${galleryProductId}`);
  const product = await res.json();
  const container = document.getElementById('gallery-images');
  container.innerHTML = '';

  (product.images || []).forEach(img => {
    const div = document.createElement('div');
    div.className = 'gallery-thumb-wrap';
    div.innerHTML = `
      <img src="${img.image_url}" class="gallery-thumb-admin">
      <button type="button" class="gallery-remove-btn" onclick="deleteGalleryImage(${img.id})">✕</button>
    `;
    container.appendChild(div);
  });
}

document.getElementById('gallery-upload-btn').addEventListener('click', async () => {
  const input = document.getElementById('gallery-file-input');
  if (!input.files.length) return;

  const formData = new FormData();
  for (const file of input.files) {
    formData.append('photos', file);
  }

  await fetch(`${API}/products/${galleryProductId}/images`, {
    method: 'POST',
    headers: { 'x-admin-password': adminPassword },
    body: formData
  });

  input.value = '';
  loadGalleryImages();
});

async function deleteGalleryImage(imageId) {
  await fetch(`${API}/products/${galleryProductId}/images/${imageId}`, {
    method: 'DELETE',
    headers: { 'x-admin-password': adminPassword }
  });
  loadGalleryImages();
}

async function toggleStock(id, newStatus) {
  await fetch(`${API}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify({ in_stock: newStatus })
  });
  loadProducts();
}

async function deleteProduct(id) {
  if (!confirm('Удалить товар?')) return;
  const res = await fetch(`${API}/products/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-password': adminPassword }
  });

  if (!res.ok) {
    const data = await res.json();
    alert(data.error || 'Не удалось удалить товар');
    return;
  }

  loadProducts();
}

// ===== Заказы =====
let allOrders = [];

async function loadOrders() {
  const res = await fetch(`${API}/orders`, {
    headers: { 'x-admin-password': adminPassword }
  });
  allOrders = await res.json();
  renderStats();
  renderOrders();
}

function renderStats() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  const ordersToday = allOrders.filter(o => new Date(o.created_at) >= startOfToday);
  const ordersWeek = allOrders.filter(o => new Date(o.created_at) >= startOfWeek);

  const revenueOf = (orders) => orders.reduce((sum, o) => {
    return sum + o.items.reduce((s, i) => s + i.price_at_order * i.quantity, 0);
  }, 0);

  const stats = document.getElementById('orders-stats');
  stats.innerHTML = `
    <div class="stat-box">
      <div class="stat-value">${allOrders.length}</div>
      <div class="stat-label">Всего заказов</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${ordersToday.length}</div>
      <div class="stat-label">Заказов сегодня</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${ordersWeek.length}</div>
      <div class="stat-label">За 7 дней</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${revenueOf(ordersWeek)} ₽</div>
      <div class="stat-label">Выручка за 7 дней</div>
    </div>
  `;
}

function renderOrders() {
  const list = document.getElementById('orders-list');
  const search = document.getElementById('orders-search').value.trim().toLowerCase();
  const statusFilter = document.getElementById('orders-status-filter').value;
  const sortOrder = document.getElementById('orders-sort').value;

  let filtered = allOrders.filter(o => {
    const matchesSearch = search === '' ||
      o.customer_name.toLowerCase().includes(search) ||
      o.customer_phone.toLowerCase().includes(search);
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  filtered.sort((a, b) => {
    const diff = new Date(a.created_at) - new Date(b.created_at);
    return sortOrder === 'new_first' ? -diff : diff;
  });

  list.innerHTML = '';

  if (filtered.length === 0) {
    list.innerHTML = '<p>Ничего не найдено</p>';
    return;
  }

  filtered.forEach(o => {
    const itemsList = o.items.map(i => `${i.product_name} x${i.quantity}`).join(', ');
    const div = document.createElement('div');
    div.className = 'order-card';
    div.innerHTML = `
      <div>
        <strong>${o.customer_name}</strong> — ${o.customer_phone}
        <br><small>${o.customer_address || ''}</small>
        <br>Товары: ${itemsList}
        <br><small>${new Date(o.created_at).toLocaleString('ru-RU')}</small>
      </div>
      <div>
        <select onchange="updateStatus(${o.id}, this.value)">
          <option value="new" ${o.status === 'new' ? 'selected' : ''}>Новый</option>
          <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>В обработке</option>
          <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>Отправлен</option>
          <option value="done" ${o.status === 'done' ? 'selected' : ''}>Завершён</option>
        </select>
      </div>
    `;
    list.appendChild(div);
  });
}

document.getElementById('orders-search').addEventListener('input', renderOrders);
document.getElementById('orders-status-filter').addEventListener('change', renderOrders);
document.getElementById('orders-sort').addEventListener('change', renderOrders);

async function updateStatus(id, status) {
  await fetch(`${API}/orders/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify({ status })
  });
  loadOrders();
}

document.getElementById('new-product-btn').addEventListener('click', () => {
  document.getElementById('product-form').reset();
  document.getElementById('p-instock').checked = true;
  document.getElementById('p-ishit').checked = false;
  editingId = null;
  document.querySelector('#product-form button[type="submit"]').textContent = 'Добавить товар';
  document.getElementById('gallery-manager').style.display = 'none';
});

// Загружаем товары при открытии страницы
//loadProducts();