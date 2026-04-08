// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
import { Pool } from 'pg';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET /api/incidents — return full log, most recent first
export async function GET(request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT * FROM "IncidentLog" ORDER BY "firstSeen" DESC`
  );
  return Response.json(rows);
}

// POST /api/incidents/sync — called after each refresh cycle with current active issues
// Body: [{ serviceId, serviceName, incidentName, impact }]
export async function POST(request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const activeNow = await request.json();

  // 1. Get all currently active incidents from the log
  const { rows: activeInLog } = await pool.query(
    `SELECT * FROM "IncidentLog" WHERE status = 'active'`
  );

  // 2. Build a key for deduplication: serviceId + incidentName
  const key = (svcId, name) => `${svcId}||${name}`;
  const activeNowKeys = new Set(activeNow.map(i => key(i.serviceId, i.incidentName)));
  const activeInLogKeys = new Set(activeInLog.map(i => key(i.serviceId, i.incidentName)));

  // 3. New incidents — in activeNow but not in log
  const toInsert = activeNow.filter(i => !activeInLogKeys.has(key(i.serviceId, i.incidentName)));

  // 4. Resolved incidents — in log as active but no longer in activeNow
  const toResolve = activeInLog.filter(i => !activeNowKeys.has(key(i.serviceId, i.incidentName)));

  // 5. Insert new
  for (const inc of toInsert) {
    const id = `inc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await pool.query(
      `INSERT INTO "IncidentLog" (id, "serviceId", "serviceName", "incidentName", impact, status)
       VALUES ($1, $2, $3, $4, $5, 'active')`,
      [id, inc.serviceId, inc.serviceName, inc.incidentName, inc.impact || 'minor']
    );
  }

  // 6. Mark resolved
  for (const inc of toResolve) {
    await pool.query(
      `UPDATE "IncidentLog" SET status = 'resolved', "resolvedAt" = NOW() WHERE id = $1`,
      [inc.id]
    );
  }

  return Response.json({ inserted: toInsert.length, resolved: toResolve.length });
}
