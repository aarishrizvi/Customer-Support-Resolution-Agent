import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { signInWithEmail, registerWithEmail, resetPassword, googleSignIn } from '../../lib/firebase';
import { getOrCreateUserProfile } from '../../lib/firestore-service';
import { UserProfile } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: UserProfile) => void;
  initialTab?: 'LOGIN' | 'REGISTER';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'LOGIN'
}) => {
  const [tab, setTab] = useState<'LOGIN' | 'REGISTER' | 'FORGOT'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (tab === 'REGISTER') {
        if (!name.trim()) {
          throw new Error('Please enter your full name.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }

        // Public customer registration - role is automatically and strictly CUSTOMER
        const user = await registerWithEmail(email.trim(), password, name.trim());
        const profile = await getOrCreateUserProfile(user, name.trim());
        onSuccess(profile);
        onClose();
      } else if (tab === 'LOGIN') {
        const user = await signInWithEmail(email.trim(), password);
        const profile = await getOrCreateUserProfile(user);
        onSuccess(profile);
        onClose();
      } else if (tab === 'FORGOT') {
        await resetPassword(email.trim());
        setResetSent(true);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'Authentication failed. Please verify credentials.';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
        msg = 'Invalid email or password. Please try again.';
      } else if (msg.includes('auth/email-already-in-use')) {
        msg = 'An account with this email already exists. Please log in.';
      } else if (msg.includes('auth/weak-password')) {
        msg = 'Password is too weak. Please use at least 6 characters.';
      }
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const res = await googleSignIn();
      if (res.user) {
        const profile = await getOrCreateUserProfile(res.user);
        onSuccess(profile);
        onClose();
      }
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      let userNotice = err.message || 'Google sign-in could not be completed.';
      if (typeof userNotice === 'string' && userNotice.startsWith('{') && userNotice.endsWith('}')) {
        try {
          const parsed = JSON.parse(userNotice);
          userNotice = parsed.error || userNotice;
        } catch {
          // ignore parse error
        }
      }
      setErrorMsg(userNotice);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-md"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand header */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-7 h-7 rounded-md bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center text-white dark:text-neutral-900 font-semibold text-xs shadow-xs">
            <span>R</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">ResolveAI</h3>
            <p className="text-[11px] text-neutral-500">Customer Support Resolution Portal</p>
          </div>
        </div>

        {/* Tab switchers: Login / Register */}
        {tab !== 'FORGOT' && (
          <div className="flex border-b border-neutral-200 dark:border-neutral-800 mb-5">
            <button
              type="button"
              onClick={() => { setTab('LOGIN'); setErrorMsg(null); }}
              className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
                tab === 'LOGIN'
                  ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('REGISTER'); setErrorMsg(null); }}
              className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
                tab === 'REGISTER'
                  ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
              }`}
            >
              Register Account
            </button>
          </div>
        )}

        {/* Reset Password Notification */}
        {resetSent ? (
          <div className="py-4 space-y-4 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Password Reset Email Sent</h4>
              <p className="text-xs text-neutral-500 mt-1">
                Please check <span className="font-medium text-neutral-800 dark:text-neutral-200">{email}</span> for instructions to reset your password.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setResetSent(false); setTab('LOGIN'); }}
              className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 underline"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {tab === 'REGISTER' && (
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sarah Khan"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
                />
              </div>
            </div>

            {tab !== 'FORGOT' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Password
                  </label>
                  {tab === 'LOGIN' && (
                    <button
                      type="button"
                      onClick={() => setTab('FORGOT')}
                      className="text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
                  />
                </div>
              </div>
            )}

            {tab === 'REGISTER' && (
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
                  />
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  New accounts are created as Customers. Support Console access is granted by an administrator.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <span>{isLoading ? 'Processing...' : tab === 'REGISTER' ? 'Create Customer Account' : tab === 'FORGOT' ? 'Send Reset Link' : 'Sign In'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {tab === 'FORGOT' && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setTab('LOGIN')}
                  className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                >
                  Return to Sign In
                </button>
              </div>
            )}

            {tab !== 'FORGOT' && (
              <>
                <div className="relative flex py-2 items-center">
                  <div className="grow border-t border-neutral-200 dark:border-neutral-800"></div>
                  <span className="shrink mx-3 text-[10px] text-neutral-400 uppercase tracking-wider">or</span>
                  <div className="grow border-t border-neutral-200 dark:border-neutral-800"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full py-2 px-3 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 shadow-2xs disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27 0-.78.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
