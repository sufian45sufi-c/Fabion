import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  try {
    const stream = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are Closed Agent, an AI assistant powered by Groq's fast inference. Be helpful, concise, and clear.",
        },
        { role: "user", content: message },
      ],
      model: "llama-3.3-70b-versatile",
      stream: true,
    });

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
