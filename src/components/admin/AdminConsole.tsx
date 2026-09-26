import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  Search,
  Users as UsersIcon,
  Headset,
  UserCog,
  Crown,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  RefreshCcw
} from 'lucide-react';
import { Conversation, Message, UserProfile, UserRole } from '../../types';
import { ConfirmModal } from '../shared/ConfirmModal';
import { ADMIN_EMAILS } from '../../lib/access-config';

interface AdminConsoleProps {
  users: UserProfile[];
  currentUserId: string;
  onUpdateRole: (uid: string, role: UserRole) => Promise<void>;
  conversations: Conversation[];
  messages: Message[];
  selectedConversationId: string;
  onSelectConversation: (id: string) => void;
}

type RoleFilter = 'ALL' | UserRole;
type AdminTab = 'ACCESS' | 'CONVERSATIONS';

const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: 'ALL', label: 'All Users' },
  { value: 'ADMIN', label: 'Admins' },
  { value: 'SUPPORT_AGENT', label: 'Support Agents' },
  { value: 'CUSTOMER', label: 'Customers' }
];

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  users,
  currentUserId,
  onUpdateRole,
  conversations,
  messages,
  selectedConversationId,
  onSelectConversation
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [pendingChange, setPendingChange] = useState<{ user: UserProfile; nextRole: UserRole } | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [adminTab, setAdminTab] = useState<AdminTab>('ACCESS');

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === 'ADMIN').length;
    const agents = users.filter((u) => u.role === 'SUPPORT_AGENT').length;
    const customers = users.filter((u) => u.role === 'CUSTOMER').length;
    return { total, admins, agents, customers };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery, roleFilter]);

  const flash = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4500);
  };

  const applyRoleChange = async () => {
    if (!pendingChange) return;
    const { user, nextRole } = pendingChange;
    setBusyUid(user.uid);
    try {
      await onUpdateRole(user.uid, nextRole);
      flash(
        'success',
        nextRole === 'CUSTOMER'
          ? `Support access revoked for ${user.displayName}.`
          : `${user.displayName} is now ${nextRole === 'ADMIN' ? 'an Admin' : 'a Support Agent'}.`
      );
      setPendingChange(null);
    } catch (err: any) {
      const raw = err instanceof Error ? err.message : String(err);
      let msg = 'Role change was rejected by Firestore security rules.';
      if (raw.includes('permission')) {
        msg = 'Permission denied. Only an Admin can change user roles.';
      }
      flash('error', msg);
      setPendingChange(null);
    } finally {
      setBusyUid(null);
    }
  };

  const roleBadge = (role: UserRole) => {
    if (role === 'ADMIN') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 border border-violet-200 dark:border-violet-900">
          <Crown className="w-3 h-3" /> ADMIN
        </span>
      );
    }
    if (role === 'SUPPORT_AGENT') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
          <Headset className="w-3 h-3" /> SUPPORT AGENT
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
        CUSTOMER
      </span>
    );
  };

  const statCards = [
    { label: 'Total Users', value: stats.total, icon: UsersIcon, tone: 'text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800' },
    { label: 'Admins', value: stats.admins, icon: Crown, tone: 'text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-950' },
    { label: 'Support Agents', value: stats.agents, icon: Headset, tone: 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950' },
    { label: 'Customers', value: stats.customers, icon: UsersIcon, tone: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950' }
  ];

  const tabClass = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
      active
        ? 'border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100'
        : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
    }`;

  const statusTone = (status: Conversation['status']) => {
    switch (status) {
      case 'RESOLVED': return 'text-emerald-600 dark:text-emerald-400';
      case 'NEEDS_HUMAN':
      case 'ESCALATED': return 'text-rose-600 dark:text-rose-400';
      case 'HUMAN_HANDLING':
      case 'ASSIGNED': return 'text-blue-600 dark:text-blue-400';
      case 'WAITING_FOR_CUSTOMER': return 'text-amber-600 dark:text-amber-400';
      default: return 'text-neutral-500 dark:text-neutral-400';
    }
  };

  const currentAdminConv = conversations.find((c) => c.id === selectedConversationId);

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-600 text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                Access Control
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 max-w-xl">
                Decide who can enter the Support Console. Only accounts you promote here can reach /support.
              </p>
            </div>
          </div>
        </div>

        {/* Console tabs */}
        <div className="flex items-center gap-1 mb-5 border-b border-neutral-200 dark:border-neutral-800">
          <button type="button" onClick={() => setAdminTab('ACCESS')} className={tabClass(adminTab === 'ACCESS')}>
            <ShieldCheck className="w-3.5 h-3.5" />
            Access Control
          </button>
          <button type="button" onClick={() => setAdminTab('CONVERSATIONS')} className={tabClass(adminTab === 'CONVERSATIONS')}>
            <MessageSquare className="w-3.5 h-3.5" />
            Conversations
            <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
              adminTab === 'CONVERSATIONS'
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
            }`}>
              {conversations.length}
            </span>
          </button>
        </div>

        {/* Notices */}
        {notice && (
          <div className={`mb-4 flex items-start gap-2 px-3.5 py-2.5 rounded-lg border text-xs ${
            notice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200'
          }`}>
            {notice.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <span>{notice.text}</span>
          </div>
        )}

        {adminTab === 'CONVERSATIONS' ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  All customer conversations
                </h2>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  The same live threads Support Agents work from - select one to read every message.
                </p>
              </div>
              <span className="text-xs text-neutral-400 shrink-0">{conversations.length} total</span>
            </div>

            {conversations.length === 0 ? (
              <div className="py-14 text-center">
                <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mx-auto flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <p className="mt-3 text-xs font-medium text-neutral-700 dark:text-neutral-300">No conversations yet</p>
                <p className="mt-1 text-[11px] text-neutral-500">
                  They appear here the moment a customer sends a message.
                </p>
              </div>
            ) : (
              <div className="grid lg:grid-cols-5">
                {/* Thread list */}
                <div className="lg:col-span-2 border-b lg:border-b-0 lg:border-r border-neutral-200 dark:border-neutral-800 max-h-[60vh] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                  {conversations.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelectConversation(c.id)}
                      className={`w-full text-left px-4 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60 ${
                        selectedConversationId === c.id ? 'bg-neutral-50 dark:bg-neutral-800/70' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                          {c.title}
                        </p>
                        <span className={`text-[9px] font-bold uppercase tracking-wide shrink-0 ${statusTone(c.status)}`}>
                          {c.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                        {c.customerName} • {c.category}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate mt-1">
                        {c.lastMessageText || 'No messages yet'}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Thread reader */}
                <div className="lg:col-span-3 min-w-0">
                  {currentAdminConv ? (
                    <>
                      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                        <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                          {currentAdminConv.title}
                        </p>
                        <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                          {currentAdminConv.customerName}
                          {currentAdminConv.customerEmail ? ` • ${currentAdminConv.customerEmail}` : ''} •
                          Ticket #{currentAdminConv.id.slice(-6)}
                        </p>
                        {currentAdminConv.aiSummary && (
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 italic">
                            AI summary: {currentAdminConv.aiSummary}
                          </p>
                        )}
                      </div>

                      <div className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
                        {messages.length === 0 ? (
                          <p className="text-xs text-neutral-400 text-center py-8">
                            No messages loaded for this thread yet.
                          </p>
                        ) : (
                          messages.map((m) => (
                            <div
                              key={m.id}
                              className={`flex ${m.senderRole === 'CUSTOMER' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                                  m.senderRole === 'CUSTOMER'
                                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                                    : m.senderRole === 'SYSTEM'
                                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-[11px] italic'
                                    : 'bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100'
                                }`}
                              >
                                {m.senderRole !== 'CUSTOMER' && m.senderRole !== 'SYSTEM' && (
                                  <p className="text-[10px] font-semibold mb-0.5 opacity-70">
                                    {m.senderName || 'Support'} •{' '}
                                    {m.senderRole === 'AI' ? 'ResolveAI' : m.senderRole === 'AGENT' ? 'Support Agent' : m.senderRole}
                                  </p>
                                )}
                                <div className="whitespace-pre-wrap">{m.content}</div>
                                <p className="text-[9px] opacity-60 mt-1">
                                  {m.internalNote ? 'Internal note • ' : ''}
                                  {new Date(m.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-neutral-400 text-center py-16">
                      Select a conversation on the left to read its messages.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {statCards.map((card) => (
            <div key={card.label} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">{card.label}</span>
                <div className={`w-7 h-7 rounded-md flex items-center justify-center ${card.tone}`}>
                  <card.icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Directory */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          {/* Toolbar */}
          <div className="p-3.5 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {ROLE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setRoleFilter(f.value)}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                    roleFilter === f.value
                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rows */}
          {filteredUsers.length === 0 ? (
            <div className="py-14 text-center">
              <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mx-auto flex items-center justify-center">
                <UsersIcon className="w-5 h-5" />
              </div>
              <p className="mt-3 text-xs font-medium text-neutral-700 dark:text-neutral-300">No users found</p>
              <p className="mt-1 text-[11px] text-neutral-500">Adjust your search or role filter.</p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredUsers.map((u) => {
                const isSelf = u.uid === currentUserId;
                const isLockedAdmin = u.role === 'ADMIN' && ADMIN_EMAILS.includes(u.email.trim().toLowerCase());
                const busy = busyUid === u.uid;

                return (
                  <li key={u.uid} className="px-4 py-3 flex items-center gap-3 flex-wrap">
                    <div className="w-8 h-8 rounded-full bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center text-xs font-semibold shrink-0">
                      {u.displayName.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate flex items-center gap-1.5">
                        {u.displayName}
                        {isSelf && <span className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">(you)</span>}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">{u.email || 'no email'}</p>
                    </div>

                    <div className="text-[10px] text-neutral-400 hidden sm:block">
                      Joined {new Date(u.createdAt).toLocaleDateString()}
                    </div>

                    <div className="w-32 flex justify-end">{roleBadge(u.role)}</div>

                    <div className="flex items-center gap-1.5">
                      {u.role !== 'SUPPORT_AGENT' && (
                        <button
                          type="button"
                          disabled={busy || isSelf}
                          onClick={() => setPendingChange({ user: u, nextRole: 'SUPPORT_AGENT' })}
                          title={isSelf ? 'You cannot change your own role' : 'Grant access to the Support Console'}
                          className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {busy ? '...' : 'Grant Access'}
                        </button>
                      )}

                      {u.role === 'SUPPORT_AGENT' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setPendingChange({ user: u, nextRole: 'CUSTOMER' })}
                          className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/70 disabled:opacity-40 transition-colors"
                        >
                          {busy ? '...' : 'Revoke'}
                        </button>
                      )}

                      {u.role !== 'ADMIN' && (
                        <button
                          type="button"
                          disabled={busy || isSelf}
                          onClick={() => setPendingChange({ user: u, nextRole: 'ADMIN' })}
                          title={isSelf ? 'You cannot change your own role' : 'Promote to Admin'}
                          className="p-1.5 rounded-md text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <UserCog className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {u.role === 'ADMIN' && !isLockedAdmin && !isSelf && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setPendingChange({ user: u, nextRole: 'CUSTOMER' })}
                          className="p-1.5 rounded-md text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 transition-colors"
                          title="Remove admin privileges"
                        >
                          <RefreshCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="mt-3 text-[10px] text-neutral-400 leading-relaxed">
          Changes apply in real time. Revoking access immediately removes Firestore read/write rights to support data for that user.
        </p>
          </>
        )}
      </div>

      {/* Confirmation */}
      <ConfirmModal
        isOpen={!!pendingChange}
        title={
          pendingChange?.nextRole === 'SUPPORT_AGENT'
            ? 'Grant Support Console access?'
            : pendingChange?.nextRole === 'ADMIN'
              ? 'Promote to Admin?'
              : 'Revoke access?'
        }
        description={
          pendingChange
            ? pendingChange.nextRole === 'SUPPORT_AGENT'
              ? `${pendingChange.user.displayName} will be able to open /support and read all customer conversations, internal notes and the knowledge base.`
              : pendingChange.nextRole === 'ADMIN'
                ? `${pendingChange.user.displayName} will be able to manage every user's access from this page. Only grant this to trusted people.`
                : `${pendingChange.user.displayName} will be demoted to Customer and immediately lose all Support Console access.`
            : ''
        }
        confirmLabel={
          pendingChange?.nextRole === 'SUPPORT_AGENT'
            ? 'Grant Access'
            : pendingChange?.nextRole === 'ADMIN'
              ? 'Promote'
              : 'Revoke'
        }
        isDestructive={pendingChange?.nextRole === 'CUSTOMER'}
        onConfirm={applyRoleChange}
        onCancel={() => setPendingChange(null)}
      />
    </div>
  );
};
