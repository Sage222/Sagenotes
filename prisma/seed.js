const { PrismaClient } = require('@prisma/client');
const { createHmac, randomBytes, scrypt } = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(`${salt}:${key.toString('hex')}`);
    });
  });
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
