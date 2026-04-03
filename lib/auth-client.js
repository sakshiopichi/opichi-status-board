// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
import { createAuthClient } from 'better-auth/react';
import { adminClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  plugins: [adminClient()],
});

export const { signIn, signOut, useSession } = authClient;
