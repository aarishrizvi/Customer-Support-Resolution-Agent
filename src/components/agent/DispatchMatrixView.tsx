import React from 'react';
import { 
  GitBranch, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  Headset, 
  Clock3, 
  Users, 
  Zap,
  ArrowDown
} from 'lucide-react';
import { Conversation } from '../../types';

interface DispatchMatrixViewProps {
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
}

export const DispatchMatrixView: React.FC<DispatchMatrixViewProps> = ({
  conversations,
  onSelectConversation
}) => {
  const aiHandling = conversations.filter((c) => c.status === 'AI_HANDLING');
  const needsHuman = conversations.filter((c) => c.status === 'NEEDS_HUMAN');
  const humanHandling = conversations.filter((c) => c.status === 'ASSIGNED');
  const resolved = conversations.filter((c) => c.status === 'RESOLVED');

  return (
    <div className="flex-1 bg-neutral-50 dark:bg-neutral-950 p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            ResolveAI Core Workflow & Dispatch Matrix
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Real-time pipeline: Single continuous customer conversation seamlessly orchestrated between AI resolution and human escalation.
          </p>
        </div>

        {/* Workflow Diagram Banner */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {/* Step 1: Customer */}
            <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Step 1</span>
                  <Users className="w-4 h-4 text-neutral-500" />
                </div>
                <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Customer Support Request</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Customer submits inquiry via continuous conversation portal.
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {conversations.length} total tickets logged
              </div>
            </div>

            {/* Step 2: AI Resolution Engine */}
            <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Step 2</span>
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                </div>
                <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">AI Evaluation</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  Evaluates knowledge base, answers FAQs, checks resolution confidence.
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-blue-200 dark:border-blue-900 text-xs font-semibold text-blue-700 dark:text-blue-400">
                {aiHandling.length} in automated handling
              </div>
            </div>

            {/* Step 3: Dispatch Decision Gate */}
            <div className="p-4 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Step 3</span>
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                </div>
                <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Human Dispatch Queue</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  Confidence low or account intervention required: dispatched without conversation restart.
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-400">
                {needsHuman.length} waiting for human
              </div>
            </div>

            {/* Step 4: Human Resolution */}
            <div className="p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Step 4</span>
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Human Joins & Resolves</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  Mohd Afnan Azhar or support agent joins active thread and resolves issue.
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-emerald-200 dark:border-emerald-900 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {humanHandling.length} active • {resolved.length} resolved
              </div>
            </div>
          </div>
        </div>

        {/* Live Queues Breakdown Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Needs Human Attention */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-rose-700 dark:text-rose-400">
                <AlertCircle className="w-4 h-4" />
                <span>Dispatched: Needs Human ({needsHuman.length})</span>
              </div>
            </div>

            <div className="space-y-2">
              {needsHuman.length === 0 ? (
                <p className="text-xs text-neutral-400 py-4 text-center">No unassigned tickets in queue.</p>
              ) : (
                needsHuman.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onSelectConversation(c.id)}
                    className="p-2.5 rounded border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-100/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-neutral-900 dark:text-neutral-100">{c.customerName}</span>
                      <span className="text-[10px] text-rose-600 font-semibold">{c.priority}</span>
                    </div>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-300 line-clamp-1 mt-0.5">
                      {c.title}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-1 font-mono">
                      Category: {c.category}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Under AI Handling */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-neutral-700 dark:text-neutral-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>AI Autonomous Resolution ({aiHandling.length})</span>
              </div>
            </div>

            <div className="space-y-2">
              {aiHandling.length === 0 ? (
                <p className="text-xs text-neutral-400 py-4 text-center">No active AI threads.</p>
              ) : (
                aiHandling.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onSelectConversation(c.id)}
                    className="p-2.5 rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-neutral-900 dark:text-neutral-100">{c.customerName}</span>
                      <span className="text-[10px] text-neutral-400">{c.priority}</span>
                    </div>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-300 line-clamp-1 mt-0.5">
                      {c.title}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      Status: Processing inquiry
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Handled by Human Agent */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-blue-700 dark:text-blue-400">
                <Headset className="w-4 h-4" />
                <span>Assigned to Human Agent ({humanHandling.length})</span>
              </div>
            </div>

            <div className="space-y-2">
              {humanHandling.length === 0 ? (
                <p className="text-xs text-neutral-400 py-4 text-center">No tickets currently with human agents.</p>
              ) : (
                humanHandling.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onSelectConversation(c.id)}
                    className="p-2.5 rounded border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-100/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-neutral-900 dark:text-neutral-100">{c.customerName}</span>
                      <span className="text-[10px] text-blue-600 font-semibold">{c.assignedAgentName}</span>
                    </div>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-300 line-clamp-1 mt-0.5">
                      {c.title}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-1">
                      Priority: {c.priority}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
