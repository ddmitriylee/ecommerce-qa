import { createSupabaseAdmin } from '@ecommerce/config';

async function seedDatabase() {
  const supabase = createSupabaseAdmin();

  console.log('Seeding categories...');
  const categories = [
    { name: 'Electronics' },
    { name: 'Clothing' },
    { name: 'Home & Garden' },
    { name: 'Sports & Outdoors' },
    { name: 'Automotive' }
  ];

  // Insert categories
  const { data: insertedCategories, error: catError } = await supabase
    .from('categories')
    .upsert(categories, { onConflict: 'name' })
    .select();

  if (catError) {
    console.error('Error seeding categories:', catError.message);
    process.exit(1);
  }

  const categoryMap = insertedCategories.reduce((acc, cat) => {
    acc[cat.name] = cat.id;
    return acc;
  }, {} as Record<string, string>);

  console.log('Seeding products...');
  const products = [
    {
      title: 'Precision Mechanical Keyboard',
      description: 'A high-end mechanical keyboard with tactile switches and customizable RGB lighting for the ultimate typing experience.',
      price: 149.99,
      discount: 0,
      stock: 50,
      image_url: 'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&q=80&w=800',
      category_id: categoryMap['Electronics']
    },
    {
      title: 'Wireless Noise-Canceling Headphones',
      description: 'Premium over-ear headphones featuring industry-leading noise cancellation and 30-hour battery life.',
      price: 299.00,
      discount: 15,
      stock: 35,
      image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800',
      category_id: categoryMap['Electronics']
    },
    {
      title: '4K Ultra HD Smart Monitor',
      description: '27-inch 4K monitor with spectacular color accuracy, perfect for creative professionals and gamers alike.',
      price: 450.00,
      discount: 10,
      stock: 20,
      image_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=800',
      category_id: categoryMap['Electronics']
    },
    {
      title: 'Classic Denim Jacket',
      description: 'A timeless denim jacket made from 100% organic cotton. Durable, comfortable, and stylish.',
      price: 89.50,
      discount: 0,
      stock: 100,
      image_url: 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&q=80&w=800',
      category_id: categoryMap['Clothing']
    },
    {
      title: 'Minimalist Leather Sneakers',
      description: 'Handcrafted leather sneakers with a clean design. Versatile enough for both casual and smart-casual outfits.',
      price: 125.00,
      discount: 5,
      stock: 45,
      image_url: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&q=80&w=800',
      category_id: categoryMap['Clothing']
    },
    {
      title: 'Modern Ceramic Coffee Dripper',
      description: 'Elevate your morning routine with this beautifully designed pour-over coffee dripper made of premium ceramic.',
      price: 34.00,
      discount: 0,
      stock: 75,
      image_url: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=800',
      category_id: categoryMap['Home & Garden']
    },
    {
      title: 'Ergonomic Office Chair',
      description: 'Fully adjustable ergonomic mesh chair offering outstanding lumbar support for long working hours.',
      price: 249.99,
      discount: 20,
      stock: 15,
      image_url: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&q=80&w=800',
      category_id: categoryMap['Home & Garden']
    },
    {
      title: 'Premium Yoga Mat',
      description: 'Extra thick, non-slip yoga mat with alignment lines. Includes a carrying strap.',
      price: 45.00,
      discount: 0,
      stock: 60,
      image_url: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&q=80&w=800',
      category_id: categoryMap['Sports & Outdoors']
    },
    {
      title: 'Stainless Steel Water Bottle',
      description: 'Double-wall vacuum insulated water bottle keeps drinks cold for 24 hours or hot for 12 hours.',
      price: 28.00,
      discount: 0,
      stock: 120,
      image_url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=800',
      category_id: categoryMap['Sports & Outdoors']
    },
    {
      title: 'Dashboard Phone Mount',
      description: 'Secure magnetic phone mount fitting directly on your car air vent or dashboard.',
      price: 19.99,
      discount: 0,
      stock: 200,
      image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=800',
      category_id: categoryMap['Automotive']
    }
  ];

  // Use insert since title isn't UNIQUE in the DB schema
  const { error: prodError } = await supabase
    .from('products')
    .insert(products);

  if (prodError) {
    console.error('Error seeding products:', prodError.message);
    process.exit(1);
  }

  console.log('✅ 10 beautifully curated test products added successfully!');
}

seedDatabase();
