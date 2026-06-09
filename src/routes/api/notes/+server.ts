import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';

export async function POST({ locals, request }) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const note = await prisma.note.create({
    data: {
      userId: locals.user.id,
      title: body.title?.trim() || 'Untitled',
      content: body.content || ''
    }
  });
  return json(note);
}

export async function PUT({ locals, request }) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const note = await prisma.note.findFirst({ where: { id: body.id, userId: locals.user.id } });
  if (!note) return json({ error: 'Not found' }, { status: 404 });
  const updated = await prisma.note.update({
    where: { id: body.id },
    data: {
      title: body.title?.trim() || 'Untitled',
      content: body.content ?? note.content
    }
  });
  return json(updated);
}

export async function DELETE({ locals, request }) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  await prisma.note.deleteMany({ where: { id: body.id, userId: locals.user.id } });
  return json({ ok: true });
}
