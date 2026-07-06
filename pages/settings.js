import Head from "next/head";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { auth, db } from "../lib/firebaseClient";

const EFFORT_OPTIONS = [
  { value: "low", label: "Low", desc: "Fastest replies, simplest reasoning." },
  { value: "medium", label: "Medium", desc: "Balanced speed and quality. Default." },
  { value: "high", label: "High", desc: "Slower, more careful and detailed answers." },
  { value: "extra", label: "Extra", desc: "Uses a reasoning model for tougher problems." },
  { value: "max", label: "Max", desc: "Maximum reasoning depth. Slowest option." },
];

export default function Settings() {
  const [userId, setUserId] = useState(null);
  const [checking, setChecking] = useState(true);
  const [effort, setEffort] = useState("medium");
  const [thinking, setThinking] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/");
        return;
      }
      setUserId(user.uid);

      const snap = await get(ref(db, `settings/${user.uid}`));
      if (snap.exists()) {
        const data = snap.val();
        setEffort(data.effort || "medium");
        setThinking(!!data.thinking);
      }
      setChecking(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleSave = async () => {
    await set(ref(db, `settings/${userId}`), { effort, thinking });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (checking) return null;

  return (
    <>
      <Head>
        <title>Settings | Closed Agent</title>
        <link
          href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500&family=Inter:wght@300;400;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div
        className="min-h-screen bg-white text-neutral-900"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <header className="p-6 flex items-center justify-between border-b border-neutral-100">
          <button
            onClick={() => router.push("/chat")}
            className="text-xs uppercase tracking-widest text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            ← Back to chat
          </button>
          <div
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: "'EB Garamond', serif" }}
          >
            Closed.
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-6 py-16">
          <h1
            className="text-4xl mb-2"
            style={{ fontFamily: "'EB Garamond', serif" }}
          >
            Settings
          </h1>
          <p className="text-sm text-neutral-500 mb-12">
            Customize how the agent thinks and responds.
          </p>

          <section className="mb-12">
            <h2 className="text-xs uppercase tracking-widest text-neutral-400 mb-4">
              Effort level
            </h2>
            <div className="space-y-2">
              {EFFORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setEffort(opt.value)}
                  className={`w-full text-left px-5 py-4 rounded-lg border transition-colors ${
                    effort === opt.value
                      ? "border-neutral-900 bg-neutral-50"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{opt.label}</span>
                    {effort === opt.value && (
                      <span className="text-[10px] uppercase tracking-widest text-neutral-500">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-xs uppercase tracking-widest text-neutral-400 mb-4">
              Reasoning
            </h2>
            <button
              onClick={() => setThinking(!thinking)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors"
            >
              <div className="text-left">
                <div className="font-medium text-sm">Show thinking</div>
                <p className="text-xs text-neutral-500 mt-1">
                  Displays the agent's reasoning process. Only applies at Extra or
                  Max effort.
                </p>
              </div>
              <div
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ml-4 ${
                  thinking ? "bg-neutral-900" : "bg-neutral-200"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                    thinking ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </div>
            </button>
          </section>

          <button
            onClick={handleSave}
            className="w-full bg-neutral-900 text-white py-3 rounded-full text-sm font-medium hover:bg-neutral-700 transition-all"
          >
            {saved ? "Saved ✓" : "Save settings"}
          </button>
        </main>
      </div>
    </>
  );
}
