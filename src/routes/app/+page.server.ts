import { redirect } from "@sveltejs/kit";
import { prisma } from "$lib/server/prisma";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ cookies, url }) => {
  const token = cookies.get("session");
  if (!token) throw redirect(303, "/login");

  const { verifyToken } = await import("$lib/server/auth");
  const payload = verifyToken(token);
  if (!payload) throw redirect(303, "/login");

  const q = url.searchParams.get("q")?.trim() || "";

  const where: any = {
    userId: payload.userId,
    parentId: null,
  };

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { content: { contains: q } },
    ];
  }

  const notes = await prisma.note.findMany({
    where,
    include: { children: { orderBy: { updatedAt: "desc" } } },
    orderBy: { updatedAt: "desc" },
  });

  return { notes, q, username: payload.username };
};
