// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
// Protected cron endpoint — called by Railway's built-in cron on a schedule.
// Fetches every service status via the internal proxy, upserts results to StatusCache.
// Auth: x-cron-secret header must match CRON_SECRET env var.
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { SERVICES } from '@/lib/services';
import { CATALOG } from '@/lib/catalog';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const CATALOG_MAP = Object.fromEntries(CATALOG.map(c => [c.id, c]));

export async function POST(request) {
  const secret = request.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Build full service list: built-ins + every catalogId any user has added
  let catalogSvcs = [];
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT "catalogId" FROM "CustomService"`
    );
    catalogSvcs = rows
      .map(r => CATALOG_MAP[r.catalogId])
      .filter(Boolean);
  } catch (e) {
    console.error('[cron] Failed to load custom services from DB:', e.message);
    // Non-fatal — proceed with built-ins only
  }

  const services = [...SERVICES, ...catalogSvcs];
  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3002';

  const results = await Promise.allSettled(
    services.map(async (svc) => {
      let data = null;
      let error = null;
      try {
        const res = await fetch(
          `${baseUrl}/api/proxy?url=${encodeURIComponent(svc.url)}`,
          { cache: 'no-store', headers: { 'x-cron-internal': '1' } }
        );
        if (res.ok) {
          data = await res.json();
        } else {
          error = `HTTP ${res.status}`;
        }
      } catch (e) {
        error = e.message;
      }

      // Upsert into StatusCache
      await pool.query(
        `INSERT INTO "StatusCache" (id, "svcId", data, error, "fetchedAt")
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT ("svcId") DO UPDATE
           SET data = $3, error = $4, "fetchedAt" = now()`,
        [randomUUID(), svc.id, data ? JSON.stringify(data) : null, error]
      );
    })
  );

  const failed = results.filter(r => r.status === 'rejected').length;
  return Response.json({ ok: true, fetched: services.length, failed });
}
