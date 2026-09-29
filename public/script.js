const API = '/api';
let cart = []; // { product_id, name, price, quantity }
let allProducts = []; // все товары, храним чтобы фильтровать без повторных запросов к серверу
let activeCategory = 'all';
let searchQuery = '';
let sortOrder = 'default';

// ===== Загрузка и показ товаров =====
async function loadProducts() {
  const res = await fetch(`${API}/products`);
  const products = await res.json();
  allProducts = products.filter(p => p.in_stock);

  renderCategoryFilters();
  renderProducts();
}

const CATEGORIES = ["Все", "Солнцезащитные", "Для зрения", "Мужские", "Женские", "Хиты"];

function renderCategoryFilters() {
  const container = document.getElementById('category-filters');

  let buttonsHtml = '';
  CATEGORIES.forEach(cat => {
    const value = cat === 'Все' ? 'all' : cat;
    buttonsHtml += `<button class="filter-btn ${activeCategory === value ? 'active' : ''}" onclick="setCategory('${value.replace(/'/g, "\\'")}')">${cat}</button>`;
  });

  container.innerHTML = buttonsHtml;
}

function setCategory(cat) {
  activeCategory = cat;
  renderCategoryFilters();
  renderProducts();
}

function showCatalog(cat) {
  setCategory(cat);
  document.getElementById('home-screen').classList.add('hidden');
  document.getElementById('catalog-screen').classList.remove('hidden');
  document.getElementById('site-footer').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function showHome() {
  document.getElementById('catalog-screen').classList.add('hidden');
  document.getElementById('home-screen').classList.remove('hidden');
  document.getElementById('site-footer').classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

async function showProductDetail(id) {
  const res = await fetch(`${API}/products/${id}`);
  const product = await res.json();
  if (!product || product.error) return;

  const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="500" height="500"%3E%3Crect width="500" height="500" fill="%23F1ECE1"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="28" fill="%23999" text-anchor="middle" dy=".3em"%3E%D0%9E%D1%87%D0%BA%D0%B8%3C/text%3E%3C/svg%3E';

  const gallery = [];
  if (product.image_url) gallery.push(product.image_url);
  (product.images || []).forEach(img => {
    if (!gallery.includes(img.image_url)) gallery.push(img.image_url);
  });
  if (gallery.length === 0) gallery.push(placeholder);

  const thumbsHtml = gallery.length > 1
    ? `<div class="product-gallery-thumbs">${gallery.map((url, i) =>
        `<img src="${url}" class="gallery-thumb ${i === 0 ? 'active' : ''}" onclick="setMainPhoto(this, '${url.replace(/'/g, "\\'")}')">`
      ).join('')}</div>`
    : '';

  const safeName = product.name.replace(/'/g, "\\'");
  const detail = document.getElementById('product-detail');
  detail.innerHTML = `
    <div>
      <div class="product-detail-photo">
        <img id="product-main-photo" src="${gallery[0]}" alt="${product.name}">
      </div>
      ${thumbsHtml}
    </div>
    <div class="product-detail-info">
      <h1>${product.name}</h1>
      <div class="product-detail-category">${product.category || ''}</div>
      <div class="product-detail-price">${product.price} ₽</div>
      <div class="product-detail-description">${product.description || 'Описание пока не добавлено.'}</div>
      <div class="product-detail-actions">
        <button class="btn-cart" onclick="addToCart(${product.id}, '${safeName}', ${product.price})">В корзину</button>
        <button class="btn-quick" onclick="openQuickOrder(${product.id}, '${safeName}', ${product.price})">В 1 клик</button>
      </div>
    </div>
  `;

  document.getElementById('catalog-screen').classList.add('hidden');
  document.getElementById('product-screen').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function setMainPhoto(thumbEl, url) {
  document.getElementById('product-main-photo').src = url;
  document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
  thumbEl.classList.add('active');
}

function backToCatalog() {
  document.getElementById('product-screen').classList.add('hidden');
  document.getElementById('catalog-screen').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '';

      let filtered = activeCategory === 'all'
    ? allProducts
    : activeCategory === 'Хиты'
      ? allProducts.filter(p => p.is_hit)
      : allProducts.filter(p => p.category === activeCategory);

  if (searchQuery.trim() !== '') {
    const q = searchQuery.trim().toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
  }

    if (sortOrder === 'price_asc') {
    filtered = [...filtered].sort((a, b) => a.price - b.price);
  } else if (sortOrder === 'price_desc') {
    filtered = [...filtered].sort((a, b) => b.price - a.price);
  } else if (sortOrder === 'popularity') {
    filtered = [...filtered].sort((a, b) => (b.is_hit || 0) - (a.is_hit || 0));
  }

  document.getElementById('products-count').textContent =
    filtered.length + ' ' + pluralizeGlasses(filtered.length);

  if (filtered.length === 0) {
    grid.innerHTML = '<p>В этой категории пока нет товаров</p>';
    return;
  }

  filtered.forEach((p, index) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    const safeName = p.name.replace(/'/g, "\\'");
        card.innerHTML = `
      <div class="product-photo" onclick="showProductDetail(${p.id})" style="cursor:pointer">
        ${p.is_hit ? '<span class="badge-hit">ХИТ</span>' : ''}
        <img src="${p.image_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="240" height="240"%3E%3Crect width="240" height="240" fill="%23F1ECE1"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="18" fill="%23999" text-anchor="middle" dy=".3em"%3E%D0%9E%D1%87%D0%BA%D0%B8%3C/text%3E%3C/svg%3E'}" alt="${p.name}">
      </div>
      <div class="product-card-body">
        <h3 onclick="showProductDetail(${p.id})" style="cursor:pointer">${p.name}</h3>
        <div class="product-category">${p.category || ''}</div>
        <div class="product-price">${p.price} ₽</div>
        <div class="actions-row">
          <button class="btn-cart" onclick="addToCart(${p.id}, '${safeName}', ${p.price})">В корзину</button>
          <button class="btn-quick" onclick="openQuickOrder(${p.id}, '${safeName}', ${p.price})">В 1 клик</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function pluralizeGlasses(n) {
  const lastTwo = n % 100;
  const last = n % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return 'моделей';
  if (last === 1) return 'модель';
  if (last >= 2 && last <= 4) return 'модели';
  return 'моделей';
}

// ===== Корзина =====
function addToCart(id, name, price) {
  const existing = cart.find(i => i.product_id === id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ product_id: id, name, price, quantity: 1 });
  }
  updateCartUI();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.product_id !== id);
  updateCartUI();
}

function updateCartUI() {
  document.getElementById('cart-count').textContent = cart.reduce((sum, i) => sum + i.quantity, 0);

  const itemsDiv = document.getElementById('cart-items');
  itemsDiv.innerHTML = '';
  let total = 0;

  cart.forEach(i => {
    total += i.price * i.quantity;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <span>${i.name} x${i.quantity} — ${i.price * i.quantity} ₽</span>
      <button onclick="removeFromCart(${i.product_id})">Убрать</button>
    `;
    itemsDiv.appendChild(div);
  });

  document.getElementById('cart-total').textContent = total;
}

// ===== Открытие / закрытие корзины =====
document.getElementById('cart-btn').addEventListener('click', () => {
  document.getElementById('cart-modal').classList.remove('hidden');
});
document.getElementById('close-cart').addEventListener('click', () => {
  document.getElementById('cart-modal').classList.add('hidden');
});

// ===== Кнопка "Контакты" =====
document.getElementById('contacts-btn').addEventListener('click', () => {
  alert('Телефон: +7 (000) 000-00-00\nEmail: info@example.com');
});

// ===== Быстрый заказ "В 1 клик" =====
let quickProduct = null;

function openQuickOrder(id, name, price) {
  quickProduct = { product_id: id };
  document.getElementById('quick-product-name').textContent = `${name} — ${price} ₽`;
  document.getElementById('quick-modal').classList.remove('hidden');
}

document.getElementById('close-quick').addEventListener('click', () => {
  document.getElementById('quick-modal').classList.add('hidden');
});

document.getElementById('quick-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!quickProduct) return;

  const order = {
    customer_name: document.getElementById('q-name').value,
    customer_phone: document.getElementById('q-phone').value,
    customer_address: '',
    items: [{ product_id: quickProduct.product_id, quantity: 1 }]
  };

  const res = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  });

  if (res.ok) {
    alert('Заказ оформлен! Спасибо.');
    e.target.reset();
    document.getElementById('quick-modal').classList.add('hidden');
    quickProduct = null;
  } else {
    alert('Ошибка при оформлении заказа');
  }
});

// ===== Оформление заказа =====
document.getElementById('checkout-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (cart.length === 0) {
    alert('Корзина пуста');
    return;
  }

  const order = {
    customer_name: document.getElementById('c-name').value,
    customer_phone: document.getElementById('c-phone').value,
    customer_address: document.getElementById('c-address').value,
    items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity }))
  };

  const res = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  });

  if (res.ok) {
    alert('Заказ оформлен! Спасибо.');
    cart = [];
    updateCartUI();
    document.getElementById('checkout-form').reset();
    document.getElementById('cart-modal').classList.add('hidden');
  } else {
    alert('Ошибка при оформлении заказа');
  }
});

// ===== Входной экран (хаб) =====
document.querySelectorAll('.hub-tile').forEach(tile => {
  tile.addEventListener('click', (e) => {
    e.preventDefault();
    showCatalog(tile.dataset.category);
  });
});

document.getElementById('hub-all-btn').addEventListener('click', () => {
  showCatalog('all');
});

document.getElementById('back-home-btn').addEventListener('click', showHome);
document.getElementById('back-catalog-btn').addEventListener('click', backToCatalog);

// ===== Поиск =====
document.getElementById('search-input').addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderProducts();
});

document.getElementById('sort-select').addEventListener('change', (e) => {
  sortOrder = e.target.value;
  renderProducts();
});

loadProducts();