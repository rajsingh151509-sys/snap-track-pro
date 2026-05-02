'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/components/api';
import { ToastHost, toast } from '@/components/Toast';

export default function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast('Password must be at least 8 characters', 'error');
      return;
    }
    setBusy(true);
    try {
      await api('/api/auth/signup', { method: 'POST', json: { name, email, password } });
      router.push('/');
      router.refresh();
    } catch (err) {
      toast(String((err as Error).message), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col justify-center">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-extrabold">Create parent account</h1>
        <p className="muted text-sm">You'll add kids to your account next.</p>
      </div>

      <form onSubmit={submit} className="card flex flex-col gap-3">
        <div>
          <label className="label">Your name</label>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            className="field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <div className="text-xs muted mt-1">At least 8 characters.</div>
        </div>
        <button className="btn" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
        <div className="text-center text-sm muted mt-2">
          Already have an account?{' '}
          <Link href="/login" className="text-accent font-bold">
            Sign in
          </Link>
        </div>
      </form>
      <ToastHost />
    </div>
  );
}
