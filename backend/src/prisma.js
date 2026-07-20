const { PrismaClient } = require('@prisma/client');

// Use a singleton Prisma client instance to prevent multiple connection pools
const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
