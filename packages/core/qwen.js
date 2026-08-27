import { ModelProvider } from "./index.js";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";

export class OpenRouterProvider extends ModelProvider {
  constructor(model = DEFAULT_MODEL) {
    super({
      id: "openrouter",
      name: `OpenRouter / ${model}`,
      description: "OpenRouter API — open-weight models",
      isLocal: false,
    });

    this.model = model;
    this.apiKey = process.env.OPENROUTER_API_KEY ?? "";

    if (!this.apiKey) {
      console.warn("[openrouter] WARNING: OPENROUTER_API_KEY is not set.");
    }
  }

  async generate(messages, options = {}) {
    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: this._headers(),
        body: JSON.stringify(this._body(messages, options, false)),
        signal: AbortSignal.timeout(60_000),
      });

      if (!response.ok) {
        const err = await response.text().catch(() => response.statusText);
        return {
          ok: false,
          error: `OpenRouter error ${response.status}: ${err}`,
        };
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content ?? "";
      return { ok: true, text };
    } catch (err) {
      return { ok: false, error: err.message ?? String(err) };
    }
  }

  async *stream(messages, options = {}) {
    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: this._headers(),
        body: JSON.stringify(this._body(messages, options, true)),
        signal: AbortSignal.timeout(60_000),
      });

      if (!response.ok) {
        const error = await response.text().catch(() => response.statusText);
        throw new Error(`OpenRouter error ${response.status}: ${error}`);
      }

      yield* readSseText(response);
    } catch (err) {
      throw new Error(err.message ?? String(err));
    }
  }

  async healthCheck() {
    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
        headers: this._headers(),
        signal: AbortSignal.timeout(8_000),
      });
      return response.ok
        ? { ok: true }
        : { ok: false, error: `${response.status}` };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  _headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      "HTTP-Referer": "https://github.com/sufian45sufi-c/Fabion",
      "X-Title": "Fabion",
    };
  }

  _body(messages, options, stream) {
    return {
      model: this.model,
      messages,
      stream,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.7,
    };
  }
}

async function* readSseText(response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("OpenRouter returned no response stream");
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? "";
    for (const event of events) {
      const data = event
        .split(/\r?\n/)
        .find((line) => line.startsWith("data:"))
        ?.slice(5)
        .trim();
      if (!data || data === "[DONE]") continue;
      const chunk = JSON.parse(data).choices?.[0]?.delta?.content ?? "";
      if (chunk) yield chunk;
    }
  }
}
