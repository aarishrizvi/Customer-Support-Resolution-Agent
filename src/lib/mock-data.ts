import { Conversation, KnowledgeArticle, CustomerProfile, Activity, Message } from '../types';

export const INITIAL_KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    id: 'kb_payment_verification',
    title: 'Payment Verification & Inactive Subscriptions',
    category: 'Billing',
    excerpt: 'Resolving cases where customer credit card or bank is charged but account entitlement remains pending or inactive.',
    content: `When a customer reports an unauthorized or pending charge where their account features remain locked:
1. Verify Stripe or payment processor transaction ID from the customer.
2. Cross-reference invoice timestamps with webhook delivery logs in the billing service.
3. If payment status shows 'succeeded' but provisioning webhook failed, trigger the 'Sync Entitlements' tool from the admin console.
4. If payment is in 'pending authorization' (common with 3D Secure bank checks), notify customer that clearance takes 2-4 hours.
5. In case of duplicate charge, process an immediate prorated refund to the original payment method and attach confirmation code to the ticket.`,
    tags: ['billing', 'payment', 'subscription', 'stripe', 'refund'],
    updatedAt: '2026-09-24T10:00:00Z',
    author: 'Mohd Afnan Azhar'
  },
  {
    id: 'kb_account_recovery',
    title: 'Account Recovery & 2FA Emergency Bypass',
    category: 'Account',
    excerpt: 'Security protocol for verifying identity when customer loses access to authentication devices.',
    content: `Identity verification protocol for 2FA recovery:
1. Request the primary account email and registered billing address zip code.
2. Confirm the last 4 digits of the payment method on file or the latest invoice number.
3. Once verified, generate a single-use 15-minute emergency recovery link.
4. Advise customer to re-enroll in WebAuthn or Authenticator app immediately upon login.
5. Never transmit raw passwords or temporary secrets over plain chat.`,
    tags: ['security', 'account', '2fa', 'recovery', 'login'],
    updatedAt: '2026-09-20T08:30:00Z',
    author: 'Mohd Afnan Azhar'
  },
  {
    id: 'kb_webhook_troubleshooting',
    title: 'Webhook Verification & HMAC SHA-256 Signature Errors',
    category: 'Technical',
    excerpt: 'Resolving payload validation errors and signature mismatch issues in API integrations.',
    content: `Troubleshooting API webhook signature mismatches:
1. Ensure the customer endpoint is reading the raw body buffer rather than parsed JSON prior to HMAC hashing.
2. The signature header 'x-resolve-signature' is computed using HMAC-SHA256 with the secret key found in Settings > Developer > Webhooks.
3. Check for clock drift between server and endpoint; timestamps older than 300 seconds are rejected to mitigate replay attacks.
4. Verify that TLS 1.3 is supported on the receiving webhook URL.`,
    tags: ['api', 'webhooks', 'developer', 'security', 'hmac'],
    updatedAt: '2026-09-18T14:20:00Z',
    author: 'Support Engineering'
  },
  {
    id: 'kb_refund_policy',
    title: 'Standard Refund Policy & Service Credit Matrix',
    category: 'Billing',
    excerpt: 'Eligibility criteria for refunds, prorated credits, and dispute resolution.',
    content: `ResolveAI Service Level Agreement and Refund Guidelines:
- Full refunds are granted automatically within 14 days of billing if usage volume remains under 10% of monthly quota.
- For service outages exceeding 99.9% uptime SLA, credit memos are issued at 10x the downtime duration value.
- Tier 1 agents have approval authority for refunds up to $100.
- Amounts exceeding $100 require escalation to Support Lead (Mohd Afnan Azhar).`,
    tags: ['refund', 'sla', 'credits', 'disputes'],
    updatedAt: '2026-09-15T11:00:00Z',
    author: 'Mohd Afnan Azhar'
  },
  {
    id: 'kb_team_workspaces',
    title: 'Managing Team Members & Role Permissions',
    category: 'General',
    excerpt: 'Inviting collaborators, assigning seat licenses, and setting granular RBAC permissions.',
    content: `To invite new team members to a ResolveAI workspace:
1. Navigate to Settings > Team Members.
2. Click 'Invite Member' and input their corporate email address.
3. Select an RBAC role: 'Admin' (full control), 'Agent' (manage customer tickets and queues), or 'Viewer' (read-only audit access).
4. Seat licenses automatically adjust on the next billing billing cycle.`,
    tags: ['team', 'seats', 'permissions', 'organization'],
    updatedAt: '2026-09-10T09:15:00Z',
    author: 'Support Team'
  }
];

export const INITIAL_CUSTOMERS: CustomerProfile[] = [
  {
    id: 'cust_sarah_khan',
    name: 'Sarah Khan',
    email: 'sarah.khan@example.com',
    tier: 'Enterprise',
    previousTicketsCount: 4,
    notes: 'CTO at Apex Logistics. Enterprise plan with dedicated SLA. Extremely high-priority stakeholder.',
    createdAt: '2025-11-12T00:00:00Z',
    company: 'Apex Logistics LLC',
    phone: '+1 (555) 349-8201'
  },
  {
    id: 'cust_marcus_vance',
    name: 'Marcus Vance',
    email: 'marcus.vance@company.io',
    tier: 'Pro',
    previousTicketsCount: 2,
    notes: 'Lead Integration Engineer. Manages webhook automated pipelines.',
    createdAt: '2026-02-04T00:00:00Z',
    company: 'Vance Dynamics',
    phone: '+1 (555) 672-9182'
  },
  {
    id: 'cust_elena_rostova',
    name: 'Elena Rostova',
    email: 'elena.rostova@techcorp.de',
    tier: 'Enterprise',
    previousTicketsCount: 7,
    notes: 'Procurement Director. Needs certified tax invoices for German accounting standards.',
    createdAt: '2025-08-19T00:00:00Z',
    company: 'TechCorp Europe GmbH',
    phone: '+49 89 2444 892'
  },
  {
    id: 'cust_david_chen',
    name: 'David Chen',
    email: 'david.chen@cloudscale.net',
    tier: 'Standard',
    previousTicketsCount: 1,
    notes: 'Standard self-serve plan. Evaluates team seat upgrade.',
    createdAt: '2026-08-01T00:00:00Z',
    company: 'CloudScale Net',
    phone: '+1 (555) 890-1290'
  }
];

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_1',
    customerId: 'cust_sarah_khan',
    customerName: 'Sarah Khan',
    customerEmail: 'sarah.khan@example.com',
    title: 'Payment deducted while subscription remains inactive',
    category: 'Billing',
    priority: 'HIGH',
    status: 'NEEDS_HUMAN',
    aiSummary: 'Customer reports a $249 payment deduction on Sep 24 while enterprise subscription features remain locked. Stripe transaction confirmed; manual entitlement sync required.',
    createdAt: '2026-09-25T10:14:00Z',
    updatedAt: '2026-09-25T10:19:00Z',
    lastMessageText: 'Can an agent please check my account directly? The charges went through my corporate card.',
    lastMessageTimestamp: '2026-09-25T10:19:00Z',
    suggestedArticles: ['kb_payment_verification', 'kb_refund_policy']
  },
  {
    id: 'conv_2',
    customerId: 'cust_marcus_vance',
    customerName: 'Marcus Vance',
    customerEmail: 'marcus.vance@company.io',
    title: 'Webhook signature validation fails with HMAC-SHA256',
    category: 'Technical',
    priority: 'MEDIUM',
    status: 'AI_HANDLING',
    aiSummary: 'Customer experiencing SHA-256 signature mismatch when ingesting webhook events in Node.js server. AI provided raw body parsing instructions.',
    createdAt: '2026-09-25T11:02:00Z',
    updatedAt: '2026-09-25T11:05:00Z',
    lastMessageText: 'I verified raw buffer parsing and will test with the updated secret now.',
    lastMessageTimestamp: '2026-09-25T11:05:00Z',
    suggestedArticles: ['kb_webhook_troubleshooting']
  },
  {
    id: 'conv_3',
    customerId: 'cust_elena_rostova',
    customerName: 'Elena Rostova',
    customerEmail: 'elena.rostova@techcorp.de',
    title: 'Urgent: Custom tax invoice and VAT registration update',
    category: 'Billing',
    priority: 'URGENT',
    status: 'ASSIGNED',
    assignedAgentId: 'agent_afnan',
    assignedAgentName: 'Mohd Afnan Azhar',
    aiSummary: 'Customer requires amended VAT reverse-charge invoice with German tax registration #DE99283120.',
    createdAt: '2026-09-25T09:30:00Z',
    updatedAt: '2026-09-25T09:45:00Z',
    lastMessageText: 'I will generate the amended EU reverse-charge invoice and email the PDF within 10 minutes.',
    lastMessageTimestamp: '2026-09-25T09:45:00Z',
    suggestedArticles: ['kb_refund_policy']
  },
  {
    id: 'conv_4',
    customerId: 'cust_david_chen',
    customerName: 'David Chen',
    customerEmail: 'david.chen@cloudscale.net',
    title: 'How do I invite team members to our workspace?',
    category: 'General',
    priority: 'LOW',
    status: 'RESOLVED',
    aiSummary: 'Customer asked how to add 3 new team members. AI resolved by providing navigation path and seat license info.',
    createdAt: '2026-09-24T16:10:00Z',
    updatedAt: '2026-09-24T16:14:00Z',
    lastMessageText: 'That was super quick and clear! All three members are added now. Thank you!',
    lastMessageTimestamp: '2026-09-24T16:14:00Z',
    suggestedArticles: ['kb_team_workspaces']
  }
];

export const INITIAL_MESSAGES: Record<string, Message[]> = {
  conv_1: [
    {
      id: 'm1_1',
      conversationId: 'conv_1',
      senderId: 'cust_sarah_khan',
      senderName: 'Sarah Khan',
      senderRole: 'CUSTOMER',
      content: 'Hello, our account was billed $249 this morning for the Enterprise renewal, but our team dashboard still says "Subscription Expired" and our API limits are throttled.',
      timestamp: '2026-09-25T10:14:00Z'
    },
    {
      id: 'm1_2',
      conversationId: 'conv_1',
      senderId: 'resolve_ai',
      senderName: 'ResolveAI',
      senderRole: 'AI',
      content: 'I can help with that. Could you provide your transaction reference number or the last 4 digits of the card used for the payment?',
      timestamp: '2026-09-25T10:15:30Z',
      operationalState: 'Reading request'
    },
    {
      id: 'm1_3',
      conversationId: 'conv_1',
      senderId: 'cust_sarah_khan',
      senderName: 'Sarah Khan',
      senderRole: 'CUSTOMER',
      content: 'Transaction ID is ch_3P92kK2eZvKYlo2C1gQ8xM9, billed to card ending in 8201.',
      timestamp: '2026-09-25T10:17:00Z'
    },
    {
      id: 'm1_4',
      conversationId: 'conv_1',
      senderId: 'resolve_ai',
      senderName: 'ResolveAI',
      senderRole: 'AI',
      content: 'I verified charge ch_3P92kK2eZvKYlo2C1gQ8xM9 was successfully captured. However, the automated entitlement sync encountered an authorization delay with your organization tenant. Because this requires manual account entitlement provisioning, I am transferring this conversation directly to our support operations queue.',
      timestamp: '2026-09-25T10:18:10Z',
      operationalState: 'Human assistance required'
    },
    {
      id: 'm1_5',
      conversationId: 'conv_1',
      senderId: 'system',
      senderName: 'System',
      senderRole: 'SYSTEM',
      content: 'Conversation dispatched to Support Agent Queue (Priority: HIGH)',
      timestamp: '2026-09-25T10:18:15Z'
    },
    {
      id: 'm1_6',
      conversationId: 'conv_1',
      senderId: 'cust_sarah_khan',
      senderName: 'Sarah Khan',
      senderRole: 'CUSTOMER',
      content: 'Can an agent please check my account directly? The charges went through my corporate card.',
      timestamp: '2026-09-25T10:19:00Z'
    }
  ],
  conv_2: [
    {
      id: 'm2_1',
      conversationId: 'conv_2',
      senderId: 'cust_marcus_vance',
      senderName: 'Marcus Vance',
      senderRole: 'CUSTOMER',
      content: 'Hey team, our webhook endpoint is rejecting ResolveAI events with invalid HMAC signature errors. We are using crypto.createHmac in Node.',
      timestamp: '2026-09-25T11:02:00Z'
    },
    {
      id: 'm2_2',
      conversationId: 'conv_2',
      senderId: 'resolve_ai',
      senderName: 'ResolveAI',
      senderRole: 'AI',
      content: 'In Node.js, the most common reason for HMAC SHA-256 signature failure is parsing the JSON payload before generating the digest. ResolveAI computes the signature over the verbatim raw body buffer.\n\nMake sure your Express middleware captures `req.rawBody` using `express.json({ verify: (req, res, buf) => req.rawBody = buf })`, and pass `req.rawBody` rather than `JSON.stringify(req.body)` to your hmac.update() call.',
      timestamp: '2026-09-25T11:03:30Z',
      operationalState: 'Checking support information'
    },
    {
      id: 'm2_3',
      conversationId: 'conv_2',
      senderId: 'cust_marcus_vance',
      senderName: 'Marcus Vance',
      senderRole: 'CUSTOMER',
      content: 'I verified raw buffer parsing and will test with the updated secret now.',
      timestamp: '2026-09-25T11:05:00Z'
    }
  ],
  conv_3: [
    {
      id: 'm3_1',
      conversationId: 'conv_3',
      senderId: 'cust_elena_rostova',
      senderName: 'Elena Rostova',
      senderRole: 'CUSTOMER',
      content: 'We need our Q3 enterprise invoice amended with our German VAT ID DE99283120 to claim reverse-charge tax credits before end of month.',
      timestamp: '2026-09-25T09:30:00Z'
    },
    {
      id: 'm3_2',
      conversationId: 'conv_3',
      senderId: 'system',
      senderName: 'System',
      senderRole: 'SYSTEM',
      content: 'Mohd Afnan Azhar joined the conversation',
      timestamp: '2026-09-25T09:35:00Z'
    },
    {
      id: 'm3_3',
      conversationId: 'conv_3',
      senderId: 'agent_afnan',
      senderName: 'Mohd Afnan Azhar',
      senderRole: 'AGENT',
      content: 'Hello Elena, I have taken over this ticket. I see your account details and the existing Q3 invoice. I will generate the amended EU reverse-charge invoice and email the PDF within 10 minutes.',
      timestamp: '2026-09-25T09:45:00Z'
    }
  ],
  conv_4: [
    {
      id: 'm4_1',
      conversationId: 'conv_4',
      senderId: 'cust_david_chen',
      senderName: 'David Chen',
      senderRole: 'CUSTOMER',
      content: 'How do I invite team members to our workspace?',
      timestamp: '2026-09-24T16:10:00Z'
    },
    {
      id: 'm4_2',
      conversationId: 'conv_4',
      senderId: 'resolve_ai',
      senderName: 'ResolveAI',
      senderRole: 'AI',
      content: 'You can invite teammates by going to **Settings > Team Members** and clicking **Invite Member**. Enter their email address and pick their role (Admin, Agent, or Viewer). They will receive an email invitation instantly to join your workspace.',
      timestamp: '2026-09-24T16:11:00Z',
      operationalState: 'Preparing response'
    },
    {
      id: 'm4_3',
      conversationId: 'conv_4',
      senderId: 'cust_david_chen',
      senderName: 'David Chen',
      senderRole: 'CUSTOMER',
      content: 'That was super quick and clear! All three members are added now. Thank you!',
      timestamp: '2026-09-24T16:14:00Z'
    },
    {
      id: 'm4_4',
      conversationId: 'conv_4',
      senderId: 'resolve_ai',
      senderName: 'ResolveAI',
      senderRole: 'AI',
      content: 'You are very welcome, David! Glad I could help. Let us know anytime if you need anything else.',
      timestamp: '2026-09-24T16:14:30Z',
      operationalState: 'Waiting for customer'
    }
  ]
};

export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 'act_1',
    conversationId: 'conv_1',
    type: 'DISPATCH',
    description: 'Conversation #conv_1 flagged by ResolveAI for human intervention (Insufficient confidence / Account Provisioning delay)',
    actorName: 'ResolveAI',
    actorRole: 'AI System',
    timestamp: '2026-09-25T10:18:15Z'
  },
  {
    id: 'act_2',
    conversationId: 'conv_3',
    type: 'HUMAN_JOINED',
    description: 'Mohd Afnan Azhar accepted and took conversation #conv_3',
    actorName: 'Mohd Afnan Azhar',
    actorRole: 'Support Lead',
    timestamp: '2026-09-25T09:35:00Z'
  },
  {
    id: 'act_3',
    conversationId: 'conv_4',
    type: 'STATUS_CHANGE',
    description: 'Ticket #conv_4 marked as RESOLVED by customer confirmation',
    actorName: 'ResolveAI',
    actorRole: 'AI System',
    timestamp: '2026-09-24T16:15:00Z'
  }
];
