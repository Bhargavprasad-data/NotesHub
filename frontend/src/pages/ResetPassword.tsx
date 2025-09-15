import React, { useState } from 'react';
import { apiFetch } from '../lib/api.ts';
import { useNavigate, useSearchParams } from 'react-router-dom';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
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
      setError(err.message || 'Failed to reset password');
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
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full p-3 rounded-lg bg-black/30 border border-white/10 focus:outline-none focus:border-blue-500"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                minLength={6}
                className="w-full p-3 rounded-lg bg-black/30 border border-white/10 focus:outline-none focus:border-blue-500"
                placeholder="Confirm new password"
              />
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
