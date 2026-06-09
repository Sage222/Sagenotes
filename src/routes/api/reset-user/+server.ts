import { json } from "@sveltejs/kit";
import { prisma } from "$lib/server/prisma";
import { hashPassword } from "$lib/server/auth";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
  const username = process.env.DEFAULT_ADMIN_USERNAME || "sage";
  const password = process.env.DEFAULT_ADMIN_PASSWORD || "changeme";
  const hash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { username },
    update: { passwordHash: hash },
    create: { username, passwordHash: hash }
  });
  return json({ ok: true, username: user.username, hashPrefix: hash.slice(0, 20) });
};
