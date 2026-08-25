import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  const env = readFileSync(join(__dirname, '../../.env'), 'utf8');
  for (const line of env.split('\n')) {
    const [key, ...val] = line.split('=');
    if (key?.trim() && val.length) process.env[key.trim()] = val.join('=').trim();
  }
} catch {}

import { FabionAgent }        from '../../packages/agents/index.js';
import { OpenRouterProvider }  from '../../packages/core/qwen.js';
import { FabionTUI }           from './tui/app.js';

const model = new OpenRouterProvider();
const agent = new FabionAgent({ model, tools: [], skills: [] });
const tui   = new FabionTUI({ agent, modelName: model.name });

await tui.start();
