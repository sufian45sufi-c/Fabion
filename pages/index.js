import Head from "next/head";
import { useState, useEffect } from "react";
import AuthModal from "../components/AuthModal";

function FloatingWindow({ title, rotate, children, className = "", style = {} }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`absolute bg-white border border-[#d8d3c8] rounded-[10px] shadow-md transition-transform duration-200 ${className}`}
      style={{
        transform: `rotate(${rotate}deg) ${hovered ? "translateY(-3px)" : ""}`,
        zIndex: hovered ? 30 : 10,
        boxShadow: hovered
          ? "0 12px 24px rgba(0,0,0,0.12)"
          : "0 4px 12px rgba(0,0,0,0.06)",
        ...style,
      }}
    >
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#e8e4d9]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
        <span className="ml-2 text-[11px] text-[#8a8578]" style={{ fontFamily: "'Press Start 2P', monospace" }}>
          {title}
        </span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function TerminalWindow() {
  return (
    <FloatingWindow title="terminal.mov" rotate={-2} className="w-[280px] hidden lg:block" style={{ top: "150px", left: "70px" }}>
      <div className="p-4 text-[11px] leading-relaxed text-black" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        <div>&gt; fabion init</div>
        <div>&gt; loading models...</div>
        <div>&gt; connecting to agents...</div>
        <div>&gt; building wonderful things...</div>
        <div className="my-2 flex items-center gap-2">
          <div className="flex-1 h-2 bg-[#eee] rounded-sm overflow-hidden">
            <div className="h-full bg-black" style={{ width: "70%" }} />
          </div>
          <span>70%</span>
        </div>
        <div>&gt; _</div>
      </div>
    </FloatingWindow>
  );
}

function BrainstormWindow() {
  return (
    <FloatingWindow title="brainstorm.md" rotate={1} className="w-[260px] hidden lg:block" style={{ top: "125px", left: "460px" }}>
      <div className="p-4 text-[11px] leading-relaxed text-black" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        <div className="font-bold mb-2"># Ideas</div>
        <div>- [x] AI IDE</div>
        <div>- [x] Deploy in one click</div>
        <div>- [ ] Mobile app</div>
        <div>- [ ] More agents</div>
      </div>
    </FloatingWindow>
  );
}

function BuildPreviewWindow() {
  return (
    <FloatingWindow title="build-v2.png" rotate={-1} className="w-[240px] hidden lg:block" style={{ top: "130px", right: "70px" }}>
      <div className="p-3">
        <div className="bg-[#f4f2ec] rounded h-32 flex flex-col gap-1 p-2">
          <div className="h-2 bg-[#ddd8ca] rounded w-2/3" />
          <div className="flex-1 grid grid-cols-3 gap-1 mt-1">
            <div className="bg-[#e4e0d4] rounded" />
            <div className="bg-[#e4e0d4] rounded" />
            <div className="bg-[#e4e0d4] rounded" />
          </div>
        </div>
      </div>
    </FloatingWindow>
  );
}

function AgentLogsWindow() {
  return (
    <FloatingWindow title="Agent Logs.txt" rotate={2} className="w-[220px] hidden md:block" style={{ top: "440px", left: "215px" }}>
      <div className="p-4 text-[10px] leading-relaxed text-black" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        <div>[10:42] Planning...</div>
        <div>[10:43] Analyzing...</div>
        <div>[10:45] Writing code...</div>
        <div>[10:47] Testing...</div>
        <div>[10:49] Done! ✓</div>
      </div>
    </FloatingWindow>
  );
}

function PreviewVideoWindow() {
  return (
    <FloatingWindow title="preview.mp4" rotate={3} className="w-[240px] hidden lg:block" style={{ top: "430px", right: "60px" }}>
      <div className="p-2">
        <div className="rounded h-32 flex items-center justify-center relative overflow-hidden bg-gradient-to-b from-sky-200 to-emerald-200">
          <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">▶</div>
        </div>
      </div>
    </FloatingWindow>
  );
}

function TaskCompletedWindow() {
  const items = ["UI Design", "Backend", "Database", "Deploy"];
  return (
    <FloatingWindow title="Task Completed" rotate={-1} className="w-[190px] hidden lg:block" style={{ top: "570px", right: "150px" }}>
      <div className="p-3 text-[10px] leading-relaxed text-black" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {items.map((it) => (
          <div key={it} className="flex items-center gap-2 mb-1">
            <span className="text-green-600">✓</span> {it}
          </div>
        ))}
        <div className="mt-2 text-[9px] text-[#8a8578]">All done! ✓</div>
      </div>
    </FloatingWindow>
  );
}

function MusicPlayerWindow() {
  const [playing, setPlaying] = useState(false);
  return (
    <FloatingWindow title="lofi beats.mp3" rotate={4} className="w-[220px] hidden lg:block" style={{ bottom: "40px", right: "290px" }}>
      <div className="p-3 bg-[#1c1c22] text-white rounded-b-[10px]">
        <div className="text-[10px] mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          lofi beats
          <br />
          <span className="text-[#888]">chill coding</span>
        </div>
        <div className="flex items-end gap-1 h-6 mb-2">
          {[3, 6, 4, 8, 5, 7, 3].map((h, i) => (
            <div
              key={i}
              className="w-1 bg-white rounded-sm"
              style={{
                height: `${h * 3}px`,
                animation: playing ? `musicBar 0.8s ease-in-out ${i * 0.1}s infinite alternate` : "none",
              }}
            />
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 text-xs">
          <span>⏮</span>
          <button onClick={() => setPlaying(!playing)}>{playing ? "⏸" : "▶"}</button>
          <span>⏭</span>
        </div>
      </div>
    </FloatingWindow>
  );
}

function PixelRobotWindow() {
  const [waving, setWaving] = useState(false);
  return (
    <FloatingWindow
      title="pixel-robot.png"
      rotate={-2}
      className="w-[190px] hidden lg:block"
      style={{ bottom: "150px", left: "300px" }}
    >
      <div
        className="p-4 flex flex-col items-center gap-2 cursor-pointer"
        onMouseEnter={() => setWaving(true)}
        onMouseLeave={() => setWaving(false)}
      >
        <div className="text-5xl" style={{ transform: waving ? "rotate(-8deg)" : "rotate(0deg)", transition: "transform 0.3s" }}>
          🤖
        </div>
        <div className="text-[9px] text-[#8a8578]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {waving ? "hello! ✦" : "click to wave"}
        </div>
      </div>
    </FloatingWindow>
  );
}

function StickyNote({ text, rotate, style, colorClass = "bg-[#fdf6a8]" }) {
  const [flipped, setFlipped] = useState(false);
  const altText = "Deploy complete.";
  return (
    <div
      onClick={() => setFlipped(!flipped)}
      className={`absolute w-[130px] p-3 ${colorClass} shadow-md cursor-pointer transition-transform duration-300 hover:-translate-y-1 hidden md:block`}
      style={{
        transform: `rotate(${rotate}deg)`,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "11px",
        ...style,
      }}
    >
      {flipped ? altText : text}
    </div>
  );
}

function PixelDecor({ emoji, style, animate, className = "" }) {
  return (
    <div
      className={`absolute text-3xl select-none pointer-events-none hidden md:block ${className}`}
      style={{ ...style, animation: animate }}
    >
      {emoji}
    </div>
  );
}

export default function Home() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState(false);

  const scrollToModels = () => {
    document.getElementById("models")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Head>
        <title>Fabion | AI Agent</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=JetBrains+Mono:wght@400;600&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          @keyframes floatSlow {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-6px); }
          }
          @keyframes steamRise {
            0% { transform: translateY(0) scale(1); opacity: 0.6; }
            100% { transform: translateY(-14px) scale(1.3); opacity: 0; }
          }
          @keyframes musicBar {
            0% { height: 4px; }
            100% { height: 22px; }
          }
          @keyframes duckWaddle {
            0%, 100% { transform: translateX(0) rotate(0deg); }
            50% { transform: translateX(6px) rotate(4deg); }
          }
          @media (prefers-reduced-motion: reduce) {
            * { animation: none !important; transition: none !important; }
          }
        `}</style>
      </Head>

      <div
        className="relative min-h-screen text-black overflow-hidden"
        style={{
          fontFamily: "'Inter', sans-serif",
          backgroundColor: "#faf8f2",
          backgroundImage: "radial-gradient(#e4dfd0 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        {/* Nav */}
        <nav className="relative z-40 flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">🙂</span>
            <span className="text-lg font-semibold">Fabion</span>
          </div>
          <div className="hidden md:flex gap-8 text-sm text-[#5c584c]">
            <button onClick={scrollToModels} className="hover:text-black transition-colors">Models</button>
            <button className="hover:text-black transition-colors">Gallery</button>
            <button className="hover:text-black transition-colors">Docs</button>
            <button className="hover:text-black transition-colors">Pricing</button>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex gap-6 text-sm text-[#5c584c]">
              <button className="hover:text-black transition-colors">Community</button>
              <button className="hover:text-black transition-colors">GitHub</button>
            </div>
            <button
              onClick={() => {
                setAuthMode(false);
                setAuthOpen(true);
              }}
              className="bg-black text-white text-sm px-5 py-2 rounded-md hover:-translate-y-0.5 transition-transform"
              style={{ boxShadow: "inset 0 -2px 0 rgba(255,255,255,0.15)" }}
            >
              Login
            </button>
          </div>
        </nav>

        {/* Desktop area */}
        <div className="relative max-w-[1400px] mx-auto px-6" style={{ minHeight: "900px" }}>
          <TerminalWindow />
          <BrainstormWindow />
          <BuildPreviewWindow />
          <AgentLogsWindow />
          <PreviewVideoWindow />
          <TaskCompletedWindow />
          <MusicPlayerWindow />
          <PixelRobotWindow />

          <StickyNote text="Need better auth..." rotate={-3} style={{ top: "300px", right: "40px" }} colorClass="bg-[#ffd6dd]" />
          <StickyNote text="Should support plugins." rotate={2} style={{ bottom: "130px", right: "350px" }} colorClass="bg-[#fdf6a8]" />
          <StickyNote text="Idea generated in 2.4 seconds." rotate={-2} style={{ bottom: "60px", left: "550px" }} colorClass="bg-[#c9e8ff]" />

          <PixelDecor emoji="☁️" style={{ top: "110px", left: "380px" }} animate="floatSlow 6s ease-in-out infinite" />
          <PixelDecor emoji="🐱" style={{ top: "220px", left: "390px" }} />
          <PixelDecor emoji="⭐" style={{ top: "220px", right: "310px" }} />
          <PixelDecor emoji="🌳" style={{ top: "120px", right: "20px" }} />
          <PixelDecor emoji="📁" style={{ top: "360px", left: "395px" }} className="text-2xl" />
          <PixelDecor emoji="🦆" style={{ top: "480px", right: "230px" }} animate="duckWaddle 4s ease-in-out infinite" />
          <PixelDecor emoji="☕" style={{ top: "380px", left: "80px" }} />
          <PixelDecor emoji="🌸" style={{ bottom: "80px", left: "150px" }} />
          <PixelDecor emoji="🎮" style={{ bottom: "170px", left: "220px" }} />
          <PixelDecor emoji="💾" style={{ bottom: "40px", right: "480px" }} />
          <PixelDecor emoji="🖥️" style={{ bottom: "80px", right: "80px" }} />
          <PixelDecor emoji="🍄" style={{ bottom: "60px", right: "230px" }} className="text-2xl" />
          <PixelDecor emoji="🗑️" style={{ bottom: "160px", left: "80px" }} />

          {/* Coffee steam */}
          <div className="absolute hidden md:block" style={{ top: "365px", left: "100px" }}>
            <div className="w-1 h-2 bg-[#ccc] rounded-full" style={{ animation: "steamRise 2s ease-in-out infinite" }} />
          </div>

          {/* Hero */}
          <div className="relative z-20 flex flex-col items-center justify-center pt-16 pb-10 text-center">
            <h1
              className="mb-6"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "clamp(40px, 8vw, 92px)",
                lineHeight: 1.15,
                letterSpacing: "-1px",
              }}
            >
              Fabion
            </h1>
            <p className="text-lg md:text-xl text-[#4a463c] max-w-xl mb-10">
              The AI agent that actually builds.
              <br />
              Apps. Games. Automations. <span className="underline">Anything.</span>
            </p>

            <div className="flex gap-4 flex-wrap justify-center">
              <button
                onClick={() => {
                  setAuthMode(true);
                  setAuthOpen(true);
                }}
                className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-md text-sm font-medium hover:-translate-y-0.5 transition-transform"
                style={{ boxShadow: "0 3px 0 rgba(0,0,0,0.25)" }}
              >
                ↗ Start Building
              </button>
              <button
                onClick={scrollToModels}
                className="flex items-center gap-2 bg-white border border-[#ddd8ca] text-black px-6 py-3 rounded-md text-sm font-medium hover:-translate-y-0.5 transition-transform"
                style={{ boxShadow: "0 3px 0 rgba(0,0,0,0.06)" }}
              >
                ▶ Watch Demo
              </button>
            </div>
          </div>
        </div>

        {/* Models section (kept from before, restyled to match) */}
        <section id="models" className="relative z-20 py-32 px-8 max-w-5xl mx-auto border-t border-[#e4dfd0]">
          <h2 className="text-3xl mb-16 font-semibold text-center">Three models. One intelligence.</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Thread", logo: "/thread-logo.png", desc: "Ultra-fast reasoning for quick, direct answers." },
              { name: "Pixel", logo: "/pixel-logo.png", desc: "Sharp, structured, and precise — built for code." },
              { name: "Cell", logo: "/cell-logo.png", desc: "Creative, multi-step reasoning for complex problems." },
            ].map((m) => (
              <div
                key={m.name}
                className="bg-white border border-[#e4dfd0] rounded-[10px] p-6 hover:-translate-y-1 transition-transform"
                style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
              >
                <img src={m.logo} alt={m.name} className="w-20 h-20 object-contain mb-4 mx-auto" />
                <h3 className="text-lg font-semibold mb-2 text-center">{m.name}</h3>
                <p className="text-sm text-[#5c584c] text-center">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="relative z-20 py-16 text-center text-xs text-[#8a8578] border-t border-[#e4dfd0]">
          © 2026 Fabion. All rights reserved.
        </footer>

        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} startInSignUp={authMode} />
      </div>
    </>
  );
}
