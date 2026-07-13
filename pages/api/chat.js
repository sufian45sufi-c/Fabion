import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const rateLimitStore = new Map();
const MAX_PER_MINUTE = 10;
const MAX_PER_DAY = 150;

function checkRateLimit(userId) {
  const now = Date.now();
  let entry = rateLimitStore.get(userId);
  if (!entry) {
    entry = { minuteCount: 0, minuteReset: now + 60_000, dayCount: 0, dayReset: now + 86_400_000 };
  }
  if (now > entry.minuteReset) {
    entry.minuteCount = 0;
    entry.minuteReset = now + 60_000;
  }
  if (now > entry.dayReset) {
    entry.dayCount = 0;
    entry.dayReset = now + 86_400_000;
  }
  if (entry.minuteCount >= MAX_PER_MINUTE) {
    rateLimitStore.set(userId, entry);
    return { allowed: false, reason: "Too many messages. Please wait a moment." };
  }
  if (entry.dayCount >= MAX_PER_DAY) {
    rateLimitStore.set(userId, entry);
    return { allowed: false, reason: "Daily message limit reached. Try again tomorrow." };
  }
  entry.minuteCount += 1;
  entry.dayCount += 1;
  rateLimitStore.set(userId, entry);
  return { allowed: true };
}

const EFFORT_MODEL_MAP = {
  low: "llama-3.3-70b-versatile",
  medium: "llama-3.3-70b-versatile",
  high: "llama-3.3-70b-versatile",
  extra: "openai/gpt-oss-120b",
  max: "openai/gpt-oss-120b",
};

const PERSONA_MODEL_OVERRIDE = {
  kimi: "openai/gpt-oss-120b",
};

function getCurrentDateContext() {
  const now = new Date();
  const formatted = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `Today's real date is ${formatted}. Your internal training data has a cutoff earlier than today. Always trust this stated date over your own assumptions.`;
}

const FORMATTING_INSTRUCTIONS = `
Formatting rules:
- Use standard markdown: **bold**, headers (##), lists, tables, [text](url) links.
- Only use fenced code blocks for genuine source code, config files, or commands — never for narrating what a tool call would look like.
- ABSOLUTE RULE: You must NEVER write text like web_search(...) as visible content in your response. If you need to search, you call it through the actual function-calling mechanism — you never type it out as words or code.
`;

const TOOL_USE_RULES = `
Tool use rules — follow strictly:
- If the user asks about current events, prices, recent news, or anything time-sensitive, or explicitly asks you to search or look something up, you MUST call the web_search function directly through the tool-calling mechanism — never as text, never skipped.
- For casual conversation, greetings, or questions you already know confidently, do NOT call the tool — just respond directly.
`;

const PERSONA_PROMPTS = {
  thread: `You are Thread 1.0, Fabion's ultra-fast model. For casual questions: quick, warm, natural. For code: precise, technical, no fluff. Never open with "Sure!" — start directly with the answer.`,
  pixel: `You are Pixel 1.0, Fabion's senior full-stack engineering specialist. Casual questions: friendly and natural. Coding tasks: correct, idiomatic, production-quality code, declared language in fenced blocks, brief approach before code and tradeoffs after, no emojis while coding.`,
  cell: `You are Cell 1.0, Fabion's creative and multi-step reasoning model. Casual/creative questions: warm and thoughtful. Complex requests: work through stages, consider multiple angles. Code: precise, no casualness.`,
  kimi: `You are Kimi K2, Fabion's agentic coding specialist, powered by GPT-OSS 120B. Casual questions: friendly and natural. Coding and agentic tasks: precise, confident, reliable multi-step execution. Use web search for current information.`,
};

const tools = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the live web for current information, news, facts, or images. Call this directly — do not describe it.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "A short, specific search query (2-6 words works best)." },
        },
        required: ["query"],
      },
    },
  },
];

async function performWebSearch(query, req) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  const res = await fetch(`${protocol}://${host}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  return { results: data.results || [], images: data.images || [] };
}

function detectsSearchIntent(text) {
  const t = text.toLowerCase();
  return /\b(search for|look up|latest|current|today's|recent news|what's happening|who won|price of)\b/.test(t);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    messages,
    userId,
    effort = "medium",
    thinking = false,
    memorySummary = "",
    persona = "pixel",
  } = req.body;

  if (!userId) return res.status(401).json({ error: "Missing user identity." });
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Messages array is required" });
  }

  const rateCheck = checkRateLimit(userId);
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: rateCheck.reason });
  }

  const model = PERSONA_MODEL_OVERRIDE[persona] || EFFORT_MODEL_MAP[effort] || EFFORT_MODEL_MAP.medium;
  const isReasoningModel = effort === "extra" || effort === "max" || persona === "kimi";
  const personaPrompt = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.pixel;

  let systemContent = `${personaPrompt}\n\n${getCurrentDateContext()}\n\n${TOOL_USE_RULES}\n\n${FORMATTING_INSTRUCTIONS}`;
  if (memorySummary && memorySummary.trim()) {
    systemContent += `\n\nWhat you remember about this user from previous conversations:\n${memorySummary}`;
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const shouldForceSearch = lastUserMessage && detectsSearchIntent(lastUserMessage.content);

  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  let workingMessages = [{ role: "system", content: systemContent }, ...messages];

  try {
    try {
      const firstPass = await groq.chat.completions.create({
        messages: workingMessages,
        model,
        tools,
        tool_choice: shouldForceSearch
          ? { type: "function", function: { name: "web_search" } }
          : "auto",
      });

      const choice = firstPass.choices[0];
      const toolCalls = choice.message.tool_calls;

      if (toolCalls && toolCalls.length > 0) {
        res.write("\u0004");
        workingMessages.push(choice.message);

        for (const call of toolCalls) {
          if (call.function.name === "web_search") {
            const args = JSON.parse(call.function.arguments || "{}");
            const { results, images } = await performWebSearch(args.query || "", req);
            const formatted = results
              .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`)
              .join("\n\n");

            workingMessages.push({
              role: "tool",
              tool_call_id: call.id,
              content: formatted || "No results found.",
            });

            if (images.length > 0) {
              res.write("\u0006" + JSON.stringify(images) + "\u0007");
            }
          }
        }

        res.write("\u0005");
      }
    } catch (toolErr) {
      console.error("Tool-calling pass failed, falling back to plain response:", toolErr);
    }

    const requestParams = { messages: workingMessages, model, stream: true };
    if (isReasoningModel) {
      requestParams.reasoning_format = thinking ? "raw" : "hidden";
    }

    const stream = await groq.chat.completions.create(requestParams);

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) res.write(content);
    }

    res.end();
  } catch (err) {
    console.error("Fatal error in chat handler:", err?.message || err);
    res.write(`Sorry, something went wrong: ${err?.message || "unknown error"}. Please try again.`);
    res.end();
  }
}
