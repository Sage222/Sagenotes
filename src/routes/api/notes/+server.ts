import { json } from "@sveltejs/kit";
import { prisma } from "$lib/server/prisma";
import { requireUser } from "$lib/server/auth";

export async function GET({ request, url }) {
  const userId = requireUser(request);
  const q = url.searchParams.get("q")?.trim() || "";
  const bin = url.searchParams.get("bin") === "1";

  const where: any = {
    userId,
    parentId: null,
    deletedAt: bin ? { not: null } : null,
    ...(q && !bin ? {
      OR: [
        { title: { contains: q } },
        { content: { contains: q } }
      ]
    } : {})
  };

  const notes = await prisma.note.findMany({
    where,
    include: { children: { where: { deletedAt: null }, orderBy: { updatedAt: "desc" } } },
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

  // Restore from bin
  if (body.action === "restore") {
    const note = await prisma.note.update({
      where: { id: body.id, userId },
      data: { deletedAt: null }
    });
    return json(note);
  }

  // Regular save
  const note = await prisma.note.update({
    where: { id: body.id, userId },
    data: { title: body.title, content: body.content }
  });
  return json(note);
}

export async function DELETE({ request }) {
  const userId = requireUser(request);
  const body = await request.json();

  // Empty bin — hard delete all soft-deleted notes
  if (body.action === "empty-bin") {
    const deleted = await prisma.note.findMany({
      where: { userId, deletedAt: { not: null } }
    });
    for (const n of deleted) {
      await prisma.tab.deleteMany({ where: { noteId: n.id } });
    }
    await prisma.note.deleteMany({ where: { userId, deletedAt: { not: null } } });
    return json({ ok: true });
  }

  // Soft delete — move to bin
  await prisma.note.update({
    where: { id: body.id, userId },
    data: { deletedAt: new Date() }
  });
  // Also soft-delete children
  await prisma.note.updateMany({
    where: { parentId: body.id, userId },
    data: { deletedAt: new Date() }
  });
  return json({ ok: true });
}
