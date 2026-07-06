import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userText, agentText, existingSummary = "" } = req.body;

  if (!userText || !agentText) {
    return res.status(400).json({ error: "Missing exchange to summarize" });
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You maintain a short running memory of key facts about a user, based on their conversations with an AI assistant. Given the existing memory and a new exchange, return an updated memory as 3-6 short bullet-free sentences of durable facts (name, preferences, ongoing projects, goals). Do not include small talk or one-off details. Respond with only the updated memory text, nothing else.",
        },
        {
          role: "user",
          content: `Existing memory:\n${existingSummary || "(none yet)"}\n\nNew exchange:\nUser: ${userText}\nAssistant: ${agentText}\n\nReturn the updated memory.`,
        },
      ],
      model: "llama-3.1-8b-instant",
    });

    const summary = completion.choices[0]?.message?.content?.trim() || existingSummary;
    res.status(200).json({ summary });
  } catch (err) {
    console.error(err);
    res.status(200).json({ summary: existingSummary });
  }
}
