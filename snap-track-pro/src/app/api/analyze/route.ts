import { NextRequest } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handle, ok, fail } from '@/lib/api-helpers';
import { analyzeFoodPhoto } from '@/lib/anthropic';

export const runtime = 'nodejs';
export const maxDuration = 30;

const Body = z.object({
  // data URL: data:image/jpeg;base64,XXX
  image: z.string().regex(/^data:image\/(jpeg|png|webp|gif);base64,/),
});

export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();
    const { image } = Body.parse(await req.json());

    // Per-day cap, server side.
    const limit = Number(process.env.DAILY_ANALYZE_LIMIT || '50');
    const today = new Date().toISOString().slice(0, 10);
    const usage = await sql<{ count: number }[]>`
      INSERT INTO analyze_usage (user_id, day, count)
      VALUES (${me.id}, ${today}, 1)
      ON CONFLICT (user_id, day) DO UPDATE SET count = analyze_usage.count + 1
      RETURNING count
    `;
    if (usage[0].count > limit) {
      return fail(429, `Daily analyze limit (${limit}) reached. Try again tomorrow or log manually.`);
    }

    const m = /^data:(image\/(jpeg|png|webp|gif));base64,(.+)$/.exec(image);
    if (!m) return fail(400, 'Bad image');
    const mediaType = m[1] as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
    const b64 = m[3];

    // Sanity-cap the size (~6 MB base64 ≈ 4.5 MB raw).
    if (b64.length > 6 * 1024 * 1024) return fail(413, 'Image too large');

    const result = await analyzeFoodPhoto({ imageBase64: b64, mediaType });
    return ok(result);
  } catch (e) {
    if (e instanceof z.ZodError) return fail(400, 'Invalid request');
    return handle(e);
  }
}
