import React, { useState } from 'react';
import { apiFetch } from '../lib/api.ts';
import { useNavigate, useSearchParams } from 'react-router-dom';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: { token, password }
      });
      setSuccess(true);
    } catch (err) {
      const message = (err as any)?.message || (typeof err === 'string' ? err : '') || 'Failed to reset password';
      setError(message as string);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="px-4 py-3 rounded-lg bg-red-600/20 border border-red-600/30 text-red-300">
          Invalid or missing token.
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-md p-6 md:p-8 bg-glass-100 backdrop-blur rounded-2xl border border-white/10 shadow-xl">
        <h2 className="text-2xl font-semibold mb-4">Reset Password</h2>
        {success ? (
          <div className="text-green-300">
            <p>Your password has been reset.</p>
            <button onClick={() => navigate('/login')} className="mt-4 px-4 py-2 rounded bg-blue-600 hover:bg-blue-500">
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-3 py-2 rounded bg-red-600/20 border border-red-600/30 text-red-300 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-300 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full p-3 pr-12 rounded-lg bg-black/30 border border-white/10 focus:outline-none focus:border-blue-500"
                  placeholder="Enter new password"
                />
                <button type="button" onClick={()=>setShowPwd(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
                  {showPwd ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  className="w-full p-3 pr-12 rounded-lg bg-black/30 border border-white/10 focus:outline-none focus:border-blue-500"
                  placeholder="Confirm new password"
                />
                <button type="button" onClick={()=>setShowConfirm(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
                  {showConfirm ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full p-3 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold disabled:opacity-60">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <div className="text-center">
              <button type="button" onClick={() => navigate('/login')} className="text-blue-400 hover:text-blue-300 underline text-sm">
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
