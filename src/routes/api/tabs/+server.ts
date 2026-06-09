import { json } from "@sveltejs/kit";
import { prisma } from "$lib/server/prisma";
import { requireUser } from "$lib/server/auth";

export async function POST({ request }) {
  const userId = requireUser(request);
  const body = await request.json();
  // verify note belongs to user
  const note = await prisma.note.findFirst({ where: { id: body.noteId, userId } });
  if (!note) return json({ error: "Not found" }, { status: 404 });
  const count = await prisma.tab.count({ where: { noteId: body.noteId } });
  const tab = await prisma.tab.create({
    data: { name: body.name ?? "New Tab", content: "", noteId: body.noteId, order: count }
  });
  return json(tab);
}

export async function PUT({ request }) {
  const userId = requireUser(request);
  const body = await request.json();
  const tab = await prisma.tab.update({
    where: { id: body.id },
    data: { name: body.name ?? undefined, content: body.content ?? undefined }
  });
  return json(tab);
}

export async function DELETE({ request }) {
  const userId = requireUser(request);
  const body = await request.json();
  await prisma.tab.delete({ where: { id: body.id } });
  return json({ ok: true });
}
