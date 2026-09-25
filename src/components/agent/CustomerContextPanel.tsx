import React, { useState } from 'react';
import { 
  User, 
  Building, 
  Phone, 
  Mail, 
  Clock3, 
  Flag, 
  BookOpen, 
  ExternalLink, 
  Share2, 
  CheckCircle, 
  ChevronRight,
  ShieldAlert,
  FileText
} from 'lucide-react';
import { Conversation, CustomerProfile, KnowledgeArticle } from '../../types';

interface CustomerContextPanelProps {
  conversation: Conversation;
  customer?: CustomerProfile;
  suggestedArticles: KnowledgeArticle[];
  onInsertKnowledgeSnippet?: (snippet: string) => void;
  onOpenArticleModal?: (article: KnowledgeArticle) => void;
  onEscalate?: () => void;
  onAlertGoogleChat?: () => void;
}

export const CustomerContextPanel: React.FC<CustomerContextPanelProps> = ({
  conversation,
  customer,
  suggestedArticles,
  onInsertKnowledgeSnippet,
  onOpenArticleModal,
  onEscalate,
  onAlertGoogleChat
}) => {
  const [copiedId, setCopiedId] = useState(false);

  const copyTicketId = () => {
    navigator.clipboard?.writeText(conversation.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="w-full lg:w-80 border-l border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex flex-col h-[calc(100vh-3.5rem)] shrink-0 overflow-y-auto p-4 space-y-5 text-xs">
      {/* Customer Information Card */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3.5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
          <span className="font-semibold uppercase tracking-wider text-neutral-400 text-[10px]">
            Customer Profile
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            customer?.tier === 'Enterprise'
              ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
              : customer?.tier === 'Pro'
              ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
          }`}>
            {customer?.tier || 'Enterprise'} Plan
          </span>
        </div>

        <div>
          <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
            {customer?.name || conversation.customerName}
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5">
            <Mail className="w-3 h-3 text-neutral-400 shrink-0" />
            <span className="truncate">{customer?.email || conversation.customerEmail}</span>
          </p>
        </div>

        {customer?.company && (
          <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
            <Building className="w-3 h-3 text-neutral-400 shrink-0" />
            <span>{customer.company}</span>
          </div>
        )}

        {customer?.phone && (
          <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
            <Phone className="w-3 h-3 text-neutral-400 shrink-0" />
            <span>{customer.phone}</span>
          </div>
        )}

        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-neutral-500">
          <span>Previous Tickets</span>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            {customer?.previousTicketsCount ?? 4}
          </span>
        </div>

        {customer?.notes && (
          <div className="p-2 rounded bg-neutral-50 dark:bg-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-400 leading-normal">
            <span className="font-medium text-neutral-900 dark:text-neutral-200">CRM Note: </span>
            {customer.notes}
          </div>
        )}
      </div>

      {/* AI Operational Summary Card */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3.5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100 dark:border-neutral-800">
          <span className="font-semibold uppercase tracking-wider text-neutral-400 text-[10px]">
            AI Operational Summary
          </span>
          <span className="text-[10px] text-neutral-400 font-mono">
            {conversation.category}
          </span>
        </div>

        <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed text-[11px]">
          {conversation.aiSummary || 'Customer inquiry under active review. Operational details logged from previous exchanges.'}
        </p>

        <div className="pt-2 flex items-center justify-between text-neutral-400 text-[10px]">
          <span className="flex items-center gap-1">
            <Clock3 className="w-3 h-3" />
            Created {new Date(conversation.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={copyTicketId}
            className="hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            {copiedId ? 'Copied ID' : 'Copy Ticket ID'}
          </button>
        </div>
      </div>

      {/* Suggested Knowledge Base Articles */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3.5 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100 dark:border-neutral-800">
          <span className="font-semibold uppercase tracking-wider text-neutral-400 text-[10px] flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            Suggested Knowledge
          </span>
          <span className="text-[10px] text-neutral-400 font-medium">
            {suggestedArticles.length} found
          </span>
        </div>

        <div className="space-y-2">
          {suggestedArticles.length === 0 ? (
            <p className="text-neutral-400 text-[11px]">No specific KB articles matched this issue.</p>
          ) : (
            suggestedArticles.map((art) => (
              <div
                key={art.id}
                className="p-2.5 rounded bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1.5"
              >
                <div className="font-medium text-neutral-900 dark:text-neutral-100 flex items-start justify-between gap-1">
                  <span>{art.title}</span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-tight">
                  {art.excerpt}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  {onInsertKnowledgeSnippet && (
                    <button
                      type="button"
                      onClick={() => onInsertKnowledgeSnippet(art.content)}
                      className="text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Insert snippet
                    </button>
                  )}
                  {onOpenArticleModal && (
                    <button
                      type="button"
                      onClick={() => onOpenArticleModal(art)}
                      className="text-[10px] text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center gap-0.5"
                    >
                      <span>Read article</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Escalation & Workspace Operations */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3.5 shadow-2xs space-y-2">
        <span className="font-semibold uppercase tracking-wider text-neutral-400 text-[10px]">
          Incident Escalation
        </span>

        <button
          onClick={onAlertGoogleChat}
          className="w-full flex items-center justify-between p-2 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-blue-500" />
            Alert Google Chat Space
          </span>
          <ChevronRight className="w-3 h-3 text-neutral-400" />
        </button>

        <button
          onClick={onEscalate}
          className="w-full flex items-center justify-between p-2 rounded bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-medium transition-colors border border-rose-200 dark:border-rose-900/50"
        >
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            Escalate to Lead (Mohd Afnan)
          </span>
          <ChevronRight className="w-3 h-3 text-rose-400" />
        </button>
      </div>
    </div>
  );
};
