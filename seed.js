const db = require('./db/database.js');

const products = [
  {
    name: 'Aviator Classic',
    description: 'Классические авиаторы с металлической оправой и градиентными линзами.',
    price: 3200,
    category: 'Солнцезащитные',
    image_url: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?auto=format&fit=crop&w=600&q=80',
    is_hit: 1
  },
  {
    name: 'Cat Eye Retro',
    description: 'Ретро-оправа в стиле «кошачий глаз», лёгкая ацетатная основа.',
    price: 2900,
    category: 'Женские',
    image_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80',
    is_hit: 0
  },
  {
    name: 'Urban Square',
    description: 'Строгая квадратная оправа для города, матовый чёрный цвет.',
    price: 3400,
    category: 'Мужские',
    image_url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&q=80',
    is_hit: 0
  },
  {
    name: 'Round Vintage',
    description: 'Круглые линзы в тонкой оправе, лёгкий винтажный акцент.',
    price: 2700,
    category: 'Женские',
    image_url: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=600&q=80',
    is_hit: 0
  },
  {
    name: 'Wayfarer Original',
    description: 'Культовая форма вайфарер, подходит практически под любой образ.',
    price: 3600,
    category: 'Солнцезащитные',
    image_url: 'https://images.unsplash.com/photo-1584036553516-bf83210aa16c?auto=format&fit=crop&w=600&q=80',
    is_hit: 1
  },
  {
    name: 'Clubmaster Steel',
    description: 'Комбинированная оправа: акцент сверху, тонкий металл снизу.',
    price: 3900,
    category: 'Мужские',
    image_url: 'https://images.unsplash.com/photo-1610136649349-0f646f318053?auto=format&fit=crop&w=600&q=80',
    is_hit: 0
  },
  {
    name: 'Minimal Rim',
    description: 'Облегчённая оправа без оправы снизу, для ежедневной носки.',
    price: 2600,
    category: 'Для зрения',
    image_url: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=600&q=80',
    is_hit: 0
  },
  {
    name: 'Classic Optic',
    description: 'Классическая прямоугольная оправа для очков для зрения.',
    price: 4500,
    category: 'Для зрения',
    image_url: 'https://images.unsplash.com/photo-1483412468200-72182dbbc544?auto=format&fit=crop&w=600&q=80',
    is_hit: 0
  }
];

const insert = db.prepare(`
  INSERT INTO products (name, description, price, category, image_url, in_stock, is_hit)
  VALUES (?, ?, ?, ?, ?, 1, ?)
`);

products.forEach(p => {
  insert.run(p.name, p.description, p.price, p.category, p.image_url, p.is_hit);
});

console.log(`Добавлено товаров: ${products.length}`);
process.exit();