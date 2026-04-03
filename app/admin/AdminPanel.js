// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Loader2, X, Shield, User, LogOut } from 'lucide-react';
import { authClient, signOut } from '@/lib/auth-client';

export default function AdminPanel() {
  const router = useRouter();
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating]   = useState(false);
  const [createError, setCreateError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await authClient.admin.listUsers({ query: { limit: 100 } });
      if (err) { setError(err.message || 'Failed to load users'); return; }
      setUsers(data?.users ?? []);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function handleCreate(e) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const { error: err } = await authClient.admin.createUser({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      });
      if (err) { setCreateError(err.message || 'Failed to create user'); return; }
      setForm({ name: '', email: '', password: '', role: 'user' });
      setShowCreate(false);
      await loadUsers();
    } catch {
      setCreateError('Something went wrong. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(userId) {
    if (!confirm('Are you sure you want to remove this user?')) return;
    setDeletingId(userId);
    try {
      const { error: err } = await authClient.admin.removeUser({ userId });
      if (err) { setError(err.message || 'Failed to remove user'); return; }
      await loadUsers();
    } catch {
      setError('Failed to remove user.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-black/[0.08] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <img src="/opichi-logo.png" alt="Opichi" width={32} height={32} className="object-contain" />
            <span className="font-semibold tracking-tight">Opichi Status Board</span>
            <span className="text-xs bg-green-50 text-green-700 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
              <Shield size={10} /> Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')}
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              Dashboard
            </button>
            <button onClick={handleSignOut}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">User Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">Create and manage user accounts</p>
          </div>
          <button onClick={() => { setShowCreate(true); setCreateError(''); }}
            className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all">
            <Plus size={15} /> New user
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
        )}

        {/* Create User Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-base">Create new user</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                {createError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{createError}</div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Name</label>
                  <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Full name"
                    className="w-full px-4 py-2.5 rounded-xl border border-black/[0.12] text-sm outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-500 transition-all bg-gray-50 placeholder:text-gray-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Email</label>
                  <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="user@example.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-black/[0.12] text-sm outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-500 transition-all bg-gray-50 placeholder:text-gray-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Password</label>
                  <input type="password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl border border-black/[0.12] text-sm outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-500 transition-all bg-gray-50 placeholder:text-gray-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Role</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-black/[0.12] text-sm outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-500 transition-all bg-gray-50">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowCreate(false)}
                    className="flex-1 py-2.5 rounded-xl border border-black/[0.12] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={creating}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white text-sm font-medium py-2.5 rounded-xl transition-all">
                    {creating && <Loader2 size={14} className="animate-spin" />}
                    {creating ? 'Creating…' : 'Create user'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white border border-black/[0.08] rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <User size={32} className="text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No users yet. Create the first one.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">User</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Joined</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        user.role === 'admin'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {user.role === 'admin' && <Shield size={9} />}
                        {user.role || 'user'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDelete(user.id)} disabled={deletingId === user.id}
                        className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50">
                        {deletingId === user.id
                          ? <Loader2 size={15} className="animate-spin" />
                          : <Trash2 size={15} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
