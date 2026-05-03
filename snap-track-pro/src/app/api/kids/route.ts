import { NextRequest } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { hashPassword, requireParent } from '@/lib/auth';
import { handle, ok, fail } from '@/lib/api-helpers';
import { toPublicUser, type User } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const me = await requireParent();
    const rows = await sql<User[]>`
      SELECT id, role, email, username, parent_id, name, age, gender,
             height_cm, weight_kg, color, calorie_goal, water_goal_ml,
             protein_goal, is_athlete, created_at
      FROM users WHERE parent_id = ${me.id} ORDER BY created_at ASC
    `;
    return ok({ kids: rows.map(toPublicUser) });
  } catch (e) {
    return handle(e);
  }
}

const CreateBody = z.object({
  name: z.string().min(1).max(80),
  username: z.string().min(2).max(40).regex(/^[a-z0-9_.-]+$/i, 'letters, numbers, _ . - only'),
  password: z.string().min(6).max(200),
  age: z.number().int().min(2).max(120).optional().nullable(),
  gender: z.enum(['male', 'female']).optional().nullable(),
  height_cm: z.number().min(50).max(250).optional().nullable(),
  weight_kg: z.number().min(10).max(250).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  calorie_goal: z.number().int().min(500).max(5000).optional(),
  water_goal_ml: z.number().int().min(200).max(5000).optional(),
  protein_goal: z.number().int().min(10).max(400).optional(),
  is_athlete: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const me = await requireParent();
    const body = CreateBody.parse(await req.json());
    const taken = await sql<{ id: string }[]>`SELECT id FROM users WHERE username = ${body.username} LIMIT 1`;
    if (taken.length) return fail(409, 'Username is taken');
    const hash = await hashPassword(body.password);
    const rows = await sql<User[]>`
      INSERT INTO users (
        role, username, password_hash, parent_id, name, age, gender,
        height_cm, weight_kg, color, calorie_goal, water_goal_ml,
        protein_goal, is_athlete
      )
      VALUES (
        'kid', ${body.username}, ${hash}, ${me.id}, ${body.name},
        ${body.age ?? null}, ${body.gender ?? null}, ${body.height_cm ?? null},
        ${body.weight_kg ?? null}, ${body.color ?? '#7c3aed'},
        ${body.calorie_goal ?? 1500}, ${body.water_goal_ml ?? 1400},
        ${body.protein_goal ?? 50}, ${body.is_athlete ?? false}
      )
      RETURNING id, role, email, username, parent_id, name, age, gender,
                height_cm, weight_kg, color, calorie_goal, water_goal_ml,
                protein_goal, is_athlete, created_at
    `;
    return ok({ kid: toPublicUser(rows[0]) });
  } catch (e) {
    if (e instanceof z.ZodError) return fail(400, e.issues.map((i) => i.message).join('; '));
    return handle(e);
  }
}
