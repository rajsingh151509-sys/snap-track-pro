import 'server-only';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { sql } from './db';
import type { User } from './types';

const COOKIE_NAME = 'snaptrack_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error('AUTH_SECRET must be set (32+ chars). See .env.example.');
  }
  return new TextEncoder().encode(s);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function makeSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
    .sign(getSecret());
}

export async function setSessionCookie(userId: string) {
  const token = await makeSessionToken(userId);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<User | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  let userId: string;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    userId = String(payload.sub);
  } catch {
    return null;
  }
  const rows = await sql<User[]>`
    SELECT id, role, email, username, parent_id, name, age, gender,
           height_cm, weight_kg, color, calorie_goal, water_goal_ml,
           protein_goal, is_athlete, created_at
    FROM users WHERE id = ${userId} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function requireUser(): Promise<User> {
  const u = await getSessionUser();
  if (!u) throw new HttpError(401, 'Not signed in');
  return u;
}

export async function requireParent(): Promise<User> {
  const u = await requireUser();
  if (u.role !== 'parent') throw new HttpError(403, 'Parents only');
  return u;
}

/**
 * For parents: a kid is theirs if kid.parent_id === parent.id.
 * For kids:    "their own" record only.
 * Throws 403 otherwise.
 */
export async function requireOwnedUser(targetUserId: string): Promise<{ me: User; target: User }> {
  const me = await requireUser();
  if (me.id === targetUserId) return { me, target: me };
  if (me.role === 'parent') {
    const rows = await sql<User[]>`
      SELECT id, role, email, username, parent_id, name, age, gender,
             height_cm, weight_kg, color, calorie_goal, water_goal_ml,
             protein_goal, is_athlete, created_at
      FROM users WHERE id = ${targetUserId} AND parent_id = ${me.id} LIMIT 1
    `;
    if (rows[0]) return { me, target: rows[0] };
  }
  throw new HttpError(403, 'Not allowed');
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
