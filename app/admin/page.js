// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import AdminPanel from './AdminPanel';

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect('/login?callbackUrl=/admin');
  if (session.user.role !== 'admin') redirect('/');

  return <AdminPanel />;
}
