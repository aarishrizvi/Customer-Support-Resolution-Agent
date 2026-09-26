# ResolveAI — Customer Support Resolution Agent

A React + Vite + TypeScript application for AI-assisted customer support with human handoff capabilities. Built with Firebase Authentication, Cloud Firestore, and Google Gemini AI.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4 |
| Auth & DB | Firebase Auth, Cloud Firestore |
| AI | Google Gemini (via `@google/genai`) |
| Server | Express (serves built app + AI endpoint) |

---

## Project Structure

```
src/
├── App.tsx                    # Root component: routing, auth, data subscriptions
├── main.tsx                   # Entry point
├── types.ts                   # Shared TypeScript interfaces
├── index.css                  # Tailwind imports + global styles
│
├── components/
│   ├── Header.tsx             # Top nav: mode switch, user menu, auth trigger
│   ├── auth/
│   │   └── AuthModal.tsx      # Login / Register / Forgot password + Google OAuth
│   ├── customer/
│   │   ├── CustomerPortal.tsx # Conversation list + "New Conversation" entry
│   │   └── CustomerConversation.tsx  # Chat view for active conversation
│   ├── agent/
│   │   ├── AgentConsole.tsx   # Support dashboard: queue, conversation, KB
│   │   ├── AgentConversationView.tsx  # Agent-side chat with internal notes
│   │   ├── QueueSidebar.tsx   # Left sidebar: filters, stats, conversation list
│   │   ├── KnowledgeBaseView.tsx      # KB management (CRUD)
│   │   ├── CustomersView.tsx          # Customer directory
│   │   ├── ActivityView.tsx           # Audit log
│   │   ├── CustomerContextPanel.tsx   # Right panel: customer info, KB suggestions
│   │   ├── DispatchMatrixView.tsx     # (Placeholder) routing matrix
│   │   └── GoogleWorkspaceHub.tsx     # (Placeholder) Google Chat integration
│   ├── admin/
│   │   └── AdminConsole.tsx   # User directory + role management (ADMIN only)
│   └── shared/
│       └── ConfirmModal.tsx   # Reusable confirmation dialog
│
├── lib/
│   ├── firebase.ts            # Firebase init (Auth, Firestore) + auth helpers
│   ├── firestore-service.ts   # All Firestore reads/writes + real-time listeners
│   ├── ai-service.ts          # Client-side AI request wrapper (/api/ai/resolve)
│   ├── ai-engine.ts           # Server-side: model chain, prompt, fallback logic
│   ├── access-config.ts       # Admin email allowlist (bootstrap)
│   ├── backend-status.ts      # Firestore connectivity probe + friendly errors
│   ├── mock-data.ts           # Seed data for empty projects
│   └── workspace.ts           # (Unused) Google Workspace helpers
│
├── server.ts                  # Express server: serves dist + /api/ai/resolve
│
├── firestore.rules            # Security rules (deploy to Firebase Console)
├── firebase-blueprint.json    # Data model schema (reference only)
├── .env.example               # Environment variable template
└── vite.config.ts             # Vite + Tailwind config
```

---

## Core Modules

### 1. Authentication (`src/lib/firebase.ts`)

- **Firebase Auth** initialization with email/password + Google OAuth
- Exported helpers:
  - `signInWithEmail(email, password)`
  - `registerWithEmail(email, password, displayName)` → creates **CUSTOMER** only
  - `resetPassword(email)`
  - `googleSignIn()`
  - `logout()`
  - `initAuth(onSuccess, onFailure)` — global auth state listener

### 2. Firestore Service (`src/lib/firestore-service.ts`)

All database operations. Uses real-time listeners (`onSnapshot`) for live UI.

**User Profiles**
- `getOrCreateUserProfile(user, displayName?)` — creates `/users/{uid}` with `role: "CUSTOMER"` on first sign-in
- `subscribeToUserProfile(uid, callback)` — real-time profile updates
- `subscribeToAllUsers(callback)` — admin directory (ADMIN only)
- `setUserRole(uid, role)` — ADMIN only, enforced by rules

**Conversations**
- `subscribeToConversations(role, uid, callback)` — filtered by role
- `subscribeToMessages(conversationId, callback)` — real-time messages
- `createConversationInDb(params)` — new thread + initial message
- `sendMessageToDb(params)` — add message, update conversation `lastMessage`
- `updateConversationAiState(params)` — AI reply + status transition
- `takeConversationInDb(params)` — agent takeover (system msg + greeting)
- `resolveConversationInDb(params)` — mark RESOLVED
- `requestHumanInDb(conversationId, customerName)` — escalate to queue

**Knowledge Base**
- `subscribeToKnowledgeBase(callback)`
- `addKnowledgeArticleToDb(article)`
- `updateKnowledgeArticleInDb(id, updates)`

**Customers & Activities**
- `subscribeToCustomers(callback)` — CRM directory (agents)
- `subscribeToActivities(callback)` — audit log (agents)
- `logActivityToDb(activity)` — write audit entry

### 3. AI Resolution (`src/lib/ai-service.ts` + `src/lib/ai-engine.ts`)

**Client** (`ai-service.ts`): POSTs to `/api/ai/resolve` with conversation context.

**Server** (`ai-engine.ts`): Model fallback chain:
```
gemini-3.8-flash → gemini-3.7-flash → ... → gemma-4-26b-a4b-it → heuristic fallback
```
Returns structured JSON:
```ts
{
  reply: string,
  canResolve: boolean,
  needsHuman: boolean,
  operationalState: 'Reading request' | 'Checking support information' | 'Preparing response' | 'Waiting for customer' | 'Human assistance required',
  aiSummary: string,
  suggestedArticleIds: string[]
}
```

**Failure resilience**: If AI fails, conversation status → `NEEDS_HUMAN`, friendly message sent, ticket queued for agents.

### 4. Routing & Access Control (`src/App.tsx`)

- **CUSTOMER** → `/` (CustomerPortal / CustomerConversation)
- **SUPPORT_AGENT** → `/support` (AgentConsole)
- **ADMIN** → `/admin` (AdminConsole)

Route protection enforced in `navigateTo()` using `userProfile.role` from Firestore (not just frontend state).

### 5. Security Rules (`firestore.rules`)

- Default deny
- Customers: own user doc, own conversations/messages
- Agents: all conversations, messages for assigned threads
- Admins: full access + role changes
- Public registration → `role: "CUSTOMER"` only

---

## Environment Variables

Copy `.env.example` → `.env.local` and fill:

```env
# Firebase (from Firebase Console > Project Settings > Web App)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Gemini AI (from https://aistudio.google.com/apikey)
GEMINI_API_KEY=

# Optional
# RESOLVE_AI_MODELS=gemini-3.8-flash,gemini-3.7-flash
# APP_URL=https://your-domain.com
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Copy env template and add your keys
cp .env.example .env.local

# Development (frontend + backend)
npm run dev        # Vite on :3000
npm run start      # Express server on :3000 (serves dist + API)

# Production build
npm run build

# Type check
npm run lint
```

---

## Firebase Console Setup (One-time)

1. **Create Firestore Database** → Native mode → `(default)` database
2. **Publish Rules**: Copy `firestore.rules` → Firebase Console → Firestore → Rules → Publish
3. **Authentication** → Enable Email/Password + Google providers
4. **Authorized Domains** → Add your deployment URL
5. **Update Admin Email** in `src/lib/access-config.ts` and `firestore.rules` (line 15)

---

## Data Flow Summary

```
Customer creates conversation
         │
         ▼
    AI_HANDLING  ──(can resolve)──→ WAITING_FOR_CUSTOMER ──(follow-up)──→ AI_HANDLING
         │
         └──(needs human)──→ NEEDS_HUMAN ──→ Support Queue
                                             │
                                             ▼
                                    Agent takes → HUMAN_HANDLING
                                             │
                                             ▼
                                        RESOLVED
```

All messages persist in Firestore. Real-time listeners keep both sides in sync without refresh.

---

## License

MIT