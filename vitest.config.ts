import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    alias: {
      '../../apps/server/lib/supabase.js': resolve(__dirname, 'apps/server/lib/supabase.ts'),
      '../../apps/server/lib/cors.js':     resolve(__dirname, 'apps/server/lib/cors.ts'),
      '../../apps/server/lib/auth.js':     resolve(__dirname, 'apps/server/lib/auth.ts'),
      '../../apps/server/lib/errors.js':   resolve(__dirname, 'apps/server/lib/errors.ts'),
      '../../apps/server/api/auth/login.js':     resolve(__dirname, 'apps/server/api/auth/login.ts'),
      '../../apps/server/api/products/index.js': resolve(__dirname, 'apps/server/api/products/index.ts'),
      '../../apps/server/api/cart/index.js':     resolve(__dirname, 'apps/server/api/cart/index.ts'),
      '../../apps/server/api/orders/index.js':   resolve(__dirname, 'apps/server/api/orders/index.ts'),
    },
    include: ['tests/**/*.test.ts'],
  },
});
