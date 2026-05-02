import { getSessionUser } from '@/lib/auth';
import { ok } from '@/lib/api-helpers';
import { toPublicUser } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET() {
  const u = await getSessionUser();
  return ok({ user: u ? toPublicUser(u) : null });
}
