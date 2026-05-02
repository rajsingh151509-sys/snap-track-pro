import { clearSessionCookie } from '@/lib/auth';
import { ok } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function POST() {
  clearSessionCookie();
  return ok({ ok: true });
}
