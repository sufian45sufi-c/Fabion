import { ModelProvider } from './index.js';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL       = 'qwen/qwen-2.5-7b-instruct';

export class OpenRouterProvider extends ModelProvider {
  constructor(model = DEFAULT_MODEL) {
    super({
      id:          'openrouter',
      name:        `OpenRouter / ${model}`,
      description: 'OpenRouter API — open-weight models',
      isLocal:     false,
    });

    this.model  = model;
    this.apiKey = process.env.OPENROUTER_API_KEY ?? '';

    if (!this.apiKey) {
      console.warn('[openrouter] WARNING: OPENROUTER_API_KEY is not set.');
    }
  }

  async generate(messages, options = {}) {
    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method:  'POST',
        headers: this._headers(),
        body:    JSON.stringify(this._body(messages, options, false)),
        signal:  AbortSignal.timeout(60_000),
      });

      if (!response.ok) {
        const err = await response.text().catch(() => response.statusText);
        return { ok: false, error: `OpenRouter error ${response.status}: ${err}` };
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content ?? '';
      return { ok: true, text };

    } catch (err) {
      return { ok: false, error: err.message ?? String(err) };
    }
  }

  async *stream(messages, options = {}) {
    const result = await this.generate(messages, options);
    if (result.ok) yield result.text;
    else yield `[Error: ${result.error}]`;
  }

  async healthCheck() {
    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
        headers: this._headers(),
        signal:  AbortSignal.timeout(8_000),
      });
      return response.ok ? { ok: true } : { ok: false, error: `${response.status}` };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  _headers() {
    return {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer':  'https://github.com/sufian45sufi-c/Fabion',
      'X-Title':       'Fabion',
    };
  }

  _body(messages, options, stream) {
    return {
      model:       this.model,
      messages,
      stream,
      max_tokens:  options.maxTokens   ?? 2048,
      temperature: options.temperature ?? 0.7,
    };
  }
}
