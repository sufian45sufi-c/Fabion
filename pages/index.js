import Head from "next/head";
import { useState, useEffect } from "react";
import AuthModal from "../components/AuthModal";
import WorkspaceShowcase from "../components/WorkspaceShowcase";

function ModelRow({ logo, name, description, gradient, reverse }) {
  return (
    <div
      className={`flex flex-col md:flex-row items-center gap-10 md:gap-16 ${
        reverse ? "md:flex-row-reverse" : ""
      }`}
    >
      <div className="flex-1 flex justify-center relative">
        <div
          className="absolute inset-0 blur-3xl opacity-30 rounded-full"
          style={{ background: gradient }}
        />
        <img src={logo} alt={name} className="relative w-full max-w-md h-auto object-contain" />
      </div>
      <div className="flex-1">
        <h3
          className="text-5xl mb-6 font-bold"
          style={{
            background: gradient,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {name}
        </h3>
        <p className="text-zinc-300 text-lg leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToModels = () => {
    document.getElementById("models")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Head>
        <title>Fabion | AI Agent</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div
        className="bg-[#0a0a12] text-white min-h-screen selection:bg-fuchsia-500 selection:text-white antialiased overflow-x-hidden"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <nav
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between px-6 py-2 rounded-full border transition-all duration-500 backdrop-blur-xl ${
            scrolled
              ? "bg-black/60 border-white/10 w-[90%] md:w-[700px] shadow-2xl"
              : "bg-black/30 border-white/5 w-[90%] md:w-[700px]"
          }`}
        >
          <div
            className="font-extrabold tracking-tighter text-sm cursor-pointer px-2"
            style={{
              background: "linear-gradient(90deg, #f97316, #ec4899, #8b5cf6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            FABION
          </div>
          <div className="hidden md:flex gap-6 text-[10px] uppercase tracking-widest text-zinc-400">
            <button onClick={scrollToModels} className="hover:text-white transition-colors duration-300">
              Models
            </button>
            <button
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="hover:text-white transition-colors duration-300"
            >
              Features
            </button>
            <button
              onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
              className="hover:text-white transition-colors duration-300"
            >
              Demo
            </button>
          </div>
          <div className="flex gap-3 items-center">
            <button
              onClick={() => {
                setAuthMode(false);
                setAuthOpen(true);
              }}
              className="text-[10px] uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthMode(true);
                setAuthOpen(true);
              }}
              className="text-[10px] uppercase tracking-widest text-white px-4 py-1.5 rounded-full hover:scale-105 transition-all"
              style={{ background: "linear-gradient(90deg, #f97316, #ec4899, #8b5cf6)" }}
            >
              Sign Up
            </button>
          </div>
        </nav>

        <section
          id="hero"
          className="relative min-h-screen flex flex-col justify-center items-center px-6 overflow-hidden"
        >
          <div
            className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[120px] opacity-40 animate-pulse"
            style={{ background: "radial-gradient(circle, #f97316, transparent 70%)", animationDuration: "6s" }}
          />
          <div
            className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full blur-[120px] opacity-40 animate-pulse"
            style={{ background: "radial-gradient(circle, #8b5cf6, transparent 70%)", animationDuration: "8s" }}
          />
          <div
            className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] opacity-30 animate-pulse"
            style={{ background: "radial-gradient(circle, #ec4899, transparent 70%)", animationDuration: "7s" }}
          />

          <div className="relative z-10 flex flex-col items-center pt-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-8 text-[10px] uppercase tracking-widest text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-orange-400 to-pink-500 animate-pulse" />
              Now live — three models, one platform
            </div>

            <h1
              className="text-[64px] md:text-[130px] font-extrabold leading-[0.95] mb-8 text-center tracking-tight"
              style={{
                background: "linear-gradient(120deg, #fb923c 0%, #f472b6 35%, #a78bfa 70%, #60a5fa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Fabion
            </h1>
            <p className="text-zinc-300 text-center max-w-lg mb-12 text-lg">
              The intelligence that works, not waits. Built for thinking, creating, and executing — with real personality.
            </p>
            <div className="flex gap-4 flex-wrap justify-center">
              <button
                onClick={scrollToModels}
                className="px-8 py-3.5 text-black text-sm font-bold rounded-full hover:scale-105 transition-transform"
                style={{ background: "linear-gradient(90deg, #fb923c, #f472b6)" }}
              >
                Start Building
              </button>
              <button
                onClick={() => {
                  setAuthMode(true);
                  setAuthOpen(true);
                }}
                className="px-8 py-3.5 text-white text-sm font-medium rounded-full border border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all"
              >
                Try Fabion Free
              </button>
            </div>
          </div>
        </section>

        <section id="models" className="py-32 px-8 max-w-6xl mx-auto border-t border-white/10 relative">
          <h2 className="text-4xl italic mb-24" style={{ fontFamily: "'Playfair Display', serif" }}>
            Three models. One intelligence.
          </h2>
          <div className="flex flex-col gap-32">
            <ModelRow
              logo="/thread-logo.png"
              name="Thread"
              gradient="linear-gradient(90deg, #fb923c, #facc15)"
              description="Ultra-fast reasoning for quick, direct answers. Thread is built for speed above all — when you need something now, not a lecture."
            />
            <ModelRow
              logo="/pixel-logo.png"
              name="Pixel"
              gradient="linear-gradient(90deg, #ec4899, #a78bfa)"
              description="Sharp, structured, and precise — built for code. Pixel thinks like a senior engineer across the full stack, backend and frontend alike."
              reverse
            />
            <ModelRow
              logo="/cell-logo.png"
              name="Cell"
              gradient="linear-gradient(90deg, #8b5cf6, #60a5fa)"
              description="Creative, multi-step reasoning for complex problems. Cell breaks down ambiguity, weighs tradeoffs, and thinks things through properly."
            />
          </div>
        </section>

        <section id="features" className="py-32 px-8 max-w-6xl mx-auto border-t border-white/10">
          <h2 className="text-4xl italic mb-20" style={{ fontFamily: "'Playfair Display', serif" }}>
            Designed to feel alive.
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { n: "01", t: "Reasoning", c: "from-orange-400 to-pink-500" },
              { n: "02", t: "Code", c: "from-pink-500 to-purple-500" },
              { n: "03", t: "Research", c: "from-purple-500 to-indigo-500" },
              { n: "04", t: "Automation", c: "from-indigo-500 to-blue-500" },
              { n: "05", t: "Memory", c: "from-blue-500 to-cyan-400" },
              { n: "06", t: "Multi-chat", c: "from-cyan-400 to-orange-400" },
            ].map((f) => (
              <div
                key={f.n}
                className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm hover:bg-white/[0.06] transition-all"
              >
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${f.c} flex items-center justify-center mb-4 text-xs font-bold text-black`}
                >
                  {f.n}
                </div>
                <h4 className="text-lg font-semibold mb-1">{f.t}</h4>
                <p className="text-zinc-400 text-sm">Engineered for high-throughput intelligent processing.</p>
              </div>
            ))}
          </div>
        </section>

        <section id="demo" className="py-32 px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl italic mb-12" style={{ fontFamily: "'Playfair Display', serif" }}>
              Engineered to execute.
            </h2>
            <WorkspaceShowcase />
          </div>
        </section>

        <section
          id="subscribe"
          className="py-32 px-8 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1e0a2e 0%, #0a0a12 60%)" }}
        >
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[130px] opacity-30"
            style={{ background: "radial-gradient(circle, #ec4899, transparent 70%)" }}
          />
          <div className="relative z-10">
            <h2
              className="text-6xl italic mb-8"
              style={{
                fontFamily: "'Playfair Display', serif",
                background: "linear-gradient(90deg, #fb923c, #f472b6, #a78bfa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Build with Fabion.
            </h2>
            <p className="text-zinc-300 max-w-md mx-auto mb-12 text-sm">
              Sign up to start chatting with Thread, Pixel, and Cell today.
            </p>
            <button
              onClick={() => {
                setAuthMode(true);
                setAuthOpen(true);
              }}
              className="px-8 py-3.5 text-black text-sm font-bold rounded-full hover:scale-105 transition-transform"
              style={{ background: "linear-gradient(90deg, #fb923c, #f472b6, #a78bfa)" }}
            >
              Get Started
            </button>
          </div>
        </section>

        <footer className="py-20 border-t border-white/10 text-center text-zinc-600 text-[10px] uppercase tracking-widest">
          <p>© 2026 Fabion. All rights reserved.</p>
        </footer>

        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} startInSignUp={authMode} />
      </div>
    </>
  );
}
