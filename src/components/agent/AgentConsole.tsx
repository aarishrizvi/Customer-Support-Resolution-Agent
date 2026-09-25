import React, { useState } from 'react';
import { 
  Inbox, 
  GitBranch, 
  Users, 
  BookOpen, 
  Clock3, 
  Share2, 
  Settings, 
  Headset, 
  Search,
  MessageSquare
} from 'lucide-react';
import { 
  Conversation, 
  Message, 
  KnowledgeArticle, 
  CustomerProfile, 
  Activity, 
  Attachment 
} from '../../types';
import { QueueSidebar, QueueTab } from './QueueSidebar';
import { AgentConversationView } from './AgentConversationView';
import { CustomerContextPanel } from './CustomerContextPanel';
import { DispatchMatrixView } from './DispatchMatrixView';
import { KnowledgeBaseView } from './KnowledgeBaseView';
import { CustomersView } from './CustomersView';
import { ActivityView } from './ActivityView';
import { GoogleWorkspaceHub } from './GoogleWorkspaceHub';
import { ConfirmModal } from '../shared/ConfirmModal';
import { sendGoogleChatMessage } from '../../lib/workspace';

type AgentNavTab = 'QUEUE' | 'DISPATCH' | 'CUSTOMERS' | 'KNOWLEDGE' | 'ACTIVITY' | 'WORKSPACE';

interface AgentConsoleProps {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  knowledgeArticles: KnowledgeArticle[];
  customers: CustomerProfile[];
  activities: Activity[];
  selectedConversationId: string;
  onSelectConversation: (id: string) => void;
  onTakeConversation: (conversationId: string) => void;
  onResolveConversation: (conversationId: string) => void;
  onAgentSendMessage: (conversationId: string, content: string, isInternalNote: boolean, attachments?: Attachment[]) => void;
  onAddKnowledgeArticle: (article: Omit<KnowledgeArticle, 'id' | 'updatedAt'>) => void;
  onUpdateKnowledgeArticle: (id: string, updates: Partial<KnowledgeArticle>) => void;
  agentName?: string;
}

export const AgentConsole: React.FC<AgentConsoleProps> = ({
  conversations,
  messages,
  knowledgeArticles,
  customers,
  activities,
  selectedConversationId,
  onSelectConversation,
  onTakeConversation,
  onResolveConversation,
  onAgentSendMessage,
  onAddKnowledgeArticle,
  onUpdateKnowledgeArticle,
  agentName = 'Mohd Afnan Azhar'
}) => {
  const [activeTab, setActiveTab] = useState<AgentNavTab>('QUEUE');
  const [activeQueue, setActiveQueue] = useState<QueueTab>('NEEDS_HUMAN');
  const [selectedArticleForModal, setSelectedArticleForModal] = useState<KnowledgeArticle | null>(null);

  // Google Chat Modal
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatAlertText, setChatAlertText] = useState('');
  const [chatAlertStatus, setChatAlertStatus] = useState<string | null>(null);

  // CSAT Modal
  const [isCsatModalOpen, setIsCsatModalOpen] = useState(false);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId) || conversations[0];
  const activeMessages = selectedConversation ? (messages[selectedConversation.id] || []) : [];
  const currentCustomer = customers.find(
    (c) => c.id === selectedConversation?.customerId || c.email === selectedConversation?.customerEmail
  );

  // Suggested knowledge articles
  const suggestedArticles = knowledgeArticles.filter((art) => {
    if (!selectedConversation) return false;
    const catMatch = art.category === selectedConversation.category;
    const keyMatch = selectedConversation.suggestedArticles?.includes(art.id);
    return catMatch || keyMatch;
  });

  const handleOpenGoogleChatModal = () => {
    if (selectedConversation) {
      setChatAlertText(
        `[URGENT INCIDENT ESCALATION]\nTicket: #${selectedConversation.id.slice(-6)} - "${selectedConversation.title}"\nCustomer: ${selectedConversation.customerName} (${selectedConversation.customerEmail})\nPriority: ${selectedConversation.priority}\nAssigned: ${selectedConversation.assignedAgentName || 'Unassigned (Needs Human)'}\nAI Summary: ${selectedConversation.aiSummary || 'Action required.'}`
      );
    }
    setIsChatModalOpen(true);
  };

  const handleSendChatAlert = async () => {
    setChatAlertStatus('Dispatching to Google Chat...');
    const res = await sendGoogleChatMessage('spaces/support-escalations', chatAlertText);
    if (res.success) {
      setChatAlertStatus('Alert sent to Google Chat!');
      setTimeout(() => {
        setIsChatModalOpen(false);
        setChatAlertStatus(null);
      }, 1500);
    } else {
      setChatAlertStatus(`Failed: ${res.info}`);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-neutral-100 dark:bg-neutral-950 overflow-hidden">
      {/* Console Subnavigation Bar */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 h-10 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('QUEUE')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'QUEUE'
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Inbox & Queue</span>
          </button>

          <button
            onClick={() => setActiveTab('DISPATCH')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'DISPATCH'
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Dispatch Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('CUSTOMERS')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'CUSTOMERS'
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customers</span>
          </button>

          <button
            onClick={() => setActiveTab('KNOWLEDGE')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'KNOWLEDGE'
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Knowledge Base</span>
          </button>

          <button
            onClick={() => setActiveTab('ACTIVITY')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'ACTIVITY'
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Clock3 className="w-3.5 h-3.5" />
            <span>Activity Trail</span>
          </button>

          <button
            onClick={() => setActiveTab('WORKSPACE')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'WORKSPACE'
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-blue-500" />
            <span>Workspace Hub</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-neutral-500 text-[11px]">
          <span>Lead: <strong className="text-neutral-800 dark:text-neutral-200">{agentName}</strong></span>
          <span>•</span>
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Live Dispatch Active
          </span>
        </div>
      </div>

      {/* Main Console View Area */}
      {activeTab === 'QUEUE' && (
        <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-6rem)] overflow-hidden">
          {/* Column 1: Queue Sidebar */}
          <QueueSidebar
            conversations={conversations}
            selectedConversationId={selectedConversation?.id || null}
            onSelectConversation={onSelectConversation}
            onTakeConversation={onTakeConversation}
            activeQueue={activeQueue}
            onChangeQueue={setActiveQueue}
            currentAgentName={agentName}
          />

          {/* Column 2: Active Conversation */}
          {selectedConversation ? (
            <AgentConversationView
              conversation={selectedConversation}
              messages={activeMessages}
              onSendMessage={(content, isInternalNote, atts) =>
                onAgentSendMessage(selectedConversation.id, content, isInternalNote, atts)
              }
              onTakeConversation={() => onTakeConversation(selectedConversation.id)}
              onResolveConversation={() => onResolveConversation(selectedConversation.id)}
              onEscalateConversation={handleOpenGoogleChatModal}
              onOpenGoogleChatModal={handleOpenGoogleChatModal}
              onOpenCSATModal={() => setIsCsatModalOpen(true)}
              agentName={agentName}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-neutral-400">
              Select a conversation from the queue to view messages.
            </div>
          )}

          {/* Column 3: Customer Context & AI Summary */}
          {selectedConversation && (
            <div className="hidden lg:block">
              <CustomerContextPanel
                conversation={selectedConversation}
                customer={currentCustomer}
                suggestedArticles={suggestedArticles}
                onInsertKnowledgeSnippet={(snippet) => {
                  onAgentSendMessage(selectedConversation.id, snippet, false);
                }}
                onOpenArticleModal={(art) => setSelectedArticleForModal(art)}
                onEscalate={handleOpenGoogleChatModal}
                onAlertGoogleChat={handleOpenGoogleChatModal}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'DISPATCH' && (
        <DispatchMatrixView
          conversations={conversations}
          onSelectConversation={(id) => {
            onSelectConversation(id);
            setActiveTab('QUEUE');
          }}
        />
      )}

      {activeTab === 'CUSTOMERS' && (
        <CustomersView
          customers={customers}
          conversations={conversations}
          onSelectConversation={(id) => {
            onSelectConversation(id);
            setActiveTab('QUEUE');
          }}
        />
      )}

      {activeTab === 'KNOWLEDGE' && (
        <KnowledgeBaseView
          articles={knowledgeArticles}
          onAddArticle={onAddKnowledgeArticle}
          onUpdateArticle={onUpdateKnowledgeArticle}
          agentName={agentName}
        />
      )}

      {activeTab === 'ACTIVITY' && (
        <ActivityView
          activities={activities}
          onSelectConversation={(id) => {
            onSelectConversation(id);
            setActiveTab('QUEUE');
          }}
        />
      )}

      {activeTab === 'WORKSPACE' && (
        <GoogleWorkspaceHub
          conversations={conversations}
          selectedConversation={selectedConversation}
        />
      )}

      {/* Article Modal */}
      {selectedArticleForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                {selectedArticleForModal.category}
              </span>
              <button
                onClick={() => setSelectedArticleForModal(null)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-xs"
              >
                Close
              </button>
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              {selectedArticleForModal.title}
            </h3>
            <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded text-xs font-mono whitespace-pre-wrap max-h-72 overflow-y-auto text-neutral-700 dark:text-neutral-300 mb-4">
              {selectedArticleForModal.content}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedArticleForModal(null)}
                className="px-3.5 py-1.5 text-xs font-medium bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 rounded"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Chat Incident Escalation Modal (with user confirmation!) */}
      <ConfirmModal
        isOpen={isChatModalOpen}
        title="Dispatch Escalation to Google Chat?"
        description={`Send operational escalation to team space (#ops-tier2):\n\n${chatAlertText}`}
        confirmLabel="Send to Google Chat"
        cancelLabel="Cancel"
        onConfirm={handleSendChatAlert}
        onCancel={() => setIsChatModalOpen(false)}
      />

      {/* CSAT Survey Modal */}
      {isCsatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Customer Satisfaction (CSAT) Survey
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Upon issue resolution, customers receive a Google Forms survey link. Verified responses sync into ResolveAI.
            </p>
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700 text-xs space-y-2">
              <div className="flex justify-between font-medium">
                <span>Google Form ID:</span>
                <span className="font-mono text-neutral-500">csat_feedback_2026</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Latest Rating:</span>
                <span className="text-amber-500 font-bold">5.0 / 5.0 (Excellent)</span>
              </div>
              <div className="text-[11px] text-neutral-500 italic">
                "Mohd Afnan Azhar resolved my duplicate charge in under 4 minutes. Seamless handoff from AI."
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setIsCsatModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
