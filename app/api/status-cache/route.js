// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
// Returns all StatusCache rows as { [svcId]: { data, error, fetchedAt } }.
// Used by the dashboard on init to seed the first render with real data instantly.
import { headers } from 'next/headers';
import { Pool } from 'pg';
import { auth } from '@/lib/auth';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { rows } = await pool.query(
      `SELECT "svcId", data, error, "fetchedAt" FROM "StatusCache"`
    );
    const result = {};
    for (const row of rows) {
      result[row.svcId] = {
        data: row.data,
        error: row.error,
        fetchedAt: row.fetchedAt,
      };
    }
    return Response.json(result);
  } catch (e) {
    console.error('GET /api/status-cache:', e);
    return Response.json({ error: 'Failed to load cache' }, { status: 500 });
  }
}
