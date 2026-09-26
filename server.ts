import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { runResolutionModel, heuristicResolve, loadEnv, type ResolutionRequest } from './src/lib/ai-engine';

loadEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Server-side AI Resolution Endpoint (model chain -> heuristic fallback)
app.post('/api/ai/resolve', async (req, res) => {
  try {
    const request: ResolutionRequest = req.body || {};
    const aiOutcome = await runResolutionModel(request);

    if (aiOutcome) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-ResolveAI-Model', aiOutcome.servedBy);
      return res.status(200).json(aiOutcome.result);
    }

    return res.status(200).json(heuristicResolve(request));
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
