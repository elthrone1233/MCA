import React, { useState } from 'react';
import { ShieldCheck, User, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLogin: (token: string, username: string) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
  settings?: {
    websiteTitle: string;
    websiteLogoText: string;
    faviconUrl: string;
    footerText: string;
  };
}

export default function Login({ onLogin, showToast, settings }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Helper to check if fallback/offline credentials match
    const checkFallbackCredentials = () => {
      const cleanUser = username.trim();
      const cleanPass = password.trim();
      if (cleanUser === 'admin' && cleanPass === 'password123') {
        return true;
      }
      
      // Check localStorage for added admin credentials
      const stored = localStorage.getItem('mca_admins');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return parsed.some((a: any) => a.username.toLowerCase() === cleanUser.toLowerCase() && a.password === cleanPass);
        } catch (e) {
          return false;
        }
      }
      return false;
    };

    try {
      const isFallbackCreds = checkFallbackCredentials();

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        // Detect Netlify URL redirection (index.html text/html) or standard 404
        const contentType = res.headers.get('content-type') || '';
        if (res.status === 404 || contentType.includes('text/html')) {
          if (isFallbackCreds) {
            showToast('Logged in (Netlify Client Mode)', 'success');
            onLogin('mock-jwt-token-serverless', username.trim());
            return;
          } else {
            throw new Error('Invalid username or password.');
          }
        }

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Invalid username or password.');
        }

        showToast('Logged in successfully!', 'success');
        onLogin(data.token, data.username);
      } catch (err: any) {
        // Fallback checks for JSON parse errors, CORS, or local offline development
        if (isFallbackCreds) {
          showToast('Logged in (Netlify Client Mode)', 'success');
          onLogin('mock-jwt-token-serverless', username.trim());
          return;
        } else {
          // Normal error display if they input incorrect credentials in offline mode
          const cleanMessage = err.message && !err.message.includes('Unexpected token') && !err.message.includes('fetch')
            ? err.message 
            : 'Invalid username or password.';
          throw new Error(cleanMessage);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please check your credentials.');
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 px-6 lg:px-8" id="login-container">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-neutral-900 flex items-center justify-center text-white shadow-md overflow-hidden p-1.5 border border-neutral-800">
            {settings?.faviconUrl ? (
              <img src={settings.faviconUrl} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <ShieldCheck className="h-7 w-7" />
            )}
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-neutral-900" id="login-title">
          {settings?.websiteTitle || 'MCA Register Records System'}
        </h2>
        <p className="mt-2 text-center text-sm text-neutral-600">
          Sign in to manage and synchronize records securely
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-10 rounded-2xl border border-neutral-200/80 shadow-sm">
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 border border-red-100 flex items-start space-x-3 text-red-800 text-sm animate-fade-in" id="login-error-alert">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-neutral-700">
                Username
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <User className="h-5 w-5" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 text-neutral-900 sm:text-sm placeholder-neutral-400"
                  placeholder="Enter administrator username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 text-neutral-900 sm:text-sm placeholder-neutral-400"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                id="login-submit-button"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 disabled:opacity-50 transition duration-150"
              >
                {isLoading ? (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Authenticating...</span>
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-neutral-200/60 pt-5">
            <p className="text-center text-xs text-neutral-400">
              Demo Credentials: <strong className="text-neutral-500">admin</strong> / <strong className="text-neutral-500">password123</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
