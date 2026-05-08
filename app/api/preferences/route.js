// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
import { headers } from 'next/headers';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { auth } from '@/lib/auth';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { rows } = await pool.query(
      `SELECT preferences FROM "UserPreferences" WHERE "userId" = $1`,
      [session.user.id]
    );
    return Response.json(rows[0]?.preferences || {});
  } catch (e) {
    console.error('GET /api/preferences:', e);
    return Response.json({ error: 'Failed to load preferences' }, { status: 500 });
  }
}

export async function PUT(request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const id = randomUUID();
  try {
    const { rows } = await pool.query(
      `INSERT INTO "UserPreferences" (id, "userId", preferences, "updatedAt")
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT ("userId") DO UPDATE SET preferences = $3, "updatedAt" = NOW()
       RETURNING preferences`,
      [id, session.user.id, JSON.stringify(body)]
    );
    return Response.json(rows[0].preferences);
  } catch (e) {
    console.error('PUT /api/preferences:', e);
    return Response.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}
