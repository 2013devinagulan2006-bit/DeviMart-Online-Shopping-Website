// DEVI MART - app.js
// Zero-dependency SPA — all state persisted in localStorage
// Architecture: module-per-concern pattern (plain JS objects/classes)

'use strict';

// ============================================================
// StorageService
// Thin wrapper around localStorage with error-safe writes.
// ============================================================

const StorageService = {
  /**
   * Retrieve and parse a value from localStorage.
   * @param {string} key
   * @returns {*} parsed value, or null if absent / unparseable
   */
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[StorageService] Failed to read key "${key}":`, err);
      return null;
    }
  },

  /**
   * Serialise a value to JSON and write it to localStorage.
   * Shows a console error (and Toast once available) on quota errors.
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      const isQuota =
        err instanceof DOMException &&
        (err.name === 'QuotaExceededError' ||
          err.name === 'NS_ERROR_DOM_QUOTA_REACHED');
      if (isQuota) {
        console.error(
          '[StorageService] localStorage quota exceeded. Unable to save data.',
          err
        );
        // Toast will be called here once UIComponents.Toast is available.
        // UIComponents.Toast('Storage limit reached. Some data could not be saved.', 'error');
      } else {
        console.error(`[StorageService] Failed to write key "${key}":`, err);
      }
    }
  },

  /**
   * Remove a key from localStorage.
   * @param {string} key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error(`[StorageService] Failed to remove key "${key}":`, err);
    }
  },

  /**
   * Read a value, apply a transform function, then write the result back.
   * Atomic-ish: the read and write happen in the same call stack turn.
   * @param {string} key
   * @param {function} fn  — receives current value (or null) and returns new value
   */
  update(key, fn) {
    const current = this.get(key);
    const updated = fn(current);
    this.set(key, updated);
  },
};

// ============================================================
// EventBus — lightweight pub/sub for cross-module events
// Usage:
//   EventBus.on('cart:changed', handler)
//   EventBus.emit('cart:changed', userId)
//   EventBus.off('cart:changed', handler)
// ============================================================
const EventBus = (() => {
  // Internal registry: { [eventName]: handler[] }
  const _handlers = {};

  return {
    /**
     * Subscribe to an event.
     * @param {string} event - Event name (e.g. 'cart:changed')
     * @param {Function} handler - Callback invoked with the emitted data
     */
    on(event, handler) {
      if (typeof handler !== 'function') return;
      if (!_handlers[event]) {
        _handlers[event] = [];
      }
      _handlers[event].push(handler);
    },

    /**
     * Unsubscribe a specific handler from an event.
     * If the same handler was registered multiple times, all copies are removed.
     * @param {string} event
     * @param {Function} handler
     */
    off(event, handler) {
      if (!_handlers[event]) return;
      _handlers[event] = _handlers[event].filter(h => h !== handler);
    },

    /**
     * Emit an event, invoking all registered handlers with the provided data.
     * Handlers are called synchronously in registration order.
     * @param {string} event
     * @param {*} data - Arbitrary payload passed to each handler
     */
    emit(event, data) {
      if (!_handlers[event]) return;
      // Iterate over a shallow copy so that handlers that call off() during
      // emission do not disrupt the current dispatch loop.
      [..._handlers[event]].forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error(`EventBus: error in handler for "${event}"`, err);
        }
      });
    }
  };
})();

// ============================================================
// AuthModule — login, logout, session management
// Validates: Requirements 2.4, 2.5, 13.3
// ============================================================

const AuthModule = {
  /**
   * Attempt to log in with the given credentials.
   *
   * Steps:
   *  1. Look up users from StorageService.
   *  2. Find a matching user by email + password + role.
   *  3. If no match → return { ok: false, error: 'Invalid credentials...' }
   *  4. If found but inactive → return { ok: false, error: 'Account deactivated...' }
   *  5. If found and active → write dm_session → return { ok: true }
   *
   * @param {string} email
   * @param {string} password
   * @param {string} role  — 'buyer' | 'seller' | 'admin'
   * @returns {{ ok: boolean, error?: string }}
   */
  login(email, password, role) {
    const users = StorageService.get('dm_users') || [];

    // Step 2 — find user matching all three fields
    const user = users.find(
      u => u.email === email && u.password === password && u.role === role
    );

    // Step 3 — no matching record
    if (!user) {
      return { ok: false, error: 'Invalid credentials. Please try again.' };
    }

    // Step 4 — account deactivated
    if (user.status === 'inactive') {
      return { ok: false, error: 'Account deactivated. Contact support.' };
    }

    // Step 5 — active user: create and persist session
    const session = {
      userId:  user.id,
      email:   user.email,
      role:    user.role,
      name:    user.name,
      loginAt: new Date().toISOString(),
    };

    StorageService.set('dm_session', session);
    return { ok: true };
  },

  /**
   * Log the current user out.
   * Removes dm_session from storage and notifies subscribers.
   */
  logout() {
    StorageService.remove('dm_session');
    EventBus.emit('auth:logout', null);
  },

  /**
   * Return the active session, or null if no one is logged in.
   * @returns {Object|null}
   */
  getSession() {
    return StorageService.get('dm_session');
  },

  /**
   * Return the active session, or redirect to #login if absent.
   * Callers can check the return value for null to avoid proceeding
   * after a redirect.
   * @returns {Object|null}
   */
  requireSession() {
    const session = this.getSession();
    if (!session) {
      window.location.hash = '#login';
      return null;
    }
    return session;
  },
};

// ============================================================
// SeedModule
// First-launch data initialisation. Each guard is independent
// so a partially seeded store can be completed without
// overwriting already-present data (idempotent).
// ============================================================

const SeedModule = (() => {
  // ----------------------------------------------------------
  // Tiny UUID helper — uses crypto.randomUUID() where available,
  // falls back to a Math.random-based v4 approximation.
  // ----------------------------------------------------------
  function uuid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback: RFC 4122 v4-like UUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // ----------------------------------------------------------
  // seedUsers — writes 3 demo accounts only if dm_users absent
  // ----------------------------------------------------------
  function seedUsers() {
    const now = new Date();

    const users = [
      {
        id: uuid(),
        email: 'admin@devimart.com',
        password: 'admin123',
        role: 'admin',
        name: 'Admin',
        status: 'active',
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: uuid(),
        email: 'buyer@devimart.com',
        password: 'buyer123',
        role: 'buyer',
        name: 'Demo Buyer',
        status: 'active',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: uuid(),
        email: 'seller@devimart.com',
        password: 'seller123',
        role: 'seller',
        name: 'Demo Seller',
        status: 'active',
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    StorageService.set('dm_users', users);
  }

  // ----------------------------------------------------------
  // seedCategories — writes 11 categories only if absent
  // ----------------------------------------------------------
  function seedCategories() {
    const categoryDefs = [
      { name: 'Chocolates',             icon: '🍫' },
      { name: 'Electronics',            icon: '📱' },
      { name: 'Books',                  icon: '📚' },
      { name: 'Flowers',                icon: '🌸' },
      { name: 'Food',                   icon: '🍔' },
      { name: 'Plants',                 icon: '🪴' },
      { name: 'Fashion',                icon: '👗' },
      { name: 'Gifts',                  icon: '🎁' },
      { name: 'Footwear',               icon: '👟' },
      { name: 'Beauty & Personal Care', icon: '🧴' },
      { name: 'Grocery',                icon: '🛒' },
    ];

    const categories = categoryDefs.map(def => ({
      id: uuid(),
      name: def.name,
      icon: def.icon,
    }));

    StorageService.set('dm_categories', categories);
  }

  // ----------------------------------------------------------
  // seedProducts — writes 33+ products only if dm_products absent
  // Depends on dm_users and dm_categories already being present.
  // ----------------------------------------------------------
  function seedProducts() {
    const users      = StorageService.get('dm_users')      || [];
    const categories = StorageService.get('dm_categories') || [];

    // Resolve seller ID from seeded users
    const seller = users.find(u => u.role === 'seller');
    if (!seller) {
      console.error('[SeedModule] Cannot seed products: seller user not found.');
      return;
    }

    // Build a category lookup: name → id
    const catId = name => {
      const cat = categories.find(c => c.name === name);
      return cat ? cat.id : null;
    };

    // Helper: picsum URL keyed by a stable slug
    
    const now = new Date();
    // Slightly varied base timestamps (one per product, 1-hour gaconst img = category => {
  const img = category => {
  const images = {
    'Chocolates': 'https://images.unsplash.com/photo-1575377427642-087cf684f04d?w=400&h=300&fit=crop',
    'Electronics': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop',
    'Books': 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=300&fit=crop',
    'Flowers': 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&h=300&fit=crop',
    'Food': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
    'Plants': 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&h=300&fit=crop',
    'Fashion': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=300&fit=crop',
    'Gifts': 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=400&h=300&fit=crop',
    'Footwear': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop',
    'Beauty & Personal Care': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop',
    'Grocery': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop'
  };

  return images[category] || images['Grocery'];
};
    

    let offset = 0;
    const ts = () => new Date(now.getTime() - (offset++ * 60 * 60 * 1000)).toISOString();

    const rawProducts = [
      // ── Chocolates ──────────────────────────────────────────
      { name: 'Dark Chocolate Bar',    category: 'Chocolates', price:  149, stock: 50,
        description: 'Rich, smooth dark chocolate bar — 70% cocoa. Perfect treat at ₹149.' },
      { name: 'Milk Chocolate Box',    category: 'Chocolates', price:  299, stock: 40,
        description: 'Assorted milk chocolates in a beautiful gift box. Priced at ₹299.' },
      { name: 'Truffle Collection',    category: 'Chocolates', price:  499, stock: 30,
        description: 'Handcrafted truffle collection with 12 flavours. Only ₹499.' },
      { name: 'White Chocolate Slab',  category: 'Chocolates', price:  199, stock: 45,
        description: 'Creamy Belgian white chocolate slab. Indulge for ₹199.' },

      // ── Electronics ─────────────────────────────────────────
      { name: 'Smartphone Pro Max',    category: 'Electronics', price: 49999, stock: 20,
        description: '6.7-inch AMOLED display, 5G ready, 128 GB storage. Available at ₹49,999.' },
      { name: 'Wireless Headphones',   category: 'Electronics', price:  2999, stock: 35,
        description: 'Over-ear ANC wireless headphones, 30-hour battery. Just ₹2,999.' },
      { name: 'Laptop Ultra',          category: 'Electronics', price: 74999, stock: 15,
        description: '14-inch laptop, i5 12th Gen, 16 GB RAM, 512 GB SSD. Priced at ₹74,999.' },
      { name: 'Smart Watch',           category: 'Electronics', price:  3499, stock: 25,
        description: 'Fitness smart watch with SpO2 and GPS. Only ₹3,499.' },

      // ── Books ────────────────────────────────────────────────
      { name: 'Python Programming Guide',  category: 'Books', price:  499, stock: 60,
        description: 'Comprehensive Python guide for beginners to advanced. ₹499.' },
      { name: 'The Great Novel',           category: 'Books', price:  349, stock: 80,
        description: 'Award-winning fiction loved across generations. ₹349.' },
      { name: "Children's Story Book",     category: 'Books', price:  199, stock: 100,
        description: 'Illustrated bedtime stories for kids aged 3–8. ₹199.' },
      { name: 'History of India',          category: 'Books', price:  599, stock: 40,
        description: 'Detailed narrative of Indian history from ancient to modern. ₹599.' },

      // ── Flowers ──────────────────────────────────────────────
      { name: 'Red Rose Bouquet',      category: 'Flowers', price:  599, stock: 30,
        description: 'Fresh dozen red roses wrapped in premium foil. ₹599.' },
      { name: 'Lily Arrangement',      category: 'Flowers', price:  749, stock: 25,
        description: 'Elegant white lilies in a decorative vase. ₹749.' },
      { name: 'Mixed Flower Bundle',   category: 'Flowers', price:  899, stock: 20,
        description: 'Colourful seasonal mixed flowers bundle. ₹899.' },
      { name: 'Sunflower Bunch',       category: 'Flowers', price:  449, stock: 35,
        description: 'Cheerful sunflower bunch — brighten any room. ₹449.' },

      // ── Food ─────────────────────────────────────────────────
      { name: 'Birthday Cake',         category: 'Food', price:  799, stock: 20,
        description: 'Half-kg custom vanilla birthday cake. Delivered fresh. ₹799.' },
      { name: 'Pizza Combo',           category: 'Food', price:  549, stock: 40,
        description: 'Two medium pizzas with garlic bread combo. ₹549.' },
      { name: 'Snack Pack',            category: 'Food', price:  299, stock: 60,
        description: 'Assorted snacks pack — 10 varieties, great for parties. ₹299.' },
      { name: 'Biryani Kit',           category: 'Food', price:  399, stock: 30,
        description: 'Ready-to-cook Hyderabadi biryani kit serves 4. ₹399.' },

      // ── Plants ───────────────────────────────────────────────
      { name: 'Indoor Peace Lily',     category: 'Plants', price:  349, stock: 25,
        description: 'Low-maintenance air-purifying peace lily in a ceramic pot. ₹349.' },
      { name: 'Outdoor Fern',          category: 'Plants', price:  299, stock: 30,
        description: 'Lush outdoor fern, ideal for balconies and gardens. ₹299.' },
      { name: 'Cactus Collection',     category: 'Plants', price:  499, stock: 40,
        description: 'Set of 5 assorted mini cacti in decorative pots. ₹499.' },
      { name: 'Money Plant Hanging',   category: 'Plants', price:  249, stock: 50,
        description: 'Golden pothos (money plant) in a hanging basket. ₹249.' },

      // ── Fashion ──────────────────────────────────────────────
      { name: 'Summer Dress',          category: 'Fashion', price:  999, stock: 35,
        description: 'Breezy floral summer dress, available in M/L/XL. ₹999.' },
      { name: "Men's Formal Shirt",    category: 'Fashion', price:  799, stock: 45,
        description: 'Classic white formal shirt, 100% cotton. ₹799.' },
      { name: 'Casual T-Shirt',        category: 'Fashion', price:  399, stock: 60,
        description: 'Soft round-neck casual tee in 6 colours. ₹399.' },
      { name: 'Denim Jacket',          category: 'Fashion', price: 1499, stock: 25,
        description: 'Slim-fit denim jacket for all seasons. ₹1,499.' },

      // ── Gifts ────────────────────────────────────────────────
      { name: 'Gift Hamper Set',       category: 'Gifts', price: 1299, stock: 20,
        description: 'Premium gift hamper with chocolates, dry fruits, and candles. ₹1,299.' },
      { name: 'Personalized Mug',      category: 'Gifts', price:  349, stock: 50,
        description: 'Custom-printed ceramic mug with your photo or message. ₹349.' },
      { name: 'Luxury Gift Box',       category: 'Gifts', price: 1999, stock: 15,
        description: 'Luxury curated gift box with assorted premium items. ₹1,999.' },
      { name: 'Greeting Card Set',     category: 'Gifts', price:  199, stock: 80,
        description: 'Pack of 10 handcrafted greeting cards for all occasions. ₹199.' },

      // ── Footwear ─────────────────────────────────────────────
      { name: 'Sports Sneakers',       category: 'Footwear', price: 2499, stock: 30,
        description: 'Lightweight running sneakers with cushioned sole. ₹2,499.' },
      { name: 'Formal Leather Shoes',  category: 'Footwear', price: 3499, stock: 20,
        description: 'Genuine leather Oxford shoes for formal occasions. ₹3,499.' },
      { name: 'Casual Sandals',        category: 'Footwear', price:  799, stock: 40,
        description: 'Comfortable everyday sandals with arch support. ₹799.' },
      { name: 'Canvas Slip-Ons',       category: 'Footwear', price:  999, stock: 35,
        description: 'Minimalist canvas slip-on shoes in 4 colours. ₹999.' },

      // ── Beauty & Personal Care ───────────────────────────────
      { name: 'Skincare Kit',          category: 'Beauty & Personal Care', price: 1499, stock: 25,
        description: 'Complete 5-step skincare routine kit for all skin types. ₹1,499.' },
      { name: 'Lipstick Set',          category: 'Beauty & Personal Care', price:  699, stock: 40,
        description: 'Set of 6 long-lasting matte lipstick shades. ₹699.' },
      { name: 'Hair Care Bundle',      category: 'Beauty & Personal Care', price:  999, stock: 30,
        description: 'Shampoo + conditioner + serum bundle for healthy hair. ₹999.' },
      { name: 'Face Wash Pack',        category: 'Beauty & Personal Care', price:  349, stock: 55,
        description: 'Gentle foaming face wash pack of 3 (100 ml each). ₹349.' },

      // ── Grocery ──────────────────────────────────────────────
      { name: 'Organic Rice 5kg',      category: 'Grocery', price:  599, stock: 50,
        description: 'Premium organic Basmati rice, 5 kg pack. ₹599.' },
      { name: 'Cooking Oil Pack',      category: 'Grocery', price:  449, stock: 60,
        description: 'Cold-pressed sunflower oil, 2-litre pack. ₹449.' },
      { name: 'Mixed Spices Set',      category: 'Grocery', price:  299, stock: 70,
        description: 'Essential Indian spice set — 8 key spices in one box. ₹299.' },
      { name: 'Whole Wheat Flour 2kg', category: 'Grocery', price:  189, stock: 80,
        description: 'Stone-ground whole wheat atta, 2 kg. ₹189.' },
    ];

    const products = rawProducts.map(p => ({
      id:          uuid(),
      name:        p.name,
      description: p.description,
      price:       p.price,
      stock:       p.stock,
      categoryId:  catId(p.category),
      sellerId:    seller.id,
      imageUrl:    img(p.category),
      createdAt:   ts(),
    }));

    StorageService.set('dm_products', products);
  }

  // ----------------------------------------------------------
  // seed() — public entry point; each guard is independent
  // ----------------------------------------------------------
  function seed() {
    if (!StorageService.get('dm_users'))      seedUsers();
    if (!StorageService.get('dm_categories')) seedCategories();
    if (!StorageService.get('dm_products'))   seedProducts();
  }

  return { seed };
})();

// ============================================================
// UIComponents — Reusable renderers
// All HTML-returning methods produce strings for innerHTML injection.
// Toast and Modal directly manipulate the DOM.
// ============================================================

const UIComponents = {

  // ----------------------------------------------------------
  // HeartIcon
  // Returns a <span> containing a heart symbol.
  // @param {boolean} filled — whether the heart is filled
  // @returns {string} HTML string
  // ----------------------------------------------------------
  HeartIcon(filled) {
    return `<span class="heart-icon${filled ? ' filled' : ''}" aria-label="${filled ? 'Remove from wishlist' : 'Add to wishlist'}">♥</span>`;
  },

  // ----------------------------------------------------------
  // StarRating
  // Returns an HTML string of 5 stars, filled up to `rating`.
  // @param {number} rating   — numeric 0–5, may be decimal
  // @param {boolean} interactive — add data-rating attributes for click handling
  // @returns {string} HTML string
  // ----------------------------------------------------------
  StarRating(rating, interactive) {
    // Round rating to nearest 0.5 for half-star display
    const rounded = Math.round(rating * 2) / 2;
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      let cls;
      if (rounded >= i) {
        cls = 'star filled';
      } else if (rounded >= i - 0.5) {
        cls = 'star half';
      } else {
        cls = 'star empty';
      }
      const dataAttr = interactive ? ` data-rating="${i}" tabindex="0" role="button" aria-label="Rate ${i} star${i > 1 ? 's' : ''}"` : '';
      const symbol = (rounded >= i) ? '★' : '☆';
      stars += `<span class="${cls}"${dataAttr}>${symbol}</span>`;
    }
    const interactiveClass = interactive ? ' star-rating-interactive' : '';
    return `<span class="star-rating${interactiveClass}" aria-label="Rating: ${rounded} out of 5">${stars}</span>`;
  },

  // ----------------------------------------------------------
  // ProductCard
  // Returns a complete product card HTML string.
  // @param {Object} product — product record from dm_products
  // @param {Object|null} session — current session (for wishlist state)
  // @returns {string} HTML string
  // ----------------------------------------------------------
  ProductCard(product, session) {
    const isOutOfStock = product.stock === 0;

    // Resolve wishlist state from localStorage if buyer session exists
    let isWishlisted = false;
    if (session && session.role === 'buyer') {
      try {
        const wishlist = JSON.parse(localStorage.getItem(`dm_wishlist_${session.userId}`)) || [];
        isWishlisted = wishlist.includes(product.id);
      } catch (_) {
        isWishlisted = false;
      }
    }

    // Resolve average rating
    let avgRating = 0;
    try {
      const reviews = JSON.parse(localStorage.getItem('dm_reviews')) || [];
      const productReviews = reviews.filter(r => r.productId === product.id);
      if (productReviews.length > 0) {
        avgRating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
      }
    } catch (_) {
      avgRating = 0;
    }

    // Resolve category name
    let categoryName = '';
    try {
      const categories = JSON.parse(localStorage.getItem('dm_categories')) || [];
      const cat = categories.find(c => c.id === product.categoryId);
      categoryName = cat ? cat.name : '';
    } catch (_) {
      categoryName = '';
    }

    const imgSrc = product.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image';
    const priceFormatted = `₹${Number(product.price).toLocaleString('en-IN')}`;
    const stockBadge = isOutOfStock
      ? '<span class="badge badge-out-of-stock">Out of Stock</span>'
      : '<span class="badge badge-in-stock">In Stock</span>';
    const heartBtn = (session && session.role === 'buyer')
      ? `<button class="btn-wishlist" data-product-id="${product.id}" aria-label="${isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}" title="${isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}">${this.HeartIcon(isWishlisted)}</button>`
      : '';
    const addToCartBtn = `<button class="btn btn-primary btn-add-to-cart" data-product-id="${product.id}" ${isOutOfStock ? 'disabled aria-disabled="true"' : ''} aria-label="Add ${product.name} to cart">${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</button>`;

    return `
<article class="product-card${isOutOfStock ? ' out-of-stock' : ''}" data-product-id="${product.id}">
  <a href="#product/${product.id}" class="product-card-link" aria-label="View details for ${product.name}">
    <div class="product-card-img-wrapper">
      <img
        src="${imgSrc}"
        alt="${product.name}"
        class="product-card-img"
        loading="lazy"
        onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'"
      />
      ${stockBadge}
    </div>
    <div class="product-card-body">
      ${categoryName ? `<span class="product-card-category">${categoryName}</span>` : ''}
      <h3 class="product-card-title">${product.name}</h3>
      <div class="product-card-rating">${this.StarRating(avgRating, false)} <span class="rating-value">(${avgRating > 0 ? avgRating.toFixed(1) : 'No ratings'})</span></div>
      <p class="product-card-price">${priceFormatted}</p>
    </div>
  </a>
  <div class="product-card-actions">
    ${addToCartBtn}
    ${heartBtn}
  </div>
</article>`.trim();
  },

  // ----------------------------------------------------------
  // Toast
  // Appends a toast notification to #toast-container.
  // Auto-removes after 3000 ms.
  // @param {string} message — toast text
  // @param {'success'|'error'|'info'} type
  // ----------------------------------------------------------
Toast(message, type = 'info') {
    // Ensure container exists
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'false');
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} toast-slide-in`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    // Icon per type
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const icon = icons[type] || icons.info;

    toast.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${icon}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Close notification">×</button>
    `.trim();

    // Close button handler
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.add('toast-slide-out');
      setTimeout(() => toast.remove(), 300);
    });

    container.appendChild(toast);

    // Auto-remove after 3000 ms
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('toast-slide-out');
        setTimeout(() => toast.remove(), 300);
      }
    }, 3000);
  },

  // ----------------------------------------------------------
  // Modal
  // Renders a confirm dialog into #modal-container.
  // @param {string} title
  // @param {string} body — HTML or text for the modal body
  // @param {Function} onConfirm — called when "Confirm" is clicked
  // ----------------------------------------------------------
  Modal(title, body, onConfirm) {
    // Ensure container exists
    let container = document.getElementById('modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'modal-container';
      document.body.appendChild(container);
    }

    // Remove any existing modal
    container.innerHTML = '';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'modal-title');
    overlay.setAttribute('aria-describedby', 'modal-body');

    overlay.innerHTML = `
      <div class="modal-dialog">
        <header class="modal-header">
          <h2 class="modal-title" id="modal-title">${title}</h2>
          <button class="modal-close" aria-label="Close dialog">×</button>
        </header>
        <div class="modal-body" id="modal-body">${body}</div>
        <footer class="modal-footer">
          <button class="btn btn-secondary modal-cancel" aria-label="Cancel and close dialog">Cancel</button>
          <button class="btn btn-primary modal-confirm" aria-label="Confirm action">Confirm</button>
        </footer>
      </div>
    `.trim();

    const close = () => {
      overlay.classList.add('modal-closing');
      setTimeout(() => {
        if (overlay.parentNode) overlay.remove();
      }, 200);
    };

    // Close on overlay background click (not dialog itself)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.querySelector('.modal-cancel').addEventListener('click', close);
    overlay.querySelector('.modal-confirm').addEventListener('click', () => {
      if (typeof onConfirm === 'function') onConfirm();
      close();
    });

    // Trap focus inside modal: close on Escape key
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', onKeyDown);
      }
    };
    document.addEventListener('keydown', onKeyDown);

    container.appendChild(overlay);

    // Focus the confirm button for keyboard accessibility
    setTimeout(() => {
      const confirmBtn = overlay.querySelector('.modal-confirm');
      if (confirmBtn) confirmBtn.focus();
    }, 50);
  },

  // ----------------------------------------------------------
  // Pagination
  // Returns an HTML string with previous, page number, and next buttons.
  // Wire onclick via event delegation on the container.
  // @param {Object} opts
  // @param {number} opts.total   — total number of items
  // @param {number} opts.page    — current page (1-based)
  // @param {number} opts.perPage — items per page
  // @param {Function} opts.onPage — callback: (pageNumber) => void
  // @returns {string} HTML string
  // ----------------------------------------------------------
  Pagination({ total, page, perPage, onPage }) {
    if (!total || total <= perPage) return '';

    const totalPages = Math.ceil(total / perPage);
    if (totalPages <= 1) return '';

    // Determine visible page window (up to 5 pages)
    const windowSize = 5;
    let startPage = Math.max(1, page - Math.floor(windowSize / 2));
    let endPage = startPage + windowSize - 1;
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - windowSize + 1);
    }

    const isFirst = page === 1;
    const isLast = page === totalPages;

    // Generate a unique id for this pagination instance for event delegation
    const paginationId = `pagination-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    let buttons = '';

    // Previous button
    buttons += `<button
      class="pagination-btn pagination-prev${isFirst ? ' disabled' : ''}"
      data-page="${page - 1}"
      ${isFirst ? 'disabled aria-disabled="true"' : ''}
      aria-label="Go to previous page"
    >‹ Prev</button>`;

    // First page + ellipsis if needed
    if (startPage > 1) {
      buttons += `<button class="pagination-btn" data-page="1" aria-label="Go to page 1">1</button>`;
      if (startPage > 2) {
        buttons += `<span class="pagination-ellipsis" aria-hidden="true">…</span>`;
      }
    }

    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
      const isCurrent = i === page;
      buttons += `<button
        class="pagination-btn pagination-page${isCurrent ? ' active' : ''}"
        data-page="${i}"
        ${isCurrent ? 'aria-current="page"' : ''}
        aria-label="Go to page ${i}"
      >${i}</button>`;
    }

    // Last page + ellipsis if needed
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons += `<span class="pagination-ellipsis" aria-hidden="true">…</span>`;
      }
      buttons += `<button class="pagination-btn" data-page="${totalPages}" aria-label="Go to page ${totalPages}">${totalPages}</button>`;
    }

    // Next button
    buttons += `<button
      class="pagination-btn pagination-next${isLast ? ' disabled' : ''}"
      data-page="${page + 1}"
      ${isLast ? 'disabled aria-disabled="true"' : ''}
      aria-label="Go to next page"
    >Next ›</button>`;

    // Inline script for event delegation — uses a unique container ID
    const script = `
<script>
(function() {
  var container = document.getElementById('${paginationId}');
  if (!container) return;
  container.addEventListener('click', function(e) {
    var btn = e.target.closest('.pagination-btn');
    if (!btn || btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;
    var pg = parseInt(btn.getAttribute('data-page'), 10);
    if (!isNaN(pg)) { (window.__paginationCallbacks && window.__paginationCallbacks['${paginationId}'] && window.__paginationCallbacks['${paginationId}'](pg)); }
  });
})();
</script>`.trim();

    // Store the callback globally keyed by id so inline script can call it
    if (typeof window !== 'undefined') {
      if (!window.__paginationCallbacks) window.__paginationCallbacks = {};
      window.__paginationCallbacks[paginationId] = onPage;
    }

    return `<nav class="pagination" id="${paginationId}" aria-label="Pagination navigation" role="navigation">${buttons}</nav>${script}`;
  },

  // ----------------------------------------------------------
  // StepTracker
  // Returns an HTML string showing a multi-step progress indicator.
  // @param {string[]} steps      — ordered array of step labels
  // @param {string}   currentStep — label of the current active step
  // @returns {string} HTML string
  // ----------------------------------------------------------
  StepTracker(steps, currentStep) {
    const currentIndex = steps.indexOf(currentStep);
    let items = '';
    steps.forEach((step, idx) => {
      let cls = 'step';
      if (idx < currentIndex) cls += ' completed';
      else if (idx === currentIndex) cls += ' active';
      const ariaCurrent = idx === currentIndex ? ' aria-current="step"' : '';
      const statusLabel = idx < currentIndex ? 'Completed' : idx === currentIndex ? 'Current step' : 'Upcoming';
      items += `
        <li class="${cls}"${ariaCurrent}>
          <span class="step-indicator" aria-hidden="true">${idx < currentIndex ? '✓' : idx + 1}</span>
          <span class="step-label">${step}</span>
          <span class="sr-only">${statusLabel}</span>
        </li>`.trim();
    });
    return `<ol class="step-tracker" aria-label="Order progress">${items}</ol>`;
  },

};

// ============================================================
// Views — late-binding namespace
// Each view module sets its render function here.
// Router calls these via Views.XxxView.render(params) so that
// later tasks can override the stub with the real implementation
// without touching Router code.
// ============================================================

const Views = {};

// Stub factory — renders a minimal placeholder until the real
// view is implemented in a later task.
function _stub(viewName) {
  return function render(params) {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
      <div class="container" style="padding:2rem;text-align:center;">
        <p style="color:var(--text-muted,#757575);font-size:1rem;">
          ${viewName} — coming soon
        </p>
      </div>`.trim();
  };
}

// Register stubs for every view. Real render functions from later
// tasks will replace these assignments.
Views.WelcomeView          = { render: _stub('WelcomeView') };
Views.BuyerHomeView        = { render: _stub('BuyerHomeView') };
Views.CategoryView         = { render: _stub('CategoryView') };
Views.SearchView           = { render: _stub('SearchView') };
Views.ProductDetailView    = { render: _stub('ProductDetailView') };
Views.CartView             = { render: _stub('CartView') };
Views.CheckoutView         = { render: _stub('CheckoutView') };
Views.OrderConfirmView     = { render: _stub('OrderConfirmView') };
Views.OrdersView           = { render: _stub('OrdersView') };
Views.OrderDetailView      = { render: _stub('OrderDetailView') };
Views.WishlistView         = { render: _stub('WishlistView') };
Views.SellerDashboardView  = { render: _stub('SellerDashboardView') };
Views.SellerProductsView   = { render: _stub('SellerProductsView') };
Views.SellerProductFormView= { render: _stub('SellerProductFormView') };
Views.SellerOrdersView     = { render: _stub('SellerOrdersView') };
Views.AdminDashboardView   = { render: _stub('AdminDashboardView') };
Views.AdminUsersView       = { render: _stub('AdminUsersView') };
Views.AdminProductsView    = { render: _stub('AdminProductsView') };
Views.AdminCategoriesView  = { render: _stub('AdminCategoriesView') };
Views.AdminOrdersView      = { render: _stub('AdminOrdersView') };
Views.AdminReportsView     = { render: _stub('AdminReportsView') };

// ============================================================
// ROUTES — maps every hash pattern to a guard + render ref.
// render is a thunk that always calls through the Views namespace
// so later tasks can swap in real implementations at any time.
// ============================================================

const ROUTES = {
  '#login': {
    guard: 'guest',
    render: (p) => Views.WelcomeView.render(p),
  },
  '#buyer-home': {
    guard: 'buyer',
    render: (p) => Views.BuyerHomeView.render(p),
  },
  '#category/:id': {
    guard: 'buyer',
    render: (p) => Views.CategoryView.render(p),
  },
  '#search': {
    guard: 'buyer',
    render: (p) => Views.SearchView.render(p),
  },
  '#product/:id': {
    guard: 'buyer',
    render: (p) => Views.ProductDetailView.render(p),
  },
  '#cart': {
    guard: 'buyer',
    render: (p) => Views.CartView.render(p),
  },
  '#checkout': {
    guard: 'buyer',
    render: (p) => Views.CheckoutView.render(p),
  },
  '#order-confirm/:id': {
    guard: 'buyer',
    render: (p) => Views.OrderConfirmView.render(p),
  },
  '#orders': {
    guard: 'buyer',
    render: (p) => Views.OrdersView.render(p),
  },
  '#order/:id': {
    guard: 'buyer',
    render: (p) => Views.OrderDetailView.render(p),
  },
  '#wishlist': {
    guard: 'buyer',
    render: (p) => Views.WishlistView.render(p),
  },
  '#seller-dashboard': {
    guard: 'seller',
    render: (p) => Views.SellerDashboardView.render(p),
  },
  '#seller-products': {
    guard: 'seller',
    render: (p) => Views.SellerProductsView.render(p),
  },
  '#seller-product-form': {
    guard: 'seller',
    render: (p) => Views.SellerProductFormView.render(p),
  },
  '#seller-orders': {
    guard: 'seller',
    render: (p) => Views.SellerOrdersView.render(p),
  },
  '#admin-dashboard': {
    guard: 'admin',
    render: (p) => Views.AdminDashboardView.render(p),
  },
  '#admin-users': {
    guard: 'admin',
    render: (p) => Views.AdminUsersView.render(p),
  },
  '#admin-products': {
    guard: 'admin',
    render: (p) => Views.AdminProductsView.render(p),
  },
  '#admin-categories': {
    guard: 'admin',
    render: (p) => Views.AdminCategoriesView.render(p),
  },
  '#admin-orders': {
    guard: 'admin',
    render: (p) => Views.AdminOrdersView.render(p),
  },
  '#admin-reports': {
    guard: 'admin',
    render: (p) => Views.AdminReportsView.render(p),
  },
};

// ============================================================
// Router
// Hash-based SPA router with a Role Guard.
//
// Algorithm (navigate):
//  1. Normalise the hash; default to '#login' when absent.
//  2. Try exact match in ROUTES, then pattern match for '/:id'.
//  3. Extract params from the matched pattern.
//  4. Run Role Guard:
//       guest   → if session active, send to role dashboard
//       buyer   → if no session → #login; wrong role → #buyer-home
//       seller  → if no session → #login; wrong role → #seller-dashboard
//       admin   → if no session → #login; wrong role → #admin-dashboard
//  5. Clear #app, invoke route.render(params).
//  6. Re-render nav bar on every navigation.
//
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
// ============================================================

const Router = (() => {
  // Default landing page per role
  const ROLE_DASHBOARD = {
    buyer:  '#buyer-home',
    seller: '#seller-dashboard',
    admin:  '#admin-dashboard',
  };

  /**
   * Match a raw hash string against the ROUTES keys.
   * Returns { route, params } or null if no match.
   *
   * @param {string} rawHash  — e.g. '#product/abc-123' or '#cart?foo=1'
   * @returns {{ route: Object, params: Object }|null}
   */
  function _matchRoute(rawHash) {
    // Strip query string from the hash before matching
    const [hashPath] = rawHash.split('?');

    // 1. Exact match first
    if (ROUTES[hashPath]) {
      return { route: ROUTES[hashPath], params: {} };
    }

    // 2. Pattern match — any route containing '/:id'
    for (const pattern of Object.keys(ROUTES)) {
      if (!pattern.includes('/:id')) continue;

      // Build a regex from the pattern: '#foo/:id' → /^#foo\/([^?/]+)/
      const regexSource = pattern.replace('/:id', '/([^?/]+)');
      const re = new RegExp('^' + regexSource + '(?:\\?.*)?$');
      const match = hashPath.match(re);
      if (match) {
        return {
          route: ROUTES[pattern],
          params: { id: match[1] },
        };
      }
    }

    return null;
  }

  /**
   * Extract query-string parameters from the hash.
   * e.g. '#seller-product-form?id=abc' → { id: 'abc' }
   *
   * @param {string} rawHash
   * @returns {Object}
   */
  function _parseQuery(rawHash) {
    const qIndex = rawHash.indexOf('?');
    if (qIndex === -1) return {};
    const qs = rawHash.slice(qIndex + 1);
    const result = {};
    qs.split('&').forEach(pair => {
      const [k, v] = pair.split('=');
      if (k) result[decodeURIComponent(k)] = v ? decodeURIComponent(v) : '';
    });
    return result;
  }

  /**
   * Perform a hash-change redirect without firing another navigate cycle
   * immediately (avoids double-render on rapid redirects).
   *
   * @param {string} hash  — full hash including '#'
   */
  function _redirect(hash) {
    window.location.hash = hash;
    // navigate will be called again via hashchange listener
  }

  /**
   * Navigate to the given hash:
   *  - Match route
   *  - Enforce Role Guard
   *  - Clear #app and call render(params)
   *
   * @param {string} rawHash  — window.location.hash value
   */
  function navigate(rawHash) {
    // Normalise: ensure leading '#', default to '#login'
    const hash = rawHash && rawHash.startsWith('#') ? rawHash : '#login';

    const matched = _matchRoute(hash);

    // Unknown route → fall back to login
    if (!matched) {
      _redirect('#login');
      return;
    }

    const { route, params: pathParams } = matched;
    // Merge path params and query params (query params are supplementary)
    const queryParams = _parseQuery(hash);
    const params = Object.assign({}, queryParams, pathParams);

    // ── Role Guard ──────────────────────────────────────────────
    const session = AuthModule.getSession();

    if (route.guard === 'guest') {
      // Guest-only route: authenticated users go to their dashboard
      if (session) {
        _redirect(ROLE_DASHBOARD[session.role] || '#login');
        return;
      }
    } else {
      // Protected route: must have a session
      if (!session) {
        _redirect('#login');
        return;
      }
      // Role must match the route's required guard
      if (session.role !== route.guard) {
        _redirect(ROLE_DASHBOARD[session.role] || '#login');
        return;
      }
    }
    // ── End Role Guard ──────────────────────────────────────────

    // Clear the app mount point
    const appEl = document.getElementById('app');
    if (appEl) appEl.innerHTML = '';

    // Render the matched view
    try {
      route.render(params);
    } catch (err) {
      console.error('[Router] Error rendering view for', hash, err);
      if (appEl) {
        appEl.innerHTML = `
          <div class="container" style="padding:2rem;text-align:center;">
            <p style="color:var(--text-muted,#757575);">
              Something went wrong. <a href="#login">Go home</a>
            </p>
          </div>`.trim();
      }
    }

    // Refresh the nav bar on every navigation
    NavBar.render();
  }

  /**
   * Bootstrap the router:
   *  - Read the current hash (default #login if absent)
   *  - Navigate to it
   *  - Subscribe to future hash changes
   */
  function init() {
    const initialHash = window.location.hash || '#login';
    navigate(initialHash);

    window.addEventListener('hashchange', () => {
      navigate(window.location.hash || '#login');
    });
  }

  return { navigate, init };
})();

// ============================================================
// NavBar
// Renders role-appropriate navigation links into #nav-links.
// Subscribes to EventBus events so it refreshes automatically.
//
// Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
// ============================================================

const NavBar = (() => {

  // ----------------------------------------------------------
  // _getCartCount — safe cart count reader.
  // CartModule may not yet be defined during early init, so we
  // fall back to a direct localStorage read.
  // ----------------------------------------------------------
  function _getCartCount(userId) {
    if (typeof CartModule !== 'undefined' && CartModule && typeof CartModule.getCount === 'function') {
      return CartModule.getCount(userId);
    }
    // Fallback: read dm_cart_{userId} directly
    try {
      const items = JSON.parse(localStorage.getItem(`dm_cart_${userId}`)) || [];
      return items.length;
    } catch (_) {
      return 0;
    }
  }

  // ----------------------------------------------------------
  // _buildLinks — returns role-appropriate nav link HTML
  // ----------------------------------------------------------
  function _buildLinks(session) {
    if (!session) return '';

    if (session.role === 'buyer') {
      const cartCount = _getCartCount(session.userId);
      const badge = cartCount > 0
        ? `<span class="cart-badge" aria-label="${cartCount} items in cart">${cartCount}</span>`
        : '';
      return `
        <a href="#buyer-home"  class="nav-link" aria-label="Home">Home</a>
        <a href="#search"      class="nav-link" aria-label="Categories">Categories</a>
        <a href="#search"      class="nav-link" aria-label="Search">Search</a>
        <a href="#cart"        class="nav-link nav-link-cart" aria-label="Cart">
          Cart${badge}
        </a>
        <a href="#wishlist"    class="nav-link" aria-label="Wishlist">Wishlist</a>
        <a href="#orders"      class="nav-link" aria-label="My Orders">My Orders</a>
        <span class="nav-user" aria-label="Logged in as ${session.name || session.email}">${session.name || session.email}</span>
      `.trim();
    }

    if (session.role === 'seller') {
      return `
        <a href="#seller-dashboard"    class="nav-link" aria-label="Dashboard">Dashboard</a>
        <a href="#seller-products"     class="nav-link" aria-label="My Products">My Products</a>
        <a href="#seller-product-form" class="nav-link" aria-label="Add Product">Add Product</a>
        <a href="#seller-orders"       class="nav-link" aria-label="Orders">Orders</a>
        <span class="nav-user" aria-label="Logged in as ${session.name || session.email}">${session.name || session.email}</span>
      `.trim();
    }

    if (session.role === 'admin') {
      return `
        <a href="#admin-dashboard"   class="nav-link" aria-label="Dashboard">Dashboard</a>
        <a href="#admin-users"       class="nav-link" aria-label="Users">Users</a>
        <a href="#admin-products"    class="nav-link" aria-label="Products">Products</a>
        <a href="#admin-categories"  class="nav-link" aria-label="Categories">Categories</a>
        <a href="#admin-orders"      class="nav-link" aria-label="Orders">Orders</a>
        <a href="#admin-reports"     class="nav-link" aria-label="Reports">Reports</a>
        <span class="nav-user" aria-label="Logged in as ${session.name || session.email}">${session.name || session.email}</span>
      `.trim();
    }

    return '';
  }

  // ----------------------------------------------------------
  // render — writes into #nav-links and wires the hamburger
  // ----------------------------------------------------------
  function render() {
    const session = AuthModule.getSession();

    // ── Logo / brand area ──────────────────────────────────────
    const logoEl = document.getElementById('nav-logo');
    if (logoEl) {
      const dest = session ? (
        session.role === 'buyer'  ? '#buyer-home' :
        session.role === 'seller' ? '#seller-dashboard' :
        '#admin-dashboard'
      ) : '#login';
      logoEl.href = dest;
    }

    // ── Nav links ──────────────────────────────────────────────
    const linksEl = document.getElementById('nav-links');
    if (!linksEl) return;

    if (!session) {
      linksEl.innerHTML = '';
      // Ensure hamburger is hidden when no session
      const hamburger = document.getElementById('nav-toggle');
      if (hamburger) hamburger.style.display = 'none';
      return;
    }

    const logoutBtn = `<button class="btn btn-logout nav-logout" id="nav-logout-btn" aria-label="Logout">Logout</button>`;
    linksEl.innerHTML = _buildLinks(session) + logoutBtn;

    // Wire logout button
    const logoutBtnEl = document.getElementById('nav-logout-btn');
    if (logoutBtnEl) {
      logoutBtnEl.addEventListener('click', () => {
        AuthModule.logout();
        // Auth:logout event triggers re-render; also navigate to login
        window.location.hash = '#login';
      });
    }

    // Show hamburger toggle
    const hamburger = document.getElementById('nav-toggle');
    if (hamburger) {
      hamburger.style.display = '';

      // Wire hamburger click only once (guard with data attribute)
      if (!hamburger.dataset.wired) {
        hamburger.dataset.wired = 'true';
        hamburger.addEventListener('click', () => {
          linksEl.classList.toggle('nav-open');
          const expanded = linksEl.classList.contains('nav-open');
          hamburger.setAttribute('aria-expanded', String(expanded));
        });
      }
    }

    // Close mobile menu on any nav-link click
    linksEl.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        linksEl.classList.remove('nav-open');
        if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ----------------------------------------------------------
  // EventBus subscriptions — keep badge + state in sync
  // ----------------------------------------------------------
  EventBus.on('cart:changed', () => render());
  EventBus.on('auth:logout',  () => render());

  return { render };
})();

// ============================================================
// WishlistModule — add/remove/toggle wishlist items per buyer
// Storage key: dm_wishlist_{userId}  →  string[] of productId values
// Validates: Requirements 8.1, 8.2, 8.3
// ============================================================

const WishlistModule = {
  /**
   * Return the list of product IDs in a buyer's wishlist.
   * @param {string} userId
   * @returns {string[]}
   */
  getItems(userId) {
    return StorageService.get(`dm_wishlist_${userId}`) || [];
  },

  /**
   * Add a product to the wishlist.
   * No-op if the product is already present (prevents duplicates).
   * @param {string} userId
   * @param {string} productId
   */
  add(userId, productId) {
    const key = `dm_wishlist_${userId}`;
    const items = StorageService.get(key) || [];
    if (items.includes(productId)) return; // already present — no-op
    items.push(productId);
    StorageService.set(key, items);
  },

  /**
   * Remove a product from the wishlist.
   * No-op if the product is not present.
   * @param {string} userId
   * @param {string} productId
   */
  remove(userId, productId) {
    const key = `dm_wishlist_${userId}`;
    const items = StorageService.get(key) || [];
    StorageService.set(key, items.filter(id => id !== productId));
  },

  /**
   * Toggle a product's presence in the wishlist.
   * Adds it if absent, removes it if present.
   * @param {string} userId
   * @param {string} productId
   */
  toggle(userId, productId) {
    if (this.has(userId, productId)) {
      this.remove(userId, productId);
    } else {
      this.add(userId, productId);
    }
  },

  /**
   * Check whether a product is in the buyer's wishlist.
   * @param {string} userId
   * @param {string} productId
   * @returns {boolean}
   */
  has(userId, productId) {
    const items = StorageService.get(`dm_wishlist_${userId}`) || [];
    return items.includes(productId);
  },
};

// ============================================================
// OrderModule — create orders, track status
// Validates: Requirements 7.7, 9.3, 12.3, 15.4
// ============================================================

const OrderModule = (() => {
  // ----------------------------------------------------------
  // UUID helper — same pattern as SeedModule
  // ----------------------------------------------------------
  function uuid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Status rank map — used for forward-only progression guard
  const STATUS_RANK = { Pending: 0, Processing: 1, Shipped: 2, Delivered: 3 };

  return {
    /**
     * Determine whether a status transition is a valid forward move.
     * @param {string} currentStatus
     * @param {string} newStatus
     * @returns {boolean}
     */
    canAdvance(currentStatus, newStatus) {
      return (
        STATUS_RANK[newStatus] !== undefined &&
        STATUS_RANK[currentStatus] !== undefined &&
        STATUS_RANK[newStatus] > STATUS_RANK[currentStatus]
      );
    },

    /**
     * Create a new order from the buyer's cart.
     *
     * Steps:
     *  1. Read products from dm_products.
     *  2. For each CartItem, snapshot name/price/sellerId and decrement stock.
     *  3. Write updated dm_products back.
     *  4. Compute total.
     *  5. Build Order object and append to dm_orders.
     *  6. Clear the buyer's cart and emit 'cart:changed'.
     *  7. Return the created Order.
     *
     * @param {string} buyerId
     * @param {Array<{productId: string, quantity: number}>} cartItems
     * @param {{ deliveryName: string, deliveryAddress: string, city: string, postalCode: string, paymentMethod: 'cod'|'card' }} deliveryInfo
     * @returns {Object} the created Order
     */
    create(buyerId, cartItems, deliveryInfo) {
      const products = StorageService.get('dm_products') || [];

      // Build order items, snapshot prices, decrement stock
      const orderItems = cartItems.map(({ productId, quantity }) => {
        const product = products.find(p => p.id === productId);
        if (!product) {
          console.error(`[OrderModule] Product not found: ${productId}`);
          return null;
        }

        // Decrement stock, floor at 0
        product.stock = Math.max(0, product.stock - quantity);

        return {
          productId:   product.id,
          productName: product.name,
          sellerId:    product.sellerId,
          unitPrice:   product.price,
          quantity,
        };
      }).filter(Boolean); // remove nulls for missing products

      // Persist updated stock values
      StorageService.set('dm_products', products);

      // Compute grand total
      const total = orderItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      );

      // Build the Order record
      const order = {
        id:              uuid(),
        buyerId,
        items:           orderItems,
        deliveryName:    deliveryInfo.deliveryName,
        deliveryAddress: deliveryInfo.deliveryAddress,
        city:            deliveryInfo.city,
        postalCode:      deliveryInfo.postalCode,
        paymentMethod:   deliveryInfo.paymentMethod,
        status:          'Pending',
        total,
        createdAt:       new Date().toISOString(),
      };

      // Persist order
      StorageService.update('dm_orders', (existing) => {
        const orders = existing || [];
        orders.push(order);
        return orders;
      });

      // Clear the buyer's cart
      StorageService.remove(`dm_cart_${buyerId}`);
      EventBus.emit('cart:changed', buyerId);

      return order;
    },

    /**
     * Return all orders placed by a specific buyer, sorted newest-first.
     * @param {string} buyerId
     * @returns {Object[]}
     */
    getByBuyer(buyerId) {
      const orders = StorageService.get('dm_orders') || [];
      return orders
        .filter(o => o.buyerId === buyerId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    /**
     * Return all orders that contain at least one item belonging to the seller,
     * sorted newest-first.
     * @param {string} sellerId
     * @returns {Object[]}
     */
    getBySeller(sellerId) {
      const orders = StorageService.get('dm_orders') || [];
      return orders
        .filter(o => o.items.some(item => item.sellerId === sellerId))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    /**
     * Return all orders sorted newest-first.
     * @returns {Object[]}
     */
    getAll() {
      const orders = StorageService.get('dm_orders') || [];
      return [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    /**
     * Return a single order by ID, or null if not found.
     * @param {string} orderId
     * @returns {Object|null}
     */
    getById(orderId) {
      const orders = StorageService.get('dm_orders') || [];
      return orders.find(o => o.id === orderId) || null;
    },

    /**
     * Advance an order to a new status (forward-only).
     * @param {string} orderId
     * @param {string} newStatus — 'Processing' | 'Shipped' | 'Delivered'
     * @returns {{ ok: boolean, error?: string }}
     */
    updateStatus(orderId, newStatus) {
      const orders = StorageService.get('dm_orders') || [];
      const index = orders.findIndex(o => o.id === orderId);

      if (index === -1) {
        return { ok: false, error: 'Order not found.' };
      }

      const order = orders[index];

      if (!this.canAdvance(order.status, newStatus)) {
        return { ok: false, error: 'Order status cannot be reversed.' };
      }

      orders[index] = { ...order, status: newStatus };
      StorageService.set('dm_orders', orders);
      return { ok: true };
    },
  };
})();

// ============================================================
// CartModule — per-buyer cart management
// Storage key: dm_cart_{userId}
// Validates: Requirements 7.1, 7.2, 7.4, 7.5
// ============================================================

const CartModule = {
  // ----------------------------------------------------------
  // _key — returns the localStorage key for a buyer's cart
  // ----------------------------------------------------------
  _key(userId) {
    return `dm_cart_${userId}`;
  },

  /**
   * Retrieve all cart items for a buyer.
   * @param {string} userId
   * @returns {CartItem[]}  — array of { productId, quantity }
   */
  getItems(userId) {
    return StorageService.get(this._key(userId)) || [];
  },

  /**
   * Add a product to the cart.
   * If the product is already present, quantity is merged (incremented).
   * If the product is new, a fresh CartItem is pushed.
   * Emits 'cart:changed' after writing.
   *
   * @param {string} userId
   * @param {string} productId
   * @param {number} quantity — amount to add (must be >= 1)
   */
  addItem(userId, productId, quantity) {
    const qty = Number(quantity) || 1;
    const items = this.getItems(userId);
    const existing = items.find(i => i.productId === productId);

    if (existing) {
      existing.quantity += qty;
    } else {
      items.push({ productId, quantity: qty });
    }

    StorageService.set(this._key(userId), items);
    EventBus.emit('cart:changed', userId);
  },

  /**
   * Remove a product from the cart entirely.
   * Emits 'cart:changed' after writing.
   *
   * @param {string} userId
   * @param {string} productId
   */
  removeItem(userId, productId) {
    const items = this.getItems(userId).filter(i => i.productId !== productId);
    StorageService.set(this._key(userId), items);
    EventBus.emit('cart:changed', userId);
  },

  /**
   * Set the quantity for an existing cart item.
   * If qty <= 0, the item is removed.
   * Emits 'cart:changed' after writing.
   *
   * @param {string} userId
   * @param {string} productId
   * @param {number} qty — new quantity
   */
  updateQuantity(userId, productId, qty) {
    const newQty = Number(qty);
    let items = this.getItems(userId);

    if (newQty <= 0) {
      items = items.filter(i => i.productId !== productId);
    } else {
      const item = items.find(i => i.productId === productId);
      if (item) {
        item.quantity = newQty;
      }
    }

    StorageService.set(this._key(userId), items);
    EventBus.emit('cart:changed', userId);
  },

  /**
   * Remove all items from a buyer's cart.
   * Emits 'cart:changed' after writing.
   *
   * @param {string} userId
   */
  clear(userId) {
    StorageService.set(this._key(userId), []);
    EventBus.emit('cart:changed', userId);
  },

  /**
   * Return the number of distinct product entries in the cart
   * (i.e. the length of the CartItem array, not the sum of quantities).
   *
   * @param {string} userId
   * @returns {number}
   */
  getCount(userId) {
    return this.getItems(userId).length;
  },

  /**
   * Return the grand total: sum of (unitPrice × quantity) for every item.
   * Product prices are resolved from dm_products.
   * Items referencing a product that no longer exists are skipped.
   *
   * @param {string} userId
   * @returns {number}
   */
  getTotal(userId) {
    const items    = this.getItems(userId);
    const products = StorageService.get('dm_products') || [];

    return items.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return sum;
      return sum + product.price * item.quantity;
    }, 0);
  },
};

// ============================================================
// ReviewModule
// Handles product reviews: submission with validation,
// retrieval, average rating, and purchase/review checks.
//
// Storage key: dm_reviews  →  Review[]
//
// Review schema:
//   { id, productId, buyerId, rating (1–5), comment, createdAt }
//
// Validates: Requirements 6.5, 6.6
// ============================================================

const ReviewModule = {
  // ----------------------------------------------------------
  // Internal UUID helper (mirrors the one in SeedModule)
  // ----------------------------------------------------------
  _uuid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  // ----------------------------------------------------------
  // hasPurchased
  // Returns true if the buyer has at least one order that
  // contains the given product (any order status qualifies).
  //
  // @param {string} buyerId
  // @param {string} productId
  // @returns {boolean}
  // ----------------------------------------------------------
  hasPurchased(buyerId, productId) {
    const orders = StorageService.get('dm_orders') || [];
    return orders.some(
      order =>
        order.buyerId === buyerId &&
        Array.isArray(order.items) &&
        order.items.some(item => item.productId === productId)
    );
  },

  // ----------------------------------------------------------
  // hasReviewed
  // Returns true if the buyer has already submitted a review
  // for the given product.
  //
  // @param {string} buyerId
  // @param {string} productId
  // @returns {boolean}
  // ----------------------------------------------------------
  hasReviewed(buyerId, productId) {
    const reviews = StorageService.get('dm_reviews') || [];
    return reviews.some(
      r => r.buyerId === buyerId && r.productId === productId
    );
  },

  // ----------------------------------------------------------
  // submit
  // Validates purchase history, rating range, and comment,
  // then writes the review record to dm_reviews.
  //
  // Validation order:
  //   1. hasPurchased check  → { ok: false, error: '...' }
  //   2. rating 1–5 integer  → { ok: false, error: '...' }
  //   3. non-empty comment   → { ok: false, error: '...' }
  //
  // @param {string} buyerId
  // @param {string} productId
  // @param {number} rating    — must be integer 1–5
  // @param {string} comment   — must be non-empty / non-whitespace
  // @returns {{ ok: boolean, error?: string }}
  // ----------------------------------------------------------
  submit(buyerId, productId, rating, comment) {
    // 1. Purchase check
    if (!this.hasPurchased(buyerId, productId)) {
      return {
        ok: false,
        error: 'You can only review products you have purchased.',
      };
    }

    // 2. Rating validation — must be an integer in [1, 5]
    const ratingNum = Number(rating);
    if (
      !Number.isInteger(ratingNum) ||
      ratingNum < 1 ||
      ratingNum > 5
    ) {
      return {
        ok: false,
        error: 'Please select a rating between 1 and 5.',
      };
    }

    // 3. Comment validation — non-empty, non-whitespace
    if (typeof comment !== 'string' || comment.trim() === '') {
      return {
        ok: false,
        error: 'Please enter a review comment.',
      };
    }

    // 4. Build and persist the review record
    const review = {
      id:        this._uuid(),
      productId: productId,
      buyerId:   buyerId,
      rating:    ratingNum,
      comment:   comment.trim(),
      createdAt: new Date().toISOString(),
    };

    StorageService.update('dm_reviews', current => {
      const reviews = Array.isArray(current) ? current : [];
      return [...reviews, review];
    });

    return { ok: true };
  },

  // ----------------------------------------------------------
  // getByProduct
  // Returns all reviews for a given product, sorted by
  // createdAt descending (most recent first).
  //
  // @param {string} productId
  // @returns {Review[]}
  // ----------------------------------------------------------
  getByProduct(productId) {
    const reviews = StorageService.get('dm_reviews') || [];
    return reviews
      .filter(r => r.productId === productId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  // ----------------------------------------------------------
  // getAverageRating
  // Returns the arithmetic mean of all review ratings for the
  // product, rounded to one decimal place. Returns 0 if there
  // are no reviews.
  //
  // @param {string} productId
  // @returns {number}
  // ----------------------------------------------------------
  getAverageRating(productId) {
    const reviews = this.getByProduct(productId);
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    return Math.round((total / reviews.length) * 10) / 10;
  },
};

// ============================================================
// WelcomeView — Login / landing page
// Renders the pink hero with brand identity and login form.
// Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
// ============================================================

Views.WelcomeView = {
  render(params) {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
<div class="welcome-page">
  <div class="welcome-inner">
    <div class="welcome-branding">
      <div class="welcome-logo" aria-hidden="true">💗</div>
      <h1 class="welcome-title">DEVI MART</h1>
      <p class="welcome-tagline">Your One-Stop Online Shopping Marketplace</p>
      <p class="welcome-tagline">One Mart. Everything You Need. 💗</p>
    </div>

    <div class="login-card">
      <h2 class="login-card-title">Welcome Back 💗</h2>
      <form id="login-form" novalidate>

        <!-- Role selector -->
        <div class="form-group">
          <label>Select Role</label>
          <div class="role-selector" role="group" aria-label="Select your role">
            <button type="button" class="role-btn active" data-role="buyer" aria-pressed="true">
              👤 Buyer
            </button>
            <button type="button" class="role-btn" data-role="seller" aria-pressed="false">
              🛍️ Seller
            </button>
            <button type="button" class="role-btn" data-role="admin" aria-pressed="false">
              👑 Admin
            </button>
          </div>
        </div>

        <!-- Email field -->
        <div class="form-group">
          <label for="login-email">
            Email / Username
            <span class="required-mark" aria-hidden="true">*</span>
          </label>
          <input
            type="email"
            id="login-email"
            name="email"
            placeholder="Enter your email"
            autocomplete="username"
            required
            aria-required="true"
          />
          <span class="field-error" id="login-email-error" role="alert" aria-live="polite"></span>
        </div>

        <!-- Password field -->
        <div class="form-group">
          <label for="login-password">
            Password
            <span class="required-mark" aria-hidden="true">*</span>
          </label>
          <input
            type="password"
            id="login-password"
            name="password"
            placeholder="Enter your password"
            autocomplete="current-password"
            required
            aria-required="true"
          />
          <span class="field-error" id="login-password-error" role="alert" aria-live="polite"></span>
        </div>

        <!-- Form-level error -->
        <div id="login-form-error" class="form-alert form-alert-error" style="display:none;" role="alert"></div>

        <!-- Submit -->
        <button type="submit" class="btn btn-primary btn-full">Login</button>

        <!-- Demo credentials hint -->
        <div class="login-links" style="text-align:center;margin-top:1rem;">
          <p style="font-size:0.875rem;color:var(--text-muted);">
            Demo accounts: buyer@devimart.com / buyer123 &nbsp;|&nbsp;
            seller@devimart.com / seller123 &nbsp;|&nbsp;
            admin@devimart.com / admin123
          </p>
        </div>

      </form>
    </div>
  </div>
</div>`.trim();

    // ── Role selector interaction ────────────────────────────────
    const roleBtns = app.querySelectorAll('.role-btn');
    roleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        roleBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      });
    });

    // ── Form submit ──────────────────────────────────────────────
    const form          = app.querySelector('#login-form');
    const emailInput    = app.querySelector('#login-email');
    const passwordInput = app.querySelector('#login-password');
    const emailError    = app.querySelector('#login-email-error');
    const passwordError = app.querySelector('#login-password-error');
    const formError     = app.querySelector('#login-form-error');

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const email    = emailInput.value.trim();
      const password = passwordInput.value;
      const activeRoleBtn = app.querySelector('.role-btn.active');
      const role = activeRoleBtn ? activeRoleBtn.dataset.role : 'buyer';

      // Clear previous errors
      emailError.textContent    = '';
      passwordError.textContent = '';
      formError.style.display   = 'none';
      formError.textContent     = '';

      // Field-level validation
      let hasError = false;

      if (!email) {
        emailError.textContent = 'Email is required.';
        hasError = true;
      }

      if (!password) {
        passwordError.textContent = 'Password is required.';
        hasError = true;
      }

      if (hasError) return; // do NOT call AuthModule.login

      // Attempt login
      const result = AuthModule.login(email, password, role);

      if (!result.ok) {
        // Preserve email value; show error banner
        formError.textContent  = result.error || 'Login failed. Please try again.';
        formError.style.display = 'block';
        passwordInput.value    = ''; // clear password for re-entry
        passwordInput.focus();
        return;
      }

      // Success — navigate to role dashboard
      const dashboards = {
        buyer:  '#buyer-home',
        seller: '#seller-dashboard',
        admin:  '#admin-dashboard',
      };
      window.location.hash = dashboards[role] || '#login';
    });
  },
};

// ============================================================
// BuyerHomeView — Hero banner, featured products, category grid
// Validates: Requirements 5.1
// ============================================================

Views.BuyerHomeView = {
  render(params) {
    const app = document.getElementById('app');
    if (!app) return;

    const session    = AuthModule.getSession();
    const products   = StorageService.get('dm_products')   || [];
    const categories = StorageService.get('dm_categories') || [];

    // Get the 8 most recent products (sort by createdAt descending)
    const featured = [...products]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);

    // Build product cards HTML
    const productCardsHtml = featured.length > 0
      ? featured.map(p => UIComponents.ProductCard(p, session)).join('')
      : '<p class="text-muted" style="grid-column:1/-1;text-align:center;">No products available yet.</p>';

    // Build category cards HTML
    const categoryCardsHtml = categories.length > 0
      ? categories.map(cat => `
          <a href="#category/${cat.id}" class="category-card" aria-label="Browse ${cat.name}">
            <span class="category-icon" aria-hidden="true">${cat.icon}</span>
            <span class="category-name">${cat.name}</span>
          </a>`.trim()).join('')
      : '<p class="text-muted" style="text-align:center;">No categories found.</p>';

    app.innerHTML = `
<div class="container page-section">

  <!-- Hero Banner -->
  <section class="hero-banner">
    <div class="hero-content">
      <h1 class="hero-title">Welcome to Devi Mart! 💗</h1>
      <p class="hero-subtitle">One Mart. Everything You Need.</p>
      <a href="#search" class="btn btn-primary btn-lg">Shop Now 🛍️</a>
    </div>
  </section>

  <!-- Featured Products -->
  <section class="page-section" id="featured-section">
    <h2 class="section-title">✨ Featured Products</h2>
    <div class="product-grid" id="featured-grid">
      ${productCardsHtml}
    </div>
  </section>

  <!-- Categories -->
  <section class="page-section">
    <h2 class="section-title">🛍️ Shop by Category</h2>
    <div class="category-grid">
      ${categoryCardsHtml}
    </div>
  </section>

</div>`.trim();

    // ── Event delegation on the featured products grid ────────────

    const grid = app.querySelector('#featured-grid');
    if (!grid || !session) return;

    grid.addEventListener('click', (e) => {
      // ── Add to Cart ──────────────────────────────────────────────
      const addBtn = e.target.closest('.btn-add-to-cart');
      if (addBtn && !addBtn.disabled) {
        const productId = addBtn.dataset.productId;
        if (productId) {
          CartModule.addItem(session.userId, productId, 1);
          UIComponents.Toast('Added to cart! 🛒', 'success');
        }
        return;
      }

      // ── Wishlist toggle ─────────────────────────────────────────
      const wishlistBtn = e.target.closest('.btn-wishlist');
      if (wishlistBtn) {
        const productId = wishlistBtn.dataset.productId;
        if (productId) {
          WishlistModule.toggle(session.userId, productId);
          // Re-render the featured section to reflect updated heart state
          Views.BuyerHomeView._renderFeaturedGrid(grid, session);
        }
        return;
      }
    });
  },

  // ----------------------------------------------------------
  // _renderFeaturedGrid
  // Re-renders just the featured grid (used after wishlist toggle).
  // @param {HTMLElement} grid  — the #featured-grid element
  // @param {Object}      session
  // ----------------------------------------------------------
  _renderFeaturedGrid(grid, session) {
    const products = StorageService.get('dm_products') || [];
    const featured = [...products]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);

    grid.innerHTML = featured.length > 0
      ? featured.map(p => UIComponents.ProductCard(p, session)).join('')
      : '<p class="text-muted" style="grid-column:1/-1;text-align:center;">No products available yet.</p>';
  },
};

// ============================================================
// WishlistView — Buyer's wishlist page
// Lists all wishlisted products with Add to Cart and Remove actions.
// Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
// ============================================================

Views.WishlistView = {
  render(params) {
    const app = document.getElementById('app');
    if (!app) return;

    const session = AuthModule.getSession();
    if (!session) {
      window.location.hash = '#login';
      return;
    }

    // Get wishlist product IDs and resolve full product objects
    const wishlistIds = WishlistModule.getItems(session.userId);
    const allProducts = StorageService.get('dm_products') || [];
    const wishlistProducts = wishlistIds
      .map(id => allProducts.find(p => p.id === id))
      .filter(Boolean); // skip any orphaned IDs (deleted products)

    // ── Empty state ──────────────────────────────────────────────
    if (wishlistProducts.length === 0) {
      app.innerHTML = `
<div class="container page-section">
  <div class="page-header">
    <h1 class="page-title">❤️ My Wishlist</h1>
  </div>
  <div class="empty-state">
    <div class="empty-state-icon">❤️</div>
    <h2 class="empty-state-title">Your wishlist is empty</h2>
    <p class="empty-state-body">Save items you love for later.</p>
    <a href="#buyer-home" class="btn btn-primary">Continue Shopping</a>
  </div>
</div>`.trim();
      return;
    }

    // ── Build product cards ─────────────────────────────────────
    const cardsHtml = wishlistProducts.map(product => {
      const isOutOfStock = product.stock === 0;
      const imgSrc = product.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image';
      const priceFormatted = `₹${Number(product.price).toLocaleString('en-IN')}`;
      const stockBadge = isOutOfStock
        ? '<span class="badge badge-out-of-stock">Out of Stock</span>'
        : '<span class="badge badge-in-stock">In Stock</span>';

      return `
<div class="product-card${isOutOfStock ? ' out-of-stock' : ''}" data-product-id="${product.id}">
  <a href="#product/${product.id}" class="product-card-link" aria-label="View details for ${product.name}">
    <div class="product-card-img-wrapper">
      <img
        src="${imgSrc}"
        alt="${product.name}"
        class="product-card-img"
        loading="lazy"
        onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'"
      />
      ${stockBadge}
    </div>
    <div class="product-card-body">
      <h3 class="product-card-title">${product.name}</h3>
      <p class="product-card-price">${priceFormatted}</p>
    </div>
  </a>
  <div class="product-card-actions">
    <button
      class="btn btn-primary btn-sm btn-add-to-cart"
      data-product-id="${product.id}"
      ${isOutOfStock ? 'disabled aria-disabled="true"' : ''}
      aria-label="Add ${product.name} to cart"
    >${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</button>
    <button
      class="btn btn-ghost btn-wishlist-remove"
      data-product-id="${product.id}"
      aria-label="Remove ${product.name} from wishlist"
    >❤️ Remove</button>
  </div>
</div>`.trim();
    }).join('');

    app.innerHTML = `
<div class="container page-section">
  <div class="page-header">
    <h1 class="page-title">❤️ My Wishlist</h1>
  </div>
  <div class="product-grid" id="wishlist-grid">
    ${cardsHtml}
  </div>
  <p class="text-muted" style="margin-top:1rem;">${wishlistProducts.length} item${wishlistProducts.length !== 1 ? 's' : ''} in your wishlist</p>
</div>`.trim();

    // ── Event delegation ────────────────────────────────────────
    const grid = app.querySelector('#wishlist-grid');
    if (!grid) return;

    grid.addEventListener('click', (e) => {
      // ── Add to Cart ──────────────────────────────────────────
      const addBtn = e.target.closest('.btn-add-to-cart');
      if (addBtn && !addBtn.disabled && addBtn.getAttribute('aria-disabled') !== 'true') {
        const productId = addBtn.dataset.productId;
        if (productId) {
          CartModule.addItem(session.userId, productId, 1);
          UIComponents.Toast('Added to cart! 🛒', 'success');
        }
        return;
      }

      // ── Remove from Wishlist ─────────────────────────────────
      const removeBtn = e.target.closest('.btn-wishlist-remove');
      if (removeBtn) {
        const productId = removeBtn.dataset.productId;
        if (productId) {
          WishlistModule.remove(session.userId, productId);
          // Re-render the entire view to reflect updated wishlist
          Views.WishlistView.render(params);
        }
        return;
      }
    });
  },
};

// ============================================================
// _listingState — shared mutable state for CategoryView and SearchView
// Tracks current filter, sort, and pagination state between re-renders.
// ============================================================

let _listingState = {
  minPrice: '',
  maxPrice: '',
  sort: 'newest',
  page: 1,
};

// ============================================================
// CategoryView — Browse products by category
// Filters by categoryId + stock > 0, supports price range filter,
// sort order, and pagination (12 per page).
//
// Validates: Requirements 5.2, 5.4, 5.5, 5.6
// ============================================================

Views.CategoryView = {
  // ----------------------------------------------------------
  // _getAvgRating — compute average rating for a product
  // ----------------------------------------------------------
  _getAvgRating(productId) {
    try {
      const reviews = StorageService.get('dm_reviews') || [];
      const productReviews = reviews.filter(r => r.productId === productId);
      if (productReviews.length === 0) return 0;
      return productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
    } catch (_) {
      return 0;
    }
  },

  // ----------------------------------------------------------
  // _applyFiltersAndSort — returns filtered + sorted product array
  // ----------------------------------------------------------
  _applyFiltersAndSort(products, state) {
    let filtered = [...products];

    // Price range filter
    const minP = state.minPrice !== '' ? Number(state.minPrice) : null;
    const maxP = state.maxPrice !== '' ? Number(state.maxPrice) : null;
    if (minP !== null && !isNaN(minP)) {
      filtered = filtered.filter(p => p.price >= minP);
    }
    if (maxP !== null && !isNaN(maxP)) {
      filtered = filtered.filter(p => p.price <= maxP);
    }

    // Sort
    const getAvg = (id) => this._getAvgRating(id);
    filtered.sort((a, b) => {
      if (state.sort === 'price-low')  return a.price - b.price;
      if (state.sort === 'price-high') return b.price - a.price;
      if (state.sort === 'top-rated')  return getAvg(b.id) - getAvg(a.id);
      // default: newest
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return filtered;
  },

  // ----------------------------------------------------------
  // render — main entry point called by Router
  // ----------------------------------------------------------
  render(params) {
    const session = AuthModule.requireSession();
    if (!session) return;

    const app = document.getElementById('app');
    if (!app) return;

    const categoryId = params && params.id;

    // Load category
    const categories = StorageService.get('dm_categories') || [];
    const category = categories.find(c => c.id === categoryId);
    const categoryName = category ? category.name : 'Category';
    const categoryIcon = category ? (category.icon || '') : '';

    // Load products: filter by categoryId AND stock > 0
    const allProducts = StorageService.get('dm_products') || [];
    const categoryProducts = allProducts.filter(
      p => p.categoryId === categoryId && p.stock > 0
    );

    // Reset page on fresh category navigation (but keep if same category re-render)
    // We reset on every full render call; re-renders from filter/sort preserve state
    // via _listingState which callers manage before calling render.

    // Apply filters and sort using current _listingState
    const filtered = this._applyFiltersAndSort(categoryProducts, _listingState);

    // Pagination
    const PER_PAGE = 12;
    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));

    // Clamp page
    if (_listingState.page > totalPages) _listingState.page = totalPages;
    if (_listingState.page < 1) _listingState.page = 1;

    const page = _listingState.page;
    const startIdx = (page - 1) * PER_PAGE;
    const pageProducts = filtered.slice(startIdx, startIdx + PER_PAGE);

    // Build product cards HTML
    let cardsHtml;
    if (pageProducts.length === 0) {
      cardsHtml = `
        <div class="empty-state" style="grid-column:1/-1;text-align:center;padding:3rem 1rem;">
          <p style="font-size:1.25rem;color:var(--text-muted);">No products found in this category.</p>
        </div>`.trim();
    } else {
      cardsHtml = pageProducts.map(p => UIComponents.ProductCard(p, session)).join('');
    }

    // Filter sidebar values
    const minVal  = _listingState.minPrice;
    const maxVal  = _listingState.maxPrice;
    const curSort = _listingState.sort;

    // Sort options
    const sortOptions = [
      { value: 'newest',     label: 'Newest' },
      { value: 'price-low',  label: 'Price: Low to High' },
      { value: 'price-high', label: 'Price: High to Low' },
      { value: 'top-rated',  label: 'Top Rated' },
    ];
    const sortOptionsHtml = sortOptions.map(opt =>
      `<option value="${opt.value}"${curSort === opt.value ? ' selected' : ''}>${opt.label}</option>`
    ).join('');

    app.innerHTML = `
<div class="container page-section">
  <div class="page-header">
    <h1 class="page-title">${categoryIcon ? categoryIcon + ' ' : ''}${categoryName}</h1>
    <p class="breadcrumb">
      <a href="#buyer-home">Home</a>
      <span class="breadcrumb-sep" aria-hidden="true">›</span>
      ${categoryName}
    </p>
  </div>

  <div class="listing-layout">
    <!-- Filter Sidebar -->
    <aside class="filter-sidebar" aria-label="Product filters">
      <div class="filter-title">Filters</div>
      <div class="filter-group">
        <div class="filter-group-label">Price Range</div>
        <div class="form-row form-row-2">
          <div class="form-group">
            <label for="min-price">Min (₹)</label>
            <input
              type="number"
              id="min-price"
              min="0"
              placeholder="0"
              value="${minVal}"
              aria-label="Minimum price"
            />
          </div>
          <div class="form-group">
            <label for="max-price">Max (₹)</label>
            <input
              type="number"
              id="max-price"
              min="0"
              placeholder="Any"
              value="${maxVal}"
              aria-label="Maximum price"
            />
          </div>
        </div>
        <button class="btn btn-primary btn-sm btn-full" id="apply-filter-btn" aria-label="Apply price filter">Apply</button>
        <button class="btn btn-secondary btn-sm btn-full" id="clear-filter-btn" style="margin-top:0.5rem" aria-label="Clear filters">Clear</button>
      </div>
    </aside>

    <!-- Product Section -->
    <section aria-label="Product listing">
      <div class="listing-controls">
        <span class="result-count" aria-live="polite">${totalCount} product${totalCount !== 1 ? 's' : ''} found</span>
        <div>
          <label for="sort-select" style="font-size:0.875rem;margin-right:0.5rem;">Sort by:</label>
          <select id="sort-select" aria-label="Sort products">
            ${sortOptionsHtml}
          </select>
        </div>
      </div>

      <div class="product-grid" id="product-listing-grid">
        ${cardsHtml}
      </div>

      <div id="pagination-container"></div>
    </section>
  </div>
</div>`.trim();

    // ── Inject Pagination ──────────────────────────────────────
    const paginationContainer = app.querySelector('#pagination-container');
    if (paginationContainer && totalCount > PER_PAGE) {
      paginationContainer.innerHTML = UIComponents.Pagination({
        total:   totalCount,
        page:    page,
        perPage: PER_PAGE,
        onPage:  (newPage) => {
          _listingState.page = newPage;
          this.render(params);
        },
      });
    }

    // ── Event wiring ───────────────────────────────────────────

    // Sort dropdown
    const sortSelect = app.querySelector('#sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        _listingState.sort = sortSelect.value;
        _listingState.page = 1;
        this.render(params);
      });
    }

    // Apply filter button
    const applyBtn = app.querySelector('#apply-filter-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const minInput = app.querySelector('#min-price');
        const maxInput = app.querySelector('#max-price');
        _listingState.minPrice = minInput ? minInput.value.trim() : '';
        _listingState.maxPrice = maxInput ? maxInput.value.trim() : '';
        _listingState.page = 1;
        this.render(params);
      });
    }

    // Clear filter button
    const clearBtn = app.querySelector('#clear-filter-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        _listingState.minPrice = '';
        _listingState.maxPrice = '';
        _listingState.page = 1;
        this.render(params);
      });
    }

    // Event delegation on product grid — Add to Cart + Wishlist
    const grid = app.querySelector('#product-listing-grid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        // Add to Cart
        const addBtn = e.target.closest('.btn-add-to-cart');
        if (addBtn && !addBtn.disabled) {
          const productId = addBtn.dataset.productId;
          if (productId && session.role === 'buyer') {
            CartModule.addItem(session.userId, productId, 1);
            UIComponents.Toast('Added to cart!', 'success');
          }
          return;
        }

        // Wishlist toggle
        const wishBtn = e.target.closest('.btn-wishlist');
        if (wishBtn) {
          const productId = wishBtn.dataset.productId;
          if (productId && session.role === 'buyer') {
            WishlistModule.toggle(session.userId, productId);
            const isNowWishlisted = WishlistModule.has(session.userId, productId);
            UIComponents.Toast(
              isNowWishlisted ? 'Added to wishlist!' : 'Removed from wishlist.',
              'info'
            );
            // Re-render to update heart icon state
            this.render(params);
          }
          return;
        }
      });
    }
  },
};


// ============================================================
// ProductDetailView — full product page with cart, wishlist,
//                     star rating, reviews, and review form.
// Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
// ============================================================

Views.ProductDetailView = {

  // ----------------------------------------------------------
  // render — main entry point
  // @param {{ id: string }} params
  // ----------------------------------------------------------
  render(params) {
    const app = document.getElementById('app');
    if (!app) return;

    const productId = params && params.id;
    const products  = StorageService.get('dm_products')   || [];
    const product   = products.find(p => p.id === productId);

    // ── Product not found ───────────────────────────────────
    if (!product) {
      app.innerHTML = `
<div class="container page-section" style="text-align:center;padding:3rem 1rem;">
  <p class="text-muted" style="font-size:1.1rem;margin-bottom:1.5rem;">Product not found.</p>
  <a href="#buyer-home" class="btn btn-primary">← Back to Home</a>
</div>`.trim();
      return;
    }

    // ── Resolve supporting data ─────────────────────────────
    const categories = StorageService.get('dm_categories') || [];
    const users      = StorageService.get('dm_users')      || [];
    const session    = AuthModule.getSession();

    const category   = categories.find(c => c.id === product.categoryId);
    const categoryName = category ? category.name : 'Uncategorised';
    const seller     = users.find(u => u.id === product.sellerId);
    const sellerName = seller ? seller.name : 'Unknown Seller';

    const avgRating  = ReviewModule.getAverageRating(productId);
    const reviews    = ReviewModule.getByProduct(productId);

    const isWishlisted = session && session.role === 'buyer'
      ? WishlistModule.has(session.userId, productId)
      : false;

    const hasPurchased = session && session.role === 'buyer'
      ? ReviewModule.hasPurchased(session.userId, productId)
      : false;

    const hasReviewed = session && session.role === 'buyer'
      ? ReviewModule.hasReviewed(session.userId, productId)
      : false;

    // ── Format price ────────────────────────────────────────
    const priceFormatted = `₹${Number(product.price).toLocaleString('en-IN')}`;
    const isOutOfStock   = product.stock === 0;
    const imgSrc = product.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image';

    // ── Stock badge ─────────────────────────────────────────
    const stockBadge = isOutOfStock
      ? `<span class="badge badge-out-of-stock">Out of Stock</span>`
      : `<span class="badge badge-in-stock">${product.stock} in stock</span>`;

    // ── Add-to-cart strip ───────────────────────────────────
    const cartStrip = isOutOfStock
      ? `<button class="btn btn-primary" disabled aria-disabled="true">Out of Stock</button>`
      : `
        <div class="qty-stepper">
          <button type="button" id="qty-dec" aria-label="Decrease quantity">−</button>
          <input type="number" id="qty-input" value="1" min="1" max="${product.stock}" aria-label="Quantity" style="width:3.5rem;text-align:center;" />
          <button type="button" id="qty-inc" aria-label="Increase quantity">+</button>
        </div>
        <button class="btn btn-primary" id="add-to-cart-btn" data-product-id="${product.id}">Add to Cart 🛒</button>
      `.trim();

    // ── Wishlist button (buyers only) ───────────────────────
    const wishlistBtn = session && session.role === 'buyer'
      ? `<button class="btn btn-ghost heart-icon-btn" id="wishlist-btn" data-product-id="${product.id}" aria-label="${isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}" title="${isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}" style="font-size:1.4rem;padding:0.4rem 0.75rem;">
          ${UIComponents.HeartIcon(isWishlisted)}
         </button>`
      : '';

    // ── Reviews HTML ────────────────────────────────────────
    let reviewsHtml = '';
    if (reviews.length > 0) {
      reviewsHtml = reviews.map(review => {
        const reviewer = users.find(u => u.id === review.buyerId);
        const reviewerName = reviewer ? reviewer.name : 'Anonymous';
        const reviewDate   = new Date(review.createdAt).toLocaleDateString('en-IN', {
          year: 'numeric', month: 'short', day: 'numeric',
        });
        return `
<div class="review-card" style="border:1px solid #f0cce0;border-radius:8px;padding:1rem;margin-bottom:1rem;background:#fff8fc;">
  <div class="review-header" style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;flex-wrap:wrap;">
    <span class="reviewer-name" style="font-weight:600;">${reviewerName}</span>
    ${UIComponents.StarRating(review.rating, false)}
    <span class="review-date text-muted" style="font-size:0.8rem;margin-left:auto;">${reviewDate}</span>
  </div>
  <p class="review-comment" style="margin:0;color:var(--text-dark,#2D2D2D);">${review.comment}</p>
</div>`.trim();
      }).join('');
    } else {
      reviewsHtml = `<p class="text-muted">No reviews yet. Be the first to review!</p>`;
    }

    // ── Review form (purchase-gated) ────────────────────────
    let reviewFormHtml = '';
    if (!session) {
      reviewFormHtml = `<p class="text-muted" style="margin-top:1rem;">
        <a href="#login">Login</a> to write a review.
      </p>`;
    } else if (session.role !== 'buyer') {
      // Non-buyers don't see the form
      reviewFormHtml = '';
    } else if (!hasPurchased) {
      reviewFormHtml = `<p class="text-muted" style="margin-top:1rem;">Purchase this product to write a review.</p>`;
    } else if (hasReviewed) {
      reviewFormHtml = `<p class="text-muted" style="margin-top:1rem;">✓ You have already reviewed this product.</p>`;
    } else {
      reviewFormHtml = `
<div class="review-form" style="margin-top:1.5rem;padding:1.5rem;border:1px solid #f0cce0;border-radius:8px;background:#fff8fc;">
  <h3 style="margin-top:0;margin-bottom:1rem;font-size:1.1rem;">Write a Review</h3>
  <form id="review-form" novalidate>
    <div class="form-group">
      <label style="display:block;margin-bottom:0.5rem;font-weight:600;">Your Rating <span class="required-mark" aria-hidden="true">*</span></label>
      ${UIComponents.StarRating(0, true)}
      <input type="hidden" id="rating-input" value="0" />
      <span class="field-error" id="rating-error" role="alert" aria-live="polite"></span>
    </div>
    <div class="form-group" style="margin-top:1rem;">
      <label for="review-comment" style="display:block;margin-bottom:0.5rem;font-weight:600;">
        Your Review <span class="required-mark" aria-hidden="true">*</span>
      </label>
      <textarea id="review-comment" rows="4" placeholder="Share your experience..." required aria-required="true" style="width:100%;padding:0.5rem;border:1px solid #ddd;border-radius:6px;resize:vertical;font-family:inherit;"></textarea>
      <span class="field-error" id="comment-error" role="alert" aria-live="polite"></span>
    </div>
    <button type="submit" class="btn btn-primary" style="margin-top:1rem;">Submit Review</button>
  </form>
</div>`.trim();
    }

    // ── Assemble full page ──────────────────────────────────
    app.innerHTML = `
<div class="container page-section">

  <!-- Breadcrumb -->
  <nav class="breadcrumb" aria-label="Breadcrumb" style="margin-bottom:1.25rem;display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;font-size:0.9rem;">
    <a href="#buyer-home" style="color:var(--pink-primary,#E91E8C);">Home</a>
    <span class="breadcrumb-sep" aria-hidden="true" style="color:var(--text-muted,#757575);">›</span>
    <a href="#category/${product.categoryId}" style="color:var(--pink-primary,#E91E8C);">${categoryName}</a>
    <span class="breadcrumb-sep" aria-hidden="true" style="color:var(--text-muted,#757575);">›</span>
    <span style="color:var(--text-muted,#757575);">${product.name}</span>
  </nav>

  <!-- Product Detail Grid -->
  <div class="product-detail" style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;align-items:start;margin-bottom:2.5rem;">

    <!-- Product Image -->
    <div>
      <img
        src="${imgSrc}"
        alt="${product.name}"
        class="product-detail-image"
        style="width:100%;border-radius:10px;object-fit:cover;max-height:420px;"
        onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'"
        loading="lazy"
      />
    </div>

    <!-- Product Info -->
    <div class="product-detail-info">
      <h1 class="product-detail-title" style="margin-top:0;margin-bottom:0.5rem;font-size:1.6rem;">${product.name}</h1>

      <div class="product-detail-price" style="font-size:1.75rem;font-weight:700;color:var(--pink-primary,#E91E8C);margin-bottom:0.75rem;">
        ${priceFormatted}
      </div>

      <!-- Average rating -->
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem;">
        ${UIComponents.StarRating(avgRating, false)}
        <span class="text-muted" style="font-size:0.875rem;">
          (${reviews.length} review${reviews.length !== 1 ? 's' : ''})
        </span>
      </div>

      <!-- Meta table -->
      <div class="product-detail-meta" style="margin-bottom:1rem;">
        <div class="product-detail-meta-row" style="display:flex;gap:0.5rem;margin-bottom:0.4rem;align-items:center;">
          <span class="product-detail-meta-label" style="font-weight:600;min-width:6rem;">Category:</span>
          <span>${categoryName}</span>
        </div>
        <div class="product-detail-meta-row" style="display:flex;gap:0.5rem;margin-bottom:0.4rem;align-items:center;">
          <span class="product-detail-meta-label" style="font-weight:600;min-width:6rem;">Seller:</span>
          <span>${sellerName}</span>
        </div>
        <div class="product-detail-meta-row" style="display:flex;gap:0.5rem;align-items:center;">
          <span class="product-detail-meta-label" style="font-weight:600;min-width:6rem;">Stock:</span>
          ${stockBadge}
        </div>
      </div>

      <!-- Description -->
      <p style="line-height:1.6;margin-bottom:1.5rem;color:var(--text-dark,#2D2D2D);">${product.description}</p>

      <!-- Add-to-cart strip -->
      <div class="add-to-cart-strip" style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
        ${cartStrip}
        ${wishlistBtn}
      </div>
    </div>
  </div>

  <!-- Reviews Section -->
  <section class="reviews-section" aria-label="Customer Reviews">
    <h2 class="section-title" style="margin-bottom:1.25rem;">Customer Reviews</h2>

    <div id="reviews-list">
      ${reviewsHtml}
    </div>

    <div id="review-form-container">
      ${reviewFormHtml}
    </div>
  </section>

</div>

<!-- Responsive override for mobile -->
<style>
@media (max-width: 767px) {
  .product-detail { grid-template-columns: 1fr !important; }
}
</style>
`.trim();

    // ── Wire quantity stepper ───────────────────────────────
    if (!isOutOfStock) {
      const qtyInput = app.querySelector('#qty-input');
      const qtyDec   = app.querySelector('#qty-dec');
      const qtyInc   = app.querySelector('#qty-inc');

      if (qtyDec && qtyInc && qtyInput) {
        qtyDec.addEventListener('click', () => {
          const cur = parseInt(qtyInput.value, 10) || 1;
          qtyInput.value = Math.max(1, cur - 1);
        });

        qtyInc.addEventListener('click', () => {
          const cur = parseInt(qtyInput.value, 10) || 1;
          qtyInput.value = Math.min(product.stock, cur + 1);
        });

        // Clamp on manual input
        qtyInput.addEventListener('change', () => {
          let val = parseInt(qtyInput.value, 10);
          if (isNaN(val) || val < 1)              val = 1;
          if (val > product.stock) val = product.stock;
          qtyInput.value = val;
        });
      }

      // ── Add to cart ───────────────────────────────────────
      const addBtn = app.querySelector('#add-to-cart-btn');
      if (addBtn && session) {
        addBtn.addEventListener('click', () => {
          const qty = parseInt(qtyInput ? qtyInput.value : '1', 10) || 1;
          CartModule.addItem(session.userId, product.id, qty);
          UIComponents.Toast(`${product.name} added to cart! 🛒`, 'success');
        });
      }
    }

    // ── Wishlist toggle ─────────────────────────────────────
    const wishlistBtnEl = app.querySelector('#wishlist-btn');
    if (wishlistBtnEl && session) {
      wishlistBtnEl.addEventListener('click', () => {
        WishlistModule.toggle(session.userId, product.id);
        const nowWishlisted = WishlistModule.has(session.userId, product.id);
        // Update button aria-label and icon
        wishlistBtnEl.setAttribute('aria-label', nowWishlisted ? 'Remove from wishlist' : 'Add to wishlist');
        wishlistBtnEl.title = nowWishlisted ? 'Remove from wishlist' : 'Add to wishlist';
        wishlistBtnEl.innerHTML = UIComponents.HeartIcon(nowWishlisted);
        UIComponents.Toast(
          nowWishlisted ? 'Added to wishlist ♥' : 'Removed from wishlist',
          nowWishlisted ? 'success' : 'info'
        );
      });
    }

    // ── Interactive star rating in review form ──────────────
    const ratingInput = app.querySelector('#rating-input');
    const starRatingEl = app.querySelector('.star-rating-interactive');

    if (starRatingEl && ratingInput) {
      // Handle both click and keyboard (Enter/Space) on each star
      starRatingEl.addEventListener('click', (e) => {
        const star = e.target.closest('[data-rating]');
        if (!star) return;
        const ratingVal = parseInt(star.getAttribute('data-rating'), 10);
        _setInteractiveRating(starRatingEl, ratingInput, ratingVal);
      });

      starRatingEl.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const star = e.target.closest('[data-rating]');
        if (!star) return;
        e.preventDefault();
        const ratingVal = parseInt(star.getAttribute('data-rating'), 10);
        _setInteractiveRating(starRatingEl, ratingInput, ratingVal);
      });
    }

    // ── Review form submit ──────────────────────────────────
    const reviewForm = app.querySelector('#review-form');
    if (reviewForm && session) {
      reviewForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const rating      = parseInt(ratingInput ? ratingInput.value : '0', 10);
        const comment     = (app.querySelector('#review-comment') || {}).value || '';
        const ratingError = app.querySelector('#rating-error');
        const commentError= app.querySelector('#comment-error');

        // Clear previous errors
        if (ratingError)  ratingError.textContent  = '';
        if (commentError) commentError.textContent = '';

        let hasError = false;

        if (!rating || rating < 1 || rating > 5) {
          if (ratingError) ratingError.textContent = 'Please select a rating between 1 and 5.';
          hasError = true;
        }

        if (!comment.trim()) {
          if (commentError) commentError.textContent = 'Please enter a review comment.';
          hasError = true;
        }

        if (hasError) return;

        const result = ReviewModule.submit(session.userId, productId, rating, comment);

        if (!result.ok) {
          UIComponents.Toast(result.error || 'Could not submit review.', 'error');
          return;
        }

        UIComponents.Toast('Review submitted! Thank you. ⭐', 'success');

        // Re-render the view to show the new review
        Views.ProductDetailView.render(params);
      });
    }
  },
};

// ----------------------------------------------------------
// _setInteractiveRating — helper (module-level, not exposed)
// Updates the visual star display and the hidden input.
// @param {HTMLElement} container — .star-rating-interactive wrapper
// @param {HTMLInputElement} hiddenInput
// @param {number} value — 1–5
// ----------------------------------------------------------
function _setInteractiveRating(container, hiddenInput, value) {
  hiddenInput.value = value;
  const stars = container.querySelectorAll('[data-rating]');
  stars.forEach(star => {
    const starVal = parseInt(star.getAttribute('data-rating'), 10);
    if (starVal <= value) {
      star.className = 'star filled';
      star.textContent = '★';
    } else {
      star.className = 'star empty';
      star.textContent = '☆';
    }
  });
}
// Start DEVI MART
document.addEventListener('DOMContentLoaded', () => {
  SeedModule.seed();
  Router.init();
});
