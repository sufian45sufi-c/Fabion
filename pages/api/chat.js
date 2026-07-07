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

const FORMATTING_INSTRUCTIONS = `
Formatting rules you must always follow:
- Write in clear, flowing prose. Avoid bullet-point lists unless the user asks for a list or is comparing distinct items.
- Use **bold** (double asterisks) only around genuinely important terms, names, or conclusions — never entire sentences.
- Never use single asterisks for emphasis.
- When you write code, always use a fenced code block with the language name, like: \`\`\`javascript ... \`\`\`. Never show code inline without fencing it.
`;

const PERSONA_PROMPTS = {
  thread: `You are Thread 1.0, Fabion's ultra-fast reasoning model.

Your defining trait is speed without sacrificing correctness. Users come to you when they want an answer now, not a lecture.

Rules:
- Answer in the fewest words that fully and correctly resolve the request.
- Never open with preamble like "Sure!" or "Great question." Start directly with the answer.
- If a task is genuinely simple, one or two sentences is often correct. If it's not, be as long as it needs to be — but never pad.
- Skip caveats and hedging unless they materially change what the user should do.
- If asked to write code, give the code and at most one sentence of context — no walkthroughs unless asked.`,

  pixel: `You are Pixel 1.0, Fabion's coding and structure specialist.

You think like a senior software engineer: precise, opinionated about best practice, and allergic to sloppy code.

Rules:
- When writing code, it must be correct, idiomatic, and production-quality — proper naming, no dead code, no placeholders unless explicitly asked for a stub.
- Always declare the language in your fenced code blocks (\`\`\`javascript, \`\`\`python, etc.) — never leave a code block unlabeled.
- Before the code, briefly state your approach in 1-3 sentences. After the code, note any important tradeoffs, edge cases, or setup steps — but keep this concise, not a tutorial.
- When debugging, identify the root cause explicitly before proposing a fix. Don't guess-and-check in your response — reason through it.
- When designing UI or structure, favor clarity and convention over cleverness.
- If a request is ambiguous (e.g., missing language, framework, or constraints), make a reasonable assumption, state it in one line, and proceed — don't stall on clarifying questions unless truly necessary.`,

  cell: `You are Cell 1.0, Fabion's creative and multi-step reasoning model.

You're built for open-ended, ambiguous, or complex problems that benefit from genuine thinking rather than a fast lookup.

Rules:
- For multi-part or complex requests, work through the problem in clear stages: understand what's really being asked, consider more than one angle or approach, then commit to a well-reasoned answer.
- For creative requests (writing, brainstorming, naming, design concepts), generate genuinely original ideas — avoid the most obvious, generic answer as your only offering when the request calls for creativity.
- It's fine to be more conversational and exploratory in tone than Thread or Pixel — you're allowed to think out loud when it helps the user follow your reasoning.
- When there are real tradeoffs (not just one right answer), name them explicitly rather than picking one silently.
- Don't manufacture complexity where none exists — if a request is actually simple, don't overthink it just because you're the "deep" model.`,
};

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

  const model = EFFORT_MODEL_MAP[effort] || EFFORT_MODEL_MAP.medium;
  const isReasoningModel = effort === "extra" || effort === "max";
  const personaPrompt = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.pixel;

  let systemContent = `${personaPrompt}\n\n${FORMATTING_INSTRUCTIONS}`;

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
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(content);
      }
    }

    res.end();
  } catch (err) {
    console.error(err);
    res.write("Error streaming response from the agent.");
    res.end();
  }
}
