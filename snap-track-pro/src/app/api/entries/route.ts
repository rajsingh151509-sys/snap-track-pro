import { NextRequest } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { requireOwnedUser, requireUser } from '@/lib/auth';
import { handle, ok, fail } from '@/lib/api-helpers';
import type { Entry } from '@/lib/types';

export const runtime = 'nodejs';

// GET /api/entries?userId=XYZ&days=7
// - Parents can pass any of their kids' IDs (or their own).
// - Kids may only request their own ID.
// - If userId omitted, defaults to the requester.
export async function GET(req: NextRequest) {
  try {
    const me = await requireUser();
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId') || me.id;
    await requireOwnedUser(userId);
    const days = Math.max(1, Math.min(60, Number(url.searchParams.get('days') || '7')));
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
    const rows = await sql<Entry[]>`
      SELECT id, user_id, type, ts, food_name, calories, notes, confidence, ml
      FROM entries
      WHERE user_id = ${userId} AND ts >= ${since}
      ORDER BY ts DESC
    `;
    return ok({ entries: rows });
  } catch (e) {
    return handle(e);
  }
}

const CreateBody = z
  .object({
    userId: z.string().uuid().optional(),
    type: z.enum(['food', 'water']),
    food_name: z.string().min(1).max(200).optional(),
    calories: z.number().int().min(0).max(10000).optional(),
    notes: z.string().max(500).optional().nullable(),
    confidence: z.enum(['low', 'medium', 'high']).optional().nullable(),
    ml: z.number().int().min(0).max(5000).optional(),
    ts: z.string().datetime().optional(),
  })
  .refine(
    (b) => (b.type === 'food' ? !!b.food_name : true) && (b.type === 'water' ? typeof b.ml === 'number' : true),
    'Invalid entry shape',
  );

export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();
    const body = CreateBody.parse(await req.json());
    const userId = body.userId || me.id;
    await requireOwnedUser(userId);

    if (body.type === 'food') {
      const rows = await sql<Entry[]>`
        INSERT INTO entries (user_id, type, ts, food_name, calories, notes, confidence)
        VALUES (
          ${userId}, 'food', ${body.ts ?? new Date().toISOString()},
          ${body.food_name!}, ${body.calories ?? 0}, ${body.notes ?? null}, ${body.confidence ?? null}
        )
        RETURNING id, user_id, type, ts, food_name, calories, notes, confidence, ml
      `;
      return ok({ entry: rows[0] });
    } else {
      const rows = await sql<Entry[]>`
        INSERT INTO entries (user_id, type, ts, ml)
        VALUES (${userId}, 'water', ${body.ts ?? new Date().toISOString()}, ${body.ml!})
        RETURNING id, user_id, type, ts, food_name, calories, notes, confidence, ml
      `;
      return ok({ entry: rows[0] });
    }
  } catch (e) {
    if (e instanceof z.ZodError) return fail(400, e.issues.map((i) => i.message).join('; '));
    return handle(e);
  }
}
