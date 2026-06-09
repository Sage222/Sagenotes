import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(302, '/login');

  const q = url.searchParams.get('q')?.trim() || '';

  const notes = await prisma.note.findMany({
    where: {
      userId: locals.user.id,
      ...(q ? {
        OR: [
          { title: { contains: q } },
          { content: { contains: q } }
        ]
      } : {})
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, updatedAt: true }
  });

  return { notes, q, username: locals.user.username };
};
