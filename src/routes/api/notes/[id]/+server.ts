import { json } from "@sveltejs/kit";
import { prisma } from "$lib/server/prisma";
import { requireUser } from "$lib/server/auth";

export async function GET({ params, request }) {
  const userId = requireUser(request);
  const note = await prisma.note.findFirst({
    where: { id: params.id, userId },
    include: { tabs: { orderBy: { order: "asc" } }, children: { orderBy: { updatedAt: "desc" } } }
  });
  return json(note);
}
