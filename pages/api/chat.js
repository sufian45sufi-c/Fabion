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
  low: "llama-3.1-8b-instant",
  medium: "llama-3.3-70b-versatile",
  high: "llama-3.3-70b-versatile",
  extra: "deepseek-r1-distill-llama-70b",
  max: "deepseek-r1-distill-llama-70b",
};

function getCurrentDateContext() {
  const now = new Date();
  const formatted = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `Today's real date is ${formatted}. Your internal training data has a cutoff earlier than today, so your default sense of "the current year" or "the latest" anything is very likely out of date. Always trust this stated date over your own assumptions. Do not correct or contradict the user about the current date. Use the web_search tool whenever a question depends on current information.`;
}

const FORMATTING_INSTRUCTIONS = `
Formatting rules you must always follow, regardless of persona:
- Use standard markdown: **bold** for key terms, headers (##) for sections in longer answers, bullet or numbered lists when comparing multiple items, tables when comparing structured data, and [text](url) for links when citing sources.
- Only use a fenced code block when the content is genuinely source code, a config file, or a command.
- Every real code block must be fenced with its language.
- If the user has attached a file, its contents appear wrapped in [FILE: filename] ... [/FILE] tags — treat as reference material unless asked to act on it.
- When using web search results, cite naturally with markdown links, never fabricate a URL or fact not present in the results.

Tone and emoji rules:
- Outside of coding tasks, write like a warm, genuine person having a real conversation.
- Emojis: at most one per message, only when it genuinely fits, never in technical/code explanations.
- Casual questions get a natural, personable tone. Code tasks get precise, technical, emoji-free responses.
`;

const PERSONA_PROMPTS = {
  thread: `You are Thread 1.0, Fabion's ultra-fast model.

For casual or conversational questions: be quick, warm, and natural — like a sharp friend who gives you the real answer immediately, no fluff.
For anything code-related: switch immediately into precise, technical, no-nonsense mode.
Never open with "Sure!" or "Great question." Start directly with the answer either way.
Use web search when the question depends on current or fast-changing information. Use the browser_action tool when the user wants you to actually visit, navigate, or interact with a specific website live.`,

  pixel: `You are Pixel 1.0, Fabion's senior full-stack engineering specialist, with deep expertise across backend and frontend.

For casual questions: be genuinely friendly and natural.
For coding tasks, switch fully into technical mode: correct, idiomatic, production-quality code, declared language in fenced blocks, brief approach before code and tradeoffs after, no emojis or casual tone while working on code.
Use web search for current library versions or recent changes you're not fully certain about.
Use the browser_action tool when the user wants you to actually visit or interact with a live website (e.g. testing a deployed page, checking a specific site's current layout).`,

  cell: `You are Cell 1.0, Fabion's creative and multi-step reasoning model.

For casual, creative, or open-ended questions: be warm, thoughtful, and genuinely engaged.
For complex requests, work through the problem in clear stages, considering more than one angle before committing.
If the conversation shifts into code, tone down the casualness and be precise instead.
Use web search for research-heavy or current-events questions. Use the browser_action tool when the user wants you to actually browse or interact with a live website.`,
};

const tools = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the live web for current information, news, facts, or images related to the query.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "A short, specific search query (2-6 words works best)." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_action",
      description: "Control a real, live web browser session. Use this to navigate to specific pages, click elements, fill forms, or interact with a website directly, rather than just searching. The browser view is visible to the user in real time.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["navigate", "click", "type", "scroll"],
            description: "The browser action to perform.",
          },
          url: { type: "string", description: "URL to navigate to (required for 'navigate')." },
          selector: { type: "string", description: "CSS selector for the element (required for 'click' and 'type')." },
          text: { type: "string", description: "Text to type (required for 'type')." },
          amount: { type: "number", description: "Pixels to scroll (optional for 'scroll', default 500)." },
        },
        required: ["type"],
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

async function performBrowserAction(args, userId, req) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  const res = await fetch(`${protocol}://${host}/api/browser-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: userId, action: args }),
  });
  return res.json();
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

  const model = EFFORT_MODEL_MAP[effort] || EFFORT_MODEL_MAP.medium;
  const isReasoningModel = effort === "extra" || effort === "max";
  const personaPrompt = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.pixel;

  let systemContent = `${personaPrompt}\n\n${getCurrentDateContext()}\n\n${FORMATTING_INSTRUCTIONS}`;
  if (memorySummary && memorySummary.trim()) {
    systemContent += `\n\nWhat you remember about this user from previous conversations:\n${memorySummary}`;
  }

  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  try {
    let workingMessages = [{ role: "system", content: systemContent }, ...messages];

    const firstPass = await groq.chat.completions.create({
      messages: workingMessages,
      model,
      tools,
      tool_choice: "auto",
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

        if (call.function.name === "browser_action") {
          res.write("\u0008");
          const args = JSON.parse(call.function.arguments || "{}");
          const browserData = await performBrowserAction(args, userId, req);

          workingMessages.push({
            role: "tool",
            tool_call_id: call.id,
            content: browserData.error
              ? `Browser action failed: ${browserData.error}`
              : `Navigated to ${browserData.url}. Page title: "${browserData.title}". Visible text: ${browserData.text?.slice(0, 500)}`,
          });
        }
      }

      res.write("\u0005");
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
    console.error(err);
    res.write("Error streaming response from the agent.");
    res.end();
  }
}
