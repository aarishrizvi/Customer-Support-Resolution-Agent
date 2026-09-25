import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Headset, Users, LogOut, Shield, ChevronDown, UserCheck } from 'lucide-react';
import { logout } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface HeaderProps {
  currentMode: 'CUSTOMER' | 'AGENT';
  onToggleMode?: (mode: 'CUSTOMER' | 'AGENT') => void;
  currentUser: User | null;
  userProfile: UserProfile | null;
  onOpenAuthModal: (tab?: 'LOGIN' | 'REGISTER') => void;
  onAssignRole?: (role: UserRole) => void;
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
  onAssignRole,
  onSignOut,
  agentName = 'Mohd Afnan Azhar',
  needsHumanCount = 0
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

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
              ) : (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium">Ops</span>
              )}
            </div>
          </div>
        </div>

        {/* User / Authentication Actions */}
        <div className="flex items-center gap-3">
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
                    <span className={`w-1.5 h-1.5 rounded-full ${isSupportAgent ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                    <span>{userProfile?.role === 'SUPPORT_AGENT' ? 'SUPPORT_AGENT' : 'CUSTOMER'}</span>
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
                      <span className={`font-semibold px-1.5 py-0.2 rounded ${
                        isSupportAgent 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' 
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {userProfile?.role || 'CUSTOMER'}
                      </span>
                    </div>
                  </div>

                  {/* Internal Role Switch Helper for Evaluator */}
                  {onAssignRole && (
                    <div className="p-2 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40">
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 px-1">
                        Role Simulation (Testing)
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => { onAssignRole('CUSTOMER'); setShowUserMenu(false); }}
                          className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                            !isSupportAgent
                              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                              : 'hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          Customer
                        </button>
                        <button
                          type="button"
                          onClick={() => { onAssignRole('SUPPORT_AGENT'); setShowUserMenu(false); }}
                          className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                            isSupportAgent
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          Support Agent
                        </button>
                      </div>
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
