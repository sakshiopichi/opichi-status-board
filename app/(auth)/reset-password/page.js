// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';

function ResetPasswordForm() {
  const router      = useRouter();
  const params      = useSearchParams();
  const token       = params.get('token');

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [done, setDone]           = useState(false);

  if (!token) {
    return (
      <div className="text-center space-y-3">
        <p className="text-sm text-red-600 font-medium">Invalid or missing reset token.</p>
        <Link href="/forgot-password" className="text-sm text-green-700 hover:underline">
          Request a new reset link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await authClient.resetPassword({ newPassword: password, token });
      if (err) {
        setError(err.message || 'Reset failed. The link may have expired.');
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-3 py-2">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <p className="font-semibold text-gray-900">Password updated</p>
        <p className="text-sm text-gray-500">Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-500 mb-2">Enter your new password below.</p>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">New password</label>
        <div className="relative">
          <input type={showPw ? 'text' : 'password'} required
            value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 pr-10 rounded-xl border border-black/[0.12] text-sm outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-500 transition-all bg-gray-50 placeholder:text-gray-300"
          />
          <button type="button" onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Confirm password</label>
        <input type={showPw ? 'text' : 'password'} required
          value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder="••••••••"
          className="w-full px-4 py-2.5 rounded-xl border border-black/[0.12] text-sm outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-500 transition-all bg-gray-50 placeholder:text-gray-300"
        />
      </div>
      <button type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white font-medium text-sm py-2.5 rounded-xl transition-all mt-2">
        {loading && <Loader2 size={15} className="animate-spin" />}
        {loading ? 'Updating…' : 'Set new password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/opichi-logo.png" alt="Opichi" width={72} height={72} className="object-contain mb-4 drop-shadow-md" />
          <h1 className="text-2xl font-semibold tracking-tight">Opichi Status Board</h1>
          <p className="text-sm text-gray-400 mt-1">Set a new password</p>
        </div>
        <div className="bg-white border border-black/[0.08] rounded-2xl p-8 shadow-sm">
          <Suspense>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
