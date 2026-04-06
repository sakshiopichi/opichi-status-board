// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
// Add clear comments for non-obvious changes, including what replaced prior behavior, to avoid repeating failed fixes.
import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { Pool } from 'pg';
import { Resend } from 'resend';

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
    sendResetPassword: async ({ user, url }) => {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: user.email,
        subject: 'Reset your Opichi password',
        html: `
          <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:40px;">
            <img src="https://opichi.ai/opichi-logo.png" alt="Opichi" width="52" style="display:block;margin:0 auto 24px;" />
            <h1 style="font-size:20px;font-weight:600;text-align:center;color:#111827;margin:0 0 8px;">Reset your password</h1>
            <p style="font-size:14px;color:#6b7280;text-align:center;margin:0 0 32px;">Click the button below to set a new password for <strong>${user.email}</strong>. This link expires in 1 hour.</p>
            <a href="${url}" style="display:block;background:#15803d;color:#ffffff;text-align:center;font-size:14px;font-weight:600;padding:14px 24px;border-radius:10px;text-decoration:none;margin-bottom:24px;">Reset password</a>
            <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
    },
  },
  plugins: [
    admin(),
    nextCookies(),
  ],
});
