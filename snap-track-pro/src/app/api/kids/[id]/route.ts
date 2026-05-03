import { NextRequest } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { hashPassword, requireOwnedUser, requireParent } from '@/lib/auth';
import { handle, ok, fail } from '@/lib/api-helpers';
import { toPublicUser, type User } from '@/lib/types';

export const runtime = 'nodejs';

const PatchBody = z.object({
  name: z.string().min(1).max(80).optional(),
  password: z.string().min(6).max(200).optional(),
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { target } = await requireOwnedUser(params.id);
    const body = PatchBody.parse(await req.json());

    // Build a dynamic update list. We do this carefully so that only provided
    // fields are touched, and password becomes a hash if present.
    const updates: Record<string, unknown> = {};
    for (const k of [
      'name',
      'age',
      'gender',
      'height_cm',
      'weight_kg',
      'color',
      'calorie_goal',
      'water_goal_ml',
      'protein_goal',
      'is_athlete',
    ] as const) {
      if (k in body) updates[k] = (body as Record<string, unknown>)[k];
    }
    if (body.password) updates.password_hash = await hashPassword(body.password);

    if (Object.keys(updates).length === 0) {
      return ok({ user: toPublicUser(target) });
    }

    const rows = await sql<User[]>`
      UPDATE users SET ${sql(updates)} WHERE id = ${target.id}
      RETURNING id, role, email, username, parent_id, name, age, gender,
                height_cm, weight_kg, color, calorie_goal, water_goal_ml,
                protein_goal, is_athlete, created_at
    `;
    return ok({ user: toPublicUser(rows[0]) });
  } catch (e) {
    if (e instanceof z.ZodError) return fail(400, e.issues.map((i) => i.message).join('; '));
    return handle(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireParent();
    const result = await sql`DELETE FROM users WHERE id = ${params.id} AND parent_id = ${me.id}`;
    if (result.count === 0) return fail(404, 'Not found');
    return ok({ ok: true });
  } catch (e) {
    return handle(e);
  }
}
