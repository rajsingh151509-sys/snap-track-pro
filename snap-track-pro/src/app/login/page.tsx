import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const u = await getSessionUser();
  if (u) redirect('/');
  return <LoginForm />;
}
