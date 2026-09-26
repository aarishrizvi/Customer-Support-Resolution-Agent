import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  CheckCircle, 
  ArrowUpRight, 
  Headset, 
  Share2, 
  Paperclip, 
  FileText, 
  MessageSquare,
  Lock,
  ChevronDown
} from 'lucide-react';
import { Conversation, Message, Attachment } from '../../types';

interface AgentConversationViewProps {
  conversation: Conversation;
  messages: Message[];
  onSendMessage: (content: string, isInternalNote: boolean, attachments?: Attachment[]) => void;
  onTakeConversation: () => void;
  onResolveConversation: () => void;
  onEscalateConversation: () => void;
  onOpenGoogleChatModal: () => void;
  onOpenCSATModal: () => void;
  agentName?: string;
}

export const AgentConversationView: React.FC<AgentConversationViewProps> = ({
  conversation,
  messages,
  onSendMessage,
  onTakeConversation,
  onResolveConversation,
  onEscalateConversation,
  onOpenGoogleChatModal,
  onOpenCSATModal,
  agentName = 'Mohd Afnan Azhar'
}) => {
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [showCannedMenu, setShowCannedMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onSendMessage(replyText.trim(), isInternalNote);
    setReplyText('');
  };

  const cannedResponses = [
    {
      title: 'Refund Approved ($249)',
      text: "Hello, I have reviewed your billing record and processed an immediate refund of $249 back to your original payment method. The credit should reflect within 3-5 business days."
    },
    {
      title: 'Manual Entitlement Provisioning',
      text: "I've manually re-synchronized your organization's subscription entitlements in our provisioning cluster. Your team members should now have full active access."
    },
    {
      title: 'Webhook Signature Debugging',
      text: "Please verify that your incoming webhook handler parses the raw body buffer rather than parsed JSON prior to computing the HMAC-SHA256 signature."
    },
    {
      title: '2FA Recovery Verified',
      text: "Identity verification successfully passed. I have generated a single-use emergency bypass link and dispatched it to your primary verified corporate address."
    }
  ];

  const insertCannedResponse = (text: string) => {
    setReplyText((prev) => (prev ? `${prev}\n${text}` : text));
    setShowCannedMenu(false);
  };

  const isAssignedToCurrent = conversation.assignedAgentName?.includes('Afnan') || conversation.assignedAgentId === 'agent_afnan';

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-white dark:bg-neutral-900 overflow-hidden">
      {/* Conversation Top Header & Action Bar */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-neutral-50/50 dark:bg-neutral-900/50">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-neutral-400">
              #{conversation.id.slice(-6)}
            </span>
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
              {conversation.title}
            </h2>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {conversation.customerName} ({conversation.customerEmail}) • {conversation.category}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isAssignedToCurrent &&
            conversation.status !== 'RESOLVED' &&
            conversation.status !== 'ASSIGNED' &&
            conversation.status !== 'HUMAN_HANDLING' && (
            <button
              onClick={onTakeConversation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 transition-opacity shadow-xs"
            >
              <Headset className="w-3.5 h-3.5" />
              <span>Take Conversation</span>
            </button>
          )}

          {conversation.status !== 'RESOLVED' ? (
            <button
              onClick={onResolveConversation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Mark Resolved</span>
            </button>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <CheckCircle className="w-3.5 h-3.5" />
              Resolved
            </span>
          )}

          {/* Google Chat Space Quick Alert */}
          <button
            onClick={onOpenGoogleChatModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
            title="Dispatch incident card to Google Chat space"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Google Chat</span>
          </button>

          {/* Google Forms CSAT */}
          <button
            onClick={onOpenCSATModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
            title="Inspect Google Forms CSAT responses"
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">CSAT Survey</span>
          </button>
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4">
        {messages.map((message) => {
          if (message.senderRole === 'SYSTEM') {
            return (
              <div key={message.id} className="py-2 flex items-center justify-center">
                <div className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[11px] text-neutral-600 dark:text-neutral-300 font-medium">
                  {message.content}
                </div>
              </div>
            );
          }

          const isInternal = message.internalNote;
          const isCustomer = message.senderRole === 'CUSTOMER';
          const isAI = message.senderRole === 'AI';
          const isAgent = message.senderRole === 'AGENT';

          return (
            <div
              key={message.id}
              className={`flex flex-col ${
                isInternal
                  ? 'items-center my-3'
                  : isCustomer
                  ? 'items-start'
                  : 'items-end'
              }`}
            >
              {/* Internal Note Banner */}
              {isInternal ? (
                <div className="w-full max-w-xl p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-amber-600" />
                      Internal Support Note • {message.senderName}
                    </span>
                    <span className="text-[10px] text-amber-600/80 font-normal">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              ) : (
                <>
                  {/* Sender Header */}
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    {isCustomer && (
                      <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                        {message.senderName} (Customer)
                      </span>
                    )}
                    {isAI && (
                      <div className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                        <span className="w-3.5 h-3.5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center text-[8px] font-bold">
                          R
                        </span>
                        <span>ResolveAI</span>
                      </div>
                    )}
                    {isAgent && (
                      <div className="flex items-center gap-1 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded font-normal">
                          Agent
                        </span>
                        <span>{message.senderName}</span>
                      </div>
                    )}
                    <span className="text-[10px] text-neutral-400">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Bubble */}
                  <div
                    className={`max-w-md sm:max-w-xl rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                      isCustomer
                        ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-tl-xs'
                        : isAI
                        ? 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-tr-xs shadow-2xs'
                        : 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-tr-xs shadow-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>

                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-neutral-200/40 dark:border-neutral-700/40 space-y-1">
                        {message.attachments.map((att) => (
                          <div key={att.id} className="flex items-center gap-1.5 text-xs">
                            <FileText className="w-3.5 h-3.5 opacity-70" />
                            <span className="truncate">{att.name}</span>
                            <span className="text-[10px] opacity-60">({att.size})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Agent Response Composer */}
      <div className={`border-t p-3 sm:p-4 shrink-0 transition-colors ${
        isInternalNote 
          ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40' 
          : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
      }`}>
        <div className="max-w-3xl mx-auto w-full">
          {/* Controls: Mode Switcher & Canned Responses */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded text-xs">
              <button
                type="button"
                onClick={() => setIsInternalNote(false)}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  !isInternalNote
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                Public Customer Reply
              </button>
              <button
                type="button"
                onClick={() => setIsInternalNote(true)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors ${
                  isInternalNote
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <Lock className="w-3 h-3" />
                Internal Note
              </button>
            </div>

            {/* Canned Responses dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCannedMenu(!showCannedMenu)}
                className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <span>Canned Responses</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showCannedMenu && (
                <div className="absolute right-0 bottom-full mb-1 w-64 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl py-1 z-30">
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase text-neutral-400 border-b border-neutral-100 dark:border-neutral-700">
                    Insert Quick Macro
                  </div>
                  {cannedResponses.map((res, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => insertCannedResponse(res.text)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition-colors"
                    >
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">{res.title}</div>
                      <div className="text-[11px] text-neutral-500 truncate">{res.text}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSend} className="flex items-end gap-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder={isInternalNote ? "Write an internal note (only visible to support agents)..." : "Reply to customer as Mohd Afnan Azhar..."}
              rows={2}
              className={`flex-1 py-2 px-3 text-sm rounded-md border focus:outline-hidden resize-none transition-all ${
                isInternalNote
                  ? 'bg-amber-100/60 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 placeholder-amber-700/60'
                  : 'bg-neutral-100 dark:bg-neutral-800 border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 focus:bg-white dark:focus:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400'
              }`}
            />

            <button
              type="submit"
              disabled={!replyText.trim()}
              className={`p-2.5 rounded-md text-white transition-opacity shrink-0 ${
                isInternalNote
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90'
              } disabled:opacity-30`}
              title="Send reply"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1.5 px-1">
            <span>Press Enter to send, Shift+Enter for newline</span>
            <span className="font-mono text-[10px]">
              Assigned: {conversation.assignedAgentName || 'Unassigned'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
