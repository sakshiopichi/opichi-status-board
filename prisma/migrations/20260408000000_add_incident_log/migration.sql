-- CreateTable
CREATE TABLE "IncidentLog" (
    "id"           TEXT NOT NULL,
    "serviceId"    TEXT NOT NULL,
    "serviceName"  TEXT NOT NULL,
    "incidentName" TEXT NOT NULL,
    "impact"       TEXT NOT NULL,
    "firstSeen"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt"   TIMESTAMP(3),
    "status"       TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "IncidentLog_pkey" PRIMARY KEY ("id")
);
