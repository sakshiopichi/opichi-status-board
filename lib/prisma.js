// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
// Prisma v7 requires a driver adapter — the native engine was removed.
// Using @prisma/adapter-pg with a pg Pool for all PrismaClient usage.
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// Singleton: reuse client across hot-reloads in development
const globalForPrisma = globalThis;
const prisma = globalForPrisma.__prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = prisma;

export default prisma;
