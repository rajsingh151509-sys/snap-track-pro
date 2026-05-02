import { NextRequest } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { verifyPassword, setSessionCookie } from '@/lib/auth';
import { handle, ok, fail } from '@/lib/api-helpers';
import { toPublicUser, type User } from '@/lib/types';

export const runtime = 'nodejs';

const Body = z.object({
  // accepts email OR username
  identifier: z.string().min(1).max(120),
  password: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    const rows = await sql<(User & { password_hash: string })[]>`
      SELECT id, role, email, username, parent_id, name, age, gender,
             height_cm, weight_kg, color, calorie_goal, water_goal_ml, created_at,
             password_hash
      FROM users
      WHERE email = ${body.identifier} OR username = ${body.identifier}
      LIMIT 1
    `;
    const user = rows[0];
    if (!user) return fail(401, 'Invalid login');
    const okPw = await verifyPassword(body.password, user.password_hash);
    if (!okPw) return fail(401, 'Invalid login');
    await setSessionCookie(user.id);
    const { password_hash: _ph, ...rest } = user;
    return ok({ user: toPublicUser(rest as User) });
  } catch (e) {
    if (e instanceof z.ZodError) return fail(400, 'Invalid request');
    return handle(e);
  }
}
