'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/components/api';
import { ToastHost, toast } from '@/components/Toast';

export default function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier || !password) return;
    setBusy(true);
    try {
      await api('/api/auth/login', { method: 'POST', json: { identifier, password } });
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
        <div
          className="mx-auto w-20 h-20 rounded-3xl grid place-items-center text-white mb-3"
          style={{ background: 'linear-gradient(135deg,#a78bfa,#f472b6)' }}
        >
          <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8h3l2-3h8l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold">Welcome back</h1>
        <p className="muted text-sm">Snap &amp; Track</p>
      </div>

      <form onSubmit={submit} className="card flex flex-col gap-3">
        <div>
          <label className="label">Email or username</label>
          <input
            className="field"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="parent@example.com or kidsusername"
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            className="field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <button className="btn" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <div className="text-center text-sm muted mt-2">
          New here?{' '}
          <Link href="/signup" className="text-accent font-bold">
            Create a parent account
          </Link>
        </div>
      </form>
      <ToastHost />
    </div>
  );
}
