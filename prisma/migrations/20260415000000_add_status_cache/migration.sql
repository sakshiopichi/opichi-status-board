-- CreateTable: StatusCache — stores the last known status for each service.
-- Populated by the cron job; read by the dashboard on init for instant first render.
CREATE TABLE "StatusCache" (
  "id"        TEXT NOT NULL,
  "svcId"     TEXT NOT NULL,
  "data"      JSONB,
  "error"     TEXT,
  "fetchedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "StatusCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StatusCache_svcId_key" ON "StatusCache"("svcId");
