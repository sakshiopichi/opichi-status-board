-- CreateTable: UserPreferences
-- Stores per-user filter configuration (which components to show per service).
-- preferences column is JSONB: { "components": { "[svcId]": ["ComponentName", ...] } }
-- Empty object = no filters active (show all components).

CREATE TABLE "UserPreferences" (
  id          TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  preferences JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "UserPreferences_pkey"    PRIMARY KEY (id),
  CONSTRAINT "UserPreferences_userId_key" UNIQUE ("userId"),
  CONSTRAINT "UserPreferences_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);
