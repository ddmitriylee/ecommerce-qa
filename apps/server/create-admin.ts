import { createSupabaseAdmin } from '@ecommerce/config';

async function createAdmin() {
  const supabase = createSupabaseAdmin();
  const email = 'admin@shopverse.test';
  const password = 'Password123!';
  const fullName = 'Test Admin User';

  console.log('Creating auth user...');
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      console.log('✅ Admin user already exists!');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
      process.exit(0);
    }
    console.error('Failed to create user:', authError.message);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`User created. ID: ${userId}`);

  // Wait 1.5 seconds for the Supabase SQL trigger to run and create the public.profiles row
  await new Promise(resolve => setTimeout(resolve, 1500));

  console.log('Updating profile role to admin...');
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', userId);

  if (profileError) {
    console.error('Failed to update profile to admin:', profileError.message);
    process.exit(1);
  }

  console.log('✅ Admin user created successfully!');
  console.log('------------------------');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log('------------------------');
}

createAdmin();
