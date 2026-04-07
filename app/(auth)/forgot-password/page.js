// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
'use client';

import { useState } from 'react';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: err } = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) {
        setError(err.message || 'Something went wrong. Please try again.');
        return;
      }
      setSent(true);
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
          <p className="text-sm text-gray-400 mt-1">Reset your password</p>
        </div>

        <div className="bg-white border border-black/[0.08] rounded-2xl p-8 shadow-sm">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Mail size={22} className="text-green-700" />
              </div>
              <h2 className="font-semibold text-gray-900">Check your email</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                If <strong>{email}</strong> exists in our system, you'll receive a reset link shortly.
              </p>
              <Link href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-green-700 hover:text-green-800 font-medium mt-2">
                <ArrowLeft size={14} />
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-500 mb-2">
                Enter your email address and we'll send you a link to reset your password.
              </p>
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
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white font-medium text-sm py-2.5 rounded-xl transition-all mt-2">
                {loading && <Loader2 size={15} className="animate-spin" />}
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <div className="text-center pt-1">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600">
                  <ArrowLeft size={13} />
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
