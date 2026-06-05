import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/client';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Seed admin user — upsert so it's safe to run multiple times
  const admin = await prisma.user.upsert({
    where: { email: 'wong.johnathanwh@gmail.com' },
    update: { role: 'admin' },
    create: {
      googleId: 'seed-admin', // placeholder — real googleId set on first OAuth login
      email: 'wong.johnathanwh@gmail.com',
      name: 'Johnathan Wong',
      role: 'admin',
    },
  });
  console.log(`Admin user: ${admin.email} (role: ${admin.role})`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
