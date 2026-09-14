# Requirements Document

## Introduction

DEVI MART is a complete multi-category e-commerce single-page application (SPA) built with pure HTML, CSS, and vanilla JavaScript. All application state and data persist exclusively in the browser's localStorage. The SPA is delivered as a single `index.html` with an accompanying `styles.css` and `app.js`. The application supports three user roles — Buyer, Seller, and Admin — each with a dedicated dashboard and feature set. The visual theme is pink-branded throughout, with the tagline "One Mart. Everything You Need. 💗". Eleven product categories are pre-seeded with sample products and three pre-seeded user accounts are available at first launch.

---

## Glossary

- **SPA**: Single-Page Application — the entire UI renders within one `index.html` file without full-page reloads.
- **App**: The DEVI MART SPA as a whole.
- **Router**: The client-side routing module that maps URL hash fragments to rendered views without server requests.
- **Auth Module**: The component responsible for login, logout, session creation, and role enforcement.
- **Session**: An object persisted in localStorage that records the currently logged-in user's ID, role, and login timestamp.
- **Buyer**: An authenticated user with the `buyer` role who browses and purchases products.
- **Seller**: An authenticated user with the `seller` role who lists and manages products and views sales data.
- **Admin**: An authenticated user with the `admin` role who manages all users, products, categories, and orders.
- **Guest**: An unauthenticated visitor who has not logged in.
- **Product**: An item for sale, belonging to one Category, owned by one Seller.
- **Category**: One of eleven predefined product groupings.
- **Cart**: A per-Buyer collection of Products with quantities, persisted in localStorage.
- **Wishlist**: A per-Buyer saved list of Products, persisted in localStorage.
- **Order**: A completed checkout transaction associated with one Buyer, containing one or more Order Items.
- **Order Item**: A single Product and quantity within an Order.
- **Review**: A star rating (1–5) and text comment left by a Buyer on a Product after purchase.
- **Stock**: The available inventory quantity of a Product, managed by the Seller.
- **Dashboard**: The role-specific landing page shown after login.
- **localStorage**: The browser Web Storage API used as the sole data persistence layer.
- **Pre-seeded Data**: Default accounts, categories, and products written to localStorage on first launch if absent.
- **Seed Module**: The code block that initialises Pre-seeded Data on first launch.
- **Welcome Screen**: The first visible screen, containing branding, the tagline, and the Login form.
- **Login Form**: The UI component on the Welcome Screen where users enter credentials and select a role.
- **Role Guard**: A runtime check that redirects users to the correct dashboard or back to the Welcome Screen based on Session role.
- **Revenue Report**: An aggregated summary of sales totals available to the Seller and Admin.

---

## Requirements

### Requirement 1 — Application Bootstrap & Pre-seeded Data

**User Story:** As any user, I want the application to load instantly in a browser by opening a single HTML file, so that no server or build step is required.

#### Acceptance Criteria

1. THE App SHALL be deliverable as three files: `index.html`, `styles.css`, and `app.js`, where opening `index.html` in a modern browser fully initialises the application.
2. WHEN the App loads for the first time and localStorage contains no user data, THE Seed Module SHALL write the following pre-seeded accounts to localStorage: `admin@devimart.com / admin123 / role:admin`, `buyer@devimart.com / buyer123 / role:buyer`, and `seller@devimart.com / seller123 / role:seller`.
3. WHEN the App loads for the first time and localStorage contains no category data, THE Seed Module SHALL write exactly 11 categories to localStorage: Electronics, Fashion, Beauty & Personal Care, Home & Kitchen, Sports & Outdoors, Books & Stationery, Toys & Games, Groceries & Food, Health & Wellness, Automotive, and Jewellery & Accessories.
4. WHEN the App loads for the first time and localStorage contains no product data, THE Seed Module SHALL write a minimum of 3 sample products per category (33 products total) to localStorage, each with a name, description, price, stock quantity, category ID, seller ID (mapped to the pre-seeded seller account), and an image placeholder reference.
5. IF localStorage already contains seeded data on a subsequent load, THEN THE Seed Module SHALL skip re-seeding to preserve any user-added data.
6. THE App SHALL use localStorage exclusively for all data persistence; no external API calls, databases, or server-side storage SHALL be used.

---

### Requirement 2 — Welcome & Login Screen

**User Story:** As a Guest, I want to see a branded welcome screen with a login form, so that I can authenticate and access the correct role dashboard.

#### Acceptance Criteria

1. WHEN the App loads and no valid Session exists in localStorage, THE Router SHALL display the Welcome Screen as the sole visible view.
2. THE Welcome Screen SHALL display the brand name "DEVI MART", the tagline "One Mart. Everything You Need. 💗", and a Login Form, rendered with a pink-dominant colour scheme.
3. THE Login Form SHALL contain an email input field, a password input field, a role selector offering exactly three options (Buyer, Seller, Admin), and a Submit button labelled "Login".
4. WHEN the Submit button is activated and the email, password, and selected role all match a stored user record, THE Auth Module SHALL create a Session in localStorage containing the user's ID, email, role, and login timestamp, then THE Router SHALL navigate to the matching role Dashboard.
5. IF the Submit button is activated and the email, password, or role do not match any stored user record, THEN THE Auth Module SHALL display an inline error message "Invalid credentials. Please try again." without clearing the entered email.
6. IF the Submit button is activated and any input field is empty, THEN THE Login Form SHALL display a field-level validation message indicating the empty field(s) before attempting credential lookup.
7. THE Welcome Screen SHALL be fully responsive, rendering correctly on viewport widths from 320 px to 1920 px.

---

### Requirement 3 — Client-Side Routing & Role Guards

**User Story:** As any authenticated user, I want the URL hash to reflect my current view, so that I can use the browser back/forward buttons and share deep links.

#### Acceptance Criteria

1. THE Router SHALL use URL hash fragments (e.g., `#buyer-home`, `#seller-dashboard`, `#admin-users`) to identify and render the active view without a page reload.
2. WHEN a hash fragment changes, THE Router SHALL unmount the currently rendered view and mount the new view within 100 ms.
3. WHEN any protected hash route is accessed and no valid Session exists in localStorage, THE Role Guard SHALL redirect the browser to `#login`.
4. WHEN a Buyer Session is active and an Admin-only or Seller-only hash route is accessed, THE Role Guard SHALL redirect the browser to `#buyer-home`.
5. WHEN a Seller Session is active and an Admin-only or Buyer-only hash route is accessed, THE Role Guard SHALL redirect the browser to `#seller-dashboard`.
6. WHEN an Admin Session is active and a Buyer-only or Seller-only hash route is accessed, THE Role Guard SHALL redirect the browser to `#admin-dashboard`.
7. WHEN the user clicks the Logout control, THE Auth Module SHALL remove the Session from localStorage and THE Router SHALL navigate to `#login`.

---

### Requirement 4 — Global Navigation & Layout

**User Story:** As any authenticated user, I want a persistent navigation bar relevant to my role, so that I can move between sections without losing context.

#### Acceptance Criteria

1. WHILE a valid Session exists, THE App SHALL render a top navigation bar containing the DEVI MART logo/name, role-appropriate navigation links, and a Logout button.
2. WHILE a Buyer Session is active, THE navigation bar SHALL include links to: Home, Categories, Search, Cart (with item-count badge), Wishlist, My Orders, and the user's display name.
3. WHILE a Seller Session is active, THE navigation bar SHALL include links to: Dashboard, My Products, Add Product, Orders, and the user's display name.
4. WHILE an Admin Session is active, THE navigation bar SHALL include links to: Dashboard, Users, Products, Categories, Orders, and Reports.
5. THE navigation bar SHALL be fully responsive; on viewports narrower than 768 px, THE navigation bar SHALL collapse into a hamburger-style toggle menu.
6. THE navigation bar SHALL maintain the pink branding colour scheme defined in `styles.css`.

---

### Requirement 5 — Buyer Module: Browse & Search

**User Story:** As a Buyer, I want to browse products by category and search by keyword, so that I can discover items I want to purchase.

#### Acceptance Criteria

1. WHEN a Buyer navigates to the Home view, THE App SHALL display a hero banner with the tagline, a featured-products section showing the 8 most recently added products, and a category grid showing all 11 categories with icons or images.
2. WHEN a Buyer selects a category from the category grid, THE App SHALL display a product listing page showing all in-stock products belonging to that category.
3. WHEN a Buyer enters text in the Search input and submits the query, THE App SHALL display all products whose name or description contains the query string (case-insensitive match).
4. WHEN a Buyer applies a price-range filter on a product listing page, THE App SHALL display only products whose price falls within the specified minimum and maximum values.
5. WHEN a Buyer applies a sort order (Price: Low to High, Price: High to Low, Newest, Top Rated) on a product listing page, THE App SHALL re-render the product list in the selected order without a page reload.
6. WHILE a product listing contains more than 12 products, THE App SHALL paginate results showing 12 products per page with Previous and Next controls.

---

### Requirement 6 — Buyer Module: Product Details

**User Story:** As a Buyer, I want to view full product details, so that I can make an informed purchase decision.

#### Acceptance Criteria

1. WHEN a Buyer clicks a product card, THE App SHALL navigate to a Product Detail view displaying the product name, description, price, category, seller name, stock availability, average star rating, and all published Reviews.
2. WHILE a product's stock quantity is greater than 0, THE Product Detail view SHALL display an "Add to Cart" button and a quantity selector defaulting to 1.
3. IF a product's stock quantity equals 0, THEN THE Product Detail view SHALL display an "Out of Stock" label and disable the "Add to Cart" button.
4. THE Product Detail view SHALL display a "Add to Wishlist" button that toggles the product in/out of the Buyer's Wishlist.
5. WHEN a Buyer submits a Review on the Product Detail view, THE App SHALL validate that a star rating between 1 and 5 is selected and a non-empty comment is entered before saving the Review to localStorage and updating the displayed average rating.
6. IF a Buyer attempts to submit a Review for a product that the Buyer has not ordered, THEN THE App SHALL display the message "You can only review products you have purchased."

---

### Requirement 7 — Buyer Module: Cart & Checkout

**User Story:** As a Buyer, I want to manage a shopping cart and complete a checkout, so that I can purchase products.

#### Acceptance Criteria

1. WHEN a Buyer clicks "Add to Cart" on a Product Detail view, THE Cart Module SHALL add the selected product and quantity to the Buyer's Cart in localStorage and increment the Cart badge count in the navigation bar.
2. IF a product already exists in the Cart and the Buyer clicks "Add to Cart" again, THEN THE Cart Module SHALL increment the existing Cart Item quantity by the selected amount rather than creating a duplicate entry.
3. WHEN a Buyer views the Cart, THE App SHALL display each Cart Item with its product name, unit price, quantity selector, line total, and a Remove button.
4. WHEN a Buyer changes the quantity of a Cart Item, THE Cart Module SHALL update the Cart Item quantity and recalculate all line totals and the Cart grand total in real time.
5. WHEN a Buyer clicks "Remove" on a Cart Item, THE Cart Module SHALL remove that item from the Cart and update the Cart badge count.
6. WHEN a Buyer clicks "Proceed to Checkout" from the Cart view, THE App SHALL display a Checkout Form requesting a delivery name, delivery address, city, postal code, and payment method selection (Cash on Delivery or Card — card details are display-only mock fields).
7. WHEN a Buyer submits the Checkout Form with all required fields filled and the Cart is non-empty, THE App SHALL create an Order in localStorage with status "Pending", decrement the stock quantity of each ordered Product, clear the Cart, and navigate to an Order Confirmation view displaying the Order ID.
8. IF a Buyer submits the Checkout Form and any required field is empty, THEN THE App SHALL display field-level validation messages without placing the Order.

---

### Requirement 8 — Buyer Module: Wishlist

**User Story:** As a Buyer, I want to save products to a Wishlist, so that I can return to them later.

#### Acceptance Criteria

1. THE Wishlist SHALL persist across sessions for the authenticated Buyer in localStorage.
2. WHEN a Buyer adds a product to the Wishlist, THE App SHALL display a filled heart icon on that product's card and on the Product Detail view.
3. WHEN a Buyer removes a product from the Wishlist, THE App SHALL display an unfilled heart icon and remove the product from the Wishlist view.
4. WHEN a Buyer views the Wishlist, THE App SHALL display all saved products with their name, price, stock status, an "Add to Cart" button, and a Remove button.
5. WHEN a Buyer clicks "Add to Cart" from the Wishlist view, THE Cart Module SHALL add the product to the Cart using a default quantity of 1.

---

### Requirement 9 — Buyer Module: Orders & Order Tracking

**User Story:** As a Buyer, I want to view my order history and track current orders, so that I know the status of my purchases.

#### Acceptance Criteria

1. WHEN a Buyer navigates to My Orders, THE App SHALL display a list of all Orders placed by that Buyer, sorted by creation date descending, each showing the Order ID, creation date, item count, total amount, and current status.
2. WHEN a Buyer selects an Order from the list, THE App SHALL display an Order Detail view showing all Order Items (product name, quantity, unit price), delivery address, payment method, and the current Order status.
3. THE Order status SHALL progress through the following states in sequence: Pending → Processing → Shipped → Delivered.
4. WHEN the App displays Order Tracking, THE App SHALL render a visual progress indicator (step tracker) showing the current status position within the four-state sequence.
5. IF an Order status is "Delivered", THEN THE App SHALL display a "Write a Review" link for each Order Item that does not yet have a Review.

---

### Requirement 10 — Seller Module: Dashboard & Analytics

**User Story:** As a Seller, I want a dashboard summarising my store performance, so that I can monitor revenue and sales activity.

#### Acceptance Criteria

1. WHEN a Seller navigates to the Seller Dashboard, THE App SHALL display summary cards showing: total products listed, total orders received, total revenue earned (sum of all completed Order totals attributed to the Seller), and total units sold.
2. WHEN a Seller views the Dashboard, THE App SHALL display a list of the 5 most recent Orders containing at least one of the Seller's products, with Order ID, date, Buyer name, and total.
3. WHEN a Seller views the Dashboard, THE App SHALL display the top 3 best-selling products (by units sold) belonging to that Seller.

---

### Requirement 11 — Seller Module: Product Management

**User Story:** As a Seller, I want to add, edit, and delete my product listings, so that I can keep my store up to date.

#### Acceptance Criteria

1. WHEN a Seller navigates to My Products, THE App SHALL display a table of all products owned by that Seller, showing product name, category, price, stock quantity, and action buttons (Edit, Delete).
2. WHEN a Seller clicks "Add Product", THE App SHALL display a Product Form with fields for: name (required), description (required), category (required, dropdown of all 11 categories), price (required, numeric, greater than 0), stock quantity (required, integer, 0 or greater), and an image URL field (optional).
3. WHEN a Seller submits a valid Product Form, THE App SHALL save the new Product to localStorage with a generated unique ID, the Seller's user ID, and a creation timestamp, then redisplay the My Products list including the new entry.
4. IF a Seller submits a Product Form with any required field empty or with price ≤ 0 or stock quantity < 0, THEN THE App SHALL display field-level validation messages and not save the product.
5. WHEN a Seller clicks "Edit" on a product, THE App SHALL display the Product Form pre-populated with the existing product data; upon valid submission, THE App SHALL update the product record in localStorage.
6. WHEN a Seller clicks "Delete" on a product, THE App SHALL display a confirmation dialog; upon confirmation, THE App SHALL remove the product from localStorage and from the My Products list.
7. WHEN a Seller updates a product's stock quantity to 0, THE App SHALL mark the product as out-of-stock and hide the "Add to Cart" button for that product in the Buyer view.

---

### Requirement 12 — Seller Module: Order Management

**User Story:** As a Seller, I want to view and update orders that contain my products, so that I can fulfil customer purchases.

#### Acceptance Criteria

1. WHEN a Seller navigates to the Seller Orders view, THE App SHALL display all Orders containing at least one product owned by the Seller, sorted by creation date descending.
2. WHEN a Seller views an Order, THE App SHALL display only the Order Items belonging to that Seller's products, alongside the Buyer's delivery name and address.
3. WHEN a Seller selects a status update for an Order (from Pending to Processing, Processing to Shipped, or Shipped to Delivered), THE App SHALL update the Order status in localStorage and reflect the change immediately in both the Seller and Buyer views.
4. IF an Order status is already "Delivered", THEN THE App SHALL disable the status-update control for that Order and display the label "Fulfilled".

---

### Requirement 13 — Admin Module: User Management

**User Story:** As an Admin, I want to view and manage all user accounts, so that I can maintain platform integrity.

#### Acceptance Criteria

1. WHEN an Admin navigates to the Users view, THE App SHALL display a paginated table of all registered users showing user ID, email, role, and registration date.
2. WHEN an Admin clicks "View" on a user, THE App SHALL display the user's profile details and, for Buyer accounts, a summary of orders placed; for Seller accounts, a summary of products listed.
3. WHEN an Admin clicks "Deactivate" on a non-Admin user account, THE App SHALL set that user's status to "inactive" in localStorage; THE Auth Module SHALL prevent login for inactive accounts and display the message "Account deactivated. Contact support."
4. IF an Admin attempts to deactivate their own account or another Admin account, THEN THE App SHALL display the error "Admin accounts cannot be deactivated." and take no action.
5. WHEN an Admin clicks "Activate" on an inactive user account, THE App SHALL set that user's status to "active" in localStorage, restoring login capability.

---

### Requirement 14 — Admin Module: Product & Category Management

**User Story:** As an Admin, I want to manage all products and categories across all sellers, so that I can curate the platform catalogue.

#### Acceptance Criteria

1. WHEN an Admin navigates to the Admin Products view, THE App SHALL display a paginated table of all products on the platform showing product name, category, seller email, price, stock, and action buttons (Edit, Delete).
2. WHEN an Admin deletes a product, THE App SHALL remove the product from localStorage and display a success notification; THE App SHALL also remove that product from any active Carts and Wishlists.
3. WHEN an Admin navigates to the Categories view, THE App SHALL display all 11 categories with their names and product counts.
4. WHEN an Admin adds a new category via the Category Form, THE App SHALL save the new category to localStorage and make it available in the Seller's product category dropdown immediately.
5. WHEN an Admin edits a category name, THE App SHALL update the category name in localStorage and reflect the change in all associated product records and UI labels.

---

### Requirement 15 — Admin Module: Order Management

**User Story:** As an Admin, I want to view and manage all orders on the platform, so that I can resolve disputes and monitor fulfilment.

#### Acceptance Criteria

1. WHEN an Admin navigates to the Admin Orders view, THE App SHALL display a paginated table of all Orders on the platform showing Order ID, Buyer email, Seller email(s), total amount, status, and creation date.
2. WHEN an Admin selects an Order, THE App SHALL display the full Order Detail view including all Order Items, delivery information, and payment method.
3. WHEN an Admin updates an Order's status, THE App SHALL save the updated status to localStorage and reflect the change in both the Buyer's and Seller's order views immediately.
4. IF an Admin attempts to set an Order status to a state that precedes its current state in the sequence (Pending → Processing → Shipped → Delivered), THEN THE App SHALL display the error "Order status cannot be reversed." and take no action.

---

### Requirement 16 — Admin Module: Reports

**User Story:** As an Admin, I want to view platform-wide reports, so that I can understand overall business performance.

#### Acceptance Criteria

1. WHEN an Admin navigates to the Reports view, THE App SHALL display the following aggregated metrics: total registered users (by role count), total products listed, total orders placed, total platform revenue (sum of all Order totals), and total units sold.
2. WHEN an Admin views the Reports view, THE App SHALL display a top-10 best-selling products table showing product name, seller email, units sold, and total revenue generated.
3. WHEN an Admin views the Reports view, THE App SHALL display a revenue-by-category breakdown showing each category name and its total revenue contribution.
4. WHEN an Admin views the Reports view, THE App SHALL display a top-5 sellers table ranked by total revenue, showing seller email and total revenue.

---

### Requirement 17 — Visual Design & Branding

**User Story:** As any user, I want the application to have a consistent pink-themed design, so that the brand identity is clear and the experience is visually cohesive.

#### Acceptance Criteria

1. THE App SHALL define a CSS colour palette in `styles.css` using the following primary values: primary pink `#E91E8C` (or equivalent), light pink background `#FFF0F5`, dark text `#2D2D2D`, white `#FFFFFF`, and accent `#FF69B4`.
2. THE App SHALL apply the pink colour palette consistently to: navigation bar background, buttons, active states, badges, headings, and the Welcome Screen background.
3. THE App SHALL use a sans-serif web-safe or Google-Fonts font family for all text elements.
4. THE App SHALL display the tagline "One Mart. Everything You Need. 💗" on the Welcome Screen and in the navigation bar logo area.
5. WHEN the viewport width is less than 768 px, THE App SHALL apply a single-column layout to product grids, dashboard cards, and forms.
6. WHEN the viewport width is between 768 px and 1199 px, THE App SHALL apply a two-column layout to product grids and a two-column layout to dashboard summary cards.
7. WHEN the viewport width is 1200 px or wider, THE App SHALL apply a four-column layout to product grids and a four-column layout to dashboard summary cards.

---

### Requirement 18 — Performance & Accessibility

**User Story:** As any user, I want the application to be fast and accessible, so that it works well regardless of my device or accessibility needs.

#### Acceptance Criteria

1. THE App SHALL achieve an initial render of the Welcome Screen within 3 seconds on a standard broadband connection with no external asset dependencies beyond optional web fonts.
2. THE App SHALL use semantic HTML5 elements (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`) for all major structural regions.
3. THE App SHALL provide `alt` attributes on all `<img>` elements.
4. THE App SHALL ensure all interactive controls (buttons, links, inputs) have visible focus indicators with a contrast ratio of at least 3:1 against their background.
5. THE App SHALL ensure all text content has a contrast ratio of at least 4.5:1 against its background colour.
6. THE App SHALL associate all form inputs with `<label>` elements using matching `for` and `id` attributes.
