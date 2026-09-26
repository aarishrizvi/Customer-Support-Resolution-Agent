import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {runResolutionModel, heuristicResolve, loadEnv, type ResolutionRequest} from './src/lib/ai-engine.ts';

loadEnv();

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
            const request: ResolutionRequest = data;
            const aiOutcome = await runResolutionModel(request);

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;

            if (aiOutcome) {
              res.setHeader('X-ResolveAI-Model', aiOutcome.servedBy);
              res.end(JSON.stringify(aiOutcome.result));
              return;
            }

            res.end(JSON.stringify(heuristicResolve(request)));
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

