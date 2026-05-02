import { NextRequest } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { hashPassword, setSessionCookie } from '@/lib/auth';
import { handle, ok, fail } from '@/lib/api-helpers';
import { toPublicUser, type User } from '@/lib/types';

export const runtime = 'nodejs';

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(80),
});

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    const existing = await sql<{ id: string }[]>`SELECT id FROM users WHERE email = ${body.email} LIMIT 1`;
    if (existing.length) return fail(409, 'An account with that email already exists');
    const hash = await hashPassword(body.password);
    const rows = await sql<User[]>`
      INSERT INTO users (role, email, password_hash, name)
      VALUES ('parent', ${body.email}, ${hash}, ${body.name})
      RETURNING id, role, email, username, parent_id, name, age, gender,
                height_cm, weight_kg, color, calorie_goal, water_goal_ml, created_at
    `;
    const user = rows[0];
    await setSessionCookie(user.id);
    return ok({ user: toPublicUser(user) });
  } catch (e) {
    if (e instanceof z.ZodError) return fail(400, e.issues.map((i) => i.message).join('; '));
    return handle(e);
  }
}
