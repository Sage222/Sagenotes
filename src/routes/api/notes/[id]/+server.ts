import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';

export async function GET({ locals, params }) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const note = await prisma.note.findFirst({ where: { id: params.id, userId: locals.user.id } });
  if (!note) return json({ error: 'Not found' }, { status: 404 });
  return json(note);
}
