// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
// Run: node scripts/create-admin.mjs
// Creates the initial admin user. Only needs to run once.
import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pool } from 'pg';
import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  database: pool,
  user: { modelName: 'User' },
  session: { modelName: 'Session' },
  account: { modelName: 'Account' },
  verification: { modelName: 'Verification' },
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  plugins: [admin()],
});

const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] || 'Admin';

if (!email || !password) {
  console.error('Usage: node scripts/create-admin.mjs <email> <password> [name]');
  process.exit(1);
}

try {
  const result = await auth.api.createUser({
    body: { email, password, name, role: 'admin' },
  });
  console.log('Admin user created:', result.user.email);
} catch (err) {
  console.error('Failed to create admin user:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}
