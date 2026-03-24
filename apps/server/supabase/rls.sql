-- ============================================
-- Row Level Security Policies
-- Run AFTER schema.sql
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ─── Profiles ───────────────────────────────
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to profiles"
  ON profiles FOR ALL
  USING (auth.role() = 'service_role');

-- ─── Categories ─────────────────────────────
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  USING (true);

CREATE POLICY "Service role full access to categories"
  ON categories FOR ALL
  USING (auth.role() = 'service_role');

-- ─── Products ───────────────────────────────
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Service role full access to products"
  ON products FOR ALL
  USING (auth.role() = 'service_role');

-- ─── Cart Items ─────────────────────────────
CREATE POLICY "Users can view own cart"
  ON cart_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own cart"
  ON cart_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart"
  ON cart_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart items"
  ON cart_items FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to cart"
  ON cart_items FOR ALL
  USING (auth.role() = 'service_role');

-- ─── Orders ─────────────────────────────────
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to orders"
  ON orders FOR ALL
  USING (auth.role() = 'service_role');

-- ─── Order Items ────────────────────────────
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to order items"
  ON order_items FOR ALL
  USING (auth.role() = 'service_role');
