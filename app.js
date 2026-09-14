/* ============================================================
   DEVI MART — app.js
   Complete Single-Page Application
   "One Mart. Everything You Need. 💗"
   ============================================================ */

'use strict';

/* ────────────────────────────────────────────────────────────
   1. StorageService
   ──────────────────────────────────────────────────────────── */
const StorageService = {
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  },
  remove(key) {
    try { localStorage.removeItem(key); return true; }
    catch (e) { return false; }
  },
  update(key, fn) {
    try {
      const current = this.get(key);
      const updated = fn(current);
      return this.set(key, updated);
    } catch (e) { return false; }
  }
};

/* ────────────────────────────────────────────────────────────
   2. EventBus
   ──────────────────────────────────────────────────────────── */
const EventBus = (function () {
  const _handlers = {};
  return {
    on(event, handler) {
      if (!_handlers[event]) _handlers[event] = [];
      _handlers[event].push(handler);
    },
    off(event, handler) {
      if (!_handlers[event]) return;
      _handlers[event] = _handlers[event].filter(h => h !== handler);
    },
    emit(event, data) {
      if (!_handlers[event]) return;
      _handlers[event].forEach(h => { try { h(data); } catch (e) { /* ignore */ } });
    }
  };
})();

/* ────────────────────────────────────────────────────────────
   3. UUID helper
   ──────────────────────────────────────────────────────────── */
function _uuid() {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
}

/* ────────────────────────────────────────────────────────────
   4. AuthModule
   ──────────────────────────────────────────────────────────── */
const AuthModule = {
  login(email, pw, role) {
    const users = StorageService.get('dm_users') || [];
    const user = users.find(u =>
      u.email === email && u.password === pw && u.role === role
    );
    if (!user) return { ok: false, error: 'Invalid email, password, or role.' };
    if (user.status !== 'active') return { ok: false, error: 'Your account has been deactivated.' };
    const session = { userId: user.id, email: user.email, role: user.role, name: user.name };
    StorageService.set('dm_session', session);
    EventBus.emit('auth:login', session);
    return { ok: true, session };
  },
  logout() {
    StorageService.remove('dm_session');
    EventBus.emit('auth:logout', {});
  },
  getSession() {
    return StorageService.get('dm_session');
  },
  requireSession() {
    const s = this.getSession();
    if (!s) { window.location.hash = '#login'; return null; }
    return s;
  }
};

/* ────────────────────────────────────────────────────────────
   5. SeedModule
   ──────────────────────────────────────────────────────────── */
const SeedModule = {
  seed() {
    /* USERS */
    if (!StorageService.get('dm_users')) {
      StorageService.set('dm_users', [
        { id: _uuid(), name: 'Admin User',  email: 'admin@devimart.com',  password: 'admin123',  role: 'admin',  status: 'active', createdAt: new Date().toISOString() },
        { id: _uuid(), name: 'Happy Buyer', email: 'buyer@devimart.com',  password: 'buyer123',  role: 'buyer',  status: 'active', createdAt: new Date().toISOString() },
        { id: _uuid(), name: 'Best Seller', email: 'seller@devimart.com', password: 'seller123', role: 'seller', status: 'active', createdAt: new Date().toISOString() },
      ]);
    }

    /* CATEGORIES */
    if (!StorageService.get('dm_categories')) {
      StorageService.set('dm_categories', [
        { id: 'cat-01', name: 'Chocolates',              icon: '🍫' },
        { id: 'cat-02', name: 'Electronics',             icon: '📱' },
        { id: 'cat-03', name: 'Books',                   icon: '📚' },
        { id: 'cat-04', name: 'Flowers',                 icon: '🌸' },
        { id: 'cat-05', name: 'Food',                    icon: '🍔' },
        { id: 'cat-06', name: 'Plants',                  icon: '🪴' },
        { id: 'cat-07', name: 'Fashion',                 icon: '👗' },
        { id: 'cat-08', name: 'Gifts',                   icon: '🎁' },
        { id: 'cat-09', name: 'Footwear',                icon: '👟' },
        { id: 'cat-10', name: 'Beauty & Personal Care',  icon: '🧴' },
        { id: 'cat-11', name: 'Grocery',                 icon: '🛒' },
      ]);
    }

    /* PRODUCTS */
    if (!StorageService.get('dm_products')) {
      const users = StorageService.get('dm_users') || [];
      const seller = users.find(u => u.role === 'seller');
      const sid = seller ? seller.id : 'seed-seller';
      const now = new Date();
      const d = (offset) => new Date(now - offset * 86400000).toISOString();

      StorageService.set('dm_products', [
        /* Chocolates */
        { id: _uuid(), categoryId:'cat-01', sellerId:sid, name:'Cadbury Dairy Milk Silk', description:'Rich creamy milk chocolate slab, perfect for gifting.', price:299, stock:50, imageUrl:'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=400', rating:4.5, createdAt:d(1) },
        { id: _uuid(), categoryId:'cat-01', sellerId:sid, name:'Dark Chocolate Assortment', description:'70% dark cacao premium blended chocolate.', price:449, stock:30, imageUrl:'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400', rating:4.3, createdAt:d(2) },
        { id: _uuid(), categoryId:'cat-01', sellerId:sid, name:'Ferrero Rocher Box', description:'Classic hazelnut praline chocolates in a golden box.', price:599, stock:20, imageUrl:'https://images.unsplash.com/photo-1575377427642-087cf684b7af?w=400', rating:4.7, createdAt:d(3) },
        { id: _uuid(), categoryId:'cat-01', sellerId:sid, name:'White Chocolate Truffles', description:'Creamy white chocolate truffles with vanilla filling.', price:349, stock:0,  imageUrl:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', rating:4.1, createdAt:d(4) },
        /* Electronics */
        { id: _uuid(), categoryId:'cat-02', sellerId:sid, name:'Wireless Earbuds Pro', description:'ANC wireless earbuds with 30hr battery life.', price:2999, stock:15, imageUrl:'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', rating:4.6, createdAt:d(5) },
        { id: _uuid(), categoryId:'cat-02', sellerId:sid, name:'Smart Watch Series 5', description:'Health tracker with GPS and AMOLED display.', price:4999, stock:8,  imageUrl:'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', rating:4.4, createdAt:d(6) },
        { id: _uuid(), categoryId:'cat-02', sellerId:sid, name:'Portable Bluetooth Speaker', description:'360° surround sound with IPX5 water resistance.', price:1499, stock:25, imageUrl:'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400', rating:4.2, createdAt:d(7) },
        { id: _uuid(), categoryId:'cat-02', sellerId:sid, name:'USB-C Fast Charger 65W', description:'GaN technology, charges laptop + phone simultaneously.', price:899, stock:40, imageUrl:'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400', rating:4.0, createdAt:d(8) },
        /* Books */
        { id: _uuid(), categoryId:'cat-03', sellerId:sid, name:'Atomic Habits', description:'James Clear\'s bestselling guide to building good habits.', price:399, stock:60, imageUrl:'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400', rating:4.9, createdAt:d(9) },
        { id: _uuid(), categoryId:'cat-03', sellerId:sid, name:'The Alchemist', description:'Paulo Coelho\'s timeless story about following your dreams.', price:299, stock:45, imageUrl:'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400', rating:4.8, createdAt:d(10) },
        { id: _uuid(), categoryId:'cat-03', sellerId:sid, name:'Rich Dad Poor Dad', description:'Robert Kiyosaki\'s financial education classic.', price:349, stock:35, imageUrl:'https://images.unsplash.com/photo-1476275466078-4cdc1b622e01?w=400', rating:4.5, createdAt:d(11) },
        { id: _uuid(), categoryId:'cat-03', sellerId:sid, name:'Zero to One', description:'Peter Thiel on startups and building the future.', price:499, stock:20, imageUrl:'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400', rating:4.3, createdAt:d(12) },
        /* Flowers */
        { id: _uuid(), categoryId:'cat-04', sellerId:sid, name:'Red Rose Bouquet', description:'12 fresh premium red roses with ribbon wrap.', price:599, stock:10, imageUrl:'https://images.unsplash.com/photo-1490750967868-88df5691166a?w=400', rating:4.8, createdAt:d(13) },
        { id: _uuid(), categoryId:'cat-04', sellerId:sid, name:'Mixed Tulip Arrangement', description:'Colourful tulips in a hand-tied bouquet.', price:449, stock:8,  imageUrl:'https://images.unsplash.com/photo-1487530811576-3780de36508c?w=400', rating:4.6, createdAt:d(14) },
        { id: _uuid(), categoryId:'cat-04', sellerId:sid, name:'Sunflower Bunch', description:'Bright sunflowers to light up any room.', price:349, stock:15, imageUrl:'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400', rating:4.4, createdAt:d(15) },
        { id: _uuid(), categoryId:'cat-04', sellerId:sid, name:'Orchid Plant Pot', description:'Beautiful purple orchid in a decorative pot.', price:799, stock:0,  imageUrl:'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=400', rating:4.7, createdAt:d(16) },
        /* Food */
        { id: _uuid(), categoryId:'cat-05', sellerId:sid, name:'Assorted Dry Fruits Box', description:'Premium cashews, almonds, pistachios mix.', price:699, stock:30, imageUrl:'https://images.unsplash.com/photo-1599599810694-b5b37304c041?w=400', rating:4.5, createdAt:d(17) },
        { id: _uuid(), categoryId:'cat-05', sellerId:sid, name:'Homemade Cookies Tin', description:'Butter cookies baked fresh, 500g tin.', price:349, stock:20, imageUrl:'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400', rating:4.3, createdAt:d(18) },
        { id: _uuid(), categoryId:'cat-05', sellerId:sid, name:'Artisan Honey Jar', description:'Wild forest honey, cold-pressed 500ml.', price:299, stock:25, imageUrl:'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400', rating:4.6, createdAt:d(19) },
        { id: _uuid(), categoryId:'cat-05', sellerId:sid, name:'Gourmet Popcorn Set', description:'6-flavour gourmet popcorn gift set.', price:449, stock:0,  imageUrl:'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=400', rating:4.2, createdAt:d(20) },
        /* Plants */
        { id: _uuid(), categoryId:'cat-06', sellerId:sid, name:'Money Plant (Golden Pothos)', description:'Easy-care indoor plant, brings positivity.', price:199, stock:40, imageUrl:'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=400', rating:4.7, createdAt:d(21) },
        { id: _uuid(), categoryId:'cat-06', sellerId:sid, name:'Succulent Collection', description:'Set of 3 cute succulents in ceramic pots.', price:499, stock:15, imageUrl:'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400', rating:4.8, createdAt:d(22) },
        { id: _uuid(), categoryId:'cat-06', sellerId:sid, name:'Peace Lily', description:'Air-purifying peace lily in a white pot.', price:349, stock:20, imageUrl:'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400', rating:4.5, createdAt:d(23) },
        { id: _uuid(), categoryId:'cat-06', sellerId:sid, name:'Bonsai Ficus', description:'Miniature bonsai ficus, 5 years old.', price:999, stock:5,  imageUrl:'https://images.unsplash.com/photo-1509655501535-66b7f6c0b2a8?w=400', rating:4.6, createdAt:d(24) },
        /* Fashion */
        { id: _uuid(), categoryId:'cat-07', sellerId:sid, name:'Floral Kurti', description:'Cotton blend floral kurti, sizes S-XXL.', price:799, stock:30, imageUrl:'https://images.unsplash.com/photo-1594938298603-c8148c4b1e7e?w=400', rating:4.4, createdAt:d(25) },
        { id: _uuid(), categoryId:'cat-07', sellerId:sid, name:'Silk Saree (Pink)', description:'Pure silk saree with golden border.', price:2999, stock:10, imageUrl:'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400', rating:4.7, createdAt:d(26) },
        { id: _uuid(), categoryId:'cat-07', sellerId:sid, name:'Denim Jacket', description:'Classic blue denim jacket, unisex fit.', price:1499, stock:20, imageUrl:'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400', rating:4.3, createdAt:d(27) },
        { id: _uuid(), categoryId:'cat-07', sellerId:sid, name:'Embroidered Dupatta', description:'Hand-embroidered dupatta with mirror work.', price:599, stock:0,  imageUrl:'https://images.unsplash.com/photo-1583391733956-6c78276477e1?w=400', rating:4.5, createdAt:d(28) },
        /* Gifts */
        { id: _uuid(), categoryId:'cat-08', sellerId:sid, name:'Personalised Photo Frame', description:'Custom engraved wooden photo frame 5x7.', price:499, stock:25, imageUrl:'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400', rating:4.6, createdAt:d(29) },
        { id: _uuid(), categoryId:'cat-08', sellerId:sid, name:'Luxury Gift Hamper', description:'Curated hamper with chocolates, candles, and spa items.', price:1499, stock:10, imageUrl:'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400', rating:4.8, createdAt:d(30) },
        { id: _uuid(), categoryId:'cat-08', sellerId:sid, name:'Scented Candle Set', description:'Set of 3 soy wax candles, lavender & rose.', price:699, stock:30, imageUrl:'https://images.unsplash.com/photo-1602028315624-f6a01f4a9a03?w=400', rating:4.5, createdAt:d(31) },
        { id: _uuid(), categoryId:'cat-08', sellerId:sid, name:'Greeting Card Bundle', description:'10 premium handmade greeting cards.', price:249, stock:50, imageUrl:'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=400', rating:4.2, createdAt:d(32) },
        /* Footwear */
        { id: _uuid(), categoryId:'cat-09', sellerId:sid, name:'Women\'s Flats (Nude)', description:'Comfortable everyday ballet flats.', price:999, stock:20, imageUrl:'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400', rating:4.3, createdAt:d(33) },
        { id: _uuid(), categoryId:'cat-09', sellerId:sid, name:'Men\'s Sports Sneakers', description:'Lightweight running shoes with memory foam.', price:2499, stock:15, imageUrl:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', rating:4.6, createdAt:d(34) },
        { id: _uuid(), categoryId:'cat-09', sellerId:sid, name:'Kolhapuri Chappals', description:'Traditional hand-crafted leather chappals.', price:699, stock:25, imageUrl:'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400', rating:4.5, createdAt:d(35) },
        { id: _uuid(), categoryId:'cat-09', sellerId:sid, name:'Ankle Boots (Brown)', description:'Faux leather ankle boots with block heel.', price:1799, stock:0,  imageUrl:'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400', rating:4.4, createdAt:d(36) },
        /* Beauty */
        { id: _uuid(), categoryId:'cat-10', sellerId:sid, name:'Rose Face Serum', description:'Vitamin C & rose extract brightening serum 30ml.', price:899, stock:35, imageUrl:'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400', rating:4.7, createdAt:d(37) },
        { id: _uuid(), categoryId:'cat-10', sellerId:sid, name:'Lipstick Set (6 shades)', description:'Long-wearing matte lipsticks in 6 gorgeous shades.', price:799, stock:20, imageUrl:'https://images.unsplash.com/photo-1586495777744-4e6232bf2f75?w=400', rating:4.5, createdAt:d(38) },
        { id: _uuid(), categoryId:'cat-10', sellerId:sid, name:'Hair Care Combo', description:'Argan oil shampoo + conditioner + serum trio.', price:1199, stock:15, imageUrl:'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400', rating:4.4, createdAt:d(39) },
        { id: _uuid(), categoryId:'cat-10', sellerId:sid, name:'Charcoal Face Mask', description:'Deep cleansing peel-off charcoal mask 100g.', price:349, stock:0,  imageUrl:'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400', rating:4.2, createdAt:d(40) },
        /* Grocery */
        { id: _uuid(), categoryId:'cat-11', sellerId:sid, name:'Organic Basmati Rice (5kg)', description:'Premium aged basmati, naturally fragrant.', price:599, stock:50, imageUrl:'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', rating:4.6, createdAt:d(41) },
        { id: _uuid(), categoryId:'cat-11', sellerId:sid, name:'Cold-Pressed Coconut Oil', description:'Virgin coconut oil, suitable for cooking & hair.', price:299, stock:40, imageUrl:'https://images.unsplash.com/photo-1526399232581-2b43b2f9e4e8?w=400', rating:4.4, createdAt:d(42) },
        { id: _uuid(), categoryId:'cat-11', sellerId:sid, name:'Mixed Spice Dabba', description:'Traditional steel dabba with 7 fresh-ground spices.', price:399, stock:30, imageUrl:'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400', rating:4.5, createdAt:d(43) },
        { id: _uuid(), categoryId:'cat-11', sellerId:sid, name:'Green Tea Assortment', description:'25-bag assortment: jasmine, mint, tulsi & more.', price:249, stock:0,  imageUrl:'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400', rating:4.3, createdAt:d(44) },
      ]);
    }
  }
};

/* ────────────────────────────────────────────────────────────
   6. UIComponents
   ──────────────────────────────────────────────────────────── */
const UIComponents = {

  HeartIcon(filled) {
    return `<button class="heart-icon${filled ? ' filled' : ''}" aria-label="${filled ? 'Remove from wishlist' : 'Add to wishlist'}" title="${filled ? 'Remove from wishlist' : 'Add to wishlist'}">${filled ? '❤️' : '🤍'}</button>`;
  },

  StarRating(rating, interactive = false) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    let html = `<span class="stars${interactive ? ' stars-interactive' : ''}">`;
    for (let i = 0; i < full;  i++) html += `<span class="star filled">★</span>`;
    if (half)                        html += `<span class="star filled">★</span>`;
    for (let i = 0; i < empty; i++) html += `<span class="star">★</span>`;
    html += `</span>`;
    return html;
  },

  ProductCard(product, session) {
    const categories = StorageService.get('dm_categories') || [];
    const cat = categories.find(c => c.id === product.categoryId);
    const categoryName = cat ? cat.name : 'General';
    const isOutOfStock = product.stock === 0;
    const imgSrc = product.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image';
    const wishlist = session ? (StorageService.get(`dm_wishlist_${session.userId}`) || []) : [];
    const inWishlist = wishlist.includes(product.id);
    const heartBtn = session && session.role === 'buyer'
      ? `<button class="wishlist-btn-card btn-wishlist" data-product-id="${product.id}" aria-label="${inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}">${inWishlist ? '❤️' : '🤍'}</button>`
      : '';
    const avgRating = _getAvgRating(product.id);
    const displayRating = avgRating || product.rating || 0;
    const disabled = isOutOfStock ? 'disabled' : '';

    return `<article class="product-card" data-product-id="${product.id}">
  <a href="#product/${product.id}" class="product-card-link" style="text-decoration:none;color:inherit;">
    <div class="product-card-image-wrap">
      <img src="${imgSrc}" alt="${product.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'" />
      ${isOutOfStock ? '<span class="out-of-stock-badge">Out of Stock</span>' : ''}
      ${heartBtn}
    </div>
    <div class="product-card-body">
      <span class="product-card-category">${categoryName}</span>
      <h3 class="product-card-title">${product.name}</h3>
      <div class="product-card-rating">
        ${UIComponents.StarRating(displayRating)}
        <span class="rating-count">${displayRating.toFixed(1)}</span>
      </div>
      <div class="product-card-footer">
        <span class="product-price">${_fmtPrice(product.price)}</span>
      </div>
    </div>
  </a>
  <div style="padding:0.5rem 1rem 1rem;">
    <button class="btn btn-primary btn-sm btn-add-to-cart" data-product-id="${product.id}" ${disabled} style="width:100%">Add to Cart 🛒</button>
  </div>
</article>`;
  },

  Toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span class="toast-message">${message}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('toast-removing');
      setTimeout(() => el.remove(), 300);
    }, 3000);
  },

  Modal(title, body, onConfirm) {
    const container = document.getElementById('modal-container');
    if (!container) return;
    container.removeAttribute('hidden');
    container.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true">
        <h2 class="modal-title">${title}</h2>
        <div class="modal-body">${body}</div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
          <button class="btn btn-danger" id="modal-confirm">Confirm</button>
        </div>
      </div>`;
    container.querySelector('#modal-cancel').onclick = () => {
      container.setAttribute('hidden', '');
      container.innerHTML = '';
    };
    container.querySelector('#modal-confirm').onclick = () => {
      container.setAttribute('hidden', '');
      container.innerHTML = '';
      if (typeof onConfirm === 'function') onConfirm();
    };
  },

  Pagination({ total, page, perPage, onPage }) {
    if (total <= perPage) return '';
    const totalPages = Math.ceil(total / perPage);
    const id = 'pg-' + Math.random().toString(36).slice(2, 7);
    window.__pgCb = window.__pgCb || {};
    window.__pgCb[id] = onPage;
    let btns = '';
    btns += `<button class="page-btn" onclick="window.__pgCb['${id}'](${page - 1})" ${page <= 1 ? 'disabled' : ''}>‹</button>`;
    for (let i = 1; i <= totalPages; i++) {
      btns += `<button class="page-btn${i === page ? ' active' : ''}" onclick="window.__pgCb['${id}'](${i})">${i}</button>`;
    }
    btns += `<button class="page-btn" onclick="window.__pgCb['${id}'](${page + 1})" ${page >= totalPages ? 'disabled' : ''}>›</button>`;
    return `<nav class="pagination" aria-label="Pagination">${btns}</nav>`;
  },

  StepTracker(steps, currentStep) {
    return `<div class="step-tracker">` +
      steps.map((label, i) => {
        const idx = i + 1;
        const completed = idx < currentStep;
        const active = idx === currentStep;
        return `<div class="step-wrapper${completed ? ' completed' : active ? ' active' : ''}">
          <div class="step${completed ? ' completed' : active ? ' active' : ''}">${completed ? '✓' : idx}</div>
          <span class="step-label">${label}</span>
        </div>`;
      }).join('') +
    `</div>`;
  }
};

/* ────────────────────────────────────────────────────────────
   11. WishlistModule
   ──────────────────────────────────────────────────────────── */
const WishlistModule = {
  _key(userId) { return `dm_wishlist_${userId}`; },
  get(userId) { return StorageService.get(this._key(userId)) || []; },
  toggle(userId, productId) {
    let list = this.get(userId);
    if (list.includes(productId)) {
      list = list.filter(id => id !== productId);
      StorageService.set(this._key(userId), list);
      EventBus.emit('wishlist:changed', { userId, productId, action: 'removed' });
      return false;
    } else {
      list.push(productId);
      StorageService.set(this._key(userId), list);
      EventBus.emit('wishlist:changed', { userId, productId, action: 'added' });
      return true;
    }
  },
  has(userId, productId) { return this.get(userId).includes(productId); }
};

/* ────────────────────────────────────────────────────────────
   12. OrderModule
   ──────────────────────────────────────────────────────────── */
const STATUS_RANK = { Pending: 1, Processing: 2, Shipped: 3, Delivered: 4 };

const OrderModule = {
  create(userId, cartItems, deliveryInfo, paymentMethod, total) {
    const orders = StorageService.get('dm_orders') || [];
    const products = StorageService.get('dm_products') || [];
    const items = cartItems.map(ci => {
      const p = products.find(pr => pr.id === ci.productId);
      return {
        productId: ci.productId,
        name: p ? p.name : ci.productId,
        imageUrl: p ? p.imageUrl : '',
        unitPrice: p ? p.price : 0,
        quantity: ci.quantity,
        sellerId: p ? p.sellerId : ''
      };
    });
    // Reduce stock
    cartItems.forEach(ci => {
      const idx = products.findIndex(p => p.id === ci.productId);
      if (idx !== -1) {
        products[idx].stock = Math.max(0, (products[idx].stock || 0) - ci.quantity);
      }
    });
    StorageService.set('dm_products', products);

    const order = {
      id: 'ORD-' + Date.now(),
      userId,
      items,
      deliveryInfo,
      paymentMethod,
      total,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };
    orders.push(order);
    StorageService.set('dm_orders', orders);
    EventBus.emit('order:created', order);
    return order;
  },
  getAll() { return StorageService.get('dm_orders') || []; },
  getByUser(userId) { return this.getAll().filter(o => o.userId === userId); },
  getById(id) { return this.getAll().find(o => o.id === id) || null; },
  updateStatus(orderId, newStatus) {
    const orders = StorageService.get('dm_orders') || [];
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) return { ok: false, error: 'Order not found' };
    const cur = orders[idx].status;
    if ((STATUS_RANK[newStatus] || 0) <= (STATUS_RANK[cur] || 0)) {
      return { ok: false, error: 'Can only move status forward.' };
    }
    orders[idx].status = newStatus;
    StorageService.set('dm_orders', orders);
    EventBus.emit('order:updated', orders[idx]);
    return { ok: true };
  }
};

/* ────────────────────────────────────────────────────────────
   13. CartModule
   ──────────────────────────────────────────────────────────── */
const CartModule = {
  _key(userId) { return `dm_cart_${userId}`; },
  getItems(userId) { return StorageService.get(this._key(userId)) || []; },
  addItem(userId, productId, qty = 1) {
    StorageService.update(this._key(userId), (cart) => {
      const items = cart || [];
      const existing = items.find(i => i.productId === productId);
      if (existing) { existing.quantity += qty; }
      else { items.push({ productId, quantity: qty }); }
      return items;
    });
    EventBus.emit('cart:changed', { userId });
  },
  removeItem(userId, productId) {
    StorageService.update(this._key(userId), (cart) => {
      return (cart || []).filter(i => i.productId !== productId);
    });
    EventBus.emit('cart:changed', { userId });
  },
  updateQuantity(userId, productId, qty) {
    if (qty <= 0) { this.removeItem(userId, productId); return; }
    StorageService.update(this._key(userId), (cart) => {
      const items = cart || [];
      const existing = items.find(i => i.productId === productId);
      if (existing) existing.quantity = qty;
      return items;
    });
    EventBus.emit('cart:changed', { userId });
  },
  clear(userId) {
    StorageService.remove(this._key(userId));
    EventBus.emit('cart:changed', { userId });
  },
  getCount(userId) {
    const items = this.getItems(userId);
    return items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  },
  getTotal(userId) {
    const items = this.getItems(userId);
    const products = StorageService.get('dm_products') || [];
    return items.reduce((sum, ci) => {
      const p = products.find(pr => pr.id === ci.productId);
      return sum + (p ? p.price * ci.quantity : 0);
    }, 0);
  }
};

/* ────────────────────────────────────────────────────────────
   14. ReviewModule
   ──────────────────────────────────────────────────────────── */
const ReviewModule = {
  getByProduct(productId) {
    return (StorageService.get('dm_reviews') || []).filter(r => r.productId === productId);
  },
  add(review) {
    const reviews = StorageService.get('dm_reviews') || [];
    reviews.push({ id: _uuid(), ...review, createdAt: new Date().toISOString() });
    StorageService.set('dm_reviews', reviews);
    EventBus.emit('review:added', review);
  },
  hasReviewed(userId, productId) {
    return (StorageService.get('dm_reviews') || []).some(r => r.userId === userId && r.productId === productId);
  },
  hasPurchased(userId, productId) {
    const orders = OrderModule.getByUser(userId);
    return orders.some(o => o.status === 'Delivered' && o.items.some(i => i.productId === productId));
  }
};

/* ────────────────────────────────────────────────────────────
   15. Helpers
   ──────────────────────────────────────────────────────────── */
function _fmtPrice(n) {
  if (isNaN(n)) return '₹0';
  return '₹' + Number(n).toLocaleString('en-IN');
}

function _fmtDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) { return iso; }
}

function _statusBadge(status) {
  const cls = {
    Pending:    'status-Pending',
    Processing: 'status-Processing',
    Shipped:    'status-Shipped',
    Delivered:  'status-Delivered'
  }[status] || 'badge-neutral';
  return `<span class="status-badge ${cls}">${status}</span>`;
}

function _getAvgRating(productId) {
  const reviews = ReviewModule.getByProduct(productId);
  if (!reviews.length) return 0;
  return reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
}

function _setInteractiveRating(container, hiddenInput, initialValue) {
  let current = initialValue || 0;
  function render(hover) {
    const val = hover || current;
    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const span = document.createElement('span');
      span.className = 'star interactive' + (i <= val ? ' filled' : '');
      span.textContent = '★';
      span.dataset.val = i;
      span.addEventListener('mouseenter', () => render(i));
      span.addEventListener('mouseleave', () => render(0));
      span.addEventListener('click', () => {
        current = i;
        hiddenInput.value = i;
        render(0);
      });
      container.appendChild(span);
    }
  }
  render(0);
}

let _listingState = { minPrice: '', maxPrice: '', sort: 'newest', page: 1 };

function _applyFiltersAndSort(products, state, getAvgFn) {
  let list = [...products];
  if (state.minPrice !== '') list = list.filter(p => p.price >= Number(state.minPrice));
  if (state.maxPrice !== '') list = list.filter(p => p.price <= Number(state.maxPrice));
  switch (state.sort) {
    case 'price-asc':  list.sort((a, b) => a.price - b.price); break;
    case 'price-desc': list.sort((a, b) => b.price - a.price); break;
    case 'rating':     list.sort((a, b) => (getAvgFn(b.id)||b.rating||0) - (getAvgFn(a.id)||a.rating||0)); break;
    default:           list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return list;
}

function _buildFilterSortPanel(state) {
  return `
    <aside class="filter-sidebar">
      <h2 class="filter-title">Filters</h2>
      <div class="filter-group">
        <div class="filter-group-label">Price Range</div>
        <div class="form-group">
          <label>Min ₹</label>
          <input type="number" id="filter-min" value="${state.minPrice}" min="0" placeholder="0" />
        </div>
        <div class="form-group">
          <label>Max ₹</label>
          <input type="number" id="filter-max" value="${state.maxPrice}" min="0" placeholder="Any" />
        </div>
      </div>
      <button class="btn btn-primary btn-sm btn-full" id="btn-apply-filter">Apply</button>
      <button class="btn btn-secondary btn-sm btn-full" id="btn-clear-filter" style="margin-top:0.5rem">Clear</button>
    </aside>
    <section>
      <div class="listing-controls">
        <span class="result-count" id="result-count"></span>
        <select id="sort-select" style="min-width:160px">
          <option value="newest" ${state.sort==='newest'?'selected':''}>Newest First</option>
          <option value="price-asc" ${state.sort==='price-asc'?'selected':''}>Price: Low → High</option>
          <option value="price-desc" ${state.sort==='price-desc'?'selected':''}>Price: High → Low</option>
          <option value="rating" ${state.sort==='rating'?'selected':''}>Top Rated</option>
        </select>
      </div>
      <div id="product-listing-grid" class="product-grid"></div>
      <div id="pagination-container"></div>
    </section>`;
}

const LISTING_PER_PAGE = 12;

function _injectProductGrid(app, products, session, state, params, renderFn) {
  const sorted = _applyFiltersAndSort(products, state, _getAvgRating);
  const total = sorted.length;
  const start = (state.page - 1) * LISTING_PER_PAGE;
  const paged = sorted.slice(start, start + LISTING_PER_PAGE);

  const grid = app.querySelector('#product-listing-grid');
  const pgContainer = app.querySelector('#pagination-container');
  const rcEl = app.querySelector('#result-count');

  if (rcEl) rcEl.textContent = `${total} product${total !== 1 ? 's' : ''} found`;

  if (!paged.length) {
    if (grid) grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🔍</div><div class="empty-state-title">No products found</div><p class="empty-state-body text-muted">Try adjusting your filters.</p></div>`;
  } else {
    if (grid) grid.innerHTML = paged.map(p => UIComponents.ProductCard(p, session)).join('');
  }
  if (pgContainer) {
    pgContainer.innerHTML = UIComponents.Pagination({
      total, page: state.page, perPage: LISTING_PER_PAGE,
      onPage(p) { state.page = p; _injectProductGrid(app, products, session, state, params, renderFn); }
    });
  }
  _wireListingGrid(app, session, params, renderFn);
}

function _wireListingGrid(app, session, params, renderFn) {
  if (!session || session.role !== 'buyer') return;
  app.querySelectorAll('.btn-add-to-cart').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      const pid = btn.dataset.productId;
      CartModule.addItem(session.userId, pid, 1);
      UIComponents.Toast('Added to cart! 🛒', 'success');
    };
  });
  app.querySelectorAll('.btn-wishlist').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      const pid = btn.dataset.productId;
      const added = WishlistModule.toggle(session.userId, pid);
      btn.textContent = added ? '❤️' : '🤍';
      UIComponents.Toast(added ? 'Added to wishlist ❤️' : 'Removed from wishlist', added ? 'success' : 'info');
    };
  });
}

function _wireFilterSort(app, params, renderFn) {
  const minEl = app.querySelector('#filter-min');
  const maxEl = app.querySelector('#filter-max');
  const sortEl = app.querySelector('#sort-select');
  const applyBtn = app.querySelector('#btn-apply-filter');
  const clearBtn = app.querySelector('#btn-clear-filter');

  if (applyBtn) applyBtn.onclick = () => {
    _listingState.minPrice = minEl ? minEl.value : '';
    _listingState.maxPrice = maxEl ? maxEl.value : '';
    _listingState.page = 1;
    renderFn(params);
  };
  if (clearBtn) clearBtn.onclick = () => {
    _listingState = { minPrice: '', maxPrice: '', sort: 'newest', page: 1 };
    renderFn(params);
  };
  if (sortEl) sortEl.onchange = () => {
    _listingState.sort = sortEl.value;
    _listingState.page = 1;
    renderFn(params);
  };
}

/* ────────────────────────────────────────────────────────────
   16. Views
   ──────────────────────────────────────────────────────────── */
const Views = {};

/* ── WelcomeView ── */
Views.WelcomeView = {
  render(params) {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="welcome-page">
        <div class="welcome-inner">
          <div class="welcome-branding">
            <div class="welcome-logo">💗</div>
            <h1 class="welcome-title">DEVI MART</h1>
            <p class="welcome-tagline">One Mart. Everything You Need.</p>
          </div>
          <div class="login-card">
            <h2 class="login-card-title">Welcome Back!</h2>
            <div id="form-alert" style="display:none" class="form-alert form-alert-error"></div>
            <div class="form-group">
              <label>Login As</label>
              <div class="role-selector">
                <button class="role-btn active" data-role="buyer">🛍️ Buyer</button>
                <button class="role-btn" data-role="seller">🏪 Seller</button>
                <button class="role-btn" data-role="admin">⚙️ Admin</button>
              </div>
              <input type="hidden" id="login-role" value="buyer" />
            </div>
            <div class="form-group">
              <label for="login-email">Email <span class="required-mark">*</span></label>
              <input type="email" id="login-email" placeholder="you@example.com" autocomplete="email" />
              <span class="field-error" id="err-email" style="display:none"></span>
            </div>
            <div class="form-group">
              <label for="login-password">Password <span class="required-mark">*</span></label>
              <input type="password" id="login-password" placeholder="Enter password" autocomplete="current-password" />
              <span class="field-error" id="err-pw" style="display:none"></span>
            </div>
            <button class="btn btn-primary btn-full btn-lg" id="btn-login">Sign In 💗</button>
            <p class="text-muted text-center" style="margin-top:1rem;font-size:0.8rem">
              Demo: buyer@devimart.com / buyer123 | seller@devimart.com / seller123 | admin@devimart.com / admin123
            </p>
          </div>
        </div>
      </div>`;

    // Role selector
    app.querySelectorAll('.role-btn').forEach(btn => {
      btn.onclick = () => {
        app.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('login-role').value = btn.dataset.role;
      };
    });

    // Login submit
    const doLogin = () => {
      const email = document.getElementById('login-email').value.trim();
      const pw    = document.getElementById('login-password').value;
      const role  = document.getElementById('login-role').value;
      const alertEl = document.getElementById('form-alert');
      let valid = true;
      document.getElementById('err-email').style.display = 'none';
      document.getElementById('err-pw').style.display = 'none';
      if (!email) { document.getElementById('err-email').textContent = 'Email is required'; document.getElementById('err-email').style.display = 'block'; valid = false; }
      if (!pw)    { document.getElementById('err-pw').textContent = 'Password is required'; document.getElementById('err-pw').style.display = 'block'; valid = false; }
      if (!valid) return;
      const result = AuthModule.login(email, pw, role);
      if (!result.ok) {
        alertEl.textContent = result.error;
        alertEl.style.display = 'block';
        return;
      }
      alertEl.style.display = 'none';
      NavBar.render();
      const dest = { buyer: '#home', seller: '#seller-dashboard', admin: '#admin-dashboard' };
      window.location.hash = dest[role] || '#home';
    };

    document.getElementById('btn-login').onclick = doLogin;
    document.getElementById('login-password').onkeydown = (e) => { if (e.key === 'Enter') doLogin(); };
  }
};

/* ── BuyerHomeView ── */
Views.BuyerHomeView = {
  render(params) {
    const session = AuthModule.requireSession();
    if (!session) return;
    const app = document.getElementById('app');
    const categories = StorageService.get('dm_categories') || [];
    const products   = StorageService.get('dm_products') || [];
    const featured   = [...products].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);

    const catCards = categories.map(c => `
      <a href="#category/${c.id}" class="category-card" aria-label="${c.name}">
        <span class="category-icon">${c.icon}</span>
        <span class="category-name">${c.name}</span>
      </a>`).join('');

    app.innerHTML = `
      <div class="hero-banner">
        <div class="hero-content container">
          <h1 class="hero-title">Welcome to DEVI MART 💗</h1>
          <p class="hero-subtitle">Shop electronics, fashion, beauty, gifts and more — all in one place.</p>
          <a href="#search" class="btn btn-primary btn-lg">Browse All Products 🛍️</a>
        </div>
      </div>
      <div class="container">
        <section class="page-section">
          <h2 class="section-title">Shop by Category</h2>
          <div class="category-grid">${catCards}</div>
        </section>
        <section class="page-section">
          <h2 class="section-title">Featured Products</h2>
          <div class="product-grid" id="featured-grid">
            ${featured.map(p => UIComponents.ProductCard(p, session)).join('')}
          </div>
        </section>
      </div>`;

    _wireListingGrid(app, session, params, () => Views.BuyerHomeView.render(params));
  }
};

/* ── CategoryView ── */
Views.CategoryView = {
  render(params) {
    const session = AuthModule.requireSession();
    if (!session) return;
    const app = document.getElementById('app');
    const categories = StorageService.get('dm_categories') || [];
    const allProducts = StorageService.get('dm_products') || [];
    const catId = params && params.id ? params.id : '';
    const cat   = categories.find(c => c.id === catId);

    const products = allProducts.filter(p => p.categoryId === catId && p.stock > 0);

    app.innerHTML = `
      <div class="container">
        <div class="page-header">
          <nav class="breadcrumb" aria-label="Breadcrumb">
            <a href="#home">Home</a><span class="breadcrumb-sep">›</span>
            <span>${cat ? cat.icon + ' ' + cat.name : 'Category'}</span>
          </nav>
          <h1 class="page-title">${cat ? cat.icon + ' ' + cat.name : 'Products'}</h1>
        </div>
        <div class="listing-layout">
          ${_buildFilterSortPanel(_listingState)}
        </div>
      </div>`;

    _injectProductGrid(app, products, session, _listingState, params, (p) => {
      _listingState.minPrice = app.querySelector('#filter-min') ? app.querySelector('#filter-min').value : _listingState.minPrice;
      _listingState.maxPrice = app.querySelector('#filter-max') ? app.querySelector('#filter-max').value : _listingState.maxPrice;
      Views.CategoryView.render(p);
    });
    _wireFilterSort(app, params, (p) => Views.CategoryView.render(p));
  }
};

/* ── SearchView ── */
Views.SearchView = {
  render(params) {
    const session = AuthModule.requireSession();
    if (!session) return;
    const app = document.getElementById('app');
    const q = (params && params.q) ? params.q.toLowerCase() : '';
    const allProducts = StorageService.get('dm_products') || [];
    const products = q
      ? allProducts.filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q))
      : allProducts;

    app.innerHTML = `
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">🔍 Search Products</h1>
        </div>
        <div class="form-group" style="max-width:500px;margin-bottom:1.5rem">
          <div class="search-bar">
            <input type="search" id="search-input" placeholder="Search products…" value="${q}" />
            <button class="btn btn-primary" id="btn-search">Search</button>
          </div>
        </div>
        <div class="listing-layout">
          ${_buildFilterSortPanel(_listingState)}
        </div>
      </div>`;

    _injectProductGrid(app, products, session, _listingState, params, (p) => Views.SearchView.render(p));
    _wireFilterSort(app, params, (p) => Views.SearchView.render(p));

    const searchBtn = app.querySelector('#btn-search');
    const searchInput = app.querySelector('#search-input');
    const doSearch = () => {
      const val = searchInput.value.trim();
      _listingState = { minPrice: '', maxPrice: '', sort: 'newest', page: 1 };
      window.location.hash = val ? `#search?q=${encodeURIComponent(val)}` : '#search';
    };
    if (searchBtn) searchBtn.onclick = doSearch;
    if (searchInput) searchInput.onkeydown = (e) => { if (e.key === 'Enter') doSearch(); };
  }
};

/* ── ProductDetailView ── */
Views.ProductDetailView = {
  render(params) {
    const session = AuthModule.requireSession();
    if (!session) return;
    const app = document.getElementById('app');
    const products = StorageService.get('dm_products') || [];
    const categories = StorageService.get('dm_categories') || [];
    const users = StorageService.get('dm_users') || [];
    const pid = params && params.id ? params.id : '';
    const product = products.find(p => p.id === pid);

    if (!product) {
      app.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">😢</div><h2 class="empty-state-title">Product not found</h2><a href="#home" class="btn btn-primary">Go Home</a></div></div>`;
      return;
    }

    const cat    = categories.find(c => c.id === product.categoryId);
    const seller = users.find(u => u.id === product.sellerId);
    const reviews = ReviewModule.getByProduct(pid);
    const avgRating = _getAvgRating(pid) || product.rating || 0;
    const inWishlist = session.role === 'buyer' ? WishlistModule.has(session.userId, pid) : false;
    const canReview = session.role === 'buyer' && ReviewModule.hasPurchased(session.userId, pid) && !ReviewModule.hasReviewed(session.userId, pid);

    const reviewsHTML = reviews.length ? reviews.map(r => {
      const u = users.find(u => u.id === r.userId);
      return `<div class="review-card">
        <div class="review-header">
          <div>
            <span class="reviewer-name">${u ? u.name : 'Anonymous'}</span>
            <div>${UIComponents.StarRating(r.rating || 0)}</div>
          </div>
          <span class="review-date">${_fmtDate(r.createdAt)}</span>
        </div>
        <p class="review-comment">${r.comment || ''}</p>
      </div>`;
    }).join('') : `<p class="text-muted">No reviews yet. Be the first!</p>`;

    const reviewFormHTML = canReview ? `
      <div class="review-form" id="review-form-section">
        <h3 style="margin-bottom:1rem;font-size:1rem;font-weight:700">Write a Review</h3>
        <div class="form-group">
          <label>Rating <span class="required-mark">*</span></label>
          <div class="stars stars-lg" id="star-picker" style="cursor:pointer"></div>
          <input type="hidden" id="review-rating" value="0" />
          <span class="field-error" id="err-rating" style="display:none">Please select a rating</span>
        </div>
        <div class="form-group">
          <label for="review-comment">Comment</label>
          <textarea id="review-comment" rows="3" placeholder="Share your thoughts…"></textarea>
        </div>
        <button class="btn btn-primary" id="btn-submit-review">Submit Review</button>
      </div>` : session.role === 'buyer' && !ReviewModule.hasPurchased(session.userId, pid)
        ? '<p class="text-muted" style="margin-top:1rem">Purchase this product to write a review.</p>'
        : session.role === 'buyer' && ReviewModule.hasReviewed(session.userId, pid)
        ? '<p class="text-muted" style="margin-top:1rem">You have already reviewed this product.</p>'
        : '';

    app.innerHTML = `
      <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb" style="padding-top:1.5rem">
          <a href="#home">Home</a><span class="breadcrumb-sep">›</span>
          ${cat ? `<a href="#category/${cat.id}">${cat.icon} ${cat.name}</a><span class="breadcrumb-sep">›</span>` : ''}
          <span>${product.name}</span>
        </nav>
        <div class="product-detail">
          <div>
            <img src="${product.imageUrl || 'https://via.placeholder.com/400x400?text=No+Image'}"
                 alt="${product.name}" class="product-detail-image"
                 onerror="this.src='https://via.placeholder.com/400x400?text=No+Image'" />
          </div>
          <div class="product-detail-info">
            <div>
              ${cat ? `<span class="product-card-category">${cat.icon} ${cat.name}</span>` : ''}
              <h1 class="product-detail-title" style="font-size:1.75rem;font-weight:700;margin-top:0.5rem">${product.name}</h1>
              <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.5rem">
                ${UIComponents.StarRating(avgRating)}
                <span class="text-muted">${avgRating.toFixed(1)} (${reviews.length} reviews)</span>
              </div>
              <div class="product-detail-price" style="margin-top:1rem">${_fmtPrice(product.price)}</div>
            </div>
            <div class="product-detail-meta">
              <div class="product-detail-meta-row">
                <span class="product-detail-meta-label">Stock:</span>
                <span>${product.stock > 0 ? `${product.stock} available` : '<span class="badge badge-error">Out of Stock</span>'}</span>
              </div>
              <div class="product-detail-meta-row">
                <span class="product-detail-meta-label">Seller:</span>
                <span>${seller ? seller.name : 'DEVI MART'}</span>
              </div>
              <div class="product-detail-meta-row">
                <span class="product-detail-meta-label">Added:</span>
                <span>${_fmtDate(product.createdAt)}</span>
              </div>
            </div>
            <p style="color:var(--text-dark);line-height:1.7">${product.description || ''}</p>
            ${session.role === 'buyer' && product.stock > 0 ? `
            <div class="add-to-cart-strip">
              <div class="qty-stepper">
                <button id="qty-dec" type="button" aria-label="Decrease quantity">−</button>
                <input type="number" id="qty-input" value="1" min="1" max="${product.stock}" aria-label="Quantity" />
                <button id="qty-inc" type="button" aria-label="Increase quantity">+</button>
              </div>
              <button class="btn btn-primary" id="btn-atc">Add to Cart 🛒</button>
              <button class="heart-icon${inWishlist ? ' filled' : ''}" id="btn-wishlist" aria-label="${inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}">${inWishlist ? '❤️' : '🤍'}</button>
            </div>` : session.role === 'buyer' ? `<p class="badge badge-error">Out of Stock</p>` : ''}
          </div>
        </div>
        <div class="reviews-section">
          <h2 class="section-title">Reviews</h2>
          ${reviewsHTML}
          ${reviewFormHTML}
        </div>
      </div>`;

    // Wire qty stepper
    const qtyInput = app.querySelector('#qty-input');
    if (qtyInput) {
      app.querySelector('#qty-dec').onclick = () => {
        const v = parseInt(qtyInput.value) || 1;
        if (v > 1) qtyInput.value = v - 1;
      };
      app.querySelector('#qty-inc').onclick = () => {
        const v = parseInt(qtyInput.value) || 1;
        if (v < product.stock) qtyInput.value = v + 1;
      };
    }

    const atcBtn = app.querySelector('#btn-atc');
    if (atcBtn) atcBtn.onclick = () => {
      const qty = parseInt(qtyInput ? qtyInput.value : 1) || 1;
      CartModule.addItem(session.userId, product.id, qty);
      UIComponents.Toast(`Added ${qty}× ${product.name} to cart 🛒`, 'success');
    };

    const wlBtn = app.querySelector('#btn-wishlist');
    if (wlBtn) wlBtn.onclick = () => {
      const added = WishlistModule.toggle(session.userId, pid);
      wlBtn.textContent = added ? '❤️' : '🤍';
      wlBtn.className = 'heart-icon' + (added ? ' filled' : '');
      UIComponents.Toast(added ? 'Added to wishlist ❤️' : 'Removed from wishlist', added ? 'success' : 'info');
    };

    // Star picker
    const starPicker = app.querySelector('#star-picker');
    const ratingInput = app.querySelector('#review-rating');
    if (starPicker && ratingInput) _setInteractiveRating(starPicker, ratingInput, 0);

    const reviewBtn = app.querySelector('#btn-submit-review');
    if (reviewBtn) reviewBtn.onclick = () => {
      const rating = parseInt(ratingInput.value);
      const comment = app.querySelector('#review-comment').value.trim();
      if (!rating) { document.getElementById('err-rating').style.display = 'block'; return; }
      document.getElementById('err-rating').style.display = 'none';
      ReviewModule.add({ productId: pid, userId: session.userId, rating, comment });
      UIComponents.Toast('Review submitted! Thank you 🌸', 'success');
      Views.ProductDetailView.render(params);
    };
  }
};

/* ── WishlistView ── */
Views.WishlistView = {
  render(params) {
    const session = AuthModule.requireSession();
    if (!session || session.role !== 'buyer') { window.location.hash = '#home'; return; }
    const app = document.getElementById('app');
    const wishlistIds = WishlistModule.get(session.userId);
    const allProducts = StorageService.get('dm_products') || [];
    const products = allProducts.filter(p => wishlistIds.includes(p.id));

    app.innerHTML = `
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">❤️ My Wishlist</h1>
        </div>
        ${products.length ? `<div class="product-grid" id="wishlist-grid">${products.map(p => UIComponents.ProductCard(p, session)).join('')}</div>`
          : `<div class="empty-state"><div class="empty-state-icon">💔</div><h2 class="empty-state-title">Your wishlist is empty</h2><p class="empty-state-body text-muted">Save products you love by clicking the heart icon.</p><a href="#home" class="btn btn-primary">Shop Now</a></div>`}
      </div>`;

    _wireListingGrid(app, session, params, () => Views.WishlistView.render(params));
  }
};

/* ── CartView ── */
Views.CartView = {
  render(params) {
    const session = AuthModule.requireSession();
    if (!session || session.role !== 'buyer') { window.location.hash = '#home'; return; }
    const app = document.getElementById('app');
    const cartItems = CartModule.getItems(session.userId);
    const allProducts = StorageService.get('dm_products') || [];

    if (!cartItems.length) {
      app.innerHTML = `
        <div class="container">
          <div class="cart-empty">
            <div class="cart-empty-icon">🛒</div>
            <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:0.5rem">Your cart is empty</h2>
            <p class="text-muted">Add some products to get started!</p>
            <a href="#home" class="btn btn-primary" style="margin-top:1rem">Start Shopping 💗</a>
          </div>
        </div>`;
      return;
    }

    const enriched = cartItems.map(ci => {
      const p = allProducts.find(pr => pr.id === ci.productId);
      return { ...ci, product: p };
    }).filter(ci => ci.product);

    const subtotal = enriched.reduce((s, ci) => s + ci.product.price * ci.quantity, 0);
    const delivery = subtotal >= 499 ? 0 : 49;
    const total    = subtotal + delivery;

    const rows = enriched.map(ci => {
      const p = ci.product;
      return `<tr>
        <td>
          <div style="display:flex;align-items:center;gap:0.75rem">
            <img src="${p.imageUrl || 'https://via.placeholder.com/60x60?text=?'}"
                 alt="${p.name}" width="60" height="60"
                 style="object-fit:cover;border-radius:8px;flex-shrink:0"
                 onerror="this.src='https://via.placeholder.com/60x60?text=?'" />
            <div>
              <a href="#product/${p.id}" style="font-weight:600;color:var(--text-dark)">${p.name}</a>
              <div class="text-muted" style="font-size:0.8rem">${_fmtPrice(p.price)} each</div>
            </div>
          </div>
        </td>
        <td>
          <div class="qty-stepper">
            <button class="btn-qty-dec" data-pid="${p.id}" type="button">−</button>
            <input type="number" class="qty-inp" data-pid="${p.id}" value="${ci.quantity}" min="1" max="${p.stock}" />
            <button class="btn-qty-inc" data-pid="${p.id}" data-max="${p.stock}" type="button">+</button>
          </div>
        </td>
        <td><strong>${_fmtPrice(p.price * ci.quantity)}</strong></td>
        <td><button class="btn btn-danger btn-sm btn-remove-cart" data-pid="${p.id}" aria-label="Remove">🗑️ Remove</button></td>
      </tr>`;
    }).join('');

    app.innerHTML = `
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">🛒 My Cart (${CartModule.getCount(session.userId)} items)</h1>
        </div>
        <div class="cart-layout">
          <div class="table-responsive">
            <table class="data-table">
              <thead><tr><th>Product</th><th>Quantity</th><th>Total</th><th>Action</th></tr></thead>
              <tbody id="cart-tbody">${rows}</tbody>
            </table>
          </div>
          <aside>
            <div class="cart-summary-card">
              <h2 class="cart-summary-title">Order Summary</h2>
              <div class="cart-summary-row"><span>Subtotal</span><span>${_fmtPrice(subtotal)}</span></div>
              <div class="cart-summary-row"><span>Delivery</span><span>${delivery === 0 ? '<span class="badge badge-success">FREE</span>' : _fmtPrice(delivery)}</span></div>
              <div class="cart-summary-total"><span>Total</span><span>${_fmtPrice(total)}</span></div>
              <a href="#checkout" class="btn btn-primary btn-full" style="margin-top:1.25rem">Proceed to Checkout →</a>
              <a href="#home" class="btn btn-secondary btn-full" style="margin-top:0.5rem">Continue Shopping</a>
            </div>
          </aside>
        </div>
      </div>`;

    // Wire qty dec buttons
    app.querySelectorAll('.btn-qty-dec').forEach(btn => {
      btn.onclick = () => {
        const pid = btn.dataset.pid;
        const item = CartModule.getItems(session.userId).find(i => i.productId === pid);
        if (item) CartModule.updateQuantity(session.userId, pid, item.quantity - 1);
        Views.CartView.render(params);
      };
    });
    // Wire qty inc buttons
    app.querySelectorAll('.btn-qty-inc').forEach(btn => {
      btn.onclick = () => {
        const pid = btn.dataset.pid;
        const max = parseInt(btn.dataset.max);
        const item = CartModule.getItems(session.userId).find(i => i.productId === pid);
        if (item && item.quantity < max) CartModule.updateQuantity(session.userId, pid, item.quantity + 1);
        else if (item && item.quantity >= max) UIComponents.Toast('Maximum stock reached', 'warning');
        Views.CartView.render(params);
      };
    });
    // Wire qty inputs
    app.querySelectorAll('.qty-inp').forEach(inp => {
      inp.onchange = () => {
        const pid = inp.dataset.pid;
        const val = parseInt(inp.value);
        if (!isNaN(val) && val > 0) CartModule.updateQuantity(session.userId, pid, val);
        Views.CartView.render(params);
      };
    });
    // Wire remove buttons
    app.querySelectorAll('.btn-remove-cart').forEach(btn => {
      btn.onclick = () => {
        CartModule.removeItem(session.userId, btn.dataset.pid);
        UIComponents.Toast('Item removed from cart', 'info');
        Views.CartView.render(params);
      };
    });
  }
};

/* ── CheckoutView ── */
Views.CheckoutView = {
  render(params) {
    const session = AuthModule.requireSession();
    if (!session || session.role !== 'buyer') { window.location.hash = '#home'; return; }
    const app = document.getElementById('app');
    const cartItems = CartModule.getItems(session.userId);
    if (!cartItems.length) { window.location.hash = '#cart'; return; }
    const allProducts = StorageService.get('dm_products') || [];
    const enriched = cartItems.map(ci => ({ ...ci, product: allProducts.find(p => p.id === ci.productId) })).filter(ci => ci.product);
    const subtotal = enriched.reduce((s, ci) => s + ci.product.price * ci.quantity, 0);
    const delivery = subtotal >= 499 ? 0 : 49;
    const total = subtotal + delivery;

    const summaryRows = enriched.map(ci =>
      `<div class="cart-summary-row"><span>${ci.product.name} × ${ci.quantity}</span><span>${_fmtPrice(ci.product.price * ci.quantity)}</span></div>`
    ).join('');

    app.innerHTML = `
      <div class="container">
        <div class="page-header">
          <h1 class="page-title">💳 Checkout</h1>
        </div>
        <div class="checkout-layout">
          <div>
            <div class="checkout-form-section">
              <h2 class="checkout-section-title"><span class="step-num">1</span> Delivery Details</h2>
              <div id="delivery-alert" class="form-alert form-alert-error" style="display:none"></div>
              <div class="form-row form-row-2">
                <div class="form-group">
                  <label for="co-name">Full Name <span class="required-mark">*</span></label>
                  <input type="text" id="co-name" placeholder="Your Name" />
                  <span class="field-error" id="err-name" style="display:none"></span>
                </div>
                <div class="form-group">
                  <label for="co-phone">Phone <span class="required-mark">*</span></label>
                  <input type="tel" id="co-phone" placeholder="10-digit phone" />
                  <span class="field-error" id="err-phone" style="display:none"></span>
                </div>
              </div>
              <div class="form-group">
                <label for="co-address">Address <span class="required-mark">*</span></label>
                <textarea id="co-address" rows="2" placeholder="Street, Landmark"></textarea>
                <span class="field-error" id="err-addr" style="display:none"></span>
              </div>
              <div class="form-row form-row-2">
                <div class="form-group">
                  <label for="co-city">City <span class="required-mark">*</span></label>
                  <input type="text" id="co-city" placeholder="City" />
                  <span class="field-error" id="err-city" style="display:none"></span>
                </div>
                <div class="form-group">
                  <label for="co-pin">Pincode <span class="required-mark">*</span></label>
                  <input type="text" id="co-pin" placeholder="6-digit pincode" maxlength="6" />
                  <span class="field-error" id="err-pin" style="display:none"></span>
                </div>
              </div>
            </div>
            <div class="checkout-form-section" style="margin-top:1.5rem">
              <h2 class="checkout-section-title"><span class="step-num">2</span> Payment Method</h2>
              <div class="form-group">
                <label><input type="radio" name="payment" value="COD" checked /> Cash on Delivery</label><br/>
                <label><input type="radio" name="payment" value="UPI" /> UPI</label><br/>
                <label><input type="radio" name="payment" value="Card" /> Credit / Debit Card</label>
              </div>
              <div id="upi-fields" class="card-fields" style="display:none">
                <p class="card-fields-note">Demo UPI — no real transaction</p>
                <div class="form-group"><label>UPI ID</label><input type="text" placeholder="yourname@upi" /></div>
              </div>
              <div id="card-fields" class="card-fields" style="display:none">
                <p class="card-fields-note">Demo card — no real transaction</p>
                <div class="form-group"><label>Card Number</label><input type="text" placeholder="4111 1111 1111 1111" maxlength="19" /></div>
                <div class="form-row form-row-2">
                  <div class="form-group"><label>Expiry</label><input type="text" placeholder="MM/YY" maxlength="5" /></div>
                  <div class="form-group"><label>CVV</label><input type="password" placeholder="•••" maxlength="4" /></div>
                </div>
              </div>
            </div>
            <button class="btn btn-primary btn-lg btn-full" id="btn-place-order" style="margin-top:1.5rem">Place Order 💗</button>
          </div>
          <aside>
            <div class="cart-summary-card">
              <h2 class="cart-summary-title">Order Summary</h2>
              ${summaryRows}
              <hr style="border:none;border-top:1px solid #fce4f0;margin:0.75rem 0"/>
              <div class="cart-summary-row"><span>Subtotal</span><span>${_fmtPrice(subtotal)}</span></div>
              <div class="cart-summary-row"><span>Delivery</span><span>${delivery === 0 ? '<span class="badge badge-success">FREE</span>' : _fmtPrice(delivery)}</span></div>
              <div class="cart-summary-total"><span>Total</span><span>${_fmtPrice(total)}</span></div>
            </div>
          </aside>
        </div>
      </div>`;

    // Payment toggle
    app.querySelectorAll('input[name="payment"]').forEach(r => {
      r.onchange = () => {
        app.querySelector('#upi-fields').style.display  = r.value === 'UPI'  ? 'block' : 'none';
        app.querySelector('#card-fields').style.display = r.value === 'Card' ? 'block' : 'none';
      };
    });

    app.querySelector('#btn-place-order').onclick = () => {
      let valid = true;
      const show = (id, msg) => { const el = app.querySelector('#' + id); if (el) { el.textContent = msg; el.style.display = msg ? 'block' : 'none'; } };
      const name    = app.querySelector('#co-name').value.trim();
      const phone   = app.querySelector('#co-phone').value.trim();
      const address = app.querySelector('#co-address').value.trim();
      const city    = app.querySelector('#co-city').value.trim();
      const pin     = app.querySelector('#co-pin').value.trim();
      const payment = app.querySelector('input[name="payment"]:checked').value;

      show('err-name', ''); show('err-phone', ''); show('err-addr', ''); show('err-city', ''); show('err-pin', '');

      if (!name)                  { show('err-name',  'Full name is required');        valid = false; }
      if (!phone || !/^\d{10}$/.test(phone)) { show('err-phone', 'Enter a valid 10-digit phone'); valid = false; }
      if (!address)               { show('err-addr',  'Address is required');          valid = false; }
      if (!city)                  { show('err-city',  'City is required');             valid = false; }
      if (!pin || !/^\d{6}$/.test(pin)) { show('err-pin', 'Enter a valid 6-digit pincode'); valid = false; }
      if (!valid) return;

      const order = OrderModule.create(
        session.userId,
        cartItems,
        { name, phone, address, city, pin },
        payment,
        total
      );
      CartModule.clear(session.userId);
      window.location.hash = `#order-confirm/${order.id}`;
    };
  }
};

/* ── OrderConfirmView ── */
Views.OrderConfirmView = {
  render(params) {
    const session = AuthModule.requireSession();
    if (!session) return;
    const app = document.getElementById('app');
    const orderId = params && params.id ? params.id : '';
    const order = OrderModule.getById(orderId);

    if (!order) {
      app.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">😢</div><h2 class="empty-state-title">Order not found</h2><a href="#home" class="btn btn-primary">Go Home</a></div></div>`;
      return;
    }

    const itemsHTML = order.items.map(i =>
      `<div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid #fce4f0">
        <span>${i.name} × ${i.quantity}</span>
        <span><strong>${_fmtPrice(i.unitPrice * i.quantity)}</strong></span>
      </div>`
    ).join('');

    app.innerHTML = `
      <div class="container">
        <div class="order-confirm">
          <div class="order-confirm-icon">🎉</div>
          <h1 class="order-confirm-title">Order Placed!</h1>
          <div class="order-confirm-id">${order.id}</div>
          <p class="text-muted">Thank you for shopping with DEVI MART 💗<br/>Your order is being processed.</p>
          <div class="card card-padded" style="text-align:left;margin:1.5rem 0">
            <h3 style="font-weight:700;margin-bottom:0.75rem">Order Items</h3>
            ${itemsHTML}
            <div style="display:flex;justify-content:space-between;padding-top:0.75rem;font-weight:700;font-size:1.1rem">
              <span>Total Paid</span><span>${_fmtPrice(order.total)}</span>
            </div>
          </div>
          <div class="card card-padded" style="text-align:left;margin-bottom:1.5rem">
            <h3 style="font-weight:700;margin-bottom:0.5rem">Delivery To</h3>
            <p style="margin-bottom:0">${order.deliveryInfo.name}<br/>${order.deliveryInfo.address}, ${order.deliveryInfo.city} − ${order.deliveryInfo.pin}<br/>📞 ${order.deliveryInfo.phone}</p>
          </div>
          <div class="order-confirm-actions">
            <a href="#orders" class="btn btn-secondary">My Orders</a>
            <a href="#home" class="btn btn-primary">Continue Shopping 💗</a>
          </div>
        </div>
      </div>`;
  }
};

/* ── OrdersView (Buyer) ── */
Views.OrdersView = {
  render(params) {
    const session = AuthModule.requireSession();
    if (!session || session.role !== 'buyer') { window.location.hash = '#home'; return; }
    const app = document.getElementById('app');
    const orders = OrderModule.getByUser(session.userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const rows = orders.map(o => {
      const itemCount = o.items.reduce((s, i) => s + i.quantity, 0);
      return `<tr>
        <td><strong>${o.id}</strong></td>
        <td>${_fmtDate(o.createdAt)}</td>
        <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
        <td>${_fmtPrice(o.total)}</td>
        <td>${_statusBadge(o.status)}</td>
        <td><a href="#order/${o.id}" class="btn btn-secondary btn-sm">View →</a></td>
      </tr>`;
    }).join('');

    app.innerHTML = `
      <div class="container">
        <div class="page-header"><h1 class="page-title">📦 My Orders</h1></div>
        ${orders.length ? `
        <div class="table-responsive">
          <table class="data-table">
            <thead><tr><th>Order ID</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>` : `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <h2 class="empty-state-title">No orders yet</h2>
          <p class="empty-state-body text-muted">Start shopping to see your orders here.</p>
          <a href="#home" class="btn btn-primary">Shop Now</a>
        </div>`}
      </div>`;
  }
};

/* ── OrderDetailView (Buyer) ── */
Views.OrderDetailView = {
  render(params) {
    const session = AuthModule.requireSession();
    if (!session) return;
    const app = document.getElementById('app');
    const orderId = params && params.id ? params.id : '';
    const order = OrderModule.getById(orderId);

    if (!order || (session.role === 'buyer' && order.userId !== session.userId)) {
      app.innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">😢</div><h2 class="empty-state-title">Order not found</h2><a href="#orders" class="btn btn-primary">Back to Orders</a></div></div>`;
      return;
    }

    const steps = ['Pending', 'Processing', 'Shipped', 'Delivered'];
    const stepIdx = steps.indexOf(order.status) + 1 || 1;

    const itemsHTML = order.items.map(i => {
      const canReview = session.role === 'buyer' && order.status === 'Delivered' && !ReviewModule.hasReviewed(session.userId, i.productId);
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;border-bottom:1px solid #fce4f0;gap:1rem;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:0.75rem">
          <img src="${i.imageUrl || 'https://via.placeholder.com/50x50?text=?'}" width="50" height="50"
               style="object-fit:cover;border-radius:8px;flex-shrink:0"
               onerror="this.src='https://via.placeholder.com/50x50?text=?'" />
          <div>
            <a href="#product/${i.productId}" style="font-weight:600;color:var(--text-dark)">${i.name}</a>
            <div class="text-muted" style="font-size:0.8rem">${_fmtPrice(i.unitPrice)} × ${i.quantity}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:0.75rem">
          <strong>${_fmtPrice(i.unitPrice * i.quantity)}</strong>
          ${canReview ? `<a href="#product/${i.productId}" class="btn btn-secondary btn-sm">✍️ Review</a>` : ''}
        </div>
      </div>`;
    }).join('');

    app.innerHTML = `
      <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb" style="padding-top:1.5rem">
          <a href="#orders">My Orders</a><span class="breadcrumb-sep">›</span><span>${order.id}</span>
        </nav>
        <div class="page-header">
          <h1 class="page-title">Order ${order.id}</h1>
          <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
            ${_statusBadge(order.status)}
            <span class="text-muted">${_fmtDate(order.createdAt)}</span>
          </div>
        </div>
        ${UIComponents.StepTracker(steps, stepIdx)}
        <div style="display:grid;grid-template-columns:1fr;gap:1.5rem">
          <div class="card card-padded">
            <h2 style="font-weight:700;margin-bottom:0.75rem">Items</h2>
            ${itemsHTML}
            <div style="display:flex;justify-content:space-between;padding-top:0.75rem;font-weight:700;font-size:1.1rem">
              <span>Total</span><span>${_fmtPrice(order.total)}</span>
            </div>
          </div>
          <div class="card card-padded">
            <h2 style="font-weight:700;margin-bottom:0.75rem">Delivery Address</h2>
            <p style="margin-bottom:0">${order.deliveryInfo.name}<br/>${order.deliveryInfo.address}, ${order.deliveryInfo.city} − ${order.deliveryInfo.pin}<br/>📞 ${order.deliveryInfo.phone}</p>
          </div>
          <div class="card card-padded">
            <h2 style="font-weight:700;margin-bottom:0.5rem">Payment</h2>
            <p style="margin-bottom:0">${order.paymentMethod}</p>
          </div>
        </div>
      </div>`;
  }
};

/* ── SellerDashboardView ── */
Views.SellerDashboardView = {
  render(params) {
    const session = AuthModule.requireSession();
    if (!session || session.role !== 'seller') { window.location.hash = '#login'; return; }
    const app = document.getElementById('app');
    const allProducts = StorageService.get('dm_products') || [];
    const allOrders   = OrderModule.getAll();
    const myProducts  = allProducts.filter(p => p.sellerId === session.userId);
    const myPIds      = new Set(myProducts.map(p => p.id));

    const sellerOrders = allOrders.filter(o => o.items.some(i => myPIds.has(i.productId)));
    const revenue = sellerOrders.reduce((s, o) =>
      s + o.items.filter(i => myPIds.has(i.productId)).reduce((ss, i) => ss + i.unitPrice * i.quantity, 0), 0);
    const unitsSold = sellerOrders.reduce((s, o) =>
      s + o.items.filter(i => myPIds.has(i.productId)).reduce((ss, i) => ss + i.quantity, 0), 0);

    // Top 3 best-sellers
    const salesMap = {};
    sellerOrders.forEach(o => o.items.filter(i => myPIds.has(i.productId)).forEach(i => {
      salesMap[i.productId] = (salesMap[i.productId] || 0) + i.quantity;
    }));
    const topProducts = myProducts.map(p => ({ ...p, sold: salesMap[p.id] || 0 }))
      .sort((a, b) => b.sold - a.sold).slice(0, 3);

    const recent5 = sellerOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

    app.innerHTML = `
      <div class="container dashboard-page">
        <div class="dashboard-header">
          <h1 class="dashboard-title">🏪 Seller Dashboard</h1>
          <p class="dashboard-subtitle">Welcome back, ${session.name}!</p>
        </div>
        <div class="dashboard-cards">
          <div class="stat-card"><div class="stat-card-icon">📦</div><div class="stat-card-label">Total Products</div><div class="stat-card-value">${myProducts.length}</div></div>
          <div class="stat-card"><div class="stat-card-icon">🛒</div><div class="stat-card-label">Total Orders</div><div class="stat-card-value">${sellerOrders.length}</div></div>
          <div class="stat-card"><div class="stat-card-icon">💰</div><div class="stat-card-label">Revenue</div><div class="stat-card-value">${_fmtPrice(revenue)}</div></div>
          <div class="stat-card"><div class="stat-card-icon">📈</div><div class="stat-card-label">Units Sold</div><div class="stat-card-value">${unitsSold}</div></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr;gap:1.5rem">
          <div>
            <h2 class="section-title">Recent Orders</h2>
            ${recent5.length ? `
            <div class="table-responsive">
              <table class="data-table">
                <thead><tr><th>Order ID</th><th>Date</th><th>Buyer</th><th>Total</th><th>Status</th></tr></thead>
                <tbody>${recent5.map(o => {
                  const users = StorageService.get('dm_users') || [];
                  const buyer = users.find(u => u.id === o.userId);
                  return `<tr>
                    <td><a href="#seller-orders" style="font-weight:600">${o.id}</a></td>
                    <td>${_fmtDate(o.createdAt)}</td>
                    <td>${buyer ? buyer.email : o.userId}</td>
                    <td>${_fmtPrice(o.total)}</td>
                    <td>${_statusBadge(o.status)}</td>
                  </tr>`;
                }).join('')}</tbody>
              </table>
            </div>` : '<p class="text-muted">No orders yet.</p>'}
          </div>
          <div>
            <h2 class="section-title">Top Selling Products</h2>
            ${topProducts.length ? `
            <div class="table-responsive">
              <table class="data-table">
                <thead><tr><th>Product</th><th>Price</th><th>Units Sold</th></tr></thead>
                <tbody>${topProducts.map(p => `<tr>
                  <td><a href="#product/${p.id}" style="font-weight:600">${p.name}</a></td>
                  <td>${_fmtPrice(p.price)}</td>
                  <td><strong>${p.sold}</strong></td>
                </tr>`).join('')}</tbody>
              </table>
            </div>` : '<p class="text-muted">No sales data yet.</p>'}
          </div>
        </div>
      </div>`;
  }
};

/* ── SellerProductsView ── */
Views.SellerProductsView = {
  render(params) {
    const session = AuthModule.requireSession();
    if (!session || session.role !== 'seller') { window.location.hash = '#login'; return; }
    const app = document.getElementById('app');
    const allProducts  = StorageService.get('dm_products') || [];
    const categories   = StorageService.get('dm_categories') || [];
    const myProducts   = allProducts.filter(p => p.sellerId === session.userId);

    const rows = myProducts.map(p => {
      const cat = categories.find(c => c.id === p.categoryId);
      return `<tr>
        <td><strong>${p.name}</strong></td>
        <td>${cat ? cat.icon + ' ' + cat.name : '-'}</td>
        <td>${_fmtPrice(p.price)}</td>
        <td>${p.stock === 0 ? '<span class="badge badge-error">Out of Stock</span>' : p.stock}</td>
        <td class="actions-cell">
          <a href="#seller-product-form?id=${p.id}" class="btn btn-secondary btn-sm">✏️ Edit</a>
          <button class="btn btn-danger btn-sm btn-delete-product" data-id="${p.id}">🗑️ Delete</button>
        </td>
      </tr>`;
    }).join('');

    app.innerHTML = `
      <div class="container">
        <div class="page-header">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem">
            <h1 class="page-title">📦 My Products</h1>
            <a href="#seller-product-form" class="btn btn-primary">+ Add Product</a>
          </div>
        </div>
        ${myProducts.length ? `
        <div class="table-responsive">
          <table class="data-table">
            <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>` : `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <h2 class="empty-state-title">No products yet</h2>
          <p class="empty-state-body text-muted">Add your first product to start selling.</p>
          <a href="#seller-product-form" class="btn btn-primary">Add Product</a>
        </div>`}
      </div>`;

    app.querySelectorAll('.btn-delete-product').forEach(btn => {
      btn.onclick = () => {
        UIComponents.Modal('Delete Product', 'Are you sure you want to delete this product? This action cannot be undone.', () => {
          const pid = btn.dataset.id;
          const updated = (StorageService.get('dm_products') || []).filter(p => p.id !== pid);
          StorageService.set('dm_products', updated);
          UIComponents.Toast('Product deleted', 'success');
          Views.SellerProductsView.render(params);
        });
      };
    });
  }
};

/* ── SellerProductFormView ── */
Views.SellerProductFormView = {
  render(params) {
    const session = AuthModule.requireSession();
    if (!session || session.role !== 'seller') { window.location.hash = '#login'; return; }
    const app = document.getElementById('app');
    const categories = StorageService.get('dm_categories') || [];
    const allProducts = StorageService.get('dm_products') || [];
    const editId = params && params.id ? params.id : null;
    const product = editId ? allProducts.find(p => p.id === editId && p.sellerId === session.userId) : null;

    const catOptions = categories.map(c =>
      `<option value="${c.id}" ${product && product.categoryId === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`
    ).join('');

    app.innerHTML = `
      <div class="container">
        <div class="page-header">
          <nav class="breadcrumb"><a href="#seller-products">My Products</a><span class="breadcrumb-sep">›</span><span>${product ? 'Edit Product' : 'Add Product'}</span></nav>
          <h1 class="page-title">${product ? '✏️ Edit Product' : '➕ Add Product'}</h1>
        </div>
        <div class="product-form-container">
          <div class="card card-padded">
            <div id="form-alert" class="form-alert form-alert-error" style="display:none"></div>
            <div class="form-group">
              <label for="pf-name">Product Name <span class="required-mark">*</span></label>
              <input type="text" id="pf-name" value="${product ? product.name : ''}" placeholder="Enter product name" />
              <span class="field-error" id="err-pf-name" style="display:none"></span>
            </div>
            <div class="form-group">
              <label for="pf-desc">Description</label>
              <textarea id="pf-desc" rows="3" placeholder="Describe your product">${product ? product.description : ''}</textarea>
            </div>
            <div class="form-group">
              <label for="pf-cat">Category <span class="required-mark">*</span></label>
              <select id="pf-cat"><option value="">— Select Category —</option>${catOptions}</select>
              <span class="field-error" id="err-pf-cat" style="display:none"></span>
            </div>
            <div class="form-row form-row-2">
              <div class="form-group">
                <label for="pf-price">Price (₹) <span class="required-mark">*</span></label>
                <input type="number" id="pf-price" value="${product ? product.price : ''}" min="1" placeholder="0" />
                <span class="field-error" id="err-pf-price" style="display:none"></span>
              </div>
              <div class="form-group">
                <label for="pf-stock">Stock <span class="required-mark">*</span></label>
                <input type="number" id="pf-stock" value="${product ? product.stock : ''}" min="0" placeholder="0" />
                <span class="field-error" id="err-pf-stock" style="display:none"></span>
              </div>
            </div>
            <div class="form-group">
              <label for="pf-img">Image URL (optional)</label>
              <input type="url" id="pf-img" value="${product ? product.imageUrl : ''}" placeholder="https://…" />
            </div>
            <div style="display:flex;gap:0.75rem;flex-wrap:wrap">
              <button class="btn btn-primary" id="btn-save-product">${product ? 'Save Changes' : 'Add Product'}</button>
              <a href="#seller-products" class="btn btn-secondary">Cancel</a>
            </div>
          </div>
        </div>
      </div>`;

    app.querySelector('#btn-save-product').onclick = () => {
      const name  = app.querySelector('#pf-name').value.trim();
      const desc  = app.querySelector('#pf-desc').value.trim();
      const catId = app.querySelector('#pf-cat').value;
      const price = parseFloat(app.querySelector('#pf-price').value);
      const stock = parseInt(app.querySelector('#pf-stock').value);
      const imgUrl= app.querySelector('#pf-img').value.trim();

      const show = (id, msg) => { const el = app.querySelector('#' + id); if (el) { el.textContent = msg; el.style.display = msg ? 'block' : 'none'; } };
      show('err-pf-name', ''); show('err-pf-cat', ''); show('err-pf-price', ''); show('err-pf-stock', '');

      let valid = true;
      if (!name)        { show('err-pf-name', 'Name is required'); valid = false; }
      if (!catId)       { show('err-pf-cat', 'Category is required'); valid = false; }
      if (isNaN(price) || price <= 0) { show('err-pf-price', 'Enter a valid price > 0'); valid = false; }
      if (isNaN(stock) || stock < 0)  { show('err-pf-stock', 'Enter valid stock >= 0'); valid = false; }
      if (!valid) return;

      const products = StorageService.get('dm_products') || [];
      if (product) {
        const idx = products.findIndex(p => p.id === editId);
        if (idx !== -1) Object.assign(products[idx], { name, description: desc, categoryId: catId, price, stock, imageUrl: imgUrl });
        StorageService.set('dm_products', products);
        UIComponents.Toast('Product updated ✅', 'success');
      } else {
        products.push({ id: _uuid(), sellerId: session.userId, name, description: desc, categoryId: catId, price, stock, imageUrl: imgUrl, rating: 0, createdAt: new Date().toISOString() });
        StorageService.set('dm_products', products);
        UIComponents.Toast('Product added ✅', 'success');
      }
      window.location.hash = '#seller-products';
    };
  }
};

/* ── SellerOrdersView ── */
Views.SellerOrdersView = {
  render(params) {
    const session = AuthModule.requireSession();
    if (!session || session.role !== 'seller') { window.location.hash = '#login'; return; }
    const app = document.getElementById('app');
    const allProducts = StorageService.get('dm_products') || [];
    const allOrders   = OrderModule.getAll();
    const users       = StorageService.get('dm_users') || [];
    const myPIds      = new Set(allProducts.filter(p => p.sellerId === session.userId).map(p => p.id));
    const orders      = allOrders.filter(o => o.items.some(i => myPIds.has(i.productId)))
                                 .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const rows = orders.map(o => {
      const buyer = users.find(u => u.id === o.userId);
      const myItems = o.items.filter(i => myPIds.has(i.productId));
      const isDelivered = o.status === 'Delivered';
      const statusOptions = ['Pending', 'Processing', 'Shipped', 'Delivered'].map(s =>
        `<option value="${s}" ${o.status === s ? 'selected' : ''} ${STATUS_RANK[s] <= STATUS_RANK[o.status] && s !== o.status ? 'disabled' : ''}>${s}</option>`
      ).join('');
      return `<tr>
        <td><strong>${o.id}</strong><br/><span class="text-muted" style="font-size:0.75rem">${_fmtDate(o.createdAt)}</span></td>
        <td>
          <div style="font-weight:600">${buyer ? buyer.name : 'Unknown'}</div>
          <div class="text-muted" style="font-size:0.75rem">${o.deliveryInfo ? o.deliveryInfo.address + ', ' + o.deliveryInfo.city : ''}</div>
        </td>
        <td>${myItems.map(i => `${i.name} ×${i.quantity}`).join('<br/>')}</td>
        <td>${_fmtPrice(myItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0))}</td>
        <td>
          ${isDelivered
            ? _statusBadge(o.status)
            : `<select class="status-update-sel" data-order-id="${o.id}" style="font-size:0.85rem;padding:0.4rem;border-radius:6px">${statusOptions}</select>`}
        </td>
      </tr>`;
    }).join('');

    app.innerHTML = `
      <div class="container">
        <div class="page-header"><h1 class="page-title">📋 My Orders</h1></div>
        ${orders.length ? `
        <div class="table-responsive">
          <table class="data-table">
            <thead><tr><th>Order</th><th>Buyer</th><th>Items</th><th>Revenue</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>` : `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h2 class="empty-state-title">No orders yet</h2>
          <p class="empty-state-body text-muted">Your orders will appear here once buyers purchase your products.</p>
        </div>`}
      </div>`;

    app.querySelectorAll('.status-update-sel').forEach(sel => {
      sel.onchange = () => {
        const result = OrderModule.updateStatus(sel.dataset.orderId, sel.value);
        if (result.ok) UIComponents.Toast(`Order status updated to ${sel.value}`, 'success');
        else UIComponents.Toast(result.error, 'error');
        Views.SellerOrdersView.render(params);
      };
    });
  }
};

/* ── AdminDashboardView ── */
Views.AdminDashboardView = {
  render(params) {
    const session = AuthModule.requireSession();
    if (!session || session.role !== 'admin') { window.location.hash = '#login'; return; }
    const app = document.getElementById('app');
    const users    = StorageService.get('dm_users') || [];
    const products = StorageService.get('dm_products') || [];
    const orders   = OrderModule.getAll();
    const revenue  = orders.reduce((s, o) => s + (o.total || 0), 0);

    app.innerHTML = `
      <div class="container dashboard-page">
        <div class="dashboard-header">
          <h1 class="dashboard-title">⚙️ Admin Dashboard</h1>
          <p class="dashboard-subtitle">Platform Overview</p>
        </div>
        <div class="dashboard-cards">
          <div class="stat-card"><div class="stat-card-icon">👥</div><div class="stat-card-label">Total Users</div><div class="stat-card-value">${users.length}</div></div>
          <div class="stat-card"><div class="stat-card-icon">📦</div><div class="stat-card-label">Total Products</div><div class="stat-card-value">${products.length}</div></div>
          <div class="stat-card"><div class="stat-card-icon">🛒</div><div class="stat-card-label">Total Orders</div><div class="stat-card-value">${orders.length}</div></div>
          <div class="stat-card"><div class="stat-card-icon">💰</div><div class="stat-card-label">Total Revenue</div><div class="stat-card-value">${_fmtPrice(revenue)}</div></div>
        </div>
        <div style="margin-top:2rem;display:flex;gap:1rem;flex-wrap:wrap">
          <a href="#admin-users" class="btn btn-secondary">Manage Users</a>
          <a href="#admin-products" class="btn btn-secondary">Manage Products</a>
          <a href="#admin-orders" class="btn btn-secondary">Manage Orders</a>
          <a href="#admin-categories" class="btn btn-secondary">Manage Categories</a>
          <a href="#admin-reports" class="btn btn-secondary">Reports</a>
        </div>
      </div>`;
  }
};

/* ── AdminUsersView ── */
Views.AdminUsersView = {
  _page: 1,
  render(params) {
    const session = AuthModule.requireSession();
    if (!session || session.role !== 'admin') { window.location.hash = '#login'; return; }
    const app = document.getElementById('app');
    const users = StorageService.get('dm_users') || [];
    const PER_PAGE = 10;
    const total = users.length;
    const paged = users.slice((this._page - 1) * PER_PAGE, this._page * PER_PAGE);

    const rows = paged.map(u => `<tr>
      <td class="text-muted" style="font-size:0.75rem">${u.id.slice(0, 8)}…</td>
      <td><strong>${u.name}</strong></td>
      <td>${u.email}</td>
      <td><span class="badge badge-info">${u.role}</span></td>
      <td>${u.status === 'active' ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-error">Inactive</span>'}</td>
      <td>${_fmtDate(u.createdAt)}</td>
      <td>
        ${u.role !== 'admin' && u.id !== session.userId
          ? u.status === 'active'
            ? `<button class="btn btn-danger btn-sm btn-toggle-user" data-id="${u.id}" data-action="deactivate">Deactivate</button>`
            : `<button class="btn btn-secondary btn-sm btn-toggle-user" data-id="${u.id}" data-action="activate">Activate</button>`
          : '<span class="text-muted">—</span>'}
      </td>
    </tr>`).join('');

    app.innerHTML = `
      <div class="container">
        <div class="page-header"><h1 class="page-title">👥 Manage Users</h1></div>
        <div class="table-responsive">
          <table class="data-table">
            <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Registered</th><th>Action</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div id="pg-users">${UIComponents.Pagination({ total, page: this._page, perPage: PER_PAGE, onPage: (p) => { Views.AdminUsersView._page = p; Views.AdminUsersView.render(params); } })}</div>
      </div>`;

    app.querySelectorAll('.btn-toggle-user').forEach(btn => {
      btn.onclick = () => {
        const uid = btn.dataset.id;
        const action = btn.dataset.action;
        const allUsers = StorageService.get('dm_users') || [];
        const uIdx = allUsers.findIndex(u => u.id === uid);
        if (uIdx !== -1) {
          if (allUsers[uIdx].role === 'admin') { UIComponents.Toast('Cannot deactivate admin', 'error'); return; }
          allUsers[uIdx].status = action === 'deactivate' ? 'inactive' : 'active';
          StorageService.set('dm_users', allUsers);
          UIComponents.Toast(`User ${action}d`, 'success');
          Views.AdminUsersView.render(params);
        }
      };
    });
  }
};

/* ── AdminProductsView ── */
Views.AdminProductsView = {
  _page: 1,
  render(params) {
    const session = AuthModule.requireSession();
    if (!session || session.role !== 'admin') { window.location.hash = '#login'; return; }
    const app = document.getElementById('app');
    const products   = StorageService.get('dm_products') || [];
    const categories = StorageService.get('dm_categories') || [];
    const users      = StorageService.get('dm_users') || [];
    const PER_PAGE = 10;
    const total = products.length;
    const paged = products.slice((this._page - 1) * PER_PAGE, this._page * PER_PAGE);

    const rows = paged.map(p => {
      const cat    = categories.find(c => c.id === p.categoryId);
      const seller = users.find(u => u.id === p.sellerId);
      return `<tr>
        <td><strong>${p.name}</strong></td>
        <td>${cat ? cat.icon + ' ' + cat.name : '-'}</td>
        <td>${seller ? seller.email : '-'}</td>
        <td>${_fmtPrice(p.price)}</td>
        <td>${p.stock === 0 ? '<span class="badge badge-error">Out</span>' : p.stock}</td>
        <td><button class="btn btn-danger btn-sm btn-admin-del-product" data-id="${p.id}">🗑️ Delete</button></td>
      </tr>`;
    }).join('');

    app.innerHTML = `
      <div class="container">
        <div class="page-header"><h1 class="page-title">📦 Manage Products</h1></div>
        <div class="table-responsive">
          <table class="data-table">
            <thead><tr><th>Name</th><th>Category</th><th>Seller</th><th>Price</th><th>Stock</th><th>Action</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        ${UIComponents.Pagination({ total, page: this._page, perPage: PER_PAGE, onPage: (p) => { Views.AdminProductsView._page = p; Views.AdminProductsView.render(params); } })}
      </div>`;

    app.querySelectorAll('.btn-admin-del-product').forEach(btn => {
      btn.onclick = () => {
        UIComponents.Modal('Delete Product', 'Delete this product and remove it from all carts and wishlists?', () => {
          const pid = btn.dataset.id;
          // Remove product
          StorageService.set('dm_products', (StorageService.get('dm_products') || []).filter(p => p.id !== pid));
          // Cascade remove from all cart/wishlist keys
          const users2 = StorageService.get('dm_users') || [];
          users2.forEach(u => {
            const cartKey = `dm_cart_${u.id}`;
            const wlKey   = `dm_wishlist_${u.id}`;
            StorageService.update(cartKey, c => (c || []).filter(i => i.productId !== pid));
            StorageService.update(wlKey,   w => (w || []).filter(id => id !== pid));
          });
          UIComponents.Toast('Product deleted', 'success');
          Views.AdminProductsView.render(params);
        });
      };
    });
  }
};

/* ── AdminCategoriesView ── */
Views.AdminCategoriesView = {
  render(params) {
    const session = AuthModule.requireSession();
    if (!session || session.role !== 'admin') { window.location.hash = '#login'; return; }
    const app = document.getElementById('app');
    const categories = StorageService.get('dm_categories') || [];
    const products   = StorageService.get('dm_products') || [];

    const rows = categories.map(c => {
      const count = products.filter(p => p.categoryId === c.id).length;
      return `<tr>
        <td style="font-size:1.5rem">${c.icon}</td>
        <td id="cat-name-${c.id}"><strong>${c.name}</strong></td>
        <td>${count}</td>
        <td>
          <button class="btn btn-secondary btn-sm btn-edit-cat" data-id="${c.id}" data-name="${c.name}" data-icon="${c.icon}">✏️ Edit</button>
        </td>
      </tr>`;
    }).join('');

    app.innerHTML = `
      <div class="container">
        <div class="page-header"><h1 class="page-title">🗂️ Manage Categories</h1></div>
        <div style="display:grid;grid-template-columns:1fr;gap:1.5rem">
          <div>
            <div class="table-responsive">
              <table class="data-table">
                <thead><tr><th>Icon</th><th>Name</th><th>Products</th><th>Action</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
          <div class="card card-padded" style="max-width:480px">
            <h2 style="font-weight:700;margin-bottom:1rem">Add Category</h2>
            <div id="cat-alert" class="form-alert form-alert-error" style="display:none"></div>
            <div class="form-row form-row-2">
              <div class="form-group">
                <label for="new-cat-icon">Icon (emoji)</label>
                <input type="text" id="new-cat-icon" placeholder="🎀" maxlength="4" />
              </div>
              <div class="form-group">
                <label for="new-cat-name">Name <span class="required-mark">*</span></label>
                <input type="text" id="new-cat-name" placeholder="Category name" />
              </div>
            </div>
            <button class="btn btn-primary" id="btn-add-cat">Add Category</button>
          </div>
        </div>
        <div id="edit-cat-form" style="display:none" class="card card-padded" style="max-width:480px;margin-top:1rem">
          <h3 style="font-weight:700;margin-bottom:1rem">Edit Category</h3>
          <div class="form-row form-row-2">
            <div class="form-group"><label>Icon</label><input type="text" id="edit-cat-icon" maxlength="4" /></div>
            <div class="form-group"><label>Name</label><input type="text" id="edit-cat-name" /></div>
          </div>
          <input type="hidden" id="edit-cat-id" />
          <div style="display:flex;gap:0.75rem">
            <button class="btn btn-primary" id="btn-save-cat">Save</button>
            <button class="btn btn-secondary" id="btn-cancel-edit-cat">Cancel</button>
          </div>
        </div>
      </div>`;

    app.querySelector('#btn-add-cat').onclick = () => {
      const name = app.querySelector('#new-cat-name').value.trim();
      const icon = app.querySelector('#new-cat-icon').value.trim() || '🏷️';
      const alertEl = app.querySelector('#cat-alert');
      if (!name) { alertEl.textContent = 'Category name is required'; alertEl.style.display = 'block'; return; }
      alertEl.style.display = 'none';
      const cats = StorageService.get('dm_categories') || [];
      cats.push({ id: 'cat-' + Date.now(), name, icon });
      StorageService.set('dm_categories', cats);
      UIComponents.Toast('Category added', 'success');
      Views.AdminCategoriesView.render(params);
    };

    app.querySelectorAll('.btn-edit-cat').forEach(btn => {
      btn.onclick = () => {
        const editForm = app.querySelector('#edit-cat-form');
        editForm.style.display = 'block';
        app.querySelector('#edit-cat-id').value   = btn.dataset.id;
        app.querySelector('#edit-cat-name').value = btn.dataset.name;
        app.querySelector('#edit-cat-icon').value = btn.dataset.icon;
      };
    });

    const saveBtn = app.querySelector('#btn-save-cat');
    if (saveBtn) saveBtn.onclick = () => {
      const id   = app.querySelector('#edit-cat-id').value;
      const name = app.querySelector('#edit-cat-name').value.trim();
      const icon = app.querySelector('#edit-cat-icon').value.trim();
      if (!name) { UIComponents.Toast('Name required', 'error'); return; }
      const cats = StorageService.get('dm_categories') || [];
      const idx = cats.findIndex(c => c.id === id);
      if (idx !== -1) { cats[idx].name = name; cats[idx].icon = icon || cats[idx].icon; }
      StorageService.set('dm_categories', cats);
      UIComponents.Toast('Category updated', 'success');
      Views.AdminCategoriesView.render(params);
    };

    const cancelBtn = app.querySelector('#btn-cancel-edit-cat');
    if (cancelBtn) cancelBtn.onclick = () => {
      app.querySelector('#edit-cat-form').style.display = 'none';
    };
  }
};

/* ── AdminOrdersView ── */
Views.AdminOrdersView = {
  _page: 1,
  render(params) {
    const session = AuthModule.requireSession();
    if (!session || session.role !== 'admin') { window.location.hash = '#login'; return; }
    const app = document.getElementById('app');
    const allOrders = OrderModule.getAll().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const users = StorageService.get('dm_users') || [];
    const PER_PAGE = 10;
    const total = allOrders.length;
    const paged = allOrders.slice((this._page - 1) * PER_PAGE, this._page * PER_PAGE);

    const rows = paged.map(o => {
      const buyer = users.find(u => u.id === o.userId);
      const isDelivered = o.status === 'Delivered';
      const statusOptions = ['Pending', 'Processing', 'Shipped', 'Delivered'].map(s =>
        `<option value="${s}" ${o.status === s ? 'selected' : ''} ${STATUS_RANK[s] < STATUS_RANK[o.status] ? 'disabled' : ''}>${s}</option>`
      ).join('');
      return `<tr>
        <td><strong>${o.id}</strong></td>
        <td>${buyer ? buyer.email : o.userId}</td>
        <td>${_fmtPrice(o.total)}</td>
        <td>${isDelivered ? _statusBadge(o.status) : `<select class="admin-status-sel" data-oid="${o.id}">${statusOptions}</select>`}</td>
        <td>${_fmtDate(o.createdAt)}</td>
      </tr>`;
    }).join('');

    app.innerHTML = `
      <div class="container">
        <div class="page-header"><h1 class="page-title">📋 Manage Orders</h1></div>
        ${total ? `
        <div class="table-responsive">
          <table class="data-table">
            <thead><tr><th>Order ID</th><th>Buyer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        ${UIComponents.Pagination({ total, page: this._page, perPage: PER_PAGE, onPage: (p) => { Views.AdminOrdersView._page = p; Views.AdminOrdersView.render(params); } })}` :
        `<div class="empty-state"><div class="empty-state-icon">📋</div><h2 class="empty-state-title">No orders yet</h2></div>`}
      </div>`;

    app.querySelectorAll('.admin-status-sel').forEach(sel => {
      sel.onchange = () => {
        const result = OrderModule.updateStatus(sel.dataset.oid, sel.value);
        if (result.ok) UIComponents.Toast('Status updated', 'success');
        else UIComponents.Toast(result.error, 'error');
        Views.AdminOrdersView.render(params);
      };
    });
  }
};

/* ── AdminReportsView ── */
Views.AdminReportsView = {
  render(params) {
    const session = AuthModule.requireSession();
    if (!session || session.role !== 'admin') { window.location.hash = '#login'; return; }
    const app = document.getElementById('app');
    const orders     = OrderModule.getAll();
    const products   = StorageService.get('dm_products') || [];
    const categories = StorageService.get('dm_categories') || [];
    const users      = StorageService.get('dm_users') || [];

    // Aggregate units sold per product
    const soldMap = {};
    orders.forEach(o => o.items.forEach(i => {
      soldMap[i.productId] = (soldMap[i.productId] || 0) + i.quantity;
    }));

    // Top 10 by units sold
    const top10 = products.map(p => ({ ...p, sold: soldMap[p.id] || 0 }))
      .sort((a, b) => b.sold - a.sold).slice(0, 10);

    // Revenue by category
    const catRevenue = {};
    orders.forEach(o => o.items.forEach(i => {
      const p = products.find(pr => pr.id === i.productId);
      if (p) catRevenue[p.categoryId] = (catRevenue[p.categoryId] || 0) + i.unitPrice * i.quantity;
    }));

    // Top 5 sellers by revenue
    const sellerRevenue = {};
    orders.forEach(o => o.items.forEach(i => {
      const p = products.find(pr => pr.id === i.productId);
      if (p) sellerRevenue[p.sellerId] = (sellerRevenue[p.sellerId] || 0) + i.unitPrice * i.quantity;
    }));
    const top5Sellers = Object.entries(sellerRevenue)
      .sort(([, a], [, b]) => b - a).slice(0, 5)
      .map(([sid, rev]) => ({ seller: users.find(u => u.id === sid), rev }));

    app.innerHTML = `
      <div class="container">
        <div class="page-header"><h1 class="page-title">📊 Reports</h1></div>
        <div class="reports-grid">
          <div class="report-card">
            <div class="report-card-header"><h2 class="report-card-title">🏆 Top 10 Products by Units Sold</h2></div>
            <div style="padding:1rem">
              <table class="data-table">
                <thead><tr><th>Product</th><th>Category</th><th>Units Sold</th></tr></thead>
                <tbody>${top10.map(p => {
                  const cat = categories.find(c => c.id === p.categoryId);
                  return `<tr><td><strong>${p.name}</strong></td><td>${cat ? cat.name : '-'}</td><td><strong>${p.sold}</strong></td></tr>`;
                }).join('')}</tbody>
              </table>
            </div>
          </div>
          <div class="report-card">
            <div class="report-card-header"><h2 class="report-card-title">💰 Revenue by Category</h2></div>
            <div style="padding:1rem">
              <table class="data-table">
                <thead><tr><th>Category</th><th>Revenue</th></tr></thead>
                <tbody>${categories.map(c => `<tr><td>${c.icon} ${c.name}</td><td><strong>${_fmtPrice(catRevenue[c.id] || 0)}</strong></td></tr>`).join('')}</tbody>
              </table>
            </div>
          </div>
          <div class="report-card">
            <div class="report-card-header"><h2 class="report-card-title">🏪 Top 5 Sellers by Revenue</h2></div>
            <div style="padding:1rem">
              <table class="data-table">
                <thead><tr><th>Seller</th><th>Email</th><th>Revenue</th></tr></thead>
                <tbody>${top5Sellers.map(({ seller, rev }) =>
                  `<tr><td><strong>${seller ? seller.name : 'Unknown'}</strong></td><td>${seller ? seller.email : '-'}</td><td><strong>${_fmtPrice(rev)}</strong></td></tr>`
                ).join('')}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>`;
  }
};

/* ────────────────────────────────────────────────────────────
   8. ROUTES
   ──────────────────────────────────────────────────────────── */
const ROUTES = [
  { pattern: 'login',               view: 'WelcomeView',         guard: null },
  { pattern: 'home',                view: 'BuyerHomeView',        guard: 'buyer' },
  { pattern: 'category/:id',        view: 'CategoryView',         guard: 'buyer' },
  { pattern: 'search',              view: 'SearchView',           guard: 'buyer' },
  { pattern: 'product/:id',         view: 'ProductDetailView',    guard: 'buyer' },
  { pattern: 'wishlist',            view: 'WishlistView',         guard: 'buyer' },
  { pattern: 'cart',                view: 'CartView',             guard: 'buyer' },
  { pattern: 'checkout',            view: 'CheckoutView',         guard: 'buyer' },
  { pattern: 'order-confirm/:id',   view: 'OrderConfirmView',     guard: 'buyer' },
  { pattern: 'orders',              view: 'OrdersView',           guard: 'buyer' },
  { pattern: 'order/:id',           view: 'OrderDetailView',      guard: 'buyer' },
  { pattern: 'seller-dashboard',    view: 'SellerDashboardView',  guard: 'seller' },
  { pattern: 'seller-products',     view: 'SellerProductsView',   guard: 'seller' },
  { pattern: 'seller-product-form', view: 'SellerProductFormView',guard: 'seller' },
  { pattern: 'seller-orders',       view: 'SellerOrdersView',     guard: 'seller' },
  { pattern: 'admin-dashboard',     view: 'AdminDashboardView',   guard: 'admin' },
  { pattern: 'admin-users',         view: 'AdminUsersView',       guard: 'admin' },
  { pattern: 'admin-products',      view: 'AdminProductsView',    guard: 'admin' },
  { pattern: 'admin-categories',    view: 'AdminCategoriesView',  guard: 'admin' },
  { pattern: 'admin-orders',        view: 'AdminOrdersView',      guard: 'admin' },
  { pattern: 'admin-reports',       view: 'AdminReportsView',     guard: 'admin' },
];

/* ────────────────────────────────────────────────────────────
   9. Router
   ──────────────────────────────────────────────────────────── */
const Router = {
  init() {
    window.addEventListener('hashchange', () => this.handle());
    this.handle();
  },

  _parseQuery(search) {
    const params = {};
    if (!search) return params;
    const qs = search.startsWith('?') ? search.slice(1) : search;
    qs.split('&').forEach(part => {
      const [k, v] = part.split('=');
      if (k) params[decodeURIComponent(k)] = v ? decodeURIComponent(v) : '';
    });
    return params;
  },

  _matchRoute(pattern, path) {
    const patParts  = pattern.split('/');
    const pathParts = path.split('/');
    if (patParts.length !== pathParts.length) return null;
    const params = {};
    for (let i = 0; i < patParts.length; i++) {
      if (patParts[i].startsWith(':')) {
        params[patParts[i].slice(1)] = pathParts[i];
      } else if (patParts[i] !== pathParts[i]) {
        return null;
      }
    }
    return params;
  },

  handle() {
    const raw      = window.location.hash.slice(1) || 'login';
    const [pathQ, queryStr] = raw.split('?');
    const path     = pathQ || 'login';
    const query    = this._parseQuery(queryStr || '');
    const session  = AuthModule.getSession();

    // Default route redirects
    if (!session && path !== 'login') {
      window.location.hash = '#login';
      return;
    }
    if (session && path === 'login') {
      const dest = { buyer: '#home', seller: '#seller-dashboard', admin: '#admin-dashboard' };
      window.location.hash = dest[session.role] || '#home';
      return;
    }

    for (const route of ROUTES) {
      const params = this._matchRoute(route.pattern, path);
      if (params !== null) {
        // Role guard
        if (route.guard && session && session.role !== route.guard) {
          const dest = { buyer: '#home', seller: '#seller-dashboard', admin: '#admin-dashboard' };
          window.location.hash = dest[session.role] || '#home';
          return;
        }
        // Reset listing state on new category/search routes
        if (route.pattern === 'category/:id' || route.pattern === 'search') {
          _listingState = { minPrice: '', maxPrice: '', sort: 'newest', page: 1 };
        }
        const mergedParams = Object.assign({}, params, query);
        NavBar.render();
        const view = Views[route.view];
        if (view) view.render(mergedParams);
        else {
          document.getElementById('app').innerHTML = `<div class="container"><div class="empty-state"><div class="empty-state-icon">🚧</div><h2 class="empty-state-title">View not found</h2></div></div>`;
        }
        window.scrollTo(0, 0);
        return;
      }
    }

    // 404
    document.getElementById('app').innerHTML = `
      <div class="container">
        <div class="empty-state" style="padding-top:4rem">
          <div class="empty-state-icon">🔍</div>
          <h1 class="empty-state-title">Page Not Found</h1>
          <p class="empty-state-body text-muted">The page you're looking for doesn't exist.</p>
          <a href="#home" class="btn btn-primary">Go Home</a>
        </div>
      </div>`;
  }
};

/* ────────────────────────────────────────────────────────────
   10. NavBar
   ──────────────────────────────────────────────────────────── */
const NavBar = {
  render() {
    const session = AuthModule.getSession();
    const nav = document.getElementById('nav-links');
    if (!nav) return;

    if (!session) {
      nav.innerHTML = `<a href="#login" class="nav-link-btn">Sign In</a>`;
    } else if (session.role === 'buyer') {
      const cartCount = CartModule.getCount(session.userId);
      const badgeHTML = cartCount > 0 ? `<span class="cart-badge">${cartCount}</span>` : '';
      nav.innerHTML = `
        <a href="#home" class="nav-link-btn ${location.hash === '#home' ? 'active' : ''}">🏠 Home</a>
        <a href="#search" class="nav-link-btn">🔍 Search</a>
        <a href="#wishlist" class="nav-link-btn">❤️ Wishlist</a>
        <a href="#cart" class="nav-link-btn">
          <span class="cart-wrapper">🛒 Cart${badgeHTML}</span>
        </a>
        <a href="#orders" class="nav-link-btn">📦 Orders</a>
        <button class="nav-link-btn nav-logout" id="btn-nav-logout">Sign Out</button>`;
    } else if (session.role === 'seller') {
      nav.innerHTML = `
        <a href="#seller-dashboard" class="nav-link-btn">📊 Dashboard</a>
        <a href="#seller-products" class="nav-link-btn">📦 Products</a>
        <a href="#seller-orders" class="nav-link-btn">📋 Orders</a>
        <button class="nav-link-btn nav-logout" id="btn-nav-logout">Sign Out</button>`;
    } else if (session.role === 'admin') {
      nav.innerHTML = `
        <a href="#admin-dashboard" class="nav-link-btn">⚙️ Dashboard</a>
        <a href="#admin-users" class="nav-link-btn">👥 Users</a>
        <a href="#admin-products" class="nav-link-btn">📦 Products</a>
        <a href="#admin-categories" class="nav-link-btn">🗂️ Categories</a>
        <a href="#admin-orders" class="nav-link-btn">📋 Orders</a>
        <a href="#admin-reports" class="nav-link-btn">📊 Reports</a>
        <button class="nav-link-btn nav-logout" id="btn-nav-logout">Sign Out</button>`;
    }

    const logoutBtn = document.getElementById('btn-nav-logout');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        AuthModule.logout();
        window.location.hash = '#login';
      };
    }

    // Hamburger toggle
    const toggle = document.querySelector('.nav-toggle');
    if (toggle) {
      toggle.onclick = () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', !expanded);
        nav.classList.toggle('nav-open', !expanded);
      };
      // Close on nav link click (mobile)
      nav.querySelectorAll('a, button').forEach(el => {
        el.addEventListener('click', () => {
          nav.classList.remove('nav-open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }
  },

  init() {
    EventBus.on('cart:changed', () => this.render());
    EventBus.on('auth:logout', () => this.render());
    EventBus.on('auth:login', () => this.render());
  }
};

/* ────────────────────────────────────────────────────────────
   17. Init
   ──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  SeedModule.seed();
  NavBar.init();
  Router.init();
  document.getElementById('footer-year').textContent = new Date().getFullYear();
});
