import { PrismaClient } from '@prisma/client';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const prisma = new PrismaClient();

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scryptAsync(password, salt, 64);
  return `${salt}:${key.toString('hex')}`;
}

async function main() {
  const username = process.env.DEFAULT_ADMIN_USERNAME || 'sage';
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'changeme';

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`User already exists: ${username}`);
    return;
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({ data: { username, passwordHash } });
  console.log(`Created user: ${username}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
