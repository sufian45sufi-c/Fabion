import Head from "next/head";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { auth, db } from "../lib/firebaseClient";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [checking, setChecking] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [userId, setUserId] = useState(null);
  const bottomRef = useRef(null);
  const router = useRouter();

  // Auth check + load saved history
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/");
        return;
      }
      setUserId(user.uid);

      const convoRef = ref(db, `conversations/${user.uid}`);
      const snap = await get(convoRef);
      if (snap.exists()) {
        setMessages(snap.val().messages || []);
      }
      setChecking(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Save whenever messages change (after initial load)
  useEffect(() => {
    if (!userId || checking) return;
    const convoRef = ref(db, `conversations/${userId}`);
    set(convoRef, { messages, updatedAt: Date.now() });
  }, [messages, userId, checking]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const handleNewChat = () => {
    setMessages([]);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { sender: "user", text }]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { sender: "agent", text: data.reply || "Something went wrong." },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "agent", text: "Error reaching the agent. Please try again." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  if (checking) return null;

  return (
    <>
      <Head>
        <title>Chat | Closed Agent</title>
        <link
          href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500&family=Inter:wght@300;400;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div
        className="bg-white text-neutral-900 min-h-screen flex flex-col"
        style={{
          fontFamily: "'Inter', sans-serif",
          backgroundImage:
            "linear-gradient(to right, #f0f0f0 1px, transparent 1px), linear-gradient(to bottom, #f0f0f0 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      >
        <header className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center bg-white/80 backdrop-blur-md z-50">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">Closed Agent</span>
            <span className="text-[10px] text-neutral-400 uppercase tracking-widest px-2 py-0.5 border border-neutral-200 rounded-full">
              v1.0
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-sm font-medium">
              Model: <span className="text-neutral-500">Agent-Core-4</span>
            </div>
            <button
              onClick={handleNewChat}
              className="text-[10px] uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              New chat
            </button>
            <button
              onClick={handleLogout}
              className="text-[10px] uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              Log out
            </button>
          </div>
        </header>

        <main
          className={`flex-1 overflow-y-auto pt-24 pb-40 px-6 flex flex-col items-center ${
            messages.length === 0 ? "justify-center" : ""
          }`}
        >
          <div className="max-w-3xl w-full space-y-8">
            {messages.length === 0 && (
              <div className="text-center">
                <h2
                  className="text-5xl mb-12"
                  style={{ fontFamily: "'EB Garamond', serif" }}
                >
                  How can I help you today?
                </h2>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-2xl ${msg.sender === "user" ? "ml-auto" : ""}`}
              >
                <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">
                  {msg.sender}
                </div>
                <div
                  className={`text-sm leading-relaxed ${
                    msg.sender === "user" ? "text-right" : ""
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="max-w-2xl">
                <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">
                  agent
                </div>
                <div className="text-sm text-neutral-400 italic">Thinking...</div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </main>

        <div className="fixed bottom-6 left-0 right-0 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-white border border-neutral-200 shadow-xl rounded-full p-2 flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 bg-transparent px-6 py-3 focus:outline-none text-sm"
              />
              <button
                onClick={sendMessage}
                className="bg-neutral-900 text-white p-3 rounded-full hover:bg-neutral-700 transition-all mr-1"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 12h14M12 5l7 7-7 7"
                  ></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
