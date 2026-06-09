import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// ── Simple token: base64(payload).base64(hmac) ──────────────
export function signToken(payload: { userId: string; username: string }): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyToken(token: string): { userId: string; username: string } | null {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const expected = createHmac("sha256", SECRET).update(data).digest("base64url");
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;
    return JSON.parse(Buffer.from(data, "base64url").toString());
  } catch {
    return null;
  }
}

// ── Password hashing with built-in scrypt ────────────────────
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    const { scrypt } = require("crypto");
    scrypt(password, salt, 64, (err: Error | null, key: Buffer) => {
      if (err) reject(err);
      else resolve(`${salt}:${key.toString("hex")}`);
    });
  });
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  return new Promise((resolve, reject) => {
    const { scrypt, timingSafeEqual } = require("crypto");
    scrypt(password, salt, 64, (err: Error | null, key: Buffer) => {
      if (err) reject(err);
      else resolve(timingSafeEqual(Buffer.from(hash, "hex"), key));
    });
  });
}

export function requireUser(request: Request): string {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/);
  if (!match) throw new Response("Unauthorized", { status: 401 });
  const payload = verifyToken(decodeURIComponent(match[1]));
  if (!payload) throw new Response("Unauthorized", { status: 401 });
  return payload.userId;
}
