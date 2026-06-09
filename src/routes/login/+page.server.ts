import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { signToken, verifyPassword } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) throw redirect(302, '/app');
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const username = String(data.get('username') || '').trim();
    const password = String(data.get('password') || '');

    if (!username || !password) {
      return fail(400, { error: 'Username and password are required.', username });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return fail(400, { error: 'Invalid username or password.', username });

    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) return fail(400, { error: 'Invalid username or password.', username });

    const token = signToken({ sub: user.id, username: user.username });
    cookies.set('session', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 60 * 60 * 24 * 30
    });

    throw redirect(302, '/app');
  }
};
