import React, { useState } from 'react';
import { ArrowRight, MessageSquare, Clock3, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { Conversation, TicketCategory } from '../../types';

interface CustomerPortalProps {
  conversations: Conversation[];
  onOpenConversation: (conversationId: string) => void;
  onStartNewConversation: (title: string, category: TicketCategory) => void;
  customerName?: string;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  conversations,
  onOpenConversation,
  onStartNewConversation,
  customerName = 'Sarah Khan'
}) => {
  const [problemText, setProblemText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory>('Billing');

  const categories: TicketCategory[] = ['Billing', 'Account', 'Technical', 'Orders', 'General'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemText.trim()) return;
    onStartNewConversation(problemText.trim(), selectedCategory);
    setProblemText('');
  };

  const getStatusBadge = (status: Conversation['status']) => {
    switch (status) {
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle className="w-3 h-3" />
            Resolved
          </span>
        );
      case 'NEEDS_HUMAN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-3 h-3" />
            Dispatched to Agent
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            Support Agent Active
          </span>
        );
      case 'WAITING_CUSTOMER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Clock3 className="w-3 h-3" />
            Awaiting Your Reply
          </span>
        );
      case 'AI_HANDLING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
            AI Handling
          </span>
        );
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-neutral-50 dark:bg-neutral-950 flex flex-col justify-between py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto w-full">
        {/* Welcome / Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            How can we help?
          </h1>
          <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            Ask a question or describe an issue. We'll solve it or hand it right to an agent.
          </p>
        </div>

        {/* Search / Input Box */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="relative flex items-center">
            <input
              type="text"
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              placeholder="Describe your problem..."
              className="w-full pl-4 pr-12 py-3.5 text-sm bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg shadow-xs focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-400 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 transition-all"
            />
            <button
              type="submit"
              disabled={!problemText.trim()}
              className="absolute right-2 p-2 rounded-md bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 disabled:opacity-30 disabled:hover:opacity-30 transition-all"
              title="Start conversation"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                  : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Previous Conversations */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Previous conversations
            </h2>
            <span className="text-xs text-neutral-400">
              {conversations.length} total
            </span>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-500">
                No past conversations. Type your question above to get started.
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onOpenConversation(conv.id)}
                  className="w-full text-left p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors flex items-center justify-between gap-4 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors shrink-0" />
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {conv.title}
                      </p>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate pl-5.5">
                      {conv.lastMessageText || 'No messages yet'}
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {getStatusBadge(conv.status)}
                    <span className="text-[11px] text-neutral-400">
                      {new Date(conv.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-neutral-400 dark:text-neutral-600 mt-8">
        ResolveAI Customer Support System • Continuous conversation with human escalation
      </div>
    </div>
  );
};
