// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { signIn } from '@/lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') || '/';

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: err } = await signIn.email({ email, password });
      if (err) {
        setError(err.message || 'Invalid credentials');
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/opichi-logo.png" alt="Opichi" width={72} height={72} className="object-contain mb-4 drop-shadow-md" />
          <h1 className="text-2xl font-semibold tracking-tight">Opichi Status Board</h1>
          <p className="text-sm text-gray-400 mt-1">Sign in to your account</p>
        </div>
        <div className="bg-white border border-black/[0.08] rounded-2xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Email</label>
              <input type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-black/[0.12] text-sm outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-500 transition-all bg-gray-50 placeholder:text-gray-300"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required autoComplete="current-password"
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
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white font-medium text-sm py-2.5 rounded-xl transition-all mt-2">
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
