import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import dotenv from 'dotenv';
import {GoogleGenAI} from '@google/genai';

dotenv.config();

function resolveAiApiPlugin(): Plugin {
  return {
    name: 'resolve-ai-api-middleware',
    configureServer(server) {
      server.middlewares.use('/api/ai/resolve', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const { category, title, customerName, messages, knowledgeContext } = data;

            const apiKey = process.env.GEMINI_API_KEY;

            // Prepare knowledge string
            const kbText = Array.isArray(knowledgeContext)
              ? knowledgeContext.map((k: any) => `[Article: ${k.title}]\nCategory: ${k.category}\n${k.content}`).join('\n\n')
              : 'Standard support documentation on file.';

            // Prepare conversation transcript
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
                res.statusCode = 200;
                res.end(text);
                return;
              } catch (aiErr) {
                console.warn('Gemini API call failed, falling back to heuristic engine:', aiErr);
              }
            }

            // High-fidelity heuristic resolution engine
            const lowerLast = (messages?.[messages.length - 1]?.content || title || '').toLowerCase();
            const lowerTranscript = transcript.toLowerCase();
            const isHumanRequested = lowerTranscript.includes('human') || lowerTranscript.includes('agent') || lowerTranscript.includes('talk to someone') || lowerTranscript.includes('real person');
            const isBillingEscalation = (category === 'Billing' && (lowerTranscript.includes('deduct') || lowerTranscript.includes('double') || lowerTranscript.includes('refund') || lowerTranscript.includes('charge')));
            const isAuthEscalation = lowerTranscript.includes('locked out') || lowerTranscript.includes('2fa');

            if (isHumanRequested || isBillingEscalation || isAuthEscalation) {
              const result = {
                reply: `I have noted the details of your request. Because this involves direct account intervention, I am connecting you directly with our support team. Your conversation is being transferred without interruption.`,
                canResolve: false,
                needsHuman: true,
                operationalState: 'Human assistance required',
                aiSummary: `Customer reports ${category?.toLowerCase() || 'support'} issue requiring operational clearance: "${title || messages?.[0]?.content?.slice(0, 100)}".`,
                suggestedArticleIds: ['kb_payment_verification', 'kb_refund_policy']
              };
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } else {
              const result = {
                reply: `Thank you for reaching out. Based on our support guidelines for ${category || 'your inquiry'}, here are the steps to proceed:\n\n1. Review the configuration under your account Settings dashboard.\n2. Ensure your integration token and permissions match the required scopes.\n\nCould you confirm if you have tested this in your staging environment?`,
                canResolve: true,
                needsHuman: false,
                operationalState: 'Preparing response',
                aiSummary: `Customer inquired about ${category || 'general guidance'}. AI provided troubleshooting instructions.`,
                suggestedArticleIds: ['kb_team_workspaces', 'kb_webhook_troubleshooting']
              };
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            }
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Internal AI error' }));
          }
        });
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), resolveAiApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

