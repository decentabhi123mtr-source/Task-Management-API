import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

type AuthMode = 'login' | 'register' | 'forgot';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === 'forgot') {
      if (password !== confirmPassword) {
        setError('New passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError('New password must be at least 6 characters long');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'register') {
        await register(name, email, password);
        setSuccess('Registration successful! Please sign in with your credentials.');
        toast.success('Registration successful!');
        setMode('login');
        setPassword('');
      } else if (mode === 'forgot') {
        const res = await authApi.resetPassword({ email, newPassword: password });
        setSuccess(res.message || 'Password reset successfully! Please sign in.');
        toast.success('Password reset successfully!');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      } else {
        await login(email, password);
        navigate('/workspaces');
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || 'An error occurred during authentication';
      if (msg === 'Network Error') {
        setError('Network Error: Cannot reach backend server. Please verify the backend is running at http://localhost:5000 or your VITE_API_URL setting.');
        toast.error('Network error. Is backend server running?');
      } else {
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 select-none">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-neutral-900">
            {mode === 'register' && 'Create your account'}
            {mode === 'login' && 'Sign in to your workspace'}
            {mode === 'forgot' && 'Reset your password'}
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            {mode === 'forgot' ? (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccess(null);
                }}
                className="font-medium text-neutral-900 underline hover:text-neutral-700 focus:outline-none"
              >
                Back to sign in
              </button>
            ) : (
              <>
                {mode === 'register' ? 'Already have an account? ' : "Don't have an account? "}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'register' ? 'login' : 'register');
                    setError(null);
                    setSuccess(null);
                  }}
                  className="font-medium text-neutral-900 underline hover:text-neutral-700 focus:outline-none"
                >
                  {mode === 'register' ? 'Sign in' : 'Register'}
                </button>
              </>
            )}
          </p>
        </div>

        <div className="bg-white px-8 py-8 border border-neutral-200 rounded-xl shadow-xs">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-200">
                <p className="text-sm text-emerald-700 font-medium">{success}</p>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-lg border border-neutral-300 px-3.5 py-2 text-sm focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                  placeholder="Jane Doe"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-lg border border-neutral-300 px-3.5 py-2 text-sm focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                  {mode === 'forgot' ? 'New Password' : 'Password'}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-lg border border-neutral-300 px-3.5 py-2 text-sm focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            {mode === 'forgot' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-lg border border-neutral-300 px-3.5 py-2 text-sm focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-lg border border-transparent bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:bg-neutral-400 disabled:cursor-not-allowed"
              >
                {loading
                  ? 'Processing...'
                  : mode === 'register'
                  ? 'Create account'
                  : mode === 'forgot'
                  ? 'Reset Password'
                  : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
