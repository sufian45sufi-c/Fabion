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

const MODEL_MAP = {
  low: "llama-3.1-8b-instant",
  medium: "llama-3.3-70b-versatile",
  high: "llama-3.3-70b-versatile",
  extra: "deepseek-r1-distill-llama-70b",
  max: "deepseek-r1-distill-llama-70b",
};

const REASONING_START = "\u0002";
const REASONING_END = "\u0003";

const FORMATTING_INSTRUCTIONS = `
Formatting rules you must always follow:
- Write in clear, flowing prose. Do not default to bullet-point lists unless the user asks for a list or is comparing distinct items.
- Use **bold** (double asterisks) only around genuinely important terms, names, or conclusions — not entire sentences, not every heading.
- Never use single asterisks for emphasis.
- Keep paragraphs short and readable.
`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, userId, effort = "medium", thinking = false, memorySummary = "" } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "Missing user identity." });
  }
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Messages array is required" });
  }

  const rateCheck = checkRateLimit(userId);
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: rateCheck.reason });
  }

  const model = MODEL_MAP[effort] || MODEL_MAP.medium;
  const isReasoningModel = effort === "extra" || effort === "max";

  let systemContent = `You are Closed Agent, an AI assistant powered by Groq's fast inference. Be helpful, clear, and accurate. Use the full conversation history to stay consistent and remember what the user has told you earlier in this chat.\n\n${FORMATTING_INSTRUCTIONS}`;

  if (memorySummary && memorySummary.trim()) {
    systemContent += `\n\nWhat you remember about this user from previous conversations:\n${memorySummary}`;
  }

  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  try {
    const requestParams = {
      messages: [{ role: "system", content: systemContent }, ...messages],
      model,
      stream: true,
    };

    if (isReasoningModel) {
      requestParams.reasoning_format = thinking ? "raw" : "hidden";
    }

    const stream = await groq.chat.completions.create(requestParams);

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta || {};
      if (delta.reasoning) {
        res.write(REASONING_START + delta.reasoning + REASONING_END);
      }
      if (delta.content) {
        res.write(delta.content);
      }
    }

    res.end();
  } catch (err) {
    console.error(err);
    res.write("Error streaming response from the agent.");
    res.end();
  }
}
