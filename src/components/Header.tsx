import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Headset, Users, LogOut, Shield, ChevronDown, UserCheck, ShieldCheck, Sun, Moon } from 'lucide-react';
import { logout } from '../lib/firebase';
import { UserProfile } from '../types';
import { getCurrentTheme, toggleTheme } from '../lib/theme';

interface HeaderProps {
  currentMode: 'CUSTOMER' | 'AGENT' | 'ADMIN';
  onToggleMode?: (mode: 'CUSTOMER' | 'AGENT') => void;
  currentUser: User | null;
  userProfile: UserProfile | null;
  onOpenAuthModal: (tab?: 'LOGIN' | 'REGISTER') => void;
  onOpenAdmin?: () => void;
  onOpenSupport?: () => void;
  onSignOut?: () => void;
  agentName?: string;
  needsHumanCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onToggleMode,
  currentUser,
  userProfile,
  onOpenAuthModal,
  onOpenAdmin,
  onOpenSupport,
  onSignOut,
  agentName = 'Mohd Afnan Azhar',
  needsHumanCount = 0
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDark, setIsDark] = useState(() => getCurrentTheme() === 'dark');

  useEffect(() => {
    setIsDark(getCurrentTheme() === 'dark');
  }, []);

  const handleThemeToggle = () => {
    const nextTheme = toggleTheme();
    setIsDark(nextTheme === 'dark');
  };

  const handleSignOut = async () => {
    try {
      setShowUserMenu(false);
      await logout();
      if (onSignOut) onSignOut();
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  const isSupportAgent = userProfile?.role === 'SUPPORT_AGENT';
  const isAdmin = userProfile?.role === 'ADMIN';

  const roleLabel = userProfile?.role === 'ADMIN' ? 'ADMIN' : isSupportAgent ? 'SUPPORT_AGENT' : 'CUSTOMER';
  const roleBadgeClass = isAdmin
    ? 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
    : isSupportAgent
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center text-white dark:text-neutral-900 font-semibold text-sm shadow-xs">
            <span className="tracking-tight text-xs font-bold">R</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-neutral-900 dark:text-neutral-100">ResolveAI</span>
              {currentMode === 'AGENT' ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium border border-neutral-200 dark:border-neutral-700">
                  <Headset className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span>Support Console</span>
                  {needsHumanCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-rose-500 text-white">
                      {needsHumanCount}
                    </span>
                  )}
                </div>
              ) : currentMode === 'ADMIN' ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 text-xs font-medium border border-violet-200 dark:border-violet-900">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Access Control</span>
                </div>
              ) : (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium">Ops</span>
              )}
            </div>
          </div>
        </div>

        {/* Route navigation + User / Authentication Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleThemeToggle}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-400"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          {userProfile && onOpenSupport && (userProfile.role === 'SUPPORT_AGENT' || userProfile.role === 'ADMIN') && (
            <button
              type="button"
              onClick={() => { setShowUserMenu(false); onOpenSupport(); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentMode === 'AGENT'
                  ? 'bg-blue-600 text-white'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Headset className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Support</span>
            </button>
          )}
          {userProfile && onOpenAdmin && userProfile.role === 'ADMIN' && (
            <button
              type="button"
              onClick={() => { setShowUserMenu(false); onOpenAdmin(); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentMode === 'ADMIN'
                  ? 'bg-violet-600 text-white'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 leading-tight">
                    {userProfile?.displayName || currentUser.displayName || currentUser.email}
                  </p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight flex items-center justify-end gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-violet-500' : isSupportAgent ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                    <span>{roleLabel}</span>
                  </p>
                </div>
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-7 h-7 rounded-full border border-neutral-200 dark:border-neutral-700 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center text-xs font-medium">
                    {(userProfile?.displayName || currentUser.displayName || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl py-2 z-50 animate-in fade-in duration-100">
                  <div className="px-3.5 py-2 border-b border-neutral-100 dark:border-neutral-800">
                    <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      {userProfile?.displayName || currentUser.displayName || 'User'}
                    </p>
                    <p className="text-[11px] text-neutral-500 truncate">{currentUser.email}</p>
                    <div className="mt-1.5 flex items-center justify-between text-[10px]">
                      <span className="text-neutral-400">Assigned Role:</span>
                      <span className={`font-semibold px-1.5 py-0.2 rounded ${roleBadgeClass}`}>
                        {roleLabel}
                      </span>
                    </div>
                  </div>

                  {/* Admin CMS entry point (admins only) */}
                  {onOpenAdmin && isAdmin && (
                    <div className="p-2 border-b border-neutral-100 dark:border-neutral-800 bg-violet-50/60 dark:bg-violet-950/30">
                      <button
                        type="button"
                        onClick={() => { setShowUserMenu(false); onOpenAdmin(); }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Access Control CMS</span>
                      </button>
                    </div>
                  )}

                  <div className="pt-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full px-3.5 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuthModal('LOGIN')}
                className="px-3 py-1.5 rounded text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuthModal('REGISTER')}
                className="px-3 py-1.5 rounded bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 text-xs font-medium hover:opacity-90 transition-opacity shadow-2xs"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
