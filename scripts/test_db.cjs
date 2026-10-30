const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../lib/db/node_modules/@prisma/client'));
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const url = 'postgres://fd93ae4e270290d6018e47884ac04b7f75bb2f8b62a464490246b78b74f06291:sk_6qYpH3csyfqvztglGVtFt@pooled.db.prisma.io:5432/postgres?sslmode=require&connect_timeout=60';
const prisma = new PrismaClient({ datasources: { db: { url } } });

async function run() {
  try {
    const count = await prisma.product.count();
    console.log('Total count:', count);
    const first5 = await prisma.product.findMany({ take: 5, select: { id: true, title: true } });
    console.log('First 5:', first5.map(p => p.title));
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
