import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { toPublicUser, type User, type PublicUser } from '@/lib/types';
import KidsManager from './KidsManager';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const me = await getSessionUser();
  if (!me) redirect('/login');
  if (me.role !== 'parent') redirect('/');
  const rows = await sql<User[]>`
    SELECT id, role, email, username, parent_id, name, age, gender,
           height_cm, weight_kg, color, calorie_goal, water_goal_ml,
           protein_goal, is_athlete, created_at
    FROM users WHERE parent_id = ${me.id} ORDER BY created_at ASC
  `;
  const kids: PublicUser[] = rows.map(toPublicUser);
  return <KidsManager initialKids={kids} />;
}
