import jwt from 'jsonwebtoken';
import argon2 from 'argon2';

const getSecret = () => process.env.JWT_SECRET || 'fallback-secret-change-in-production';

export function signToken(payload: object): string {
  return jwt.sign(payload, getSecret(), { expiresIn: '30d' });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, getSecret());
  } catch {
    return null;
  }
}

export const hashPassword = (p: string) => argon2.hash(p);
export const verifyPassword = (hash: string, p: string) => argon2.verify(hash, p);
