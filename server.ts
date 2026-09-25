import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Server-side AI Resolution Endpoint
app.post('/api/ai/resolve', async (req, res) => {
  try {
    const { category, title, customerName, messages, knowledgeContext } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    const kbText = Array.isArray(knowledgeContext)
      ? knowledgeContext.map((k: any) => `[Article: ${k.title}]\nCategory: ${k.category}\n${k.content}`).join('\n\n')
      : 'Standard support documentation on file.';

    const transcript = Array.isArray(messages)
      ? messages.map((m: any) => `${m.senderRole || m.senderName}: ${m.content}`).join('\n')
      : `Customer: ${title}`;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are ResolveAI, an understated, professional Customer Support Resolution Agent for Mohd Afnan Azhar.
Knowledge Base Context:
${kbText}

Conversation History:
Customer Name: ${customerName || 'Customer'}
Category: ${category || 'General'}
Title: ${title || 'Support Request'}

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
  "suggestedArticleIds": ["string array of matching article IDs"]
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          }
        });

        const text = response.text?.trim() || '{}';
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).send(text);
      } catch (aiErr) {
        console.warn('Gemini API call failed, falling back to heuristic engine:', aiErr);
      }
    }

    // Heuristic fallback
    const lowerTranscript = transcript.toLowerCase();
    const isHumanRequested = lowerTranscript.includes('human') || lowerTranscript.includes('agent') || lowerTranscript.includes('talk to someone');
    const isBillingEscalation = (category === 'Billing' && (lowerTranscript.includes('deduct') || lowerTranscript.includes('double') || lowerTranscript.includes('refund')));

    if (isHumanRequested || isBillingEscalation) {
      return res.status(200).json({
        reply: `I have noted the details of your request. Because this involves direct account intervention, I am connecting you directly with our support team. Your conversation is being transferred without interruption.`,
        canResolve: false,
        needsHuman: true,
        operationalState: 'Human assistance required',
        aiSummary: `Customer reports ${category?.toLowerCase() || 'support'} issue requiring operational clearance: "${title}".`,
        suggestedArticleIds: ['kb_payment_verification', 'kb_refund_policy']
      });
    }

    return res.status(200).json({
      reply: `Thank you for reaching out. Based on our support guidelines for ${category || 'your inquiry'}, here are the steps to proceed:\n\n1. Review the configuration under your account Settings dashboard.\n2. Ensure your integration token and permissions match the required scopes.\n\nCould you confirm if you have tested this in your staging environment?`,
      canResolve: true,
      needsHuman: false,
      operationalState: 'Preparing response',
      aiSummary: `Customer inquired about ${category || 'general guidance'}. AI provided troubleshooting instructions.`,
      suggestedArticleIds: ['kb_team_workspaces', 'kb_webhook_troubleshooting']
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal AI error' });
  }
});

// Serve frontend dist
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ResolveAI Operations Server listening on port ${PORT}`);
});
