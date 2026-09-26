import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

export interface ResolutionResult {
  reply: string;
  canResolve: boolean;
  needsHuman: boolean;
  operationalState:
    | 'Reading request'
    | 'Checking support information'
    | 'Preparing response'
    | 'Waiting for customer'
    | 'Human assistance required';
  aiSummary: string;
  suggestedArticleIds: string[];
}

export interface ResolutionRequest {
  category?: string;
  title?: string;
  customerName?: string;
  messages?: Array<{ content: string; senderRole?: string; senderName?: string }>;
  knowledgeContext?: Array<{ id?: string; title: string; category: string; content: string }>;
}

/**
 * Model fallback chain: newest Gemini first, older/cheaper Gemini models next,
 * and a Gemma open model as the very last resort before the heuristic engine.
 * Override with RESOLVE_AI_MODELS=modelA,modelB,... in the environment.
 */
export const TEXT_MODEL_CHAIN: string[] = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemma-4-26b-a4b-it',
];

/** The single Gemma model used as the final in-chain fallback. */
export const LAST_RESORT_MODEL = 'gemma-4-26b-a4b-it';

const PER_MODEL_TIMEOUT_MS = 15000;
// The Gemma last resort is a large open model: measured ~23s per answer.
const GEMMA_TIMEOUT_MS = 45000;
const TOTAL_BUDGET_MS = 75000;

const VALID_STATES: ResolutionResult['operationalState'][] = [
  'Reading request',
  'Checking support information',
  'Preparing response',
  'Waiting for customer',
  'Human assistance required',
];

let envLoaded = false;
function ensureEnv(): void {
  if (envLoaded) return;
  envLoaded = true;
  // AI Studio injects GEMINI_API_KEY at runtime; locally it lives in .env.local / .env.
  dotenv.config({ path: '.env.local' });
  dotenv.config();
}

export function getApiKey(): string | undefined {
  ensureEnv();
  return process.env.GEMINI_API_KEY || undefined;
}

/** Load .env.local / .env into process.env at process start (idempotent). */
export function loadEnv(): void {
  ensureEnv();
}

function getModelChain(): string[] {
  ensureEnv();
  const override = process.env.RESOLVE_AI_MODELS;
  if (override && override.trim()) {
    const models = override.split(',').map((m) => m.trim()).filter(Boolean);
    if (models.length) return models;
  }
  return TEXT_MODEL_CHAIN;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

function errText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try { return JSON.stringify(err); } catch { return String(err); }
}

/** Key/permission problems: retrying other models is pointless, abort the chain. */
function isFatalKeyError(err: unknown): boolean {
  const msg = errText(err).toLowerCase();
  return (
    msg.includes('api key not valid') ||
    msg.includes('api_key_invalid') ||
    msg.includes('api key not') ||
    msg.includes('permission denied') ||
    msg.includes('unauthenticated') ||
    /(^|\D)401(\D|$)/.test(msg)
  );
}

export function buildResolutionPrompt(req: ResolutionRequest): string {
  const kbText = Array.isArray(req.knowledgeContext)
    ? req.knowledgeContext
        .map((k) => `[Article: ${k.title}]${k.id ? ` (ID: ${k.id})` : ''}\nCategory: ${k.category}\n${k.content}`)
        .join('\n\n')
    : 'Standard support documentation on file.';

  const transcript = Array.isArray(req.messages)
    ? req.messages.map((m) => `${m.senderRole || m.senderName || 'Customer'}: ${m.content}`).join('\n')
    : `Customer: ${req.title || 'Support Request'}`;

  return `You are ResolveAI, an understated, professional Customer Support Resolution Agent for Mohd Afnan Azhar.
Knowledge Base Context:
${kbText}

Conversation History:
Customer Name: ${req.customerName || 'Customer'}
Category: ${req.category || 'General'}
Title: ${req.title || 'Support Request'}

Transcript:
${transcript}

Task:
Analyze this support request.
1. Determine if the issue can be resolved autonomously via knowledge base, or if human assistance is required (needsHuman = true).
   - Needs human IF: requires financial refund execution, manual account entitlement provisioning, 2FA hardware bypass, security disputes, or explicit customer demand for a human agent.
   - Autonomous IF: general troubleshooting, how-to instructions, documentation steps, or policy clarification.
2. Provide a clean, direct, empathetic response. Do not use robotic jargon or buzzwords.
3. Provide a short 1-2 sentence operational summary for the human agent (e.g. "Customer reports payment deduction while subscription remains inactive.")

Respond ONLY with valid JSON in this schema:
{
  "reply": "string (your customer-facing response)",
  "canResolve": boolean,
  "needsHuman": boolean,
  "operationalState": "Reading request" | "Checking support information" | "Preparing response" | "Waiting for customer" | "Human assistance required",
  "aiSummary": "string (concise 1-2 sentence operational summary)",
  "suggestedArticleIds": ["string array of matching article IDs - copy them exactly from the (ID: ...) values in the knowledge base above"]
}`;
}

function extractJsonText(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('```')) {
    const withoutFence = trimmed.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '');
    return withoutFence;
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return trimmed.slice(start, end + 1);
}

function parseResolution(raw: string): ResolutionResult | null {
  const jsonText = extractJsonText(raw);
  if (!jsonText) return null;
  try {
    const data = JSON.parse(jsonText);
    if (!data || typeof data.reply !== 'string' || !data.reply.trim()) return null;

    const needsHuman = Boolean(data.needsHuman);
    const canResolve = typeof data.canResolve === 'boolean' ? data.canResolve : !needsHuman;
    const operationalState: ResolutionResult['operationalState'] = VALID_STATES.includes(data.operationalState)
      ? data.operationalState
      : needsHuman ? 'Human assistance required' : 'Waiting for customer';

    const suggestedArticleIds = Array.isArray(data.suggestedArticleIds)
      ? data.suggestedArticleIds.filter((id: unknown): id is string => typeof id === 'string').slice(0, 8)
      : [];

    return {
      reply: data.reply.trim(),
      canResolve,
      needsHuman,
      operationalState,
      aiSummary:
        typeof data.aiSummary === 'string' && data.aiSummary.trim()
          ? data.aiSummary.trim()
          : `Customer contacted support about ${'a listed category'}.`,
      suggestedArticleIds,
    };
  } catch {
    return null;
  }
}

async function callModel(ai: GoogleGenAI, model: string, prompt: string): Promise<string> {
  const isGemma = model.startsWith('gemma');
  // Open-weight Gemma models reject request config on this API (500 INTERNAL when
  // temperature/responseMimeType is set), so they get a bare call and we parse the
  // JSON out of their free-text answer ourselves.
  const config: Record<string, unknown> | undefined = isGemma
    ? undefined
    : { temperature: 0.2, responseMimeType: 'application/json' };

  const response = await withTimeout(
    ai.models.generateContent({ model, contents: prompt, ...(config ? { config } : {}) }),
    isGemma ? GEMMA_TIMEOUT_MS : PER_MODEL_TIMEOUT_MS,
    model
  );

  const text = response.text?.trim();
  if (!text) throw new Error(`${model} returned an empty response`);
  return text;
}

/**
 * Walks the model chain until one returns a usable structured answer.
 * Returns null when no model could serve the request (caller uses heuristics).
 */
export async function runResolutionModel(
  req: ResolutionRequest
): Promise<{ result: ResolutionResult; servedBy: string } | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.info('[ResolveAI] GEMINI_API_KEY not set - using heuristic engine');
    return null;
  }

  const chain = getModelChain();
  const startedAt = Date.now();
  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildResolutionPrompt(req);

  for (const model of chain) {
    if (Date.now() - startedAt > TOTAL_BUDGET_MS) {
      console.warn(`[ResolveAI] model budget exhausted after ${Date.now() - startedAt}ms - using heuristic engine`);
      return null;
    }

    try {
      const text = await callModel(ai, model, prompt);
      const parsed = parseResolution(text);
      if (parsed) {
        console.info(`[ResolveAI] served by ${model} in ${Date.now() - startedAt}ms`);
        return { result: parsed, servedBy: model };
      }
      console.warn(`[ResolveAI] ${model} returned unusable output - trying next model`);
    } catch (err) {
      console.warn(`[ResolveAI] ${model} failed: ${errText(err)}`);
      if (isFatalKeyError(err)) {
        console.error('[ResolveAI] API key rejected - aborting model chain');
        return null;
      }
    }
  }

  console.warn(`[ResolveAI] all ${chain.length} models failed - using heuristic engine`);
  return null;
}

/** Final offline layer: keyword-driven resolution when every model is down. */
export function heuristicResolve(req: ResolutionRequest): ResolutionResult {
  const transcript = (Array.isArray(req.messages) && req.messages.length
    ? req.messages.map((m) => `${m.senderRole || m.senderName || 'Customer'}: ${m.content}`).join('\n')
    : req.title || ''
  ).toLowerCase();

  const isHumanRequested =
    transcript.includes('human') ||
    transcript.includes('agent') ||
    transcript.includes('talk to someone') ||
    transcript.includes('real person');
  const isBillingEscalation =
    req.category === 'Billing' &&
    (transcript.includes('deduct') || transcript.includes('double') || transcript.includes('refund') || transcript.includes('charge'));
  const isAuthEscalation = transcript.includes('locked out') || transcript.includes('2fa');

  if (isHumanRequested || isBillingEscalation || isAuthEscalation) {
    return {
      reply:
        'I have noted the details of your request. Because this involves direct account intervention, I am connecting you directly with our support team. Your conversation is being transferred without interruption.',
      canResolve: false,
      needsHuman: true,
      operationalState: 'Human assistance required',
      aiSummary: `Customer reports ${String(req.category || 'support').toLowerCase()} issue requiring operational clearance: "${req.title || transcript.slice(0, 100)}".`,
      suggestedArticleIds: ['kb_payment_verification', 'kb_refund_policy'],
    };
  }

  return {
    reply:
      'Thank you for reaching out. Based on our support guidelines for ' +
      `${req.category || 'your inquiry'}, here are the steps to proceed:\n\n` +
      '1. Review the configuration under your account Settings dashboard.\n' +
      '2. Ensure your integration token and permissions match the required scopes.\n\n' +
      'Could you confirm if you have tested this in your staging environment?',
    canResolve: true,
    needsHuman: false,
    operationalState: 'Preparing response',
    aiSummary: `Customer inquired about ${req.category || 'general guidance'}. AI provided troubleshooting instructions.`,
    suggestedArticleIds: ['kb_team_workspaces', 'kb_webhook_troubleshooting'],
  };
}
