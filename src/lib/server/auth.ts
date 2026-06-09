import { createHmac, randomBytes, timingSafeEqual, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

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
    const sigBuf = Buffer.from(sig, "utf8");
    const expBuf = Buffer.from(expected, "utf8");
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;
    return JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt, 64) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored || !stored.includes(":")) return false;
  const colonIdx = stored.indexOf(":");
  const salt = stored.slice(0, colonIdx);
  const hash = stored.slice(colonIdx + 1);
  if (!salt || !hash) return false;
  try {
    const key = await scryptAsync(password, salt, 64) as Buffer;
    const hashBuf = Buffer.from(hash, "hex");
    if (key.length !== hashBuf.length) return false;
    return timingSafeEqual(key, hashBuf);
  } catch {
    return false;
  }
}

export function requireUser(request: Request): string {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/);
  if (!match) throw new Response("Unauthorized", { status: 401 });
  const payload = verifyToken(decodeURIComponent(match[1]));
  if (!payload) throw new Response("Unauthorized", { status: 401 });
  return payload.userId;
}
