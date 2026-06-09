import { verifyToken } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('session');
  const decoded = token ? verifyToken(token) : null;
  event.locals.user = decoded ? { id: decoded.sub, username: decoded.username } : null;
  return resolve(event);
};
