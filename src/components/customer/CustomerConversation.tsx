import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Send, 
  Paperclip, 
  CheckCircle, 
  Clock3, 
  AlertCircle, 
  Headset, 
  UserCircle,
  FileText,
  X
} from 'lucide-react';
import { Conversation, Message, Attachment } from '../../types';

interface CustomerConversationProps {
  conversation: Conversation;
  messages: Message[];
  isAiTyping: boolean;
  aiOperationalState?: string;
  onSendMessage: (content: string, attachments?: Attachment[]) => void;
  onRequestHuman: () => void;
  onBack: () => void;
  customerName?: string;
}

export const CustomerConversation: React.FC<CustomerConversationProps> = ({
  conversation,
  messages,
  isAiTyping,
  aiOperationalState,
  onSendMessage,
  onRequestHuman,
  onBack,
  customerName = 'Sarah Khan'
}) => {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiTyping, aiOperationalState]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && attachments.length === 0) return;
    onSendMessage(inputText.trim(), attachments);
    setInputText('');
    setAttachments([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: Attachment[] = Array.from(files).map((f) => ({
      id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
      type: f.type || 'application/octet-stream',
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const getStatusDisplay = () => {
    switch (conversation.status) {
      case 'RESOLVED':
        return {
          label: 'Issue Resolved',
          color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
          icon: <CheckCircle className="w-3.5 h-3.5" />
        };
      case 'NEEDS_HUMAN':
        return {
          label: 'Dispatched to Support Queue',
          color: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
          icon: <AlertCircle className="w-3.5 h-3.5" />
        };
      case 'ASSIGNED':
        return {
          label: `${conversation.assignedAgentName || 'Agent'} is actively handling`,
          color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
          icon: <Headset className="w-3.5 h-3.5" />
        };
      case 'WAITING_CUSTOMER':
        return {
          label: 'Awaiting your reply',
          color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
          icon: <Clock3 className="w-3.5 h-3.5" />
        };
      case 'AI_HANDLING':
      default:
        return {
          label: 'ResolveAI Automated Resolution',
          color: 'text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700',
          icon: <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-neutral-50 dark:bg-neutral-950">
      {/* Top Conversation Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Back to conversations"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
              {conversation.title}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-neutral-400">
                Ticket #{conversation.id.slice(-6)} • {conversation.category}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border ${statusInfo.color}`}>
            {statusInfo.icon}
            <span>{statusInfo.label}</span>
          </div>

          {conversation.status !== 'RESOLVED' && conversation.status !== 'ASSIGNED' && (
            <button
              onClick={onRequestHuman}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors border border-neutral-200 dark:border-neutral-700"
              title="Request a human support agent"
            >
              <Headset className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Request Support Agent</span>
              <span className="md:hidden">Agent</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4 max-w-3xl w-full mx-auto">
        {messages.map((message) => {
          // System message divider
          if (message.senderRole === 'SYSTEM') {
            return (
              <div key={message.id} className="py-2 flex items-center justify-center">
                <div className="px-3 py-1 rounded-full bg-neutral-200/80 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 text-[11px] text-neutral-600 dark:text-neutral-300 font-medium tracking-wide">
                  {message.content}
                </div>
              </div>
            );
          }

          const isCustomer = message.senderRole === 'CUSTOMER';
          const isAI = message.senderRole === 'AI';
          const isAgent = message.senderRole === 'AGENT';

          return (
            <div
              key={message.id}
              className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'} group`}
            >
              {/* Sender Name & Role Label */}
              <div className="flex items-center gap-1.5 mb-1 px-1">
                {isAI && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                    <span className="w-4 h-4 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center text-[9px] font-bold">
                      R
                    </span>
                    <span>ResolveAI</span>
                  </div>
                )}
                {isAgent && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-900 dark:text-neutral-200 font-medium">
                    <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">
                      {message.senderName?.charAt(0) || 'A'}
                    </div>
                    <span>{message.senderName}</span>
                    <span className="text-[10px] px-1 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded font-normal">
                      Support Agent
                    </span>
                  </div>
                )}
                {isCustomer && (
                  <span className="text-xs text-neutral-400">
                    You
                  </span>
                )}
                <span className="text-[10px] text-neutral-400">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-md sm:max-w-lg rounded-xl px-4 py-2.5 text-sm leading-relaxed transition-all ${
                  isCustomer
                    ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-br-xs'
                    : isAgent
                    ? 'bg-white dark:bg-neutral-900 border border-blue-200 dark:border-blue-900 text-neutral-800 dark:text-neutral-100 shadow-2xs rounded-bl-xs'
                    : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 shadow-2xs rounded-bl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>

                {/* Attachments preview inside bubble */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-neutral-200/50 dark:border-neutral-700/50 space-y-1">
                    {message.attachments.map((att) => (
                      <div key={att.id} className="flex items-center gap-2 text-xs opacity-90">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{att.name}</span>
                        <span className="text-[10px] opacity-75">({att.size})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* AI Operational State / Typing Indicator */}
        {isAiTyping && (
          <div className="flex flex-col items-start space-y-1">
            <div className="flex items-center gap-1.5 px-1 text-xs text-neutral-500 font-medium">
              <span className="w-4 h-4 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center text-[9px] font-bold">
                R
              </span>
              <span>ResolveAI</span>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl rounded-bl-xs px-3.5 py-2 shadow-2xs flex items-center gap-2.5">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" />
              </div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                {aiOperationalState || 'Preparing response'}...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <div className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 p-3 sm:p-4 shrink-0">
        <div className="max-w-3xl mx-auto w-full">
          {/* Attachment list if any selected */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 p-2 bg-neutral-50 dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 bg-white dark:bg-neutral-900 px-2 py-1 rounded text-xs border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                >
                  <FileText className="w-3 h-3 text-neutral-500" />
                  <span className="max-w-[150px] truncate">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSend} className="flex items-end gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-md text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
              title="Add attachment"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Type your reply (Press Enter to send)..."
              rows={1}
              className="flex-1 max-h-32 min-h-[40px] py-2 px-3 text-sm bg-neutral-100 dark:bg-neutral-800 rounded-md border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 focus:bg-white dark:focus:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden resize-none transition-all"
            />

            <button
              type="submit"
              disabled={!inputText.trim() && attachments.length === 0}
              className="p-2.5 rounded-md bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 disabled:opacity-30 disabled:hover:opacity-30 transition-all shrink-0"
              title="Send reply"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1.5 px-1">
            <span>Powered by ResolveAI Continuous Resolution Protocol</span>
            {conversation.status === 'NEEDS_HUMAN' && (
              <span className="text-rose-500 font-medium">In Human Queue</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
