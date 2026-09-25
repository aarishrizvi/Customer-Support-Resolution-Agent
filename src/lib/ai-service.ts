import { Message, KnowledgeArticle } from '../types';

export interface AIResolutionResult {
  reply: string;
  canResolve: boolean;
  needsHuman: boolean;
  operationalState: 'Reading request' | 'Checking support information' | 'Preparing response' | 'Waiting for customer' | 'Human assistance required';
  aiSummary: string;
  suggestedArticleIds: string[];
}

export async function requestAIResolution(params: {
  conversationId: string;
  category: string;
  title: string;
  customerName: string;
  messages: Message[];
  knowledgeContext?: KnowledgeArticle[];
}): Promise<AIResolutionResult> {
  try {
    const res = await fetch('/api/ai/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      throw new Error(`AI service responded with HTTP ${res.status}`);
    }

    const data: AIResolutionResult = await res.json();
    return data;
  } catch (error) {
    console.warn('Fallback to local resolution handler:', error);
    // Graceful offline fallback
    const lastMsg = params.messages[params.messages.length - 1]?.content.toLowerCase() || '';
    const needsAgent = lastMsg.includes('human') || lastMsg.includes('agent') || lastMsg.includes('refund') || lastMsg.includes('charge') || params.category === 'Billing';

    if (needsAgent) {
      return {
        reply: "I understand the urgency of this issue. To resolve this accurately, I've routed this conversation directly to our support operations queue. A human agent will join shortly.",
        canResolve: false,
        needsHuman: true,
        operationalState: 'Human assistance required',
        aiSummary: `Customer reports an issue requiring account intervention: "${params.title}"`,
        suggestedArticleIds: ['kb_payment_verification']
      };
    }

    return {
      reply: `I can help with that. Based on standard resolution procedures for ${params.category}, please verify that your settings are up to date and let me know if you would like me to review the logs.`,
      canResolve: true,
      needsHuman: false,
      operationalState: 'Waiting for customer',
      aiSummary: `Customer asked about ${params.category}. Initial instructions provided.`,
      suggestedArticleIds: ['kb_team_workspaces']
    };
  }
}
