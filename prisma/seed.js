import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes, pbkdf2Sync } from "crypto";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "changeme";
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) { console.log("Seed: user already exists, skipping."); return; }
  const passwordHash = hashPassword(password);
  await prisma.user.create({ data: { username, passwordHash } });
  console.log(`Seed: created user "${username}"`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
