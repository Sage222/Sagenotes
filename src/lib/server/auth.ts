import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export function signToken(payload: { userId: string; username: string }) {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { userId: string; username: string } | null {
  try {
    return jwt.verify(token, SECRET) as { userId: string; username: string };
  } catch {
    return null;
  }
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function requireUser(request: Request): string {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/);
  if (!match) throw new Response("Unauthorized", { status: 401 });
  const payload = verifyToken(decodeURIComponent(match[1]));
  if (!payload) throw new Response("Unauthorized", { status: 401 });
  return payload.userId;
}
