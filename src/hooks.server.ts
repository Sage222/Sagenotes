import { verifyToken } from "$lib/server/auth";
import { redirect } from "@sveltejs/kit";
import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get("session");
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      event.locals.userId = payload.userId;
      event.locals.username = payload.username;
    }
  }

  const protectedPaths = ["/app"];
  const isProtected = protectedPaths.some(p => event.url.pathname.startsWith(p));

  if (isProtected && !event.locals.userId) {
    throw redirect(303, "/login");
  }

  return resolve(event);
};
