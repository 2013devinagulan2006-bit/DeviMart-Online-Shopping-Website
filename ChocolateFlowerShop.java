import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.net.URL;
import java.util.*;

public class ChocolateFlowerShop extends JFrame {

    static class Product {
        String name, category, image;
        double price;
        int stock;

        Product(String name, String category, double price, int stock, String image) {
            this.name = name;
            this.category = category;
            this.price = price;
            this.stock = stock;
            this.image = image;
        }
    }

    static class CartItem {
        Product product;
        int quantity;

        CartItem(Product product, int quantity) {
            this.product = product;
            this.quantity = quantity;
        }
    }

    static class Order {
        String productName;
        double price;
        int quantity;
        Date date;

        Order(String productName, double price, int quantity) {
            this.productName = productName;
            this.price = price;
            this.quantity = quantity;
            this.date = new Date();
        }
    }

    ArrayList<Product> products = new ArrayList<>();
    ArrayList<CartItem> cart = new ArrayList<>();
    ArrayList<Product> wishlist = new ArrayList<>();
    ArrayList<Order> orders = new ArrayList<>();

    String currentUser = "";

    JPanel mainPanel;

    Color purple = new Color(105, 45, 145);
    Color lightPurple = new Color(245, 235, 250);
    Color pink = new Color(255, 225, 235);

    public ChocolateFlowerShop() {
        setTitle("DEVI MART - Chocolate & Flower Shop");
        setSize(1200, 800);
        setLocationRelativeTo(null);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);

        loadProducts();

        showLogin();

        setVisible(true);
    }

    void loadProducts() {

        products.add(new Product(
                "Cadbury Dairy Milk",
                "Chocolate",
                50,
                20,
                "https://commons.wikimedia.org/wiki/Special:FilePath/Cadbury%20Dairy%20Milk.jpg"
        ));

        products.add(new Product(
                "Cadbury Dairy Milk Silk",
                "Chocolate",
                80,
                20,
                "https://commons.wikimedia.org/wiki/Special:FilePath/Diary%20milk%20silk%20varieties.jpg"
        ));

        products.add(new Product(
                "Cadbury 5 Star",
                "Chocolate",
                30,
                20,
                "https://commons.wikimedia.org/wiki/Special:FilePath/Cadbury%20chocolate%20squares.jpg"
        ));

        products.add(new Product(
                "KitKat",
                "Chocolate",
                40,
                20,
                "https://commons.wikimedia.org/wiki/Special:FilePath/KitKat.jpg"
        ));

        products.add(new Product(
                "Snickers",
                "Chocolate",
                50,
                20,
                "https://commons.wikimedia.org/wiki/Special:FilePath/Snickers.jpg"
        ));

        products.add(new Product(
                "Red Rose",
                "Flower",
                100,
                15,
                "https://commons.wikimedia.org/wiki/Special:FilePath/Rose%20flower%20jpg.jpg"
        ));

        products.add(new Product(
                "Tulip",
                "Flower",
                150,
                15,
                "https://commons.wikimedia.org/wiki/Special:FilePath/Tulip%20flower.jpg"
        ));

        products.add(new Product(
                "Sunflower",
                "Flower",
                120,
                15,
                "https://commons.wikimedia.org/wiki/Special:FilePath/Sunflower%20.jpg"
        ));

        products.add(new Product(
                "Lotus",
                "Flower",
                130,
                15,
                "https://commons.wikimedia.org/wiki/Special:FilePath/Lotusflower%40.jpg"
        ));

        products.add(new Product(
                "Orchid",
                "Flower",
                180,
                15,
                "https://commons.wikimedia.org/wiki/Special:FilePath/Orchid%20Flower.jpg"
        ));
    }

    void showLogin() {

        JPanel panel = new JPanel(new GridBagLayout());
        panel.setBackground(lightPurple);

        JPanel box = new JPanel();
        box.setPreferredSize(new Dimension(400, 450));
        box.setLayout(new BoxLayout(box, BoxLayout.Y_AXIS));
        box.setBackground(Color.WHITE);
        box.setBorder(BorderFactory.createEmptyBorder(35, 40, 35, 40));

        JLabel title = new JLabel("DEVI MART");
        title.setFont(new Font("Arial", Font.BOLD, 32));
        title.setForeground(purple);
        title.setAlignmentX(Component.CENTER_ALIGNMENT);

        JLabel sub = new JLabel("Chocolate & Flower Shop");
        sub.setFont(new Font("Arial", Font.PLAIN, 16));
        sub.setAlignmentX(Component.CENTER_ALIGNMENT);

        JTextField username = new JTextField();
        username.setMaximumSize(new Dimension(320, 45));
        username.setBorder(BorderFactory.createTitledBorder("Username"));

        JPasswordField password = new JPasswordField();
        password.setMaximumSize(new Dimension(320, 45));
        password.setBorder(BorderFactory.createTitledBorder("Password"));

        JButton login = new JButton("LOGIN");
        login.setMaximumSize(new Dimension(320, 45));
        login.setBackground(purple);
        login.setForeground(Color.WHITE);

        JButton register = new JButton("REGISTER");
        register.setMaximumSize(new Dimension(320, 40));

        login.addActionListener(e -> {

            if (username.getText().trim().isEmpty() ||
                    password.getPassword().length == 0) {

                JOptionPane.showMessageDialog(
                        this,
                        "Please enter Username and Password"
                );

                return;
            }

            currentUser = username.getText().trim();

            showHome();
        });

        register.addActionListener(e -> showRegister());

        box.add(title);
        box.add(Box.createVerticalStrut(10));
        box.add(sub);
        box.add(Box.createVerticalStrut(35));
        box.add(username);
        box.add(Box.createVerticalStrut(15));
        box.add(password);
        box.add(Box.createVerticalStrut(25));
        box.add(login);
        box.add(Box.createVerticalStrut(15));
        box.add(register);

        panel.add(box);

        setContentPane(panel);
        revalidate();
        repaint();
    }

    void showRegister() {

        JPanel panel = new JPanel(new GridBagLayout());
        panel.setBackground(lightPurple);

        JPanel box = new JPanel();
        box.setPreferredSize(new Dimension(430, 500));
        box.setLayout(new BoxLayout(box, BoxLayout.Y_AXIS));
        box.setBackground(Color.WHITE);
        box.setBorder(BorderFactory.createEmptyBorder(30, 40, 30, 40));

        JLabel title = new JLabel("CREATE ACCOUNT");
        title.setFont(new Font("Arial", Font.BOLD, 26));
        title.setForeground(purple);
        title.setAlignmentX(Component.CENTER_ALIGNMENT);

        JTextField name = new JTextField();
        name.setMaximumSize(new Dimension(330, 45));
        name.setBorder(BorderFactory.createTitledBorder("Name"));

        JTextField email = new JTextField();
        email.setMaximumSize(new Dimension(330, 45));
        email.setBorder(BorderFactory.createTitledBorder("Email"));

        JTextField username = new JTextField();
        username.setMaximumSize(new Dimension(330, 45));
        username.setBorder(BorderFactory.createTitledBorder("Username"));

        JPasswordField password = new JPasswordField();
        password.setMaximumSize(new Dimension(330, 45));
        password.setBorder(BorderFactory.createTitledBorder("Password"));

        JButton create = new JButton("CREATE ACCOUNT");
        create.setMaximumSize(new Dimension(330, 45));
        create.setBackground(purple);
        create.setForeground(Color.WHITE);

        JButton back = new JButton("BACK TO LOGIN");
        back.setMaximumSize(new Dimension(330, 40));

        create.addActionListener(e -> {

            if (name.getText().trim().isEmpty() ||
                    email.getText().trim().isEmpty() ||
                    username.getText().trim().isEmpty() ||
                    password.getPassword().length == 0) {

                JOptionPane.showMessageDialog(
                        this,
                        "Please fill all fields"
                );

                return;
            }

            JOptionPane.showMessageDialog(
                    this,
                    "Registration Successful!"
            );

            showLogin();
        });

        back.addActionListener(e -> showLogin());

        box.add(title);
        box.add(Box.createVerticalStrut(25));
        box.add(name);
        box.add(Box.createVerticalStrut(12));
        box.add(email);
        box.add(Box.createVerticalStrut(12));
        box.add(username);
        box.add(Box.createVerticalStrut(12));
        box.add(password);
        box.add(Box.createVerticalStrut(25));
        box.add(create);
        box.add(Box.createVerticalStrut(12));
        box.add(back);

        panel.add(box);

        setContentPane(panel);
        revalidate();
        repaint();
    }

    void showHome() {

        JPanel page = new JPanel(new BorderLayout());
        page.setBackground(Color.WHITE);

        page.add(createNavbar(), BorderLayout.NORTH);

        mainPanel = new JPanel();
        mainPanel.setLayout(new BoxLayout(mainPanel, BoxLayout.Y_AXIS));
        mainPanel.setBackground(Color.WHITE);

        JLabel welcome = new JLabel(
                "Welcome, " + currentUser + "!",
                SwingConstants.CENTER
        );

        welcome.setFont(new Font("Arial", Font.BOLD, 26));
        welcome.setForeground(purple);
        welcome.setAlignmentX(Component.CENTER_ALIGNMENT);

        mainPanel.add(Box.createVerticalStrut(20));
        mainPanel.add(welcome);
        mainPanel.add(Box.createVerticalStrut(20));

        addSection("CHOCOLATE COLLECTION", "Chocolate");
        addSection("FLOWERS COLLECTION", "Flower");

        JScrollPane scroll = new JScrollPane(mainPanel);
        scroll.getVerticalScrollBar().setUnitIncrement(16);

        page.add(scroll, BorderLayout.CENTER);

        setContentPane(page);
        revalidate();
        repaint();
    }

    JPanel createNavbar() {

        JPanel nav = new JPanel(new BorderLayout());
        nav.setBackground(purple);
        nav.setBorder(BorderFactory.createEmptyBorder(12, 18, 12, 18));

        JLabel logo = new JLabel("DEVI MART");
        logo.setFont(new Font("Arial", Font.BOLD, 26));
        logo.setForeground(Color.WHITE);

        JPanel buttons = new JPanel(new FlowLayout(FlowLayout.RIGHT, 8, 0));
        buttons.setOpaque(false);

        String[] names = {
                "Home",
                "Search",
                "Categories",
                "Wishlist",
                "Cart",
                "My Orders",
                "Account",
                "Logout"
        };

        for (String name : names) {

            JButton b = new JButton(name);

            b.addActionListener(e -> {

                if (name.equals("Home")) showHome();
                else if (name.equals("Search")) showSearch();
                else if (name.equals("Categories")) showCategories();
                else if (name.equals("Wishlist")) showWishlist();
                else if (name.equals("Cart")) showCart();
                else if (name.equals("My Orders")) showOrders();
                else if (name.equals("Account")) showAccount();
                else if (name.equals("Logout")) {
                    currentUser = "";
                    cart.clear();
                    showLogin();
                }
            });

            buttons.add(b);
        }

        nav.add(logo, BorderLayout.WEST);
        nav.add(buttons, BorderLayout.CENTER);

        return nav;
    }

    void addSection(String title, String category) {

        JLabel heading = new JLabel(title);
        heading.setFont(new Font("Arial", Font.BOLD, 28));
        heading.setForeground(purple);
        heading.setAlignmentX(Component.CENTER_ALIGNMENT);

        mainPanel.add(heading);
        mainPanel.add(Box.createVerticalStrut(10));

        JPanel grid = new JPanel(new GridLayout(1, 5, 15, 15));
        grid.setBackground(Color.WHITE);
        grid.setBorder(BorderFactory.createEmptyBorder(10, 20, 30, 20));

        for (Product p : products) {

            if (p.category.equals(category)) {
                grid.add(createProductCard(p));
            }
        }

        mainPanel.add(grid);
    }

    JPanel createProductCard(Product p) {

        JPanel card = new JPanel();
        card.setLayout(new BoxLayout(card, BoxLayout.Y_AXIS));
        card.setBackground(Color.WHITE);
        card.setBorder(
                BorderFactory.createCompoundBorder(
                        BorderFactory.createLineBorder(new Color(220, 220, 220)),
                        BorderFactory.createEmptyBorder(10, 10, 10, 10)
                )
        );

        JLabel image = createImageLabel(p.image);

        JLabel name = new JLabel(p.name);
        name.setFont(new Font("Arial", Font.BOLD, 16));
        name.setAlignmentX(Component.CENTER_ALIGNMENT);

        JLabel price = new JLabel("₹" + p.price);
        price.setFont(new Font("Arial", Font.BOLD, 17));
        price.setForeground(purple);
        price.setAlignmentX(Component.CENTER_ALIGNMENT);

        JLabel stock = new JLabel("Stock: " + p.stock);
        stock.setAlignmentX(Component.CENTER_ALIGNMENT);

        JButton cartButton = new JButton("Add to Cart");
        cartButton.setAlignmentX(Component.CENTER_ALIGNMENT);

        JButton buyButton = new JButton("Buy Now");
        buyButton.setAlignmentX(Component.CENTER_ALIGNMENT);

        JButton wishButton = new JButton("♡ Wishlist");
        wishButton.setAlignmentX(Component.CENTER_ALIGNMENT);

        JButton viewButton = new JButton("View");
        viewButton.setAlignmentX(Component.CENTER_ALIGNMENT);

        cartButton.addActionListener(e -> addToCart(p));

        buyButton.addActionListener(e -> buyNow(p));

        wishButton.addActionListener(e -> addWishlist(p));

        viewButton.addActionListener(e -> showProductDetails(p));

        card.add(image);
        card.add(Box.createVerticalStrut(8));
        card.add(name);
        card.add(Box.createVerticalStrut(5));
        card.add(price);
        card.add(stock);
        card.add(Box.createVerticalStrut(8));
        card.add(cartButton);
        card.add(Box.createVerticalStrut(5));
        card.add(buyButton);
        card.add(Box.createVerticalStrut(5));
        card.add(wishButton);
        card.add(Box.createVerticalStrut(5));
        card.add(viewButton);

        return card;
    }
JLabel createImageLabel(String imageURL) {

    JLabel label = new JLabel();
    label.setPreferredSize(new Dimension(190, 150));
    label.setMaximumSize(new Dimension(190, 150));
    label.setAlignmentX(Component.CENTER_ALIGNMENT);
    label.setHorizontalAlignment(SwingConstants.CENTER);

    try {
        URL url = new URL(imageURL);
        ImageIcon icon = new ImageIcon(url);

        Image img = icon.getImage();

        Image scaled = img.getScaledInstance(
                180,
                130,
                Image.SCALE_SMOOTH
        );

        label.setIcon(new ImageIcon(scaled));

    } catch (Exception e) {
        label.setText("Image unavailable");
    }

    return label;
}

    void addToCart(Product p) {

        for (CartItem item : cart) {

            if (item.product == p) {

                if (item.quantity < p.stock) {
                    item.quantity++;
                    JOptionPane.showMessageDialog(this, "Added to Cart!");
                } else {
                    JOptionPane.showMessageDialog(this, "Stock limit reached");
                }

                return;
            }
        }

        cart.add(new CartItem(p, 1));

        JOptionPane.showMessageDialog(
                this,
                p.name + " added to cart!"
        );
    }

    void addWishlist(Product p) {

        if (!wishlist.contains(p)) {

            wishlist.add(p);

            JOptionPane.showMessageDialog(
                    this,
                    p.name + " added to Wishlist!"
            );

        } else {

            JOptionPane.showMessageDialog(
                    this,
                    "Already in Wishlist"
            );
        }
    }

    void buyNow(Product p) {

        int result = JOptionPane.showConfirmDialog(
                this,
                "Buy " + p.name + " for ₹" + p.price + "?",
                "Confirm Order",
                JOptionPane.YES_NO_OPTION
        );

        if (result == JOptionPane.YES_OPTION) {

            orders.add(new Order(p.name, p.price, 1));

            JOptionPane.showMessageDialog(
                    this,
                    "Order Placed Successfully!"
            );
        }
    }

    void showProductDetails(Product p) {

        JPanel panel = new JPanel(new BorderLayout(15, 15));

        JLabel image = createImageLabel(p.image);

        JPanel info = new JPanel();
        info.setLayout(new BoxLayout(info, BoxLayout.Y_AXIS));

        JLabel name = new JLabel(p.name);
        name.setFont(new Font("Arial", Font.BOLD, 24));

        JLabel price = new JLabel("Price: ₹" + p.price);
        price.setFont(new Font("Arial", Font.BOLD, 18));

        JLabel stock = new JLabel("Available Stock: " + p.stock);

        JButton cartButton = new JButton("Add to Cart");
        JButton buyButton = new JButton("Buy Now");

        cartButton.addActionListener(e -> addToCart(p));
        buyButton.addActionListener(e -> buyNow(p));

        info.add(name);
        info.add(Box.createVerticalStrut(15));
        info.add(price);
        info.add(Box.createVerticalStrut(10));
        info.add(stock);
        info.add(Box.createVerticalStrut(20));
        info.add(cartButton);
        info.add(Box.createVerticalStrut(10));
        info.add(buyButton);

        panel.add(image, BorderLayout.WEST);
        panel.add(info, BorderLayout.CENTER);

        JOptionPane.showMessageDialog(
                this,
                panel,
                "Product Details",
                JOptionPane.PLAIN_MESSAGE
        );
    }

    void showSearch() {

        String text = JOptionPane.showInputDialog(
                this,
                "Enter product name:"
        );

        if (text == null || text.trim().isEmpty()) return;

        for (Product p : products) {

            if (p.name.toLowerCase().contains(text.toLowerCase())) {

                showProductDetails(p);
                return;
            }
        }

        JOptionPane.showMessageDialog(
                this,
                "Product not found"
        );
    }

    void showCategories() {

        String[] options = {
                "Chocolate",
                "Flower"
        };

        String choice = (String) JOptionPane.showInputDialog(
                this,
                "Select Category",
                "Categories",
                JOptionPane.PLAIN_MESSAGE,
                null,
                options,
                options[0]
        );

        if (choice == null) return;

        JPanel panel = new JPanel(new GridLayout(0, 4, 15, 15));
        panel.setBackground(Color.WHITE);

        for (Product p : products) {

            if (p.category.equals(choice)) {
                panel.add(createProductCard(p));
            }
        }

        JScrollPane scroll = new JScrollPane(panel);

        setMainContent(
                choice + " Collection",
                scroll
        );
    }

    void showWishlist() {

        JPanel panel = new JPanel(new GridLayout(0, 4, 15, 15));
        panel.setBackground(Color.WHITE);

        if (wishlist.isEmpty()) {

            panel.add(new JLabel("Wishlist is Empty"));

        } else {

            for (Product p : wishlist) {
                panel.add(createProductCard(p));
            }
        }

        setMainContent(
                "MY WISHLIST",
                new JScrollPane(panel)
        );
    }

    void showCart() {

        JPanel panel = new JPanel();
        panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));
        panel.setBackground(Color.WHITE);

        double total = 0;

        if (cart.isEmpty()) {

            panel.add(new JLabel("Cart is Empty"));

        } else {

            for (CartItem item : cart) {

                JPanel row = new JPanel(new FlowLayout(FlowLayout.LEFT));

                JLabel name = new JLabel(
                        item.product.name +
                        "   ₹" + item.product.price +
                        "   Qty: " + item.quantity
                );

                JButton remove = new JButton("Remove");

                remove.addActionListener(e -> {
                    cart.remove(item);
                    showCart();
                });

                row.add(name);
                row.add(remove);

                panel.add(row);

                total += item.product.price * item.quantity;
            }

            JLabel totalLabel = new JLabel(
                    "Total: ₹" + total
            );

            totalLabel.setFont(
                    new Font("Arial", Font.BOLD, 22)
            );

            JButton checkout = new JButton("CHECKOUT");

            checkout.addActionListener(e -> checkout());

            panel.add(Box.createVerticalStrut(20));
            panel.add(totalLabel);
            panel.add(checkout);
        }

        setMainContent(
                "MY CART",
                new JScrollPane(panel)
        );
    }

    void checkout() {

        if (cart.isEmpty()) return;

        for (CartItem item : cart) {

            orders.add(
                    new Order(
                            item.product.name,
                            item.product.price,
                            item.quantity
                    )
            );
        }

        cart.clear();

        JOptionPane.showMessageDialog(
                this,
                "Order Placed Successfully!"
        );

        showOrders();
    }

    void showOrders() {

        JPanel panel = new JPanel();
        panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));
        panel.setBackground(Color.WHITE);

        if (orders.isEmpty()) {

            panel.add(new JLabel("No Orders Yet"));

        } else {

            for (Order o : orders) {

                JLabel label = new JLabel(
                        "✓ " + o.productName +
                        " | ₹" + o.price +
                        " | Qty: " + o.quantity +
                        " | " + o.date
                );

                label.setFont(
                        new Font("Arial", Font.PLAIN, 16)
                );

                panel.add(label);
                panel.add(Box.createVerticalStrut(12));
            }
        }

        setMainContent(
                "MY ORDERS",
                new JScrollPane(panel)
        );
    }

    void showAccount() {

        JPanel panel = new JPanel();
        panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));
        panel.setBackground(Color.WHITE);

        JLabel title = new JLabel("MY ACCOUNT");
        title.setFont(new Font("Arial", Font.BOLD, 28));

        JLabel user = new JLabel(
                "Logged in as: " + currentUser
        );

        panel.add(title);
        panel.add(Box.createVerticalStrut(20));
        panel.add(user);

        setMainContent(
                "ACCOUNT",
                new JScrollPane(panel)
        );
    }

    void setMainContent(String title, JScrollPane content) {

        JPanel page = new JPanel(new BorderLayout());

        page.add(createNavbar(), BorderLayout.NORTH);

        JLabel heading = new JLabel(
                title,
                SwingConstants.CENTER
        );

        heading.setFont(
                new Font("Arial", Font.BOLD, 28)
        );

        heading.setForeground(purple);

        page.add(heading, BorderLayout.CENTER);

        JPanel center = new JPanel(new BorderLayout());
        center.add(heading, BorderLayout.NORTH);
        center.add(content, BorderLayout.CENTER);

        page.add(center, BorderLayout.CENTER);

        setContentPane(page);
        revalidate();
        repaint();
    }

    public static void main(String[] args) {

        SwingUtilities.invokeLater(() -> {
            new ChocolateFlowerShop();
        });
    }
}