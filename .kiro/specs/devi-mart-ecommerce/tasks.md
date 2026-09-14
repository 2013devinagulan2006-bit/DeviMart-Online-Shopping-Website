# Implementation Plan: DEVI MART E-commerce SPA

## Overview

Implement DEVI MART as a zero-dependency, single-page e-commerce application using pure HTML, CSS, and vanilla JavaScript across three files: `index.html`, `styles.css`, and `app.js`. All state lives in `localStorage`. The build proceeds in layers — foundation first (HTML shell + CSS theme + storage utilities + seed data), then auth and routing, then each role's feature surface (Buyer, Seller, Admin), finishing with integration wiring and cross-cutting concerns.

---

## Tasks

- [x] 1. Create the HTML shell and CSS design system
  - Create `index.html` with semantic structure (`<header>`, `<nav>`, `<main id="app">`, `<footer>`), charset/viewport meta, and `<link>` to `styles.css` + `<script defer src="app.js">`.
  - Create `styles.css` with all CSS custom properties (`--pink-primary`, `--pink-light`, `--pink-accent`, `--pink-dark`, `--text-dark`, `--text-muted`, `--white`, `--shadow`, `--radius`, `--transition`).
  - Add base reset, typography, button styles, form styles, badge styles, toast component, modal component, and focus-visible outline rule (3 px solid `--pink-primary`).
  - Add responsive product grid (1-col mobile → 2-col 768 px → 4-col 1200 px) and dashboard-cards grid (same breakpoints).
  - Add navigation bar styles including hamburger collapse at < 768 px.
  - Add step-tracker, star-rating, heart-icon, and pagination component styles.
  - _Requirements: 1.1, 17.1, 17.2, 17.3, 17.5, 17.6, 17.7, 18.2, 18.4, 18.5_

- [x] 2. Implement StorageService and SeedModule
  - [x] 2.1 Implement `StorageService` (`get`, `set`, `remove`, `update`) in `app.js` with `try/catch` around all writes and a `Toast` fallback for quota errors.
    - _Requirements: 1.6_
  - [x] 2.2 Implement `SeedModule` with idempotent guards for `dm_users`, `dm_categories`, and `dm_products`.
    - Seed 3 users: `admin@devimart.com/admin123/admin`, `buyer@devimart.com/buyer123/buyer`, `seller@devimart.com/seller123/seller`.
    - Seed exactly 11 categories with emoji icons.
    - Seed ≥ 3 sample products per category (≥ 33 products total), each with name, description, price, stock, categoryId, sellerId, imageUrl placeholder, and ISO createdAt.
    - _Requirements: 1.2, 1.3, 1.4, 1.5_
  - [ ]* 2.3 Write property test for Seed Idempotence
    - **Property 1: Seed Idempotence**
    - **Validates: Requirements 1.5**

- [x] 3. Implement AuthModule and EventBus
  - [x] 3.1 Implement `EventBus` (`on`, `off`, `emit`) as a plain object in `app.js`.
    - _Requirements: 4.1_
  - [x] 3.2 Implement `AuthModule` (`login`, `logout`, `getSession`, `requireSession`) in `app.js`.
    - `login` checks `status === 'active'`, matches email + password + role, writes `dm_session`.
    - `logout` removes `dm_session`, emits `auth:logout`.
    - Inactive user returns `{ ok: false, error: 'Account deactivated. Contact support.' }`.
    - _Requirements: 2.4, 2.5, 13.3_
  - [ ]* 3.3 Write property test for Login Success (active valid user)
    - **Property 2: Login Success for Any Valid User**
    - **Validates: Requirements 2.4**
  - [ ]* 3.4 Write property test for Login Failure Leaves Session Absent
    - **Property 3: Login Failure Leaves Session Absent**
    - **Validates: Requirements 2.5**
  - [ ]* 3.5 Write property test for Deactivated User Cannot Login
    - **Property 25: Deactivated User Cannot Login**
    - **Validates: Requirements 13.3**

- [x] 4. Implement Router with Role Guards
  - [x] 4.1 Implement `Router` in `app.js`: register all `ROUTES` map entries, parse hash + `:id` params, run Role Guard, clear `#app`, call matched `render(params)`.
    - Default hash `#login` when none present.
    - Redirect unauthenticated access of protected routes to `#login`.
    - Redirect cross-role access to the session role's default dashboard.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  - [ ]* 4.2 Write property test for Role Guard — Unauthenticated Redirect
    - **Property 5: Role Guard — Unauthenticated Redirect**
    - **Validates: Requirements 3.3**
  - [ ]* 4.3 Write property test for Role Guard — Cross-Role Redirect
    - **Property 6: Role Guard — Cross-Role Redirect**
    - **Validates: Requirements 3.4, 3.5, 3.6**

- [x] 5. Checkpoint — Core infrastructure
  - Ensure `index.html` opens in a browser, shows a blank pink page, `StorageService` and `SeedModule` run without errors in the console, and `dm_users`/`dm_categories`/`dm_products` are written to `localStorage` on first load.

- [x] 6. Implement UIComponents and global navigation bar
  - [x] 6.1 Implement `UIComponents` in `app.js`: `ProductCard(product, session)`, `Toast(message, type)`, `Modal(title, body, onConfirm)`, `Pagination({total, page, perPage, onPage})`, `StepTracker(steps, currentStep)`, `StarRating(rating, interactive)`, `HeartIcon(filled)`.
    - All `<img>` elements must include non-empty `alt` attributes.
    - All form inputs must use `<label>` with matching `for`/`id`.
    - _Requirements: 18.2, 18.3, 18.6_
  - [x] 6.2 Implement the persistent navigation bar renderer that reads the active session and renders role-appropriate links (Buyer: Home, Categories, Search, Cart badge, Wishlist, My Orders, name; Seller: Dashboard, My Products, Add Product, Orders, name; Admin: Dashboard, Users, Products, Categories, Orders, Reports) plus a Logout button and hamburger toggle.
    - Subscribe to `EventBus` `cart:changed` to update Cart badge count in real time.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 7. Implement WelcomeView (Login Screen)
  - [x] 7.1 Implement `WelcomeView.render()` in `app.js`: pink hero with brand name "DEVI MART", tagline "One Mart. Everything You Need. 💗", and the login form (email, password, role selector with Buyer/Seller/Admin, Submit button "Login").
    - On submit: validate non-empty fields (field-level `<span class="field-error">`), call `AuthModule.login`, navigate to role dashboard on success, show inline error on failure (preserve email value).
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  - [ ]* 7.2 Write property test for Empty-Field Form Validation
    - **Property 4: Empty-Field Form Validation**
    - **Validates: Requirements 2.6**

- [x] 8. Implement CartModule and WishlistModule
  - [x] 8.1 Implement `CartModule` (`getItems`, `addItem`, `removeItem`, `updateQuantity`, `clear`, `getCount`, `getTotal`) in `app.js`.
    - `addItem` merges quantity if product already present.
    - Emits `cart:changed` via `EventBus` on every mutation.
    - _Requirements: 7.1, 7.2, 7.4, 7.5_
  - [ ]* 8.2 Write property test for Cart Add Grows Count
    - **Property 12: Cart Add Grows Count**
    - **Validates: Requirements 7.1**
  - [ ]* 8.3 Write property test for Cart Duplicate Merges Quantity
    - **Property 13: Cart Duplicate Merges Quantity**
    - **Validates: Requirements 7.2**
  - [ ]* 8.4 Write property test for Cart Line Total Accuracy
    - **Property 14: Cart Line Total Accuracy**
    - **Validates: Requirements 7.4**
  - [x] 8.5 Implement `WishlistModule` (`getItems`, `add`, `remove`, `toggle`, `has`) in `app.js`.
    - _Requirements: 8.1, 8.2, 8.3_
  - [ ]* 8.6 Write property test for Wishlist Round-Trip
    - **Property 16: Wishlist Round-Trip**
    - **Validates: Requirements 8.3**

- [x] 9. Implement ReviewModule and OrderModule
  - [x] 9.1 Implement `ReviewModule` (`submit`, `getByProduct`, `getAverageRating`, `hasPurchased`, `hasReviewed`) in `app.js`.
    - `submit` validates `hasPurchased` (rejects with error if not purchased), rating 1–5, and non-empty comment.
    - _Requirements: 6.5, 6.6_
  - [ ]* 9.2 Write property test for Review Requires Purchase
    - **Property 17: Review Requires Purchase**
    - **Validates: Requirements 6.6**
  - [ ]* 9.3 Write property test for Review Rating Validation
    - **Property 18: Review Rating Validation**
    - **Validates: Requirements 6.5**
  - [x] 9.4 Implement `OrderModule` (`create`, `getByBuyer`, `getBySeller`, `getAll`, `getById`, `updateStatus`, `canAdvance`) in `app.js`.
    - `create` snapshots product names and prices, decrements stock, clears cart, emits `cart:changed`.
    - `updateStatus` enforces `STATUS_RANK` forward-only progression.
    - _Requirements: 7.7, 9.3, 12.3, 15.4_
  - [ ]* 9.5 Write property test for Checkout Decrements Stock
    - **Property 15: Checkout Decrements Stock**
    - **Validates: Requirements 7.7**
  - [ ]* 9.6 Write property test for Order Status Forward-Only
    - **Property 19: Order Status Forward-Only**
    - **Validates: Requirements 9.3, 12.3, 15.4**
  - [ ]* 9.7 Write property test for Buyer Order Isolation
    - **Property 20: Buyer Order Isolation**
    - **Validates: Requirements 9.1**

- [x] 10. Checkpoint — Core modules
  - Ensure `AuthModule`, `CartModule`, `WishlistModule`, `ReviewModule`, and `OrderModule` pass their unit tests and the WelcomeView renders correctly with functional login for all three demo accounts.

- [ ] 11. Implement Buyer views — browsing and search
  - [ ] 11.1 Implement `BuyerHomeView.render()`: hero banner with tagline + "Shop Now" CTA (`#search`), featured-products grid (8 most recent products using `ProductCard`), and category grid (all 11 categories with emoji + name, each linking to `#category/{id}`).
    - _Requirements: 5.1_
  - [ ] 11.2 Implement `CategoryView.render(params)`: filter products by `categoryId` and `stock > 0`; render price-range filter sidebar and sort dropdown (Price Low→High, Price High→Low, Newest, Top Rated); paginated product grid (12 per page) with Previous/Next controls.
    - _Requirements: 5.2, 5.4, 5.5, 5.6_
  - [ ]* 11.3 Write property test for Category Filter Correctness
    - **Property 7: Category Filter Correctness**
    - **Validates: Requirements 5.2**
  - [ ]* 11.4 Write property test for Price Filter Correctness
    - **Property 9: Price Filter Correctness**
    - **Validates: Requirements 5.4**
  - [ ]* 11.5 Write property test for Sort Order Invariant
    - **Property 10: Sort Order Invariant**
    - **Validates: Requirements 5.5**
  - [ ]* 11.6 Write property test for Pagination Page Size
    - **Property 11: Pagination Page Size**
    - **Validates: Requirements 5.6**
  - [ ] 11.7 Implement `SearchView.render(params)`: pre-populate search bar from hash query param; filter `dm_products` by case-insensitive name/description match; same filter/sort/pagination UI as CategoryView.
    - _Requirements: 5.3_
  - [ ]* 11.8 Write property test for Search Result Correctness
    - **Property 8: Search Result Correctness**
    - **Validates: Requirements 5.3**

- [ ] 12. Implement Buyer views — product detail and wishlist
  - [ ] 12.1 Implement `ProductDetailView.render(params)`: load product by `:id`; show name, description, price, category, seller name, stock status; quantity stepper (min 1, max stock) + "Add to Cart" if stock > 0 or "Out of Stock" disabled state if stock = 0; heart toggle for wishlist; average star rating from `ReviewModule.getAverageRating`; review list; review form (shown only if `ReviewModule.hasPurchased` is true and `!hasReviewed`).
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - [ ]* 12.2 Write property test for Image Alt Attribute Presence
    - **Property 27: Image Alt Attribute Presence**
    - **Validates: Requirements 18.3**
  - [ ] 12.3 Implement `WishlistView.render()`: list all wishlist products with name, price, stock status; "Add to Cart" (quantity 1) and Remove (heart toggle) buttons.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 13. Implement Buyer views — cart, checkout, and orders
  - [ ] 13.1 Implement `CartView.render()`: table of cart items (product name, unit price, quantity input for real-time update, line total, Remove button); grand total; "Proceed to Checkout" button → `#checkout`.
    - _Requirements: 7.3, 7.4, 7.5, 7.6_
  - [ ] 13.2 Implement `CheckoutView.render()`: delivery form (name, address, city, postal code — all required) + payment method selector (Cash on Delivery, Card); show mock card fields (number, expiry, CVV) when Card selected; on submit validate all fields → call `OrderModule.create` → navigate to `#order-confirm/{orderId}`.
    - _Requirements: 7.6, 7.7, 7.8_
  - [ ] 13.3 Implement `OrderConfirmView.render(params)`: display Order ID and summary with a "Continue Shopping" link.
    - _Requirements: 7.7_
  - [ ] 13.4 Implement `OrdersView.render()` (Buyer): list all buyer orders sorted by `createdAt` descending (Order ID, date, item count, total, status badge); row click → `#order/{id}`.
    - _Requirements: 9.1_
  - [ ] 13.5 Implement `OrderDetailView.render(params)` (Buyer): full order breakdown; `StepTracker(['Pending','Processing','Shipped','Delivered'], status)`; "Write a Review" link per unreviewed order item when status is Delivered.
    - _Requirements: 9.2, 9.3, 9.4, 9.5_

- [ ] 14. Checkpoint — Buyer flows
  - Ensure a full end-to-end Buyer flow works: login → browse categories → search → view product detail → add to cart → checkout → view order history → write review. All tests pass.

- [ ] 15. Implement Seller views
  - [ ] 15.1 Implement `SellerDashboardView.render()`: summary cards (total products, total orders, total revenue, total units sold); recent 5 orders list; top 3 best-selling products table.
    - Revenue formula: sum of `unitPrice × quantity` for all order items where `sellerId` matches.
    - _Requirements: 10.1, 10.2, 10.3_
  - [ ]* 15.2 Write property test for Seller Revenue Accuracy
    - **Property 21: Seller Revenue Accuracy**
    - **Validates: Requirements 10.1**
  - [ ] 15.3 Implement `SellerProductsView.render()`: table of seller's products (name, category, price, stock, Edit/Delete action buttons); Delete triggers confirmation modal.
    - _Requirements: 11.1, 11.6_
  - [ ] 15.4 Implement `SellerProductFormView.render(params)`: shared add/edit form with fields (name, description, category dropdown, price, stock, imageUrl optional); pre-populate if `?id=` param present; validate on submit (required fields, price > 0, stock ≥ 0); generate UUID + sellerId + createdAt on add; update record on edit.
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 11.7_
  - [ ]* 15.5 Write property test for Product Form Validation — Invalid Inputs Rejected
    - **Property 22: Product Form Validation — Invalid Inputs Rejected**
    - **Validates: Requirements 11.4**
  - [ ]* 15.6 Write property test for Product Edit Round-Trip
    - **Property 23: Product Edit Round-Trip**
    - **Validates: Requirements 11.5**
  - [ ] 15.7 Implement `SellerOrdersView.render()`: list all orders containing seller's products sorted by `createdAt` descending; show only seller's order items + buyer delivery name/address; status update dropdown (disabled if Delivered, shows "Fulfilled"); call `OrderModule.updateStatus` on change.
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 16. Implement Admin views — users and products
  - [ ] 16.1 Implement `AdminDashboardView.render()`: platform stats cards (user count, product count, order count, total revenue).
    - _Requirements: 16.1_
  - [ ] 16.2 Implement `AdminUsersView.render()`: paginated table of all users (ID, email, role, registration date); View (shows profile + order/product summary), Deactivate/Activate buttons; guard: cannot deactivate admin or self, show error "Admin accounts cannot be deactivated."
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  - [ ] 16.3 Implement `AdminProductsView.render()`: paginated table of all products (name, category, seller email, price, stock, Edit/Delete); Delete cascades — remove from all `dm_cart_*` and `dm_wishlist_*` keys; show success Toast.
    - _Requirements: 14.1, 14.2_
  - [ ]* 16.4 Write property test for Admin Delete Cascades
    - **Property 24: Admin Delete Cascades**
    - **Validates: Requirements 14.2**

- [ ] 17. Implement Admin views — categories, orders, and reports
  - [ ] 17.1 Implement `AdminCategoriesView.render()`: list all categories with product count; Add category form; Edit category name (updates name in localStorage and all UI labels).
    - _Requirements: 14.3, 14.4, 14.5_
  - [ ] 17.2 Implement `AdminOrdersView.render()`: paginated table of all orders (Order ID, buyer email, seller email(s), total, status, date); status update dropdown with forward-only guard ("Order status cannot be reversed."); full order detail view on row select.
    - _Requirements: 15.1, 15.2, 15.3, 15.4_
  - [ ] 17.3 Implement `AdminReportsView.render()`: platform metrics section; top-10 products table (by units sold, showing name/seller email/units/revenue); revenue-by-category breakdown; top-5 sellers by revenue.
    - _Requirements: 16.1, 16.2, 16.3, 16.4_
  - [ ]* 17.4 Write property test for Platform Revenue Consistency
    - **Property 26: Platform Revenue Consistency**
    - **Validates: Requirements 16.1**

- [ ] 18. Checkpoint — Admin and Seller flows
  - Ensure Seller login → dashboard analytics → add/edit/delete product → manage order statuses all work. Ensure Admin login → view users → deactivate/activate → manage products (with cascade) → manage categories → update orders → view reports all work. All tests pass.

- [ ] 19. Wire everything together and finalise
  - [ ] 19.1 Call `seed()`, `Router.init()`, and render the navigation bar in `app.js`'s top-level initialisation block (runs on `DOMContentLoaded`). Ensure `window.onhashchange` is wired to `Router.navigate`.
    - _Requirements: 1.1, 3.1, 3.2_
  - [ ] 19.2 Wire `EventBus` `cart:changed` subscription in the nav bar renderer to refresh the Cart badge count. Wire `auth:logout` to clear the nav bar and render `WelcomeView`.
    - _Requirements: 4.1, 4.2_
  - [ ] 19.3 Verify all `<img>` elements across all views have non-empty `alt` attributes; verify all form inputs have associated `<label>` elements; verify focus-visible outlines appear on interactive controls.
    - _Requirements: 18.3, 18.4, 18.5, 18.6_
  - [ ] 19.4 Apply final responsive layout pass: confirm single-column at 320 px, two-column at 768 px, four-column at 1200 px for product grids and dashboard cards; confirm nav hamburger collapse below 768 px.
    - _Requirements: 17.5, 17.6, 17.7, 4.5_

- [ ] 20. Final checkpoint — Full application
  - Ensure all three user roles work end-to-end, all 27 correctness properties are validated by passing tests, and the app renders the Welcome Screen within 3 seconds with no external asset dependencies beyond optional web fonts. Ask the user if any questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; they represent property-based and unit tests.
- All property tests should use a PBT library (e.g., fast-check) with ≥ 100 iterations per property, tagged `Feature: devi-mart-ecommerce, Property N: [property text]`.
- Each task references specific requirements for traceability.
- The design document's Correctness Properties section (Properties 1–27) maps directly to the `*`-marked test sub-tasks.
- Checkpoints (tasks 5, 10, 14, 18, 20) ensure incremental validation at each major layer boundary.
- No build tools or external frameworks are used; the app runs directly from `index.html`.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3.1"] },
    { "id": 1, "tasks": ["2.2", "3.2", "6.1"] },
    { "id": 2, "tasks": ["2.3", "3.3", "3.4", "3.5", "4.1", "8.1", "8.5", "9.1", "9.4"] },
    { "id": 3, "tasks": ["4.2", "4.3", "6.2", "7.1", "8.2", "8.3", "8.4", "8.6", "9.2", "9.3", "9.5", "9.6", "9.7"] },
    { "id": 4, "tasks": ["7.2", "11.1", "11.2", "11.7", "12.1", "12.3", "13.1", "13.2", "13.3", "13.4", "13.5", "15.1", "15.3", "15.4", "15.7", "16.1", "16.2", "16.3", "17.1", "17.2", "17.3"] },
    { "id": 5, "tasks": ["11.3", "11.4", "11.5", "11.6", "11.8", "12.2", "15.2", "15.5", "15.6", "16.4", "17.4"] },
    { "id": 6, "tasks": ["19.1", "19.2", "19.3", "19.4"] }
  ]
}
```
