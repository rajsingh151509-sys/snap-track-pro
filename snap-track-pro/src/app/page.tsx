import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import type { Entry, PublicUser } from '@/lib/types';
import { toPublicUser } from '@/lib/types';
import Dashboard from './Dashboard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  // For a parent: show all kids + themselves; default to first kid (or self).
  // For a kid: their own data only.
  let kids: PublicUser[] = [];
  if (user.role === 'parent') {
    const rows = await sql<import('@/lib/types').User[]>`
      SELECT id, role, email, username, parent_id, name, age, gender,
             height_cm, weight_kg, color, calorie_goal, water_goal_ml, created_at
      FROM users WHERE parent_id = ${user.id} ORDER BY created_at ASC
    `;
    kids = rows.map(toPublicUser);
  }

  const initialUserId = user.role === 'parent' && kids.length ? kids[0].id : user.id;
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const entries = await sql<Entry[]>`
    SELECT id, user_id, type, ts, food_name, calories, notes, confidence, ml
    FROM entries WHERE user_id = ${initialUserId} AND ts >= ${since}
    ORDER BY ts DESC
  `;

  return (
    <Dashboard
      me={toPublicUser(user)}
      kids={kids}
      initialUserId={initialUserId}
      initialEntries={entries}
    />
  );
}
