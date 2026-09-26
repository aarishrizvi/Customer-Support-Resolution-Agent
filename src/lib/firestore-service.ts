import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  getDocs,
  limit
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { 
  Conversation, 
  Message, 
  KnowledgeArticle, 
  CustomerProfile, 
  Activity, 
  UserProfile, 
  UserRole,
  TicketCategory,
  Attachment 
} from '../types';
import { 
  INITIAL_KNOWLEDGE_ARTICLES, 
  INITIAL_CUSTOMERS, 
  INITIAL_ACTIVITIES,
  INITIAL_CONVERSATIONS,
  INITIAL_MESSAGES
} from './mock-data';
import { isAdminEmail } from './access-config';

// ==========================================
// User Profiles & Roles
// ==========================================

// Firestore can hang indefinitely when the backend is unreachable, which
// silently blocks routing. Always bound profile reads so the session resolves.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

// Firestore rejects a payload containing an explicitly `undefined` field with
// "Unsupported field value: undefined". Optional fields (attachments,
// internalNote, priority, ...) are passed as undefined all over the app, which
// silently failed every message write. Always route payloads through clean().
function clean<T extends Record<string, unknown>>(data: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) out[key] = value;
  }
  return out as T;
}

export async function getOrCreateUserProfile(user: User, initialDisplayName?: string): Promise<UserProfile> {
  const userDocRef = doc(db, 'users', user.uid);
  const allowlistedAdmin = isAdminEmail(user.email);
  const fallbackProfile: UserProfile = {
    uid: user.uid,
    email: user.email || '',
    displayName: initialDisplayName || user.displayName || user.email?.split('@')[0] || 'Customer',
    photoURL: user.photoURL || undefined,
    role: allowlistedAdmin ? 'ADMIN' : 'CUSTOMER',
    createdAt: new Date().toISOString()
  };

  try {
    const snap = await withTimeout(getDoc(userDocRef), 6000, 'Profile read');
    if (snap.exists()) {
      const data = snap.data();
      const storedRole = (data.role as UserRole) || 'CUSTOMER';
      const role: UserRole = allowlistedAdmin ? 'ADMIN' : storedRole;

      // Bootstrap / heal the admin allowlist: keep the stored doc in sync
      if (allowlistedAdmin && storedRole !== 'ADMIN') {
        await withTimeout(
          setDoc(userDocRef, {
            uid: user.uid,
            name: data.name || data.displayName || fallbackProfile.displayName,
            email: data.email || user.email || '',
            role: 'ADMIN',
            createdAt: data.createdAt || fallbackProfile.createdAt
          }, { merge: true }),
          6000,
          'Admin bootstrap write'
        ).catch((e) => console.warn('Admin bootstrap write pending:', e));
      }

      return {
        uid: user.uid,
        email: data.email || user.email || '',
        displayName: data.name || data.displayName || initialDisplayName || user.displayName || 'Customer',
        photoURL: user.photoURL || undefined,
        role,
        createdAt: data.createdAt || new Date().toISOString()
      };
    }

    // New Registration: MUST strictly be role: "CUSTOMER"
    // unless the email is on the trusted admin allowlist.
    await withTimeout(
      setDoc(userDocRef, {
        uid: fallbackProfile.uid,
        name: fallbackProfile.displayName,
        email: fallbackProfile.email,
        role: fallbackProfile.role,
        createdAt: fallbackProfile.createdAt
      }),
      6000,
      'Profile write'
    );

    return fallbackProfile;
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : String(err);
    // If Firestore reports client is offline or network is momentarily unavailable,
    // gracefully provide the authenticated user profile so sign-in does not fail
    if (errMsg.includes('offline') || errMsg.includes('unavailable') || errMsg.includes('network')) {
      console.warn('Firestore temporarily offline during profile fetch; continuing with authenticated session:', errMsg);
      // Attempt background write when connection reconnects
      setDoc(userDocRef, {
        uid: fallbackProfile.uid,
        name: fallbackProfile.displayName,
        email: fallbackProfile.email,
        role: fallbackProfile.role,
        createdAt: fallbackProfile.createdAt
      }).catch((e) => console.warn('Background profile save pending reconnection:', e));

      return fallbackProfile;
    }

    // Firestore never answered: proceed with the local access config instead of
    // hanging the whole session (this is what made /support and /admin look dead).
    if (errMsg.includes('timed out')) {
      console.warn('Firestore profile operation timed out; using local access config:', errMsg);
      return fallbackProfile;
    }

    // Never break the signed-in session over this: fall back to the client-side
    // access config so routes still work. Firestore rules remain the real
    // enforcement point for data access.
    if (
      errMsg.includes('permission') ||
      errMsg.includes('denied') ||
      errMsg.includes('insufficient') ||
      errMsg.includes('unauthenticated')
    ) {
      console.warn(
        'Firestore rejected the profile read/write. Publish firestore.rules to restore data access. Falling back to local access config:',
        errMsg
      );
      return fallbackProfile;
    }

    // Unexpected error: surface it, but still keep the session alive
    console.error('Unexpected error while loading user profile:', err);
    return fallbackProfile;
  }
}

export function subscribeToUserProfile(uid: string, callback: (profile: UserProfile | null) => void) {
  const userDocRef = doc(db, 'users', uid);
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const storedRole = (data.role as UserRole) || 'CUSTOMER';
        // Trust the signed-in account email too: an older doc may be missing
        // `email`, which would otherwise downgrade a valid admin to CUSTOMER.
        const allowlistedAdmin = isAdminEmail(data.email) || isAdminEmail(auth.currentUser?.email);
        callback({
          uid,
          email: data.email || auth.currentUser?.email || '',
          displayName: data.name || data.displayName || 'Customer',
          role: allowlistedAdmin ? 'ADMIN' : storedRole,
          createdAt: data.createdAt || new Date().toISOString()
        });
      } else {
        callback(null);
      }
    },
    (error) => {
      console.warn('Profile listener notice:', error.message);
    }
  );
}

// Admin CMS: real-time directory of every registered user.
// Firestore rules only allow this list query for ADMIN / SUPPORT_AGENT.
export function subscribeToAllUsers(callback: (users: UserProfile[]) => void) {
  const colRef = collection(db, 'users');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        users.push({
          uid: docSnap.id,
          email: d.email || '',
          displayName: d.name || d.displayName || 'Customer',
          photoURL: d.photoURL,
          role: isAdminEmail(d.email) ? 'ADMIN' : ((d.role as UserRole) || 'CUSTOMER'),
          createdAt: d.createdAt || new Date().toISOString()
        });
      });
      users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(users);
    },
    (error) => {
      console.warn('Users directory listener:', error.message);
      callback([]);
    }
  );
}

// Role grant / revoke. Server-side enforcement lives in firestore.rules:
// only an ADMIN (allowlist or role) may change a `role` field.
export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  const userDocRef = doc(db, 'users', uid);
  try {
    await updateDoc(userDocRef, { role });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    throw err;
  }
}

// ==========================================
// Conversations (Real-time Firestore)
// ==========================================

export function subscribeToConversations(
  userRole: UserRole,
  currentUid: string,
  callback: (conversations: Conversation[]) => void
) {
  const colRef = collection(db, 'conversations');
  
  // Customers only query their own conversations (enforced by rules)
  // Support agents query all conversations
  const q = userRole === 'CUSTOMER'
    ? query(colRef, where('customerId', '==', currentUid))
    : query(colRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    async (snapshot) => {
      const convs: Conversation[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        convs.push({
          id: docSnap.id,
          customerId: d.customerId,
          customerName: d.customerName || 'Customer',
          customerEmail: d.customerEmail || '',
          title: d.title || 'Support Request',
          category: d.category || 'General',
          priority: d.priority || 'MEDIUM',
          status: d.status || 'AI_HANDLING',
          handlerType: d.handlerType || (d.status === 'HUMAN_HANDLING' || d.status === 'ASSIGNED' ? 'HUMAN' : 'AI'),
          assignedAgentId: d.assignedAgentId,
          assignedAgentName: d.assignedAgentName,
          aiSummary: d.aiSummary,
          createdAt: d.createdAt || new Date().toISOString(),
          updatedAt: d.updatedAt || new Date().toISOString(),
          resolvedAt: d.resolvedAt,
          lastMessageText: d.lastMessageText || '',
          lastMessageTimestamp: d.lastMessageTimestamp || d.updatedAt || new Date().toISOString(),
          suggestedArticles: d.suggestedArticles || []
        });
      });

      // Sort client-side by updatedAt descending if Firestore query lacked compound index
      convs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      // If empty for support agents on initial database boot, auto-seed demo conversations
      if (convs.length === 0 && userRole === 'SUPPORT_AGENT') {
        try {
          await seedInitialFirestoreData();
        } catch (seedErr) {
          console.warn('Initial seeding note:', seedErr);
        }
      }

      callback(convs);
    },
    (error) => {
      // Listeners must never throw (it would break the React render loop):
      // surface the problem and hand the UI an empty list instead.
      console.warn('Conversations listener:', error.message, error.code || '');
      callback([]);
    }
  );
}

// ==========================================
// Messages (Real-time Firestore Subcollection)
// ==========================================

export function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void
) {
  const messagesColRef = collection(db, 'conversations', conversationId, 'messages');
  const q = query(messagesColRef, orderBy('timestamp', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        msgs.push({
          id: docSnap.id,
          conversationId,
          senderId: d.senderId,
          senderName: d.senderName,
          senderRole: d.senderRole,
          content: d.content,
          timestamp: d.timestamp || new Date().toISOString(),
          operationalState: d.operationalState,
          attachments: d.attachments,
          internalNote: d.internalNote
        });
      });
      callback(msgs);
    },
    (error) => {
      console.warn(`Messages listener for ${conversationId}:`, error.message);
      callback([]);
    }
  );
}

// Create new Conversation + initial Message
export async function createConversationInDb(params: {
  customerId: string;
  customerName: string;
  customerEmail: string;
  title: string;
  category: TicketCategory;
  initialMessageText: string;
}): Promise<string> {
  const convId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const now = new Date().toISOString();

  const convRef = doc(db, 'conversations', convId);
  const msgRef = doc(collection(db, 'conversations', convId, 'messages'));

  try {
    await setDoc(convRef, clean({
      customerId: params.customerId,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      title: params.title,
      category: params.category,
      priority: params.category === 'Billing' ? 'HIGH' : 'MEDIUM',
      status: 'AI_HANDLING',
      handlerType: 'AI',
      createdAt: now,
      updatedAt: now,
      lastMessageText: params.initialMessageText,
      lastMessageTimestamp: now,
      suggestedArticles: []
    }));

    await setDoc(msgRef, clean({
      conversationId: convId,
      senderId: params.customerId,
      senderName: params.customerName,
      senderRole: 'CUSTOMER',
      content: params.initialMessageText,
      timestamp: now
    }));

    return convId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `conversations/${convId}`);
    throw err;
  }
}

// Send a Message within a conversation
export async function sendMessageToDb(params: {
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: Message['senderRole'];
  content: string;
  operationalState?: Message['operationalState'];
  attachments?: Attachment[];
  internalNote?: boolean;
}): Promise<string> {
  const { conversationId, ...msgData } = params;
  const now = new Date().toISOString();
  const msgRef = doc(collection(db, 'conversations', conversationId, 'messages'));
  const convRef = doc(db, 'conversations', conversationId);

  try {
    await setDoc(msgRef, clean({
      conversationId,
      ...msgData,
      timestamp: now
    }));

    // If it is not an internal agent note, update conversation's lastMessage
    if (!params.internalNote) {
      await updateDoc(convRef, clean({
        lastMessageText: params.content,
        lastMessageTimestamp: now,
        updatedAt: now
      }));
    }

    return msgRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `conversations/${conversationId}/messages`);
    throw err;
  }
}

// Dispatch / AI State Update
export async function updateConversationAiState(params: {
  conversationId: string;
  status: Conversation['status'];
  aiSummary: string;
  suggestedArticles?: string[];
  replyMessage: string;
  operationalState?: Message['operationalState'];
}) {
  const { conversationId, status, aiSummary, suggestedArticles, replyMessage, operationalState } = params;
  const now = new Date().toISOString();
  const convRef = doc(db, 'conversations', conversationId);
  const msgRef = doc(collection(db, 'conversations', conversationId, 'messages'));

  try {
    // 1. Write AI reply message
    await setDoc(msgRef, clean({
      conversationId,
      senderId: 'resolve_ai',
      senderName: 'ResolveAI',
      senderRole: 'AI',
      content: replyMessage,
      timestamp: now,
      operationalState
    }));

    // 2. If needs human, write system notification divider
    if (status === 'NEEDS_HUMAN') {
      const sysMsgRef = doc(collection(db, 'conversations', conversationId, 'messages'));
      await setDoc(sysMsgRef, clean({
        conversationId,
        senderId: 'system',
        senderName: 'System',
        senderRole: 'SYSTEM',
        content: 'Conversation dispatched to Support Agent Queue (Priority: HIGH)',
        timestamp: now
      }));
    }

    // 3. Update conversation document
    await updateDoc(convRef, clean({
      status,
      handlerType: status === 'NEEDS_HUMAN' ? 'HUMAN' : 'AI',
      priority: status === 'NEEDS_HUMAN' ? 'HIGH' : undefined,
      aiSummary,
      suggestedArticles: suggestedArticles || [],
      lastMessageText: replyMessage,
      lastMessageTimestamp: now,
      updatedAt: now
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}`);
    throw err;
  }
}

// Support Agent Takes Conversation
export async function takeConversationInDb(params: {
  conversationId: string;
  agentId: string;
  agentName: string;
}) {
  const { conversationId, agentId, agentName } = params;
  const now = new Date().toISOString();
  const convRef = doc(db, 'conversations', conversationId);

  try {
    // 1. System divider
    const sysMsgRef = doc(collection(db, 'conversations', conversationId, 'messages'));
    await setDoc(sysMsgRef, clean({
      conversationId,
      senderId: 'system',
      senderName: 'System',
      senderRole: 'SYSTEM',
      content: `${agentName} joined the conversation`,
      timestamp: now
    }));

    // 2. Agent greeting
    const agentMsgRef = doc(collection(db, 'conversations', conversationId, 'messages'));
    const greeting = "I've reviewed your request and history. I'll take care of this for you.";
    await setDoc(agentMsgRef, clean({
      conversationId,
      senderId: agentId,
      senderName: agentName,
      senderRole: 'AGENT',
      content: greeting,
      timestamp: now
    }));

    // 3. Update conversation record
    await updateDoc(convRef, clean({
      status: 'HUMAN_HANDLING',
      handlerType: 'HUMAN',
      assignedAgentId: agentId,
      assignedAgentName: agentName,
      lastMessageText: greeting,
      lastMessageTimestamp: now,
      updatedAt: now
    }));

    // 4. Log Activity
    await logActivityToDb({
      conversationId,
      type: 'HUMAN_JOINED',
      description: `${agentName} accepted and took conversation #${conversationId.slice(-6)}`,
      actorName: agentName,
      actorRole: 'Support Lead'
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}`);
    throw err;
  }
}

// Resolve Conversation
export async function resolveConversationInDb(params: {
  conversationId: string;
  agentName: string;
}) {
  const { conversationId, agentName } = params;
  const now = new Date().toISOString();
  const convRef = doc(db, 'conversations', conversationId);
  const sysMsgRef = doc(collection(db, 'conversations', conversationId, 'messages'));

  try {
    await setDoc(sysMsgRef, clean({
      conversationId,
      senderId: 'system',
      senderName: 'System',
      senderRole: 'SYSTEM',
      content: `Ticket marked as Resolved by ${agentName}`,
      timestamp: now
    }));

    await updateDoc(convRef, clean({
      status: 'RESOLVED',
      resolvedAt: now,
      updatedAt: now
    }));

    await logActivityToDb({
      conversationId,
      type: 'STATUS_CHANGE',
      description: `Ticket #${conversationId.slice(-6)} marked as RESOLVED by ${agentName}`,
      actorName: agentName,
      actorRole: 'Support Lead'
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}`);
    throw err;
  }
}

// Request Human Assistance (from Customer Side)
export async function requestHumanInDb(conversationId: string, customerName: string) {
  const now = new Date().toISOString();
  const convRef = doc(db, 'conversations', conversationId);

  try {
    // 1. System divider
    const sysMsgRef = doc(collection(db, 'conversations', conversationId, 'messages'));
    await setDoc(sysMsgRef, clean({
      conversationId,
      senderId: 'system',
      senderName: 'System',
      senderRole: 'SYSTEM',
      content: 'Customer requested human support agent assistance',
      timestamp: now
    }));

    // 2. AI handoff note
    const aiMsgRef = doc(collection(db, 'conversations', conversationId, 'messages'));
    const text = "I have transferred this conversation to our support operations queue. A support agent will review your history and join shortly.";
    await setDoc(aiMsgRef, clean({
      conversationId,
      senderId: 'resolve_ai',
      senderName: 'ResolveAI',
      senderRole: 'AI',
      content: text,
      timestamp: now
    }));

    // 3. Update Conversation
    await updateDoc(convRef, clean({
      status: 'NEEDS_HUMAN',
      handlerType: 'HUMAN',
      priority: 'HIGH',
      lastMessageText: text,
      lastMessageTimestamp: now,
      updatedAt: now
    }));

    await logActivityToDb({
      conversationId,
      type: 'DISPATCH',
      description: `Customer requested manual escalation on #${conversationId.slice(-6)}`,
      actorName: customerName,
      actorRole: 'Customer'
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}`);
    throw err;
  }
}

// ==========================================
// Knowledge Base (Firestore)
// ==========================================

export function subscribeToKnowledgeBase(callback: (articles: KnowledgeArticle[]) => void) {
  const colRef = collection(db, 'knowledgeBase');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const articles: KnowledgeArticle[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        articles.push({
          id: docSnap.id,
          title: d.title,
          category: d.category,
          excerpt: d.excerpt,
          content: d.content,
          tags: d.tags || [],
          updatedAt: d.updatedAt || new Date().toISOString(),
          author: d.author || 'Support Operations'
        });
      });
      callback(articles.length > 0 ? articles : INITIAL_KNOWLEDGE_ARTICLES);
    },
    (err) => {
      console.warn('KnowledgeBase listener:', err.message);
      callback(INITIAL_KNOWLEDGE_ARTICLES);
    }
  );
}

export async function addKnowledgeArticleToDb(article: Omit<KnowledgeArticle, 'id' | 'updatedAt'>) {
  const colRef = collection(db, 'knowledgeBase');
  const now = new Date().toISOString();
  try {
    await addDoc(colRef, clean({
      ...article,
      updatedAt: now
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'knowledgeBase');
  }
}

export async function updateKnowledgeArticleInDb(id: string, updates: Partial<KnowledgeArticle>) {
  const docRef = doc(db, 'knowledgeBase', id);
  try {
    await updateDoc(docRef, clean({
      ...updates,
      updatedAt: new Date().toISOString()
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `knowledgeBase/${id}`);
  }
}

// ==========================================
// Customers & Activities
// ==========================================

export function subscribeToCustomers(callback: (customers: CustomerProfile[]) => void) {
  const colRef = collection(db, 'customers');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const custs: CustomerProfile[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        custs.push({
          id: docSnap.id,
          name: d.name,
          email: d.email,
          tier: d.tier || 'Standard',
          previousTicketsCount: d.previousTicketsCount ?? 0,
          notes: d.notes || '',
          createdAt: d.createdAt || new Date().toISOString(),
          company: d.company,
          phone: d.phone
        });
      });
      callback(custs.length > 0 ? custs : INITIAL_CUSTOMERS);
    },
    (err) => {
      console.warn('Customers listener:', err.message);
      callback(INITIAL_CUSTOMERS);
    }
  );
}

export function subscribeToActivities(callback: (activities: Activity[]) => void) {
  const colRef = collection(db, 'activities');
  const q = query(colRef, orderBy('timestamp', 'desc'), limit(50));

  return onSnapshot(
    q,
    (snapshot) => {
      const acts: Activity[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        acts.push({
          id: docSnap.id,
          conversationId: d.conversationId,
          type: d.type,
          description: d.description,
          actorName: d.actorName,
          actorRole: d.actorRole,
          timestamp: d.timestamp || new Date().toISOString()
        });
      });
      callback(acts.length > 0 ? acts : INITIAL_ACTIVITIES);
    },
    (err) => {
      console.warn('Activities listener:', err.message);
      callback(INITIAL_ACTIVITIES);
    }
  );
}

export async function logActivityToDb(act: Omit<Activity, 'id' | 'timestamp'>) {
  const colRef = collection(db, 'activities');
  try {
    await addDoc(colRef, clean({
      ...act,
      timestamp: new Date().toISOString()
    }));
  } catch (err) {
    // Non-fatal logging
    console.warn('Failed to log activity to Firestore:', err);
  }
}

// One-time initial seeding for empty projects
async function seedInitialFirestoreData() {
  try {
    // Seed initial KB articles
    for (const art of INITIAL_KNOWLEDGE_ARTICLES) {
      await setDoc(doc(db, 'knowledgeBase', art.id), clean({
        title: art.title,
        category: art.category,
        excerpt: art.excerpt,
        content: art.content,
        tags: art.tags,
        updatedAt: art.updatedAt,
        author: art.author
      }));
    }

    // Seed initial Customers
    for (const cust of INITIAL_CUSTOMERS) {
      await setDoc(doc(db, 'customers', cust.id), clean({
        name: cust.name,
        email: cust.email,
        tier: cust.tier,
        previousTicketsCount: cust.previousTicketsCount,
        notes: cust.notes,
        createdAt: cust.createdAt,
        company: cust.company,
        phone: cust.phone
      }));
    }

    // Seed initial Activities
    for (const act of INITIAL_ACTIVITIES) {
      await setDoc(doc(db, 'activities', act.id), clean({
        conversationId: act.conversationId,
        type: act.type,
        description: act.description,
        actorName: act.actorName,
        actorRole: act.actorRole,
        timestamp: act.timestamp
      }));
    }
  } catch (e) {
    console.warn('Seed operation completed or skipped:', e);
  }
}
