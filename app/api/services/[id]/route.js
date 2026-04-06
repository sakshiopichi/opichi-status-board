// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
import { headers } from 'next/headers';
import { Pool } from 'pg';
import { auth } from '@/lib/auth';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function DELETE(_request, { params }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  try {
    const { rows } = await pool.query(
      `DELETE FROM "CustomService" WHERE id = $1 AND "userId" = $2 RETURNING id`,
      [id, session.user.id]
    );
    if (rows.length === 0) {
      return Response.json({ error: 'Not found or forbidden' }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (e) {
    console.error('DELETE /api/services:', e);
    return Response.json({ error: 'Failed to remove service' }, { status: 500 });
  }
}
