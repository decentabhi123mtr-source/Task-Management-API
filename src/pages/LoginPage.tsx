import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register(name, email, password);
        setSuccess('Registration successful! Please sign in with your credentials.');
        setIsRegister(false);
        setPassword('');
      } else {
        await login(email, password);
        // After success, navigate to workspace selection page
        navigate('/workspaces');
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || 'An error occurred during authentication';
      if (msg === 'Network Error') {
        setError('Network Error: Cannot reach backend server. Please verify the backend is running at http://localhost:5000 or your VITE_API_URL setting.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-neutral-900">
            {isRegister ? 'Create your account' : 'Sign in to your workspace'}
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
                setSuccess(null);
              }}
              className="font-medium text-neutral-900 underline hover:text-neutral-700 focus:outline-none"
            >
              {isRegister ? 'Sign in' : 'Register'}
            </button>
          </p>
        </div>

        <div className="bg-white px-8 py-8 border border-neutral-200 rounded-lg">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 p-4 border border-green-200">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            {isRegister && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-neutral-700">
                  Full name
                </label>
                <div className="mt-1">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-xs focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                    placeholder="Jane Doe"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-xs focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-xs focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md border border-transparent bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:bg-neutral-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : isRegister ? 'Create account' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
