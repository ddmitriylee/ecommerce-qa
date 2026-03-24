-- ============================================
-- Seed Data
-- Run AFTER schema.sql and rls.sql
-- ============================================

-- Categories
INSERT INTO categories (id, name) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Electronics'),
  ('c1000000-0000-0000-0000-000000000002', 'Clothing'),
  ('c1000000-0000-0000-0000-000000000003', 'Home & Garden'),
  ('c1000000-0000-0000-0000-000000000004', 'Sports & Outdoors'),
  ('c1000000-0000-0000-0000-000000000005', 'Books');

-- Products
INSERT INTO products (title, description, price, discount, stock, category_id, image_url) VALUES
  ('Wireless Noise-Cancelling Headphones', 'Premium over-ear headphones with active noise cancellation, 30-hour battery life, and crystal-clear audio.', 299.99, 15, 50, 'c1000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'),
  ('4K Ultra HD Smart TV 55"', 'Stunning 4K display with HDR support, built-in streaming apps, and voice control.', 799.99, 10, 25, 'c1000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400'),
  ('Mechanical Gaming Keyboard', 'RGB backlit mechanical keyboard with Cherry MX switches and programmable macros.', 149.99, 0, 100, 'c1000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1541140532154-b024d1b2be3e?w=400'),
  ('Smartphone Pro Max', 'Flagship smartphone with 6.7" OLED display, triple camera system, and 5G connectivity.', 1199.99, 5, 30, 'c1000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400'),
  ('Premium Leather Jacket', 'Genuine Italian leather jacket with quilted lining. Timeless style.', 499.99, 20, 15, 'c1000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400'),
  ('Slim Fit Casual Shirt', 'Comfortable cotton shirt perfect for everyday wear. Available in multiple colors.', 59.99, 0, 200, 'c1000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400'),
  ('Running Sneakers Ultra', 'Lightweight running shoes with responsive cushioning and breathable mesh upper.', 189.99, 10, 75, 'c1000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'),
  ('Smart Home Hub', 'Central control for all your smart devices. Voice-activated with touchscreen display.', 249.99, 0, 40, 'c1000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=400'),
  ('Indoor Plant Collection', 'Set of 3 beautiful indoor plants with decorative ceramic pots.', 79.99, 0, 60, 'c1000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400'),
  ('Ergonomic Office Chair', 'Premium mesh office chair with lumbar support, adjustable armrests, and headrest.', 599.99, 25, 20, 'c1000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400'),
  ('Mountain Bike Pro', 'Full-suspension mountain bike with 29" wheels, hydraulic disc brakes, and Shimano gears.', 1499.99, 0, 10, 'c1000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=400'),
  ('Yoga Mat Premium', 'Extra-thick eco-friendly yoga mat with alignment lines and carrying strap.', 49.99, 0, 150, 'c1000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400'),
  ('Camping Tent 4-Person', 'Waterproof family tent with easy setup, ventilation windows, and gear pocket.', 299.99, 15, 35, 'c1000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400'),
  ('Bestseller Novel Collection', 'Hardcover collection of 5 bestselling novels. Perfect gift for book lovers.', 89.99, 10, 80, 'c1000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400'),
  ('Programming Masterclass Book', 'Comprehensive guide to modern software development with practical examples.', 44.99, 0, 120, 'c1000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400');
