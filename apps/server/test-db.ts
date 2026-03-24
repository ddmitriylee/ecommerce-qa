import { createSupabaseAdmin } from '@ecommerce/config';

async function testConnection() {
  console.log('Testing Supabase connection...');
  try {
    // This will throw if env vars are missing
    const supabase = createSupabaseAdmin();
    
    console.log('Querying products table...');
    const { data: products, error: productsError } = await supabase.from('products').select('*').limit(3);
    
    if (productsError) {
      console.error('❌ Error fetching products:', productsError.message);
      process.exit(1);
    }
    
    console.log('✅ Connection to Supabase successful!');
    console.log(`Found ${products.length} products in the database.`);
    if (products.length > 0) {
      console.log('Sample product:', products[0].title);
    }
    
  } catch (err: any) {
    console.error('❌ Failed to connect:', err.message || err);
    process.exit(1);
  }
}

testConnection();
