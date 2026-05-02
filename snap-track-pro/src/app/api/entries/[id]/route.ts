import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handle, ok, fail } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireUser();
    // A parent can delete any of their kids' entries; a kid only their own.
    if (me.role === 'parent') {
      const result = await sql`
        DELETE FROM entries
        WHERE id = ${params.id}
          AND user_id IN (SELECT id FROM users WHERE id = ${me.id} OR parent_id = ${me.id})
      `;
      if (result.count === 0) return fail(404, 'Not found');
    } else {
      const result = await sql`DELETE FROM entries WHERE id = ${params.id} AND user_id = ${me.id}`;
      if (result.count === 0) return fail(404, 'Not found');
    }
    return ok({ ok: true });
  } catch (e) {
    return handle(e);
  }
}
