// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
import { headers } from 'next/headers';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { auth } from '@/lib/auth';
import { CATALOG } from '@/lib/catalog';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const CATALOG_IDS = new Set(CATALOG.map(c => c.id));

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { rows } = await pool.query(
      `SELECT id, "catalogId", "createdAt" FROM "CustomService" WHERE "userId" = $1 ORDER BY "createdAt" ASC`,
      [session.user.id]
    );
    return Response.json(rows);
  } catch (e) {
    console.error('GET /api/services:', e);
    return Response.json({ error: 'Failed to load services' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { catalogId } = body || {};
  if (!catalogId || !CATALOG_IDS.has(catalogId)) {
    return Response.json({ error: 'Invalid catalogId' }, { status: 400 });
  }

  const id = randomUUID();
  try {
    const { rows } = await pool.query(
      `INSERT INTO "CustomService" (id, "userId", "catalogId", "createdAt")
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT ("userId", "catalogId") DO NOTHING
       RETURNING id, "catalogId", "createdAt"`,
      [id, session.user.id, catalogId]
    );
    if (rows.length === 0) {
      // Already added — return the existing record
      const { rows: existing } = await pool.query(
        `SELECT id, "catalogId", "createdAt" FROM "CustomService" WHERE "userId" = $1 AND "catalogId" = $2`,
        [session.user.id, catalogId]
      );
      return Response.json(existing[0], { status: 200 });
    }
    return Response.json(rows[0], { status: 201 });
  } catch (e) {
    console.error('POST /api/services:', e);
    return Response.json({ error: 'Failed to add service' }, { status: 500 });
  }
}
