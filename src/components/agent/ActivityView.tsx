import React, { useState } from 'react';
import { 
  Clock3, 
  GitBranch, 
  Headset, 
  CheckCircle, 
  Share2, 
  AlertCircle, 
  Filter 
} from 'lucide-react';
import { Activity } from '../../types';

interface ActivityViewProps {
  activities: Activity[];
  onSelectConversation?: (conversationId: string) => void;
}

export const ActivityView: React.FC<ActivityViewProps> = ({
  activities,
  onSelectConversation
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredActivities = activities.filter((act) => {
    if (filterType !== 'ALL' && act.type !== filterType) return false;
    return true;
  });

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'DISPATCH':
        return <GitBranch className="w-4 h-4 text-rose-500" />;
      case 'HUMAN_JOINED':
        return <Headset className="w-4 h-4 text-blue-500" />;
      case 'STATUS_CHANGE':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'CHAT_ALERT':
        return <Share2 className="w-4 h-4 text-indigo-500" />;
      case 'AI_REPLIED':
      default:
        return <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />;
    }
  };

  return (
    <div className="flex-1 bg-neutral-50 dark:bg-neutral-950 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Clock3 className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
              Operational Activity & Audit Trail
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Immutable chronological record of AI routing decisions, human interventions, and workspace dispatches.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-md py-1.5 px-2.5 focus:outline-hidden"
            >
              <option value="ALL">All Activity Types</option>
              <option value="DISPATCH">Human Dispatch Events</option>
              <option value="HUMAN_JOINED">Agent Takeovers</option>
              <option value="STATUS_CHANGE">Status Changes</option>
              <option value="CHAT_ALERT">Google Chat Dispatches</option>
            </select>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-2xs divide-y divide-neutral-100 dark:divide-neutral-800/60">
          {filteredActivities.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400">
              No activity matching the selected filter.
            </div>
          ) : (
            filteredActivities.map((act) => (
              <div
                key={act.id}
                onClick={() => onSelectConversation && onSelectConversation(act.conversationId)}
                className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors flex items-start gap-3.5 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
                  {getActivityIcon(act.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      {act.actorName} ({act.actorRole})
                    </p>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 leading-normal">
                    {act.description}
                  </p>

                  <span className="text-[10px] text-neutral-400 font-mono mt-1 block">
                    Ref Ticket: #{act.conversationId.slice(-6)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
