import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import SignupForm from './SignupForm';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const u = await getSessionUser();
  if (u) redirect('/');
  return <SignupForm />;
}
