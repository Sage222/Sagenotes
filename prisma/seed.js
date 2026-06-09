const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "changeme";
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) { console.log("Seed: user already exists, skipping."); return; }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { username, passwordHash } });
  console.log(`Seed: created user "${username}"`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
