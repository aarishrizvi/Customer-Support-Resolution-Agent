import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { Header } from './components/Header';
import { CustomerPortal } from './components/customer/CustomerPortal';
import { CustomerConversation } from './components/customer/CustomerConversation';
import { AgentConsole } from './components/agent/AgentConsole';
import { AuthModal } from './components/auth/AuthModal';
import { 
  Conversation, 
  Message, 
  KnowledgeArticle, 
  CustomerProfile, 
  Activity, 
  TicketCategory, 
  Attachment,
  UserProfile,
  UserRole
} from './types';
import { 
  initAuth, 
  testConnection 
} from './lib/firebase';
import {
  getOrCreateUserProfile,
  subscribeToUserProfile,
  assignUserRole,
  subscribeToConversations,
  subscribeToMessages,
  createConversationInDb,
  sendMessageToDb,
  updateConversationAiState,
  takeConversationInDb,
  resolveConversationInDb,
  requestHumanInDb,
  subscribeToKnowledgeBase,
  addKnowledgeArticleToDb,
  updateKnowledgeArticleInDb,
  subscribeToCustomers,
  subscribeToActivities,
  logActivityToDb
} from './lib/firestore-service';
import { requestAIResolution } from './lib/ai-service';
import { AlertCircle, ShieldAlert, CheckCircle } from 'lucide-react';

export default function App() {
  // Navigation / Route state - Customer is default, /support for Support Agent
  const [currentRoute, setCurrentRoute] = useState<'CUSTOMER' | 'SUPPORT'>(() => {
    return window.location.pathname.startsWith('/support') ? 'SUPPORT' : 'CUSTOMER';
  });
  const [routeRestrictedNotice, setRouteRestrictedNotice] = useState<string | null>(null);

  // Authentication & User Profile
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authToast, setAuthToast] = useState<{ type: 'success' | 'info'; title: string; message: string } | null>(null);

  const triggerAuthToast = (title: string, message: string, type: 'success' | 'info' = 'success') => {
    setAuthToast({ type, title, message });
    setTimeout(() => {
      setAuthToast(null);
    }, 4500);
  };

  // Firestore Real-Time Data State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [knowledgeArticles, setKnowledgeArticles] = useState<KnowledgeArticle[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Active Selection & View state
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [isCustomerInsideChat, setIsCustomerInsideChat] = useState<boolean>(false);

  // AI Evaluation State
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);
  const [aiOperationalState, setAiOperationalState] = useState<string>('');

  const AGENT_DISPLAY_NAME = userProfile?.displayName || 'Mohd Afnan Azhar';

  // ============================================================
  // Route Navigation & Synchronization
  // ============================================================

  const navigateTo = (path: '/customer' | '/support' | '/', notifyState = true) => {
    const targetPath = path === '/customer' ? '/' : path;
    if (notifyState && window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }

    if (targetPath === '/support') {
      // Check Protected Route
      if (!currentUser) {
        setIsAuthModalOpen(true);
        setRouteRestrictedNotice('Please sign in to access the Support Console.');
        return;
      }
      if (userProfile && userProfile.role !== 'SUPPORT_AGENT') {
        // Enforce protection: customer cannot access /support
        setRouteRestrictedNotice('Access Restricted: /support is only accessible to authorized Support Agents.');
        setCurrentRoute('CUSTOMER');
        window.history.replaceState({}, '', '/');
        setTimeout(() => setRouteRestrictedNotice(null), 5000);
        return;
      }
      setCurrentRoute('SUPPORT');
      setRouteRestrictedNotice(null);
    } else {
      setCurrentRoute('CUSTOMER');
      setRouteRestrictedNotice(null);
    }
  };

  useEffect(() => {
    // Listen to browser popstate (back/forward)
    const handlePopState = () => {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/support')) {
        navigateTo('/support', false);
      } else {
        navigateTo('/', false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser, userProfile]);

  // Initial Boot & Firebase Auth Listener
  useEffect(() => {
    testConnection();

    const unsubscribe = initAuth(
      async (firebaseUser) => {
        setCurrentUser(firebaseUser);
        if (firebaseUser) {
          try {
            const profile = await getOrCreateUserProfile(firebaseUser);
            setUserProfile(profile);

            const initialPath = window.location.pathname;
            if (initialPath.startsWith('/support')) {
              if (profile.role === 'SUPPORT_AGENT') {
                navigateTo('/support', false);
              } else {
                setRouteRestrictedNotice('Access restricted: Customers cannot access /support.');
                setTimeout(() => setRouteRestrictedNotice(null), 4000);
                navigateTo('/', false);
              }
            } else {
              // Customer is default
              navigateTo('/', false);
            }
          } catch (e) {
            console.error('Error fetching user profile:', e);
          }
        } else {
          setUserProfile(null);
          if (window.location.pathname.startsWith('/support')) {
            setRouteRestrictedNotice('Please sign in to access the Support Console.');
            setIsAuthModalOpen(true);
          }
          navigateTo('/', false);
        }
      },
      () => {
        setCurrentUser(null);
        setUserProfile(null);
        navigateTo('/', false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Listen for real-time user role updates in Firestore
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = subscribeToUserProfile(currentUser.uid, (profile) => {
      if (profile) {
        setUserProfile((prev) => (prev ? { ...prev, ...profile } : profile));
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [currentUser?.uid]);

  // ============================================================
  // Real-Time Data Subscriptions
  // ============================================================

  // 1. Conversations (Filtered by role in Firestore)
  useEffect(() => {
    const role: UserRole = userProfile?.role || 'CUSTOMER';
    const uid = currentUser?.uid || 'guest';

    const unsubscribe = subscribeToConversations(role, uid, (fetchedConvs) => {
      setConversations(fetchedConvs);
      // Auto-select first conversation if none selected
      if (fetchedConvs.length > 0 && !selectedConversationId) {
        setSelectedConversationId(fetchedConvs[0].id);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [userProfile?.role, currentUser?.uid]);

  // 2. Real-Time Messages for Active Conversation
  useEffect(() => {
    if (!selectedConversationId) {
      setActiveMessages([]);
      return;
    }

    const unsubscribe = subscribeToMessages(selectedConversationId, (msgs) => {
      setActiveMessages(msgs);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [selectedConversationId]);

  // 3. Knowledge Base
  useEffect(() => {
    const unsubscribe = subscribeToKnowledgeBase((articles) => {
      setKnowledgeArticles(articles);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // 4. Customers Directory (for Support Agents)
  useEffect(() => {
    if (userProfile?.role !== 'SUPPORT_AGENT') return;
    const unsubscribe = subscribeToCustomers((custs) => {
      setCustomers(custs);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [userProfile?.role]);

  // 5. Activity Log (for Support Agents)
  useEffect(() => {
    if (userProfile?.role !== 'SUPPORT_AGENT') return;
    const unsubscribe = subscribeToActivities((acts) => {
      setActivities(acts);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [userProfile?.role]);

  // Count tickets needing human
  const needsHumanCount = conversations.filter(
    (c) => c.status === 'NEEDS_HUMAN' || c.status === 'ESCALATED'
  ).length;

  // Selected conversation object
  const currentSelectedConversation =
    conversations.find((c) => c.id === selectedConversationId) || conversations[0];

  // ============================================================
  // Customer Actions (Continuous Conversation Flow)
  // ============================================================

  const handleStartNewConversation = async (title: string, category: TicketCategory) => {
    if (!currentUser) {
      setAuthModalTab('LOGIN');
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const customerId = currentUser.uid;
      const customerName = userProfile?.displayName || currentUser.displayName || 'Customer';
      const customerEmail = currentUser.email || '';

      // 1. Create in Firestore
      const newConvId = await createConversationInDb({
        customerId,
        customerName,
        customerEmail,
        title,
        category,
        initialMessageText: title
      });

      setSelectedConversationId(newConvId);
      setIsCustomerInsideChat(true);

      // 2. Trigger AI Resolution Engine
      await executeAiEvaluation(
        newConvId,
        category,
        title,
        customerName,
        [
          {
            id: 'init_msg',
            conversationId: newConvId,
            senderId: customerId,
            senderName: customerName,
            senderRole: 'CUSTOMER',
            content: title,
            timestamp: new Date().toISOString()
          }
        ]
      );
    } catch (err) {
      console.error('Failed to create conversation in Firestore:', err);
    }
  };

  const handleCustomerSendMessage = async (content: string, attachments?: Attachment[]) => {
    if (!selectedConversationId || !currentUser) return;

    try {
      const senderName = userProfile?.displayName || currentUser.displayName || 'Customer';

      // 1. Write customer message to Firestore
      await sendMessageToDb({
        conversationId: selectedConversationId,
        senderId: currentUser.uid,
        senderName,
        senderRole: 'CUSTOMER',
        content,
        attachments
      });

      const activeConv = conversations.find((c) => c.id === selectedConversationId);
      // If already assigned to human agent, agent sees message in real time without AI interception
      if (activeConv?.status === 'HUMAN_HANDLING' || activeConv?.status === 'ASSIGNED') {
        return;
      }

      // 2. Evaluate with AI
      const updatedMessages: Message[] = [
        ...activeMessages,
        {
          id: `temp_${Date.now()}`,
          conversationId: selectedConversationId,
          senderId: currentUser.uid,
          senderName,
          senderRole: 'CUSTOMER',
          content,
          timestamp: new Date().toISOString(),
          attachments
        }
      ];

      await executeAiEvaluation(
        selectedConversationId,
        activeConv?.category || 'General',
        activeConv?.title || content,
        senderName,
        updatedMessages
      );
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // AI Resolution & Failure Resilience Logic
  const executeAiEvaluation = async (
    conversationId: string,
    category: string,
    title: string,
    customerName: string,
    thread: Message[]
  ) => {
    setIsAiTyping(true);
    setAiOperationalState('Reading request');

    setTimeout(() => {
      setAiOperationalState('Checking support information');
    }, 700);

    setTimeout(() => {
      setAiOperationalState('Preparing response');
    }, 1400);

    try {
      // Call server AI resolution endpoint
      const result = await requestAIResolution({
        conversationId,
        category,
        title,
        customerName,
        messages: thread,
        knowledgeContext: knowledgeArticles
      });

      // Update conversation and messages in Firestore
      await updateConversationAiState({
        conversationId,
        status: result.needsHuman ? 'NEEDS_HUMAN' : result.canResolve ? 'WAITING_FOR_CUSTOMER' : 'AI_HANDLING',
        aiSummary: result.aiSummary,
        suggestedArticles: result.suggestedArticleIds,
        replyMessage: result.reply,
        operationalState: result.operationalState
      });

      if (result.needsHuman) {
        await logActivityToDb({
          conversationId,
          type: 'DISPATCH',
          description: `Conversation #${conversationId.slice(-6)} dispatched to human queue by ResolveAI: "${result.aiSummary}"`,
          actorName: 'ResolveAI',
          actorRole: 'AI Resolution Agent'
        });
      }
    } catch (aiErr) {
      // SECTION 7 REQUIREMENT: AI FAILURE RESILIENCE
      // 1. Do not delete or lose the customer's message.
      // 2. Preserve the conversation.
      // 3. Change conversation status to require human assistance.
      // 4. Put conversation into support queue.
      // 5. Normal support message rather than raw error.
      console.warn('AI evaluation failed or timed out. Gracefully handing off to human support queue:', aiErr);

      await updateConversationAiState({
        conversationId,
        status: 'NEEDS_HUMAN',
        aiSummary: `Customer inquiry regarding ${category}: "${title}". Dispatched to human agent.`,
        replyMessage: "Thank you for reaching out. I've transferred your conversation directly to our support operations queue. A human agent will review your request and join shortly.",
        operationalState: 'Human assistance required'
      });

      await logActivityToDb({
        conversationId,
        type: 'DISPATCH',
        description: `Conversation #${conversationId.slice(-6)} automatically routed to human queue due to AI fallback dispatch.`,
        actorName: 'ResolveAI',
        actorRole: 'Dispatch Engine'
      });
    } finally {
      setIsAiTyping(false);
      setAiOperationalState('');
    }
  };

  const handleRequestHuman = async () => {
    if (!selectedConversationId) return;
    try {
      const customerName = userProfile?.displayName || 'Customer';
      await requestHumanInDb(selectedConversationId, customerName);
    } catch (err) {
      console.error('Error requesting human agent:', err);
    }
  };

  // ============================================================
  // Support Agent Actions (Takeover & Resolution)
  // ============================================================

  const handleTakeConversation = async (conversationId: string) => {
    if (!currentUser) return;
    try {
      await takeConversationInDb({
        conversationId,
        agentId: currentUser.uid,
        agentName: AGENT_DISPLAY_NAME
      });
    } catch (err) {
      console.error('Error taking conversation:', err);
    }
  };

  const handleAgentSendMessage = async (
    conversationId: string,
    content: string,
    isInternalNote: boolean,
    attachments?: Attachment[]
  ) => {
    if (!currentUser) return;
    try {
      await sendMessageToDb({
        conversationId,
        senderId: currentUser.uid,
        senderName: AGENT_DISPLAY_NAME,
        senderRole: 'AGENT',
        content,
        internalNote: isInternalNote,
        attachments
      });

      if (isInternalNote) {
        await logActivityToDb({
          conversationId,
          type: 'NOTE_ADDED',
          description: `Internal note added by ${AGENT_DISPLAY_NAME} on #${conversationId.slice(-6)}`,
          actorName: AGENT_DISPLAY_NAME,
          actorRole: 'Support Agent'
        });
      }
    } catch (err) {
      console.error('Error sending agent message:', err);
    }
  };

  const handleResolveConversation = async (conversationId: string) => {
    try {
      await resolveConversationInDb({
        conversationId,
        agentName: AGENT_DISPLAY_NAME
      });
    } catch (err) {
      console.error('Error resolving conversation:', err);
    }
  };

  // Knowledge Base Actions
  const handleAddKnowledgeArticle = async (article: Omit<KnowledgeArticle, 'id' | 'updatedAt'>) => {
    await addKnowledgeArticleToDb(article);
  };

  const handleUpdateKnowledgeArticle = async (id: string, updates: Partial<KnowledgeArticle>) => {
    await updateKnowledgeArticleInDb(id, updates);
  };

  // Role Assignment Tool for Testing / Admin
  const handleAssignRole = async (role: UserRole) => {
    if (!currentUser) return;
    try {
      await assignUserRole(currentUser.uid, role);
      setUserProfile((prev) => (prev ? { ...prev, role } : null));
      if (role === 'SUPPORT_AGENT') {
        navigateTo('/support');
      } else {
        navigateTo('/');
      }
    } catch (err) {
      console.error('Error assigning role:', err);
    }
  };

  // Message mapping dictionary for AgentConsole compatibility
  const messagesDict: Record<string, Message[]> = {
    [selectedConversationId]: activeMessages
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans antialiased">
      {/* Top Application Header */}
      <Header
        currentMode={currentRoute === 'SUPPORT' ? 'AGENT' : 'CUSTOMER'}
        currentUser={currentUser}
        userProfile={userProfile}
        onOpenAuthModal={(tab = 'LOGIN') => {
          setAuthModalTab(tab);
          setIsAuthModalOpen(true);
        }}
        onAssignRole={handleAssignRole}
        onSignOut={() => triggerAuthToast('Signed Out', 'You have been signed out successfully.', 'info')}
        agentName={AGENT_DISPLAY_NAME}
        needsHumanCount={needsHumanCount}
      />

      {/* Auth Success / Notification Toast */}
      {authToast && (
        <div className="fixed top-16 right-4 z-50 flex items-start gap-3 px-4 py-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl max-w-sm animate-in slide-in-from-top-2 fade-in duration-200">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            authToast.type === 'success'
              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700'
          }`}>
            <CheckCircle className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">{authToast.title}</p>
            <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">{authToast.message}</p>
          </div>
          <button
            onClick={() => setAuthToast(null)}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Protected Route Access Denied Banner */}
      {routeRestrictedNotice && (
        <div className="bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900/60 px-4 py-2 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{routeRestrictedNotice}</span>
          </div>
        </div>
      )}

      {/* Main Content View */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentRoute === 'CUSTOMER' ? (
          isCustomerInsideChat && currentSelectedConversation ? (
            <CustomerConversation
              conversation={currentSelectedConversation}
              messages={activeMessages}
              isAiTyping={isAiTyping}
              aiOperationalState={aiOperationalState}
              onSendMessage={handleCustomerSendMessage}
              onRequestHuman={handleRequestHuman}
              onBack={() => setIsCustomerInsideChat(false)}
              customerName={userProfile?.displayName || 'Customer'}
            />
          ) : (
            <CustomerPortal
              conversations={conversations}
              onOpenConversation={(id) => {
                setSelectedConversationId(id);
                setIsCustomerInsideChat(true);
              }}
              onStartNewConversation={handleStartNewConversation}
              customerName={userProfile?.displayName || 'Customer'}
            />
          )
        ) : (
          <AgentConsole
            conversations={conversations}
            messages={messagesDict}
            knowledgeArticles={knowledgeArticles}
            customers={customers}
            activities={activities}
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
            onTakeConversation={handleTakeConversation}
            onResolveConversation={handleResolveConversation}
            onAgentSendMessage={handleAgentSendMessage}
            onAddKnowledgeArticle={handleAddKnowledgeArticle}
            onUpdateKnowledgeArticle={handleUpdateKnowledgeArticle}
            agentName={AGENT_DISPLAY_NAME}
          />
        )}
      </main>

      {/* Auth Modal (Email/Password & Google Sign In) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={authModalTab}
        onSuccess={(profile) => {
          setUserProfile(profile);
          triggerAuthToast(
            'Signed In Successfully',
            `Welcome, ${profile.displayName}! Authenticated as ${profile.role === 'SUPPORT_AGENT' ? 'Support Agent' : 'Customer'}.`,
            'success'
          );
          if (profile.role === 'SUPPORT_AGENT' && window.location.pathname.startsWith('/support')) {
            navigateTo('/support');
          } else if (profile.role === 'SUPPORT_AGENT') {
            navigateTo('/support');
          } else {
            navigateTo('/');
          }
        }}
      />
    </div>
  );
}
