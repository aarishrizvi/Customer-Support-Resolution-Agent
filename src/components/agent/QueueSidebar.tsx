import React, { useState } from 'react';
import { 
  Search, 
  Flag, 
  Clock3, 
  AlertCircle, 
  CheckCircle, 
  Headset, 
  User, 
  Filter
} from 'lucide-react';
import { Conversation, TicketPriority, TicketCategory } from '../../types';

export type QueueTab = 'NEEDS_HUMAN' | 'ASSIGNED_TO_ME' | 'AI_HANDLING' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'ALL';

interface QueueSidebarProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onTakeConversation: (id: string) => void;
  activeQueue: QueueTab;
  onChangeQueue: (queue: QueueTab) => void;
  currentAgentId?: string;
  currentAgentName?: string;
}

export const QueueSidebar: React.FC<QueueSidebarProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onTakeConversation,
  activeQueue,
  onChangeQueue,
  currentAgentId = 'agent_afnan',
  currentAgentName = 'Mohd Afnan Azhar'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Compute counts
  const counts = {
    NEEDS_HUMAN: conversations.filter((c) => c.status === 'NEEDS_HUMAN').length,
    ASSIGNED_TO_ME: conversations.filter(
      (c) =>
        (c.status === 'ASSIGNED' || c.status === 'HUMAN_HANDLING') &&
        (c.assignedAgentId === currentAgentId || c.assignedAgentName?.includes('Afnan'))
    ).length,
    AI_HANDLING: conversations.filter((c) => c.status === 'AI_HANDLING').length,
    WAITING_CUSTOMER: conversations.filter((c) => c.status === 'WAITING_CUSTOMER' || c.status === 'WAITING_FOR_CUSTOMER').length,
    RESOLVED: conversations.filter((c) => c.status === 'RESOLVED').length,
    ALL: conversations.length
  };

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    // Queue filter
    if (activeQueue === 'NEEDS_HUMAN' && conv.status !== 'NEEDS_HUMAN') return false;
    if (activeQueue === 'ASSIGNED_TO_ME') {
      const isMine =
        (conv.status === 'ASSIGNED' || conv.status === 'HUMAN_HANDLING') &&
        (conv.assignedAgentId === currentAgentId || conv.assignedAgentName?.includes('Afnan'));
      if (!isMine) return false;
    }
    if (activeQueue === 'AI_HANDLING' && conv.status !== 'AI_HANDLING') return false;
    if (activeQueue === 'WAITING_CUSTOMER' && conv.status !== 'WAITING_CUSTOMER' && conv.status !== 'WAITING_FOR_CUSTOMER') return false;
    if (activeQueue === 'RESOLVED' && conv.status !== 'RESOLVED') return false;

    // Priority filter
    if (priorityFilter !== 'ALL' && conv.priority !== priorityFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = conv.title.toLowerCase().includes(q);
      const matchCustomer = conv.customerName.toLowerCase().includes(q);
      const matchLastMsg = (conv.lastMessageText || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCustomer && !matchLastMsg) return false;
    }

    return true;
  });

  const getPriorityTag = (p: TicketPriority) => {
    switch (p) {
      case 'URGENT':
        return <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">URGENT</span>;
      case 'HIGH':
        return <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">HIGH</span>;
      case 'MEDIUM':
        return <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">MED</span>;
      case 'LOW':
      default:
        return <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-500">LOW</span>;
    }
  };

  const getWaitTime = (timestamp: string) => {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
  };

  return (
    <div className="w-full md:w-80 lg:w-88 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col h-[calc(100vh-3.5rem)] shrink-0 select-none">
      {/* Queue selector tabs */}
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 px-2 py-1 flex items-center justify-between">
          <span>Operational Queues</span>
          <span className="text-[10px] text-neutral-400">{conversations.length} total</span>
        </div>

        <div className="grid grid-cols-2 gap-1 text-xs">
          <button
            onClick={() => onChangeQueue('NEEDS_HUMAN')}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              activeQueue === 'NEEDS_HUMAN'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold shadow-2xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              Needs Human
            </span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold">
              {counts.NEEDS_HUMAN}
            </span>
          </button>

          <button
            onClick={() => onChangeQueue('ASSIGNED_TO_ME')}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              activeQueue === 'ASSIGNED_TO_ME'
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold shadow-2xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Headset className="w-3.5 h-3.5 text-blue-500" />
              My Tickets
            </span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-semibold">
              {counts.ASSIGNED_TO_ME}
            </span>
          </button>

          <button
            onClick={() => onChangeQueue('AI_HANDLING')}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              activeQueue === 'AI_HANDLING'
                ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              AI Handling
            </span>
            <span className="text-[11px] text-neutral-500">{counts.AI_HANDLING}</span>
          </button>

          <button
            onClick={() => onChangeQueue('RESOLVED')}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              activeQueue === 'RESOLVED'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              Resolved
            </span>
            <span className="text-[11px] text-neutral-500">{counts.RESOLVED}</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-2.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets, customers..."
            className="w-full pl-8 pr-2 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 rounded border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
          />
        </div>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-transparent rounded py-1.5 px-2 focus:outline-hidden"
        >
          <option value="ALL">Priority: All</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Compact Tickets List */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400">
            No tickets match current queue filters.
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = conv.id === selectedConversationId;
            const needsTake = conv.status === 'NEEDS_HUMAN';

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`p-3 cursor-pointer transition-colors relative group ${
                  isSelected
                    ? 'bg-neutral-100 dark:bg-neutral-800/80 border-l-2 border-neutral-900 dark:border-neutral-100'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                }`}
              >
                {/* Row Header: Customer name + wait time */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {conv.customerName}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      • {conv.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {getPriorityTag(conv.priority)}
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {getWaitTime(conv.lastMessageTimestamp || conv.updatedAt)}
                    </span>
                  </div>
                </div>

                {/* Issue title */}
                <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 line-clamp-1 mb-1">
                  {conv.title}
                </p>

                {/* Last message preview */}
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 mb-2">
                  {conv.lastMessageText || 'No messages yet'}
                </p>

                {/* Row Footer: Handler + Action */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-100/60 dark:border-neutral-800/40">
                  <div className="flex items-center gap-1 text-[10px]">
                    {conv.status === 'NEEDS_HUMAN' && (
                      <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Needs Human
                      </span>
                    )}
                    {conv.status === 'AI_HANDLING' && (
                      <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        ResolveAI
                      </span>
                    )}
                    {(conv.status === 'ASSIGNED' || conv.status === 'HUMAN_HANDLING') && (
                      <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                        <Headset className="w-3 h-3" />
                        {conv.assignedAgentName || 'Agent'}
                      </span>
                    )}
                    {(conv.status === 'WAITING_CUSTOMER' || conv.status === 'WAITING_FOR_CUSTOMER') && (
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Clock3 className="w-3 h-3" />
                        Waiting Customer
                      </span>
                    )}
                    {conv.status === 'RESOLVED' && (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Resolved
                      </span>
                    )}
                  </div>

                  {needsTake && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTakeConversation(conv.id);
                      }}
                      className="px-2 py-0.5 text-[10px] font-semibold rounded bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 transition-opacity shadow-2xs"
                    >
                      Take Ticket
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
