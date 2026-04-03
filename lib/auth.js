// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
// Add clear comments for non-obvious changes, including what replaced prior behavior, to avoid repeating failed fixes.
import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  database: pool,
  // PascalCase table names from Prisma migration
  user: { modelName: 'User' },
  session: {
    modelName: 'Session',
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  account: { modelName: 'Account' },
  verification: { modelName: 'Verification' },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [
    admin(),
    nextCookies(),
  ],
});
