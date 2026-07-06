import Head from "next/head";
import { useState } from "react";
import AuthModal from "../components/AuthModal";

export default function Home() {
  const [email, setEmail] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState(false); // false = login, true = signup

  return (
    <>
      <Head>
        <title>Fabion | Agentic Intelligence</title>
        <link
          href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500&family=Inter:wght@300;400;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div
        className="bg-white text-neutral-900 min-h-screen selection:bg-neutral-900 selection:text-white"
        style={{
          fontFamily: "'Inter', sans-serif",
          backgroundImage:
            "linear-gradient(to right, #f0f0f0 1px, transparent 1px), linear-gradient(to bottom, #f0f0f0 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      >
        {/* Nav */}
        <nav className="fixed top-6 left-6 right-6 md:left-1/2 md:-translate-x-1/2 md:w-[600px] backdrop-blur-md bg-white/60 border border-neutral-200/50 rounded-full px-6 py-3 shadow-sm z-50 flex justify-between items-center">
          <div className="text-lg font-bold tracking-tight">Fabion</div>
          <div className="hidden md:flex gap-8 text-[11px] uppercase tracking-[0.2em] font-medium text-neutral-500">
            <a href="#features" className="hover:text-neutral-900 transition-colors">
              Features
            </a>
            <a href="#waitlist" className="hover:text-neutral-900 transition-colors">
              Waitlist
            </a>
          </div>
          <div className="flex items-center gap-3">
           <button
  onClick={() => {
    alert("Sign Up clicked!");
    setAuthMode(true);
    setAuthOpen(true);
  }}
              className="text-[10px] uppercase tracking-widest hover:text-neutral-500 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthMode(true);
                setAuthOpen(true);
              }}
              className="bg-neutral-900 text-white text-[10px] px-4 py-2 rounded-full uppercase tracking-widest hover:bg-neutral-700 transition-all"
            >
              Sign Up
            </button>
          </div>
        </nav>

        <main className="max-w-5xl mx-auto pt-48 px-6 pb-24">
          {/* Hero */}
          <div className="mb-32">
            <h1
              className="text-7xl md:text-9xl tracking-tight mb-8"
              style={{ fontFamily: "'EB Garamond', serif" }}
            >
              Agentic
              <br />
              Intelligence.
            </h1>
            <p className="text-xl md:text-2xl text-neutral-500 font-light max-w-xl leading-relaxed">
              The core architecture for the agentic future. Built for speed,
              designed for the creator, and scaled for production.
            </p>
          </div>

          {/* Features */}
          <section
            id="features"
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-32"
          >
            <div className="md:col-span-2 border border-neutral-200 p-10 bg-white/50 h-80 flex flex-col justify-end rounded-lg">
              <h3
                className="text-3xl mb-3"
                style={{ fontFamily: "'EB Garamond', serif" }}
              >
                Sub-Second Inference
              </h3>
              <p className="text-sm text-neutral-500 max-w-sm">
                Powered by Groq, Fabion delivers near-instant response
                times for complex agent decision-making.
              </p>
            </div>

            <div className="border border-neutral-200 p-10 bg-white/50 h-80 flex flex-col justify-end rounded-lg">
              <h3
                className="text-3xl mb-3"
                style={{ fontFamily: "'EB Garamond', serif" }}
              >
                Modular SDK
              </h3>
              <p className="text-sm text-neutral-500">
                Connectors for every workflow. Plug-and-play integrations with
                your stack.
              </p>
            </div>

            <div className="border border-neutral-200 p-10 bg-white/50 h-80 flex flex-col justify-end rounded-lg">
              <h3
                className="text-3xl mb-3"
                style={{ fontFamily: "'EB Garamond', serif" }}
              >
                Vibe Driven
              </h3>
              <p className="text-sm text-neutral-500">
                An interface optimized for the "vibe coding" era—clean,
                focused, and intuitive.
              </p>
            </div>

            <div className="md:col-span-2 border border-neutral-200 p-10 bg-neutral-900 text-white h-80 flex flex-col justify-end rounded-lg">
              <h3
                className="text-3xl mb-3 text-neutral-100"
                style={{ fontFamily: "'EB Garamond', serif" }}
              >
                Ready to build?
              </h3>
              <p className="text-sm text-neutral-400">
                Join the Fabion beta and start architecting your first
                autonomous agent.
              </p>
            </div>
          </section>

          {/* Waitlist */}
          <section id="waitlist" className="border-t border-neutral-200 pt-24">
            <div className="max-w-2xl">
              <h2
                className="text-4xl mb-8"
                style={{ fontFamily: "'EB Garamond', serif" }}
              >
                Join the Waitlist
              </h2>
              <p className="text-lg text-neutral-600 mb-8 leading-relaxed">
                We're onboarding new builders in cohorts. Secure your spot in
                the queue and get priority access to the SDK.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@address.com"
                  className="border border-neutral-200 bg-transparent px-6 py-3 rounded-full w-full sm:w-64 text-sm focus:outline-none focus:border-neutral-400 transition-colors"
                />
                <button className="bg-neutral-900 text-white px-8 py-3 rounded-full text-sm font-medium hover:bg-neutral-700 transition-all w-full sm:w-auto">
                  Request Access
                </button>
              </div>
            </div>
          </section>
        </main>

        <footer className="pb-12 text-center text-[10px] uppercase tracking-widest text-neutral-400">
          © 2026 Fabion — Agentic Intelligence Infrastructure
        </footer>

        <AuthModal
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
          startInSignUp={authMode}
        />
      </div>
    </>
  );
}
