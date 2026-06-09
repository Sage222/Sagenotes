import { redirect } from "@sveltejs/kit";
import { prisma } from "$lib/server/prisma";
import { verifyToken } from "$lib/server/auth";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ cookies, url }) => {
  const token = cookies.get("session");
  if (!token) throw redirect(303, "/login");

  const payload = verifyToken(token);
  if (!payload) throw redirect(303, "/login");

  const q = url.searchParams.get("q")?.trim() || "";

  const notes = await prisma.note.findMany({
    where: {
      userId: payload.userId,
      parentId: null,
      ...(q ? {
        OR: [
          { title: { contains: q } },
          { content: { contains: q } }
        ]
      } : {})
    },
    include: { children: { orderBy: { updatedAt: "desc" } } },
    orderBy: { updatedAt: "desc" }
  });

  return { notes, q, username: payload.username };
};
