export type UserRole = 'CUSTOMER' | 'SUPPORT_AGENT' | 'ADMIN';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  createdAt: string;
}

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TicketCategory = 'Billing' | 'Account' | 'Technical' | 'Orders' | 'General';

export type TicketStatus = 
  | 'AI_HANDLING' 
  | 'WAITING_FOR_CUSTOMER'
  | 'WAITING_CUSTOMER'
  | 'NEEDS_HUMAN' 
  | 'HUMAN_HANDLING'
  | 'ASSIGNED' 
  | 'RESOLVED'
  | 'ESCALATED';

export type HandlerType = 'AI' | 'HUMAN';

export type MessageRole = 'CUSTOMER' | 'AI' | 'AGENT' | 'SYSTEM';

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  url?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: MessageRole;
  content: string;
  timestamp: string;
  operationalState?: 'Reading request' | 'Checking support information' | 'Preparing response' | 'Waiting for customer' | 'Human assistance required';
  attachments?: Attachment[];
  internalNote?: boolean;
}

export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  handlerType?: HandlerType;
  assignedAgentId?: string;
  assignedAgentName?: string;
  aiSummary?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  lastMessageText: string;
  lastMessageTimestamp: string;
  unreadCountCustomer?: number;
  unreadCountAgent?: number;
  suggestedArticles?: string[];
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: TicketCategory;
  excerpt: string;
  content: string;
  tags: string[];
  updatedAt: string;
  author: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  tier: 'Enterprise' | 'Pro' | 'Standard';
  previousTicketsCount: number;
  notes: string;
  createdAt: string;
  company?: string;
  phone?: string;
}

export interface Activity {
  id: string;
  conversationId: string;
  type: 'DISPATCH' | 'HUMAN_JOINED' | 'STATUS_CHANGE' | 'AI_REPLIED' | 'NOTE_ADDED' | 'CHAT_ALERT';
  description: string;
  actorName: string;
  actorRole: string;
  timestamp: string;
}

export interface GoogleChatSpace {
  name: string;
  displayName: string;
  spaceType?: string;
}

export interface CSATResponse {
  id: string;
  customerEmail: string;
  rating: number; // 1-5
  comment: string;
  ticketId: string;
  submittedAt: string;
}
