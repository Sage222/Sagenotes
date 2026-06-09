import { json } from "@sveltejs/kit";
import { prisma } from "$lib/server/prisma";
import { requireUser } from "$lib/server/auth";

export async function GET({ request, url }) {
  const userId = requireUser(request);
  const q = url.searchParams.get("q")?.trim() || "";
  const where = {
    userId,
    parentId: null,
    ...(q ? {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } }
      ]
    } : {})
  };
  const notes = await prisma.note.findMany({
    where,
    include: { children: { orderBy: { updatedAt: "desc" } } },
    orderBy: { updatedAt: "desc" }
  });
  return json(notes);
}

export async function POST({ request }) {
  const userId = requireUser(request);
  const body = await request.json();
  const note = await prisma.note.create({
    data: {
      title: body.title ?? "Untitled",
      content: body.content ?? "",
      parentId: body.parentId ?? null,
      userId
    }
  });
  return json(note);
}

export async function PUT({ request }) {
  const userId = requireUser(request);
  const body = await request.json();
  const note = await prisma.note.update({
    where: { id: body.id, userId },
    data: {
      title: body.title,
      content: body.content
    }
  });
  return json(note);
}

export async function DELETE({ request }) {
  const userId = requireUser(request);
  const body = await request.json();
  await prisma.note.deleteMany({ where: { id: body.id, userId } });
  return json({ ok: true });
}
