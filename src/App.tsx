import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { Header } from './components/Header';
import { CustomerPortal } from './components/customer/CustomerPortal';
import { CustomerConversation } from './components/customer/CustomerConversation';
import { AgentConsole } from './components/agent/AgentConsole';
import { AdminConsole } from './components/admin/AdminConsole';
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
  testConnection,
  auth
} from './lib/firebase';
import {
  getOrCreateUserProfile,
  subscribeToUserProfile,
  subscribeToAllUsers,
  setUserRole,
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
import {
  probeBackend,
  friendlyError,
  CREATE_DATABASE_URL,
  RULES_CONSOLE_URL,
  BackendReport
} from './lib/backend-status';
import { AlertCircle, ShieldAlert, CheckCircle, Loader2 } from 'lucide-react';

export default function App() {
  // Navigation / Route state - Customer is default; protected routes are
  // granted only after Firebase resolves the profile (see navigateTo).
  const [currentRoute, setCurrentRoute] = useState<'CUSTOMER' | 'SUPPORT' | 'ADMIN'>('CUSTOMER');
  const [routeRestrictedNotice, setRouteRestrictedNotice] = useState<string | null>(null);

  // Authentication & User Profile
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authToast, setAuthToast] = useState<{ type: 'success' | 'info' | 'error'; title: string; message: string } | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  // Backend health (Firestore reachable / rules published / database exists)
  const [backendReport, setBackendReport] = useState<BackendReport | null>(null);

  // Chat progress indicators
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isStartingConversation, setIsStartingConversation] = useState(false);

  const triggerAuthToast = (title: string, message: string, type: 'success' | 'info' | 'error' = 'success') => {
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
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Active Selection & View state
  const [selectedConversationId, setSelectedConversationId] = useState<string>(
    () => sessionStorage.getItem('resolveai.selectedConversation') || ''
  );
  const [isCustomerInsideChat, setIsCustomerInsideChat] = useState<boolean>(
    () => sessionStorage.getItem('resolveai.insideChat') === '1'
  );

  // Refresh must not throw the customer back to the landing page: remember the
  // open thread for this tab (the messages themselves live in Firestore).
  useEffect(() => {
    if (selectedConversationId) sessionStorage.setItem('resolveai.selectedConversation', selectedConversationId);
    else sessionStorage.removeItem('resolveai.selectedConversation');
  }, [selectedConversationId]);

  useEffect(() => {
    sessionStorage.setItem('resolveai.insideChat', isCustomerInsideChat ? '1' : '0');
  }, [isCustomerInsideChat]);

  // AI Evaluation State
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);
  const [aiOperationalState, setAiOperationalState] = useState<string>('');

  const AGENT_DISPLAY_NAME = userProfile?.displayName || 'Mohd Afnan Azhar';

  // ============================================================
  // Route Navigation & Synchronization
  // ============================================================

  const navigateTo = (
    path: '/customer' | '/support' | '/admin' | '/',
    notifyState = true,
    resolvedProfile: UserProfile | null = userProfile
  ) => {
    const targetPath = path === '/customer' ? '/' : path;
    const isProtected = targetPath === '/support' || targetPath === '/admin';

    // Only commit the URL once we know the route is allowed
    const commitUrl = () => {
      if (window.location.pathname === targetPath) return;
      if (notifyState) window.history.pushState({}, '', targetPath);
      else window.history.replaceState({}, '', targetPath);
    };

    if (isProtected) {
      // Check Protected Route using current user state or active Firebase auth instance
      const activeUser = currentUser || auth.currentUser;
      if (!activeUser) {
        if (window.location.pathname !== '/') window.history.replaceState({}, '', '/');
        setIsAuthModalOpen(true);
        setRouteRestrictedNotice(
          targetPath === '/admin'
            ? 'Please sign in to access the Access Control CMS.'
            : 'Please sign in to access the Support Console.'
        );
        setCurrentRoute('CUSTOMER');
        return;
      }

      // Access level still loading: leave the URL untouched and let the
      // "resume pending protected route" effect below route once it resolves.
      if (!resolvedProfile) {
        setRouteRestrictedNotice(
          targetPath === '/admin'
            ? 'Checking administrator access...'
            : 'Checking Support Console access...'
        );
        return;
      }

      const allowedRoles: UserRole[] = targetPath === '/admin' ? ['ADMIN'] : ['SUPPORT_AGENT', 'ADMIN'];
      if (!allowedRoles.includes(resolvedProfile.role)) {
        const who = resolvedProfile.email || resolvedProfile.displayName || 'this account';
        setRouteRestrictedNotice(
          targetPath === '/admin'
            ? `Access Restricted: signed in as ${who} with role ${resolvedProfile.role}. The Access Control CMS is only for administrators.`
            : `Access Restricted: signed in as ${who} with role ${resolvedProfile.role}. /support requires an authorized Support Agent.`
        );
        console.info('[ResolveAI] access DENIED', {
          wanted: targetPath,
          signedInAs: who,
          role: resolvedProfile.role
        });
        setCurrentRoute('CUSTOMER');
        window.history.replaceState({}, '', '/');
        setTimeout(() => setRouteRestrictedNotice(null), 8000);
        return;
      }

      console.info('[ResolveAI] access GRANTED', {
        wanted: targetPath,
        signedInAs: resolvedProfile.email || resolvedProfile.displayName,
        role: resolvedProfile.role
      });
      commitUrl();
      setCurrentRoute(targetPath === '/admin' ? 'ADMIN' : 'SUPPORT');
      setRouteRestrictedNotice(null);
      return;
    }

    commitUrl();
    setCurrentRoute('CUSTOMER');
    setRouteRestrictedNotice(null);
  };

  // Resume a protected route requested before the profile finished loading
  useEffect(() => {
    if (!userProfile) return;
    const pathname = window.location.pathname;
    if (pathname.startsWith('/admin') && currentRoute !== 'ADMIN') {
      navigateTo('/admin', false, userProfile);
    } else if (pathname.startsWith('/support') && currentRoute !== 'SUPPORT') {
      navigateTo('/support', false, userProfile);
    }
  }, [userProfile, currentRoute]);

  // Never leave a silent screen while Firebase resolves the session
  useEffect(() => {
    if (!isSessionLoading) return;
    const t = setTimeout(() => {
      setRouteRestrictedNotice(
        'Still restoring your session. Open DevTools > Console and look for [ResolveAI] logs to see what is stuck.'
      );
    }, 8000);
    return () => clearTimeout(t);
  }, [isSessionLoading]);

  // Backend health: probe Firestore on boot and keep retrying while it fails,
  // so "nothing happens" is never the user's only feedback.
  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;

    const runProbe = async (): Promise<void> => {
      const report = await probeBackend();
      if (cancelled) return;
      setBackendReport(report);
      console.info(
        '[ResolveAI] backend:',
        report.ok ? 'connected' : `FAILED (${report.issue}) - ${report.message}`
      );
      if (!report.ok) retryTimer = window.setTimeout(() => { void runProbe(); }, 12000);
    };

    void runProbe();

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, []);

  useEffect(() => {
    // Listen to browser popstate (back/forward)
    const handlePopState = () => {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/admin')) {
        navigateTo('/admin', false);
      } else if (pathname.startsWith('/support')) {
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
          setIsAuthModalOpen(false);
          try {
            const profile = await getOrCreateUserProfile(firebaseUser);
            setUserProfile(profile);
            console.info('[ResolveAI] session restored', {
              email: profile.email,
              role: profile.role,
              path: window.location.pathname
            });

            const initialPath = window.location.pathname;
            if (initialPath.startsWith('/admin')) {
              if (profile.role === 'ADMIN') {
                navigateTo('/admin', false, profile);
              } else {
                navigateTo('/', false, profile);
                setRouteRestrictedNotice('Access restricted: the Access Control CMS is only for administrators.');
                setTimeout(() => setRouteRestrictedNotice(null), 4000);
              }
            } else if (initialPath.startsWith('/support')) {
              if (profile.role === 'SUPPORT_AGENT' || profile.role === 'ADMIN') {
                navigateTo('/support', false, profile);
              } else {
                navigateTo('/', false, profile);
                setRouteRestrictedNotice('Access restricted: this account cannot access the Support Console.');
                setTimeout(() => setRouteRestrictedNotice(null), 4000);
              }
            } else {
              // Customer is default
              navigateTo('/', false, profile);
            }
          } catch (e) {
            console.error('Error fetching user profile:', e);
          } finally {
            setIsSessionLoading(false);
          }
        } else {
          setUserProfile(null);
          setIsSessionLoading(false);
          const blockedPath = window.location.pathname;
          navigateTo('/', false, null);
          if (blockedPath.startsWith('/support')) {
            setRouteRestrictedNotice('Please sign in to access the Support Console.');
            setIsAuthModalOpen(true);
          } else if (blockedPath.startsWith('/admin')) {
            setRouteRestrictedNotice('Please sign in to access the Access Control CMS.');
            setIsAuthModalOpen(true);
          }
        }
      },
      () => {
        setCurrentUser(null);
        setUserProfile(null);
        setIsSessionLoading(false);
        navigateTo('/', false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Safeguard: whenever currentUser is logged in, ensure auth modal is closed
  useEffect(() => {
    if (currentUser) {
      setIsAuthModalOpen(false);
    }
  }, [currentUser]);

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

  // Access Control CMS: full user directory (admins only)
  useEffect(() => {
    if (userProfile?.role !== 'ADMIN') {
      setAllUsers([]);
      return;
    }
    const unsub = subscribeToAllUsers((users) => setAllUsers(users));
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [userProfile?.role]);

  // If an admin revokes this session's access in real time, kick it out immediately
  useEffect(() => {
    if (!userProfile) return;
    if (currentRoute === 'SUPPORT' && userProfile.role !== 'SUPPORT_AGENT' && userProfile.role !== 'ADMIN') {
      navigateTo('/', false, userProfile);
      setRouteRestrictedNotice('Your Support Console access has been revoked by an administrator.');
      setTimeout(() => setRouteRestrictedNotice(null), 5000);
    } else if (currentRoute === 'ADMIN' && userProfile.role !== 'ADMIN') {
      navigateTo('/', false, userProfile);
      setRouteRestrictedNotice('Your administrator access has been revoked.');
      setTimeout(() => setRouteRestrictedNotice(null), 5000);
    }
  }, [currentRoute, userProfile]);

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
      triggerAuthToast(
        'Sign in to start a conversation',
        'Messages are stored against your account so Support Agents can read them. Please sign in or register first.',
        'info'
      );
      setAuthModalTab('LOGIN');
      setIsAuthModalOpen(true);
      return;
    }
    if (isStartingConversation) return;

    setIsStartingConversation(true);
    let newConvId = '';
    try {
      const customerId = currentUser.uid;
      const customerName = userProfile?.displayName || currentUser.displayName || 'Customer';
      const customerEmail = currentUser.email || '';

      // 1. Create in Firestore
      newConvId = await createConversationInDb({
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
      try {
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
      } catch (aiErr) {
        console.error('AI evaluation could not be persisted:', aiErr);
        triggerAuthToast(
          'No AI reply yet',
          friendlyError(aiErr, 'The conversation was created, but the AI reply could not be saved.'),
          'error'
        );
      }
    } catch (err) {
      console.error('Failed to create conversation in Firestore:', err);
      triggerAuthToast(
        "Couldn't start the conversation",
        friendlyError(err, 'The message could not be saved to the backend.'),
        'error'
      );
    } finally {
      setIsStartingConversation(false);
    }
  };

  const handleCustomerSendMessage = async (content: string, attachments?: Attachment[]) => {
    if (!selectedConversationId || !currentUser) return;
    if (isSendingMessage) return;

    const senderName = userProfile?.displayName || currentUser.displayName || 'Customer';

    // 1. Write customer message to Firestore
    setIsSendingMessage(true);
    try {
      await sendMessageToDb({
        conversationId: selectedConversationId,
        senderId: currentUser.uid,
        senderName,
        senderRole: 'CUSTOMER',
        content,
        attachments
      });
    } catch (err) {
      console.error('Error sending message:', err);
      triggerAuthToast(
        'Message not sent',
        friendlyError(err, 'Your reply could not be saved to the backend.'),
        'error'
      );
      return;
    } finally {
      setIsSendingMessage(false);
    }

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

    try {
      await executeAiEvaluation(
        selectedConversationId,
        activeConv?.category || 'General',
        activeConv?.title || content,
        senderName,
        updatedMessages
      );
    } catch (err) {
      console.error('AI evaluation could not be persisted:', err);
      triggerAuthToast(
        'No AI reply yet',
        friendlyError(err, 'The AI answer could not be saved to this conversation.'),
        'error'
      );
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
      triggerAuthToast('Could not request an agent', friendlyError(err, 'Escalation failed to save.'), 'error');
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
      triggerAuthToast('Could not take this conversation', friendlyError(err, 'The takeover failed to save.'), 'error');
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
      triggerAuthToast('Message not sent', friendlyError(err, 'Your reply could not be saved.'), 'error');
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
      triggerAuthToast('Could not resolve ticket', friendlyError(err, 'The status change failed to save.'), 'error');
    }
  };

  // Knowledge Base Actions
  const handleAddKnowledgeArticle = async (article: Omit<KnowledgeArticle, 'id' | 'updatedAt'>) => {
    await addKnowledgeArticleToDb(article);
  };

  const handleUpdateKnowledgeArticle = async (id: string, updates: Partial<KnowledgeArticle>) => {
    await updateKnowledgeArticleInDb(id, updates);
  };

  // Access Control: only an ADMIN may grant or revoke Support Console access.
  // Server-side enforcement lives in firestore.rules (role field is admin-only).
  const handleUpdateUserRole = async (uid: string, role: UserRole) => {
    if (userProfile?.role !== 'ADMIN') {
      throw new Error('permission-denied: admin role required');
    }
    const target = allUsers.find((u) => u.uid === uid);
    await setUserRole(uid, role);
    await logActivityToDb({
      conversationId: 'access-control',
      type: 'STATUS_CHANGE',
      description: `Access change: ${target?.displayName || uid} (${target?.email || ''}) set to ${role} by ${userProfile.displayName}`,
      actorName: userProfile.displayName,
      actorRole: 'Administrator'
    });
  };

  // Manual re-check from the banner (the effect above keeps auto-retrying too)
  const recheckBackend = async (): Promise<void> => {
    const report = await probeBackend();
    setBackendReport(report);
    console.info('[ResolveAI] backend re-check:', report.ok ? 'connected' : report.message);
  };

  // Message mapping dictionary for AgentConsole compatibility
  const messagesDict: Record<string, Message[]> = {
    [selectedConversationId]: activeMessages
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans antialiased">
      {/* Top Application Header */}
      <Header
        currentMode={currentRoute === 'ADMIN' ? 'ADMIN' : currentRoute === 'SUPPORT' ? 'AGENT' : 'CUSTOMER'}
        currentUser={currentUser}
        userProfile={userProfile}
        onOpenAuthModal={(tab = 'LOGIN') => {
          setAuthModalTab(tab);
          setIsAuthModalOpen(true);
        }}
        onOpenAdmin={() => navigateTo('/admin')}
        onOpenSupport={() => navigateTo('/support')}
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
              : authToast.type === 'error'
              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700'
          }`}>
            {authToast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
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

      {/* Backend health banner - never let a dead backend look like "nothing happened" */}
      {backendReport && !backendReport.ok && (
        <div className="bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900 px-4 py-2.5 text-xs text-rose-900 dark:text-rose-100">
          <div className="max-w-5xl mx-auto flex items-start gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Backend problem - messages are not being saved or shared.</p>
              <p className="mt-0.5 text-rose-700 dark:text-rose-300 leading-snug">{backendReport.message}</p>
              {backendReport.hint && (
                <p className="mt-0.5 text-rose-700/80 dark:text-rose-300/80 leading-snug">{backendReport.hint}</p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                {backendReport.consoleUrl && (
                  <a
                    href={backendReport.consoleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline underline-offset-2 hover:text-rose-600"
                  >
                    1. Create Firestore database
                  </a>
                )}
                {backendReport.rulesUrl && (
                  <a
                    href={backendReport.rulesUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline underline-offset-2 hover:text-rose-600"
                  >
                    2. Publish firestore.rules
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => void recheckBackend()}
                  className="font-semibold px-2 py-0.5 rounded border border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950 transition-colors"
                >
                  Re-check
                </button>
                <span className="text-rose-500 dark:text-rose-400">
                  Checked {new Date(backendReport.checkedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session status / Protected Route banner */}
      {isSessionLoading && !routeRestrictedNotice && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-900/60 px-4 py-2 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
          <span className="font-medium">Restoring your session and checking access...</span>
        </div>
      )}
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
        {currentRoute === 'ADMIN' ? (
          <AdminConsole
            users={allUsers}
            currentUserId={currentUser?.uid || ''}
            onUpdateRole={handleUpdateUserRole}
            conversations={conversations}
            messages={activeMessages}
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
          />
        ) : currentRoute === 'CUSTOMER' ? (
          isCustomerInsideChat && currentSelectedConversation ? (
            <CustomerConversation
              conversation={currentSelectedConversation}
              messages={activeMessages}
              isAiTyping={isAiTyping}
              isSending={isSendingMessage}
              aiOperationalState={aiOperationalState}
              onSendMessage={handleCustomerSendMessage}
              onRequestHuman={handleRequestHuman}
              onBack={() => setIsCustomerInsideChat(false)}
              customerName={userProfile?.displayName || 'Customer'}
            />
          ) : (
            <CustomerPortal
              conversations={conversations}
              isStarting={isStartingConversation}
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
          const roleLabel =
            profile.role === 'ADMIN'
              ? 'Administrator'
              : profile.role === 'SUPPORT_AGENT'
                ? 'Support Agent'
                : 'Customer';
          triggerAuthToast(
            'Signed In Successfully',
            `Welcome, ${profile.displayName}! Authenticated as ${roleLabel}.`,
            'success'
          );
          const path = window.location.pathname;
          const wantsSupport = path.startsWith('/support');
          const wantsAdmin = path.startsWith('/admin');
          if (profile.role === 'ADMIN') {
            navigateTo(wantsSupport ? '/support' : wantsAdmin ? '/admin' : '/', false, profile);
          } else if (profile.role === 'SUPPORT_AGENT') {
            navigateTo(wantsSupport ? '/support' : '/', false, profile);
          } else {
            navigateTo('/', false, profile);
          }
        }}
      />
    </div>
  );
}
