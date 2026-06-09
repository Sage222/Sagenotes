import { redirect, fail } from "@sveltejs/kit";
import { prisma } from "$lib/server/prisma";
import { verifyPassword, signToken } from "$lib/server/auth";
import type { Actions } from "./$types";

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const form = await request.formData();
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "");

    if (!username || !password) {
      return fail(400, { error: "Username and password are required." });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      console.log(`[login] no user found for username: ${username}`);
      return fail(401, { error: "Invalid username or password." });
    }

    console.log(`[login] found user: ${username}, hash prefix: ${user.passwordHash?.slice(0,20)}`);

    const valid = await verifyPassword(password, user.passwordHash);
    console.log(`[login] password valid: ${valid}`);

    if (!valid) {
      return fail(401, { error: "Invalid username or password." });
    }

    const token = signToken({ userId: user.id, username: user.username });
    cookies.set("session", token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      secure: false
    });

    throw redirect(303, "/app");
  }
};
