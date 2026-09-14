# Design Document — DEVI MART E-commerce SPA

## Overview

DEVI MART is a zero-dependency, single-page e-commerce application delivered as three static files: `index.html`, `styles.css`, and `app.js`. All state is persisted exclusively in `localStorage`. The app renders entirely client-side using hash-based routing. Three role types (Buyer, Seller, Admin) each have a dedicated view surface, enforced by a runtime Role Guard.

The architecture follows a **module-per-concern** pattern where every major subsystem is a plain JavaScript object or class exported from `app.js`. No frameworks or build tools are required.

---

## Architecture

### File Layout

```
index.html        ← single HTML shell; mounts <div id="app">
styles.css        ← all styles; CSS custom properties for the pink theme
app.js            ← entire application logic (~2 500–3 500 lines)
```

`index.html` loads `styles.css` via `<link>` and `app.js` via `<script type="module">` (or a plain `<script defer>` if modules are not desired).

### Module Map (`app.js`)

```
app.js
├── StorageService      — thin wrapper around localStorage (get/set/remove)
├── SeedModule          — first-launch data initialisation
├── AuthModule          — login, logout, session management
├── Router              — hash-based SPA router + Role Guard
├── EventBus            — lightweight pub/sub for cross-module events
├── CartModule          — add/remove/update cart items
├── WishlistModule      — add/remove wishlist items
├── OrderModule         — create orders, track status
├── ReviewModule        — submit and retrieve product reviews
├── UIComponents        — reusable renderers (ProductCard, Modal, Toast, Pagination, StepTracker)
└── Views               — one render function per route
    ├── WelcomeView
    ├── BuyerHomeView
    ├── CategoryView
    ├── SearchView
    ├── ProductDetailView
    ├── CartView
    ├── CheckoutView
    ├── OrderConfirmView
    ├── OrdersView (Buyer)
    ├── WishlistView
    ├── SellerDashboardView
    ├── SellerProductsView
    ├── SellerProductFormView
    ├── SellerOrdersView
    ├── AdminDashboardView
    ├── AdminUsersView
    ├── AdminProductsView
    ├── AdminCategoriesView
    ├── AdminOrdersView
    └── AdminReportsView
```

---

## Data Models

All records are serialised as JSON in `localStorage` under these keys:

| Key | Type | Description |
|-----|------|-------------|
| `dm_users` | `User[]` | All registered user accounts |
| `dm_categories` | `Category[]` | All product categories |
| `dm_products` | `Product[]` | All product listings |
| `dm_orders` | `Order[]` | All orders |
| `dm_reviews` | `Review[]` | All product reviews |
| `dm_cart_{userId}` | `CartItem[]` | Per-buyer cart |
| `dm_wishlist_{userId}` | `string[]` | Per-buyer wishlist (product IDs) |
| `dm_session` | `Session` | Active session (or absent) |

### User

```javascript
{
  id: string,           // UUID
  email: string,
  password: string,     // plaintext (demo app — no security claim)
  role: 'buyer' | 'seller' | 'admin',
  name: string,
  status: 'active' | 'inactive',
  createdAt: string     // ISO 8601
}
```

### Category

```javascript
{
  id: string,
  name: string,         // one of the 11 predefined names
  icon: string          // emoji or placeholder
}
```

### Product

```javascript
{
  id: string,
  name: string,
  description: string,
  price: number,        // > 0
  stock: number,        // >= 0
  categoryId: string,
  sellerId: string,
  imageUrl: string,     // optional; defaults to placeholder
  createdAt: string
}
```

### Order

```javascript
{
  id: string,
  buyerId: string,
  items: OrderItem[],
  deliveryName: string,
  deliveryAddress: string,
  city: string,
  postalCode: string,
  paymentMethod: 'cod' | 'card',
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered',
  total: number,
  createdAt: string
}
```

### OrderItem

```javascript
{
  productId: string,
  productName: string,    // snapshot at order time
  sellerId: string,
  unitPrice: number,      // snapshot at order time
  quantity: number
}
```

### Review

```javascript
{
  id: string,
  productId: string,
  buyerId: string,
  rating: number,   // 1–5
  comment: string,
  createdAt: string
}
```

### CartItem

```javascript
{
  productId: string,
  quantity: number
}
```

### Session

```javascript
{
  userId: string,
  email: string,
  role: 'buyer' | 'seller' | 'admin',
  loginAt: string
}
```

---

## Components & Interfaces

### StorageService

```javascript
const StorageService = {
  get(key)           // → parsed value or null
  set(key, value)    // serialises to JSON, writes to localStorage
  remove(key)        // removes key
  update(key, fn)    // read → apply fn → write (atomic-ish)
}
```

### SeedModule

Runs once on app boot. Guard pattern:

```javascript
function seed() {
  if (!StorageService.get('dm_users'))       seedUsers();
  if (!StorageService.get('dm_categories'))  seedCategories();
  if (!StorageService.get('dm_products'))    seedProducts();
}
```

Idempotent: each guard independently skips if the key already exists.

### AuthModule

```javascript
const AuthModule = {
  login(email, password, role)  // → { ok, error }
  logout()
  getSession()                  // → Session | null
  requireSession()              // throws/redirects if no session
}
```

`login` looks up the user in `dm_users`, checks status is `'active'`, matches `email + password + role`, then writes a `dm_session` record.

### Router

Routes are registered as a map from hash string to `{ guard, render }`:

```javascript
const ROUTES = {
  '#login':              { guard: 'guest',  render: WelcomeView.render },
  '#buyer-home':         { guard: 'buyer',  render: BuyerHomeView.render },
  '#category/:id':       { guard: 'buyer',  render: CategoryView.render },
  '#search':             { guard: 'buyer',  render: SearchView.render },
  '#product/:id':        { guard: 'buyer',  render: ProductDetailView.render },
  '#cart':               { guard: 'buyer',  render: CartView.render },
  '#checkout':           { guard: 'buyer',  render: CheckoutView.render },
  '#order-confirm/:id':  { guard: 'buyer',  render: OrderConfirmView.render },
  '#orders':             { guard: 'buyer',  render: OrdersView.render },
  '#order/:id':          { guard: 'buyer',  render: OrderDetailView.render },
  '#wishlist':           { guard: 'buyer',  render: WishlistView.render },
  '#seller-dashboard':   { guard: 'seller', render: SellerDashboardView.render },
  '#seller-products':    { guard: 'seller', render: SellerProductsView.render },
  '#seller-product-form':{ guard: 'seller', render: SellerProductFormView.render },
  '#seller-orders':      { guard: 'seller', render: SellerOrdersView.render },
  '#admin-dashboard':    { guard: 'admin',  render: AdminDashboardView.render },
  '#admin-users':        { guard: 'admin',  render: AdminUsersView.render },
  '#admin-products':     { guard: 'admin',  render: AdminProductsView.render },
  '#admin-categories':   { guard: 'admin',  render: AdminCategoriesView.render },
  '#admin-orders':       { guard: 'admin',  render: AdminOrdersView.render },
  '#admin-reports':      { guard: 'admin',  render: AdminReportsView.render }
};
```

On `hashchange`, the Router:
1. Parses the hash and extracts any `:id` parameters.
2. Looks up the route entry.
3. Runs the Role Guard — redirects if the session role does not match.
4. Clears `#app` innerHTML, then calls the matched `render(params)` function.

### CartModule

```javascript
const CartModule = {
  getItems(userId)
  addItem(userId, productId, quantity)   // merges if already present
  removeItem(userId, productId)
  updateQuantity(userId, productId, qty)
  clear(userId)
  getCount(userId)                       // total distinct items
  getTotal(userId)                       // sum of price * qty
}
```

Cart badge is updated via `EventBus.emit('cart:changed', userId)` which the nav bar subscribes to.

### WishlistModule

```javascript
const WishlistModule = {
  getItems(userId)         // → productId[]
  add(userId, productId)
  remove(userId, productId)
  toggle(userId, productId)
  has(userId, productId)   // → boolean
}
```

### OrderModule

```javascript
const OrderModule = {
  create(buyerId, cartItems, deliveryInfo)   // → Order
  getByBuyer(buyerId)
  getBySeller(sellerId)
  getAll()
  getById(orderId)
  updateStatus(orderId, newStatus)           // validates forward-only
  canAdvance(currentStatus, newStatus)       // → boolean
}
```

`updateStatus` enforces the `Pending → Processing → Shipped → Delivered` sequence. Attempting to set a status to any position before the current one throws an error.

Status rank map:
```javascript
const STATUS_RANK = { Pending: 0, Processing: 1, Shipped: 2, Delivered: 3 };
function canAdvance(from, to) {
  return STATUS_RANK[to] > STATUS_RANK[from];
}
```

### ReviewModule

```javascript
const ReviewModule = {
  submit(buyerId, productId, rating, comment)  // validates purchase history
  getByProduct(productId)
  getAverageRating(productId)                  // → number (0 if none)
  hasPurchased(buyerId, productId)             // → boolean
  hasReviewed(buyerId, productId)              // → boolean
}
```

### EventBus

```javascript
const EventBus = {
  on(event, handler)
  off(event, handler)
  emit(event, data)
}
```

Used to decouple cart badge updates, toast notifications, and nav re-renders from view logic.

### UIComponents

```javascript
const UIComponents = {
  ProductCard(product, session)  // → HTML string
  Toast(message, type)           // appends to DOM, auto-removes after 3s
  Modal(title, body, onConfirm)  // confirm dialog
  Pagination({ total, page, perPage, onPage })  // → HTML string
  StepTracker(steps, currentStep)               // → HTML string
  StarRating(rating, interactive)               // → HTML string
  HeartIcon(filled)                             // → HTML string
}
```

---

## Routing & Navigation Flow

```
App Load
  └── seed()
  └── Router.init()
       └── read current hash (default: #login)
       └── run Role Guard
            ├── no session + protected route → #login
            ├── buyer session + seller/admin route → #buyer-home
            ├── seller session + buyer/admin route → #seller-dashboard
            └── admin session + buyer/seller route → #admin-dashboard
       └── render matching View

window.onhashchange
  └── Router.navigate(newHash)
       └── same Role Guard + render cycle
```

---

## View Descriptions

### WelcomeView

Renders the pink branded landing page with the `<form id="login-form">`. On submit:
1. Validates non-empty fields (inline `<span class="field-error">`).
2. Calls `AuthModule.login(email, password, role)`.
3. On success: navigates to role-specific dashboard hash.
4. On failure: shows error below form.

### BuyerHomeView

- Hero banner: tagline + CTA "Shop Now" → `#search`.
- Featured products: last 8 products by `createdAt` → `UIComponents.ProductCard` grid.
- Category grid: all categories with icon/emoji and name, each links to `#category/{id}`.

### CategoryView

- Loads products filtered by `categoryId` and `stock > 0`.
- Renders filter sidebar (price range) and sort dropdown.
- Paginated product grid (12 per page).

### SearchView

- Search bar pre-populated with `?q=` query param extracted from hash.
- Filters `dm_products` by case-insensitive name/description match.
- Same filter/sort/pagination as CategoryView.

### ProductDetailView

- Loads product by `:id`.
- If `stock === 0`: "Out of Stock" badge, disabled Add to Cart.
- If `stock > 0`: quantity stepper (min 1, max stock), "Add to Cart" button.
- Wishlist heart toggle.
- Average star rating computed by `ReviewModule.getAverageRating`.
- Review list rendered chronologically.
- Review form: shown only if buyer has purchased the product (via `ReviewModule.hasPurchased`).

### CartView

- Reads `CartModule.getItems(userId)`, cross-references product data for prices.
- Table with quantity input (inline update), line total, remove button.
- Grand total computed client-side.
- "Proceed to Checkout" button → `#checkout`.

### CheckoutView

- Delivery form: name, address, city, postal code (all required).
- Payment method: `<select>` with "Cash on Delivery" and "Card (mock)".
- Card mock fields (number, expiry, CVV) visible when "Card" selected — display only.
- On submit: validates, calls `OrderModule.create`, decrements stock, clears cart, navigates to `#order-confirm/{orderId}`.

### OrdersView (Buyer)

- Lists `OrderModule.getByBuyer(userId)` sorted by `createdAt` descending.
- Each row: Order ID, date, item count, total, status badge.
- Row click → `#order/{id}`.

### OrderDetailView (Buyer)

- Full order breakdown.
- `UIComponents.StepTracker(['Pending','Processing','Shipped','Delivered'], currentStatus)`.
- "Write a Review" links for delivered orders with unreviewed items.

### WishlistView

- Lists wishlist products.
- "Add to Cart" calls `CartModule.addItem(..., 1)`.
- Heart remove calls `WishlistModule.remove`.

### SellerDashboardView

Summary cards: total products, total orders, total revenue, total units sold.

Revenue calculation:
```javascript
const revenue = orders
  .flatMap(o => o.items)
  .filter(i => i.sellerId === session.userId)
  .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
```

Recent 5 orders + top 3 best-selling products table.

### SellerProductsView

Table of `dm_products` filtered by `sellerId`. Edit → `#seller-product-form?id={id}`. Delete → confirmation modal → removes from `dm_products`.

### SellerProductFormView

Shared add/edit form. Pre-populated if `?id=` present. Validates on submit. Generates UUID on add. Sets `sellerId = session.userId`, `createdAt = new Date().toISOString()`.

### SellerOrdersView

Orders containing seller's products. Status dropdown per order (disabled if Delivered). Update calls `OrderModule.updateStatus`.

### AdminDashboardView

Platform stats: user count, product count, order count, total revenue.

### AdminUsersView

Paginated table of `dm_users`. View, Deactivate, Activate buttons.
- Deactivate guard: cannot deactivate `role === 'admin'` or self.

### AdminProductsView

Paginated table of all products. Edit links to `SellerProductFormView` (admin-accessible version). Delete cascades to remove from all `dm_cart_*` and `dm_wishlist_*` keys.

### AdminCategoriesView

Category list with product count. Add/Edit forms. Edit updates `categoryId`-linked product `categoryId` snapshots if category name changes are needed (name stored, not just reference).

### AdminOrdersView

Paginated table. Status update dropdown with same no-reverse guard.

### AdminReportsView

Four sections:
1. Platform metrics cards.
2. Top-10 products table (by units sold).
3. Revenue by category (computed from orders × order items).
4. Top-5 sellers by revenue.

---

## CSS Architecture (`styles.css`)

### Custom Properties

```css
:root {
  --pink-primary:   #E91E8C;
  --pink-light:     #FFF0F5;
  --pink-accent:    #FF69B4;
  --pink-dark:      #C2185B;
  --text-dark:      #2D2D2D;
  --text-muted:     #757575;
  --white:          #FFFFFF;
  --shadow:         0 2px 8px rgba(233,30,140,0.12);
  --radius:         8px;
  --transition:     0.2s ease;
}
```

### Responsive Grid

```css
/* Mobile first */
.product-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }

@media (min-width: 768px) {
  .product-grid { grid-template-columns: repeat(2, 1fr); }
  .dashboard-cards { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1200px) {
  .product-grid { grid-template-columns: repeat(4, 1fr); }
  .dashboard-cards { grid-template-columns: repeat(4, 1fr); }
}
```

### Navigation Collapse

Hamburger toggle is a `<button class="nav-toggle">` that toggles `.nav-open` on `<nav>`. CSS:

```css
@media (max-width: 767px) {
  .nav-links { display: none; flex-direction: column; }
  .nav-links.nav-open { display: flex; }
}
```

### Focus Indicators

```css
*:focus-visible {
  outline: 3px solid var(--pink-primary);
  outline-offset: 2px;
}
```

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Login with wrong credentials | Inline error below form; email field value preserved |
| Empty login fields | Per-field `<span class="field-error">` messages |
| Deactivated account login | Error: "Account deactivated. Contact support." |
| Add product with invalid data | Per-field validation messages; form not submitted |
| Checkout with empty fields | Per-field validation messages; order not created |
| Review without purchase | Error: "You can only review products you have purchased." |
| Order status reversal | Error: "Order status cannot be reversed." |
| Admin deactivate admin | Error: "Admin accounts cannot be deactivated." |
| Route not found | Redirect to role-appropriate default or `#login` |
| localStorage quota exceeded | `try/catch` around all writes; `Toast` error notification |

---

## Sequence: Checkout Flow

```
Buyer clicks "Proceed to Checkout"
  → Router navigates to #checkout
  → CheckoutView renders delivery form

Buyer fills form → clicks "Place Order"
  → Validate all required fields
  → IF valid:
      items = CartModule.getItems(userId)
      order = OrderModule.create(userId, items, deliveryInfo)
      // OrderModule.create:
      //   1. Snapshot product names and prices
      //   2. Write order to dm_orders
      //   3. Decrement stock for each product in dm_products
      //   4. CartModule.clear(userId)
      //   5. EventBus.emit('cart:changed', userId)
      Router.navigate('#order-confirm/' + order.id)
  → IF invalid:
      Show field-level errors; do not create order
```

---

## Sequence: Admin Delete Product (Cascade)

```
Admin clicks Delete on product row
  → Modal confirm dialog

Admin confirms
  → Remove product from dm_products
  → For each dm_cart_* key in localStorage:
      filter out CartItem where productId matches
      write back filtered array
  → For each dm_wishlist_* key in localStorage:
      filter out productId
      write back filtered array
  → Toast: "Product deleted successfully."
  → Re-render AdminProductsView
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Seed Idempotence

*For any* existing localStorage state that already contains seeded user, category, or product data, invoking the Seed Module a second time SHALL produce an identical count of records with identical IDs as the first invocation — no duplicates and no records removed.

**Validates: Requirements 1.5**

---

### Property 2: Login Success for Any Valid User

*For any* user record stored in `dm_users` with status `'active'`, submitting the correct email, password, and role to `AuthModule.login` SHALL return `{ ok: true }` and write a Session to `dm_session` whose `userId` and `role` match the user record.

**Validates: Requirements 2.4**

---

### Property 3: Login Failure Leaves Session Absent

*For any* combination of email, password, or role that does not exactly match an active user record, `AuthModule.login` SHALL return `{ ok: false }` and SHALL NOT write or modify `dm_session`.

**Validates: Requirements 2.5**

---

### Property 4: Empty-Field Form Validation

*For any* subset of required login form fields that are empty (email, password, role), the Login Form SHALL display at least one field-level validation message and SHALL NOT call `AuthModule.login`.

**Validates: Requirements 2.6**

---

### Property 5: Role Guard — Unauthenticated Redirect

*For any* protected hash route (any route with guard ≠ `'guest'`) accessed when `dm_session` is absent, the Router SHALL navigate to `#login` and SHALL NOT render the target view.

**Validates: Requirements 3.3**

---

### Property 6: Role Guard — Cross-Role Redirect

*For any* session with role R and *any* hash route whose required guard is a role other than R, the Router SHALL redirect to the default dashboard for role R and SHALL NOT render the target view.

**Validates: Requirements 3.4, 3.5, 3.6**

---

### Property 7: Category Filter Correctness

*For any* category selection by a Buyer, every product displayed on the resulting listing page SHALL have a `categoryId` matching the selected category AND a `stock` value greater than 0.

**Validates: Requirements 5.2**

---

### Property 8: Search Result Correctness

*For any* non-empty search query string Q, every product returned by the search function SHALL have a `name` or `description` that contains Q (case-insensitive), and no product outside that set SHALL appear in the results.

**Validates: Requirements 5.3**

---

### Property 9: Price Filter Correctness

*For any* price range `[min, max]` applied to a product listing, every displayed product SHALL have `price >= min` and `price <= max`; no product with price outside the range SHALL appear.

**Validates: Requirements 5.4**

---

### Property 10: Sort Order Invariant

*For any* product list and any selected sort order, the resulting displayed list SHALL satisfy the ordering comparator for that sort — i.e., for adjacent products A and B in the rendered list, the comparator for the chosen sort key SHALL hold between A and B.

**Validates: Requirements 5.5**

---

### Property 11: Pagination Page Size

*For any* product listing with N products and page size 12, every page rendered by the pagination component SHALL contain at most 12 products, and the total number of products across all pages SHALL equal N.

**Validates: Requirements 5.6**

---

### Property 12: Cart Add Grows Count

*For any* Buyer and product not currently in the Cart, calling `CartModule.addItem` SHALL increase the number of distinct Cart items by exactly 1 and the Cart badge count SHALL reflect the new total.

**Validates: Requirements 7.1**

---

### Property 13: Cart Duplicate Merges Quantity

*For any* Buyer and product already present in the Cart with quantity Q, calling `CartModule.addItem` with quantity delta D SHALL result in that Cart item having quantity Q + D, with the total number of distinct Cart items unchanged.

**Validates: Requirements 7.2**

---

### Property 14: Cart Line Total Accuracy

*For any* Cart item with unit price P and quantity Q, the displayed line total SHALL equal P × Q, and the Cart grand total SHALL equal the sum of all line totals.

**Validates: Requirements 7.4**

---

### Property 15: Checkout Decrements Stock

*For any* valid checkout with a non-empty Cart, after `OrderModule.create` completes, each ordered product's `stock` in `dm_products` SHALL be reduced by exactly the ordered quantity, and the Cart SHALL be empty.

**Validates: Requirements 7.7**

---

### Property 16: Wishlist Round-Trip

*For any* product added to and then removed from a Buyer's Wishlist, the Wishlist SHALL return to its exact state prior to the addition — the product SHALL NOT appear in the Wishlist and the wishlist length SHALL be unchanged from before the add.

**Validates: Requirements 8.3**

---

### Property 17: Review Requires Purchase

*For any* Buyer B and product P such that no Order belonging to B contains P as an Order Item, `ReviewModule.submit(B, P, ...)` SHALL be rejected and no review record SHALL be written to `dm_reviews`.

**Validates: Requirements 6.6**

---

### Property 18: Review Rating Validation

*For any* review submission attempt where `rating` is outside the range 1–5 or `comment` is empty or whitespace-only, the submission SHALL be rejected and no review record SHALL be written.

**Validates: Requirements 6.5**

---

### Property 19: Order Status Forward-Only

*For any* Order with current status S, calling `OrderModule.updateStatus` with a target status T where `STATUS_RANK[T] <= STATUS_RANK[S]` SHALL return an error and SHALL NOT modify the order's status in `dm_orders`.

**Validates: Requirements 9.3, 12.3, 15.4**

---

### Property 20: Buyer Order Isolation

*For any* Buyer B, `OrderModule.getByBuyer(B)` SHALL return only Orders whose `buyerId` equals B's user ID, with no Orders from other Buyers present, sorted by `createdAt` descending.

**Validates: Requirements 9.1**

---

### Property 21: Seller Revenue Accuracy

*For any* Seller S, the total revenue displayed on the Seller Dashboard SHALL equal the sum of `unitPrice × quantity` for all Order Items across all Orders where `sellerId` matches S's user ID.

**Validates: Requirements 10.1**

---

### Property 22: Product Form Validation — Invalid Inputs Rejected

*For any* product form submission where at least one required field is empty, or `price <= 0`, or `stock < 0`, the form SHALL display at least one field-level validation message and SHALL NOT write a product record to `dm_products`.

**Validates: Requirements 11.4**

---

### Property 23: Product Edit Round-Trip

*For any* existing product P and a valid update to one or more of its fields, after editing and submitting, `StorageService.get('dm_products')` SHALL contain exactly one product with P's ID, and that record SHALL reflect the updated field values while all other fields remain unchanged.

**Validates: Requirements 11.5**

---

### Property 24: Admin Delete Cascades

*For any* product P deleted by an Admin, P SHALL NOT appear in any Buyer's Cart (`dm_cart_*`) or Wishlist (`dm_wishlist_*`) after the deletion completes.

**Validates: Requirements 14.2**

---

### Property 25: Deactivated User Cannot Login

*For any* user account with `status: 'inactive'`, calling `AuthModule.login` with that user's correct credentials SHALL return `{ ok: false, error: 'Account deactivated. Contact support.' }` and SHALL NOT write a Session.

**Validates: Requirements 13.3**

---

### Property 26: Platform Revenue Consistency

*For any* set of Orders in `dm_orders`, the total platform revenue displayed on the Admin Reports page SHALL equal the sum of `order.total` for all Orders in that set.

**Validates: Requirements 16.1**

---

### Property 27: Image Alt Attribute Presence

*For any* product rendered in a product card or product detail view, the corresponding `<img>` element SHALL have a non-empty `alt` attribute describing the product.

**Validates: Requirements 18.3**

---

## Testing Strategy

### Unit Tests (Example-Based)
- Seed module writes exactly three users with correct emails and roles.
- Login form renders email, password, role selector, and submit button.
- Logout removes `dm_session` and navigates to `#login`.
- Cart view renders each item with remove button.
- Seller dashboard summary card for a seller with no orders shows all zeros.

### Property-Based Tests
- Use a PBT library (e.g., fast-check) with at least 100 iterations per property.
- Each test references its property number using the tag format: **Feature: devi-mart-ecommerce, Property N: [property text]**.
- Generators needed: `arbUser`, `arbProduct`, `arbOrder`, `arbCartItem`, `arbReview`, `arbHash`.

### Edge Cases (Example-Based)
- Stock = 0 renders "Out of Stock" and disables Add to Cart.
- Adding whitespace-only task description is rejected (validation).
- Admin attempting to deactivate an admin account receives error.
- Attempting reverse order status change receives error.
