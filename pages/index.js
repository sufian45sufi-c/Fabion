import Head from "next/head";
import { useState } from "react";
import AuthModal from "../components/AuthModal";

const COLORS = {
  bg: "#C9D8F4",
  cream: "#F7F1E1",
  border: "#3B2A1A",
  blue: "#5B8DEF",
  yellow: "#F4C544",
  pink: "#F186B4",
  green: "#7ABF6B",
};

function PixelBorder({ children, className = "", style = {} }) {
  return (
    <div
      className={`bg-[#F7F1E1] ${className}`}
      style={{
        border: `4px solid ${COLORS.border}`,
        boxShadow: `6px 6px 0px ${COLORS.border}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function PixelButton({ children, onClick, variant = "primary", className = "" }) {
  const bg = variant === "primary" ? "#1a1410" : "#F7F1E1";
  const color = variant === "primary" ? "#F7F1E1" : "#1a1410";
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 text-xs uppercase tracking-widest transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none hover:-translate-y-0.5 ${className}`}
      style={{
        fontFamily: "'Press Start 2P', monospace",
        background: bg,
        color,
        border: `3px solid ${COLORS.border}`,
        boxShadow: `4px 4px 0px ${COLORS.border}`,
      }}
    >
      {children}
    </button>
  );
}

function IconCloud({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <rect x="3" y="6" width="10" height="1" fill={COLORS.border} />
      <rect x="2" y="7" width="12" height="1" fill={COLORS.border} />
      <rect x="1" y="8" width="14" height="2" fill="#fff" stroke={COLORS.border} strokeWidth="0.3" />
      <rect x="1" y="8" width="14" height="2" fill="#EAF2FF" />
      <rect x="2" y="7" width="12" height="1" fill="#EAF2FF" />
      <rect x="3" y="6" width="10" height="1" fill="#EAF2FF" />
      <rect x="1" y="8" width="14" height="2" fill="none" stroke={COLORS.border} strokeWidth="0.5" />
    </svg>
  );
}

function IconCode({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <rect x="1" y="1" width="14" height="14" fill="#1a1410" stroke={COLORS.border} strokeWidth="0.5" />
      <path d="M5 5 L2 8 L5 11" stroke={COLORS.green} strokeWidth="1.4" fill="none" strokeLinecap="square" />
      <path d="M11 5 L14 8 L11 11" stroke={COLORS.green} strokeWidth="1.4" fill="none" strokeLinecap="square" />
    </svg>
  );
}

function IconFlower({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <rect x="7" y="9" width="2" height="6" fill={COLORS.green} />
      <rect x="6" y="3" width="4" height="4" fill={COLORS.pink} />
      <rect x="2" y="6" width="4" height="4" fill={COLORS.pink} />
      <rect x="10" y="6" width="4" height="4" fill={COLORS.pink} />
      <rect x="6" y="9" width="4" height="3" fill={COLORS.pink} />
      <rect x="6" y="6" width="4" height="4" fill={COLORS.yellow} />
    </svg>
  );
}

function IconBolt({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <rect x="9" y="1" width="3" height="2" fill={COLORS.yellow} />
      <rect x="7" y="3" width="3" height="2" fill={COLORS.yellow} />
      <rect x="5" y="5" width="4" height="2" fill={COLORS.yellow} />
      <rect x="7" y="7" width="4" height="2" fill={COLORS.yellow} />
      <rect x="9" y="9" width="3" height="2" fill={COLORS.yellow} />
      <rect x="6" y="9" width="3" height="2" fill={COLORS.yellow} />
      <rect x="4" y="11" width="3" height="2" fill={COLORS.yellow} />
    </svg>
  );
}

function IconPalette({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <rect x="2" y="4" width="10" height="8" fill="#fff" stroke={COLORS.border} strokeWidth="0.5" />
      <rect x="3" y="5" width="2" height="2" fill={COLORS.pink} />
      <rect x="6" y="5" width="2" height="2" fill={COLORS.yellow} />
      <rect x="9" y="5" width="2" height="2" fill={COLORS.blue} />
      <rect x="3" y="8" width="2" height="2" fill={COLORS.green} />
      <rect x="6" y="8" width="2" height="2" fill="#3B2A1A" />
    </svg>
  );
}

function IconBrain({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <rect x="4" y="3" width="8" height="8" fill={COLORS.pink} stroke={COLORS.border} strokeWidth="0.5" />
      <rect x="6" y="5" width="1" height="1" fill={COLORS.border} />
      <rect x="9" y="5" width="1" height="1" fill={COLORS.border} />
      <rect x="5" y="8" width="6" height="1" fill={COLORS.border} />
    </svg>
  );
}

function IconStar({ size = 32, color = COLORS.yellow }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <rect x="7" y="1" width="2" height="3" fill={color} />
      <rect x="7" y="12" width="2" height="3" fill={color} />
      <rect x="1" y="7" width="3" height="2" fill={color} />
      <rect x="12" y="7" width="3" height="2" fill={color} />
      <rect x="6" y="6" width="4" height="4" fill={color} />
    </svg>
  );
}

function IconMac({ size = 100 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" shapeRendering="crispEdges">
      <rect x="10" y="4" width="20" height="18" fill="#D8D2C2" stroke={COLORS.border} strokeWidth="0.8" />
      <rect x="13" y="7" width="14" height="10" fill={COLORS.blue} />
      <rect x="14" y="24" width="12" height="4" fill="#D8D2C2" stroke={COLORS.border} strokeWidth="0.8" />
      <rect x="8" y="30" width="24" height="3" fill="#D8D2C2" stroke={COLORS.border} strokeWidth="0.8" />
      <rect x="10" y="33" width="20" height="4" fill="#C4BCA8" stroke={COLORS.border} strokeWidth="0.8" />
    </svg>
  );
}

function PlantIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <rect x="6" y="9" width="4" height="5" fill="#B08968" stroke={COLORS.border} strokeWidth="0.3" />
      <rect x="7" y="4" width="2" height="6" fill={COLORS.green} />
      <rect x="4" y="5" width="3" height="2" fill={COLORS.green} />
      <rect x="9" y="3" width="3" height="2" fill={COLORS.green} />
    </svg>
  );
}

function MugIcon({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <rect x="3" y="6" width="8" height="7" fill="#fff" stroke={COLORS.border} strokeWidth="0.5" />
      <rect x="11" y="8" width="2" height="3" fill="none" stroke={COLORS.border} strokeWidth="0.6" />
    </svg>
  );
}

function Sparkle({ style }) {
  return (
    <div className="absolute select-none pointer-events-none" style={{ ...style, animation: "twinkle 2.5s ease-in-out infinite" }}>
      <svg width="14" height="14" viewBox="0 0 16 16" shapeRendering="crispEdges">
        <rect x="7" y="2" width="2" height="4" fill={COLORS.yellow} />
        <rect x="7" y="10" width="2" height="4" fill={COLORS.yellow} />
        <rect x="2" y="7" width="4" height="2" fill={COLORS.yellow} />
        <rect x="10" y="7" width="4" height="2" fill={COLORS.yellow} />
      </svg>
    </div>
  );
}

function ModelCard({ icon, name, tag, desc, accent }) {
  return (
    <PixelBorder className="p-6 flex flex-col hover:-translate-y-1.5 transition-transform relative overflow-hidden">
      <div
        className="absolute top-0 left-0 w-full h-1.5"
        style={{ background: accent }}
      />
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-bold mb-1" style={{ fontFamily: "'Press Start 2P', monospace" }}>
        {name}
      </h3>
      <div className="text-[10px] mb-4 uppercase tracking-widest" style={{ color: accent, fontFamily: "'Press Start 2P', monospace" }}>
        {tag}
      </div>
      <p className="text-sm text-[#5c5343] mb-6 leading-relaxed flex-1">{desc}</p>
      <button
        className="text-xs uppercase tracking-widest self-start hover:translate-x-1 transition-transform"
        style={{ fontFamily: "'Press Start 2P', monospace", color: COLORS.border }}
      >
        Explore →
      </button>
    </PixelBorder>
  );
}

function FeatureCard({ icon, title, desc, preview }) {
  return (
    <PixelBorder className="p-6 hover:-translate-y-1 transition-transform">
      <div className="flex items-start gap-4 mb-4">
        <div className="shrink-0">{icon}</div>
        <div>
          <h3 className="text-sm font-bold mb-1" style={{ fontFamily: "'Press Start 2P', monospace" }}>
            {title}
          </h3>
          <p className="text-xs text-[#5c5343] leading-relaxed">{desc}</p>
        </div>
      </div>
      {preview}
    </PixelBorder>
  );
}

function PricingCard({ name, price, features, cta, highlighted, badge }) {
  return (
    <div
      className={`p-8 flex flex-col relative ${highlighted ? "md:-translate-y-4" : ""}`}
      style={{
        background: "#F7F1E1",
        border: `4px solid ${COLORS.border}`,
        boxShadow: highlighted ? `8px 8px 0px ${COLORS.blue}` : `6px 6px 0px ${COLORS.border}`,
      }}
    >
      {badge && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[9px] uppercase tracking-widest"
          style={{ fontFamily: "'Press Start 2P', monospace", background: COLORS.blue, color: "#fff", border: `2px solid ${COLORS.border}` }}
        >
          Popular
        </div>
      )}
      <h3 className="text-base font-bold mb-2" style={{ fontFamily: "'Press Start 2P', monospace" }}>
        {name}
      </h3>
      <div className="mb-6">
        <span className="text-4xl font-bold" style={{ fontFamily: "'Press Start 2P', monospace" }}>
          {price}
        </span>
        <span className="text-xs text-[#8a8069]"> /mo</span>
      </div>
      <ul className="space-y-2.5 mb-8 flex-1">
        {features.map((f) => (
          <li key={f} className="text-xs text-[#5c5343] flex items-start gap-2">
            <span style={{ color: COLORS.green }}>■</span> {f}
          </li>
        ))}
      </ul>
      <PixelButton variant={highlighted ? "primary" : "secondary"} className="w-full">
        {cta}
      </PixelButton>
    </div>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <PixelBorder className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-bold"
        style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "11px" }}
      >
        {q}
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && <div className="px-5 pb-4 text-xs text-[#5c5343] leading-relaxed">{a}</div>}
    </PixelBorder>
  );
}

export default function Home() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState(false);
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      <Head>
        <title>Fabion | AI Agent</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          @keyframes twinkle { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.1); } }
          @keyframes floatPixel { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
          @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
        `}</style>
      </Head>

      <div
        className="min-h-screen text-[#1a1410]"
        style={{
          fontFamily: "'Inter', sans-serif",
          backgroundColor: COLORS.bg,
          backgroundImage:
            "linear-gradient(rgba(59,42,26,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(59,42,26,0.08) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        {/* Navbar */}
        <div className="sticky top-4 z-50 px-4">
          <nav
            className="max-w-5xl mx-auto flex items-center justify-between px-5 py-3"
            style={{
              background: "#F7F1E1",
              border: `3px solid ${COLORS.border}`,
              boxShadow: `5px 5px 0px ${COLORS.border}`,
            }}
          >
            <div className="flex items-center gap-2">
              <IconMac size={26} />
              <span className="font-bold text-sm" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                FABION
              </span>
              <span style={{ color: COLORS.yellow, fontSize: "10px" }}>✦</span>
            </div>
            <div className="hidden md:flex gap-6 text-[10px] uppercase tracking-widest">
              <button onClick={() => scrollTo("features")} className="hover:text-blue-600 transition-colors">Features</button>
              <button onClick={() => scrollTo("models")} className="hover:text-blue-600 transition-colors">Models</button>
              <button onClick={() => scrollTo("pricing")} className="hover:text-blue-600 transition-colors">Pricing</button>
              <button onClick={() => scrollTo("memes")} className="hover:text-blue-600 transition-colors">Memes</button>
            </div>
            <PixelButton
              onClick={() => {
                setAuthMode(true);
                setAuthOpen(true);
              }}
              className="text-[9px] px-4 py-2"
            >
              Try Fabion →
            </PixelButton>
          </nav>
        </div>

        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 pt-20 pb-24 grid md:grid-cols-2 gap-10 items-center relative">
          <Sparkle style={{ top: "10px", left: "20px" }} />
          <Sparkle style={{ bottom: "40px", left: "60%" }} />
          <div>
            <h1
              className="text-4xl md:text-5xl leading-tight mb-6"
              style={{ fontFamily: "'Press Start 2P', monospace", letterSpacing: "1px" }}
            >
              Welcome to <span style={{ color: COLORS.blue }}>Fabion</span>
              <span style={{ color: COLORS.yellow }}>+</span>
            </h1>
            <p className="text-base text-[#5c5343] mb-8 leading-relaxed">
              The ultimate retro studio for modern developers.
            </p>
            <div className="flex gap-4 flex-wrap">
              <PixelButton
                onClick={() => {
                  setAuthMode(true);
                  setAuthOpen(true);
                }}
              >
                Get Started
              </PixelButton>
              <PixelButton variant="secondary" onClick={() => scrollTo("models")}>
                Explore Models
              </PixelButton>
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <div style={{ animation: "floatPixel 4s ease-in-out infinite" }}>
              <IconMac size={180} />
            </div>
            <div className="absolute -bottom-2 -left-6">
              <PlantIcon size={48} />
            </div>
            <div className="absolute bottom-6 -right-4">
              <MugIcon size={34} />
            </div>
            <Sparkle style={{ top: "0px", right: "0px" }} />
            <Sparkle style={{ bottom: "60px", left: "-10px" }} />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-5xl mx-auto px-6 py-24">
          <h2 className="text-2xl mb-3" style={{ fontFamily: "'Press Start 2P', monospace" }}>
            Features
          </h2>
          <p className="text-sm text-[#5c5343] mb-12">Everything you need to build, ship, and scale faster.</p>

          <div className="grid md:grid-cols-2 gap-6">
            <FeatureCard
              icon={<IconBolt />}
              title="Instant Deploy"
              desc="Deploy your application in seconds. Zero configuration, zero hassle."
              preview={
                <div className="mt-4 p-3 bg-[#1a1410] text-[#7ABF6B] text-[10px] font-mono">
                  $ fabion deploy
                  <br />✓ Deployed in 2.3s
                </div>
              }
            />
            <FeatureCard
              icon={<IconPalette />}
              title="Custom UI Theme Engine"
              desc="Create and customize beautiful themes with our powerful theme engine."
              preview={
                <div className="mt-4 flex gap-2">
                  {[COLORS.pink, COLORS.yellow, COLORS.border, COLORS.green].map((c) => (
                    <div key={c} className="w-6 h-6" style={{ background: c, border: `1.5px solid ${COLORS.border}` }} />
                  ))}
                </div>
              }
            />
            <FeatureCard
              icon={<IconBrain />}
              title="AI-Powered Code Optimization"
              desc="Get smart suggestions, refactors, and performance improvements."
              preview={
                <div className="mt-4 p-3 bg-[#1a1410] text-[#EAE2C8] text-[9px] font-mono leading-relaxed">
                  // AI Suggestion
                  <br />
                  for (let i = 0; i &lt; n; i++) {"{"}
                  <br />
                  &nbsp;&nbsp;doSomething(i);
                  <br />
                  {"}"}
                </div>
              }
            />
            <FeatureCard
              icon={<IconStar />}
              title="Developer First"
              desc="Built by developers, for developers. Clean, fast, and reliable."
              preview={
                <div className="mt-4 text-[10px] text-[#5c5343]" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                  Developers Love Fabion
                </div>
              }
            />
          </div>
        </section>

        {/* Models */}
        <section id="models" className="max-w-5xl mx-auto px-6 py-24">
          <h2 className="text-2xl mb-3" style={{ fontFamily: "'Press Start 2P', monospace" }}>
            Our Models
          </h2>
          <p className="text-sm text-[#5c5343] mb-12">Three specialized models. One powerful studio.</p>

          <div className="grid md:grid-cols-3 gap-6">
            <ModelCard
              icon={<IconCloud />}
              name="Thread"
              tag="For Speed"
              accent={COLORS.blue}
              desc="Ultra-fast responses. Instant answers. Lowest latency of any model on Fabion."
            />
            <ModelCard
              icon={<IconCode />}
              name="Pixel"
              tag="For Coding"
              accent={COLORS.green}
              desc="Writes code, debugs, explains, and builds full apps — your AI pair programmer."
            />
            <ModelCard
              icon={<IconFlower />}
              name="Cell"
              tag="For Daily Questions"
              accent={COLORS.pink}
              desc="General knowledge, writing, school, ideas, and conversation — for everything else."
            />
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="max-w-5xl mx-auto px-6 py-24">
          <h2 className="text-2xl mb-3" style={{ fontFamily: "'Press Start 2P', monospace" }}>
            Pricing
          </h2>
          <p className="text-sm text-[#5c5343] mb-16">Simple pricing for every developer. Start free, scale when you grow.</p>

          <div className="grid md:grid-cols-3 gap-8 mb-24">
            <PricingCard
              name="Basic"
              price="$0"
              cta="Get Started Free"
              features={[
                "1 Project",
                "Community Support",
                "Basic Features",
                "Standard Model Access (Cell 1.0)",
                "Up to 2,000 AI Messages / mo",
              ]}
            />
            <PricingCard
              name="Pro"
              price="$19"
              cta="Upgrade to Pro"
              highlighted
              badge
              features={[
                "Unlimited Projects",
                "Priority Support",
                "All Models Access (Pixel, Thread, Cell)",
                "Up to 50,000 AI Messages / mo",
                "File Storage (10GB)",
                "Custom Domains",
              ]}
            />
            <PricingCard
              name="Studio"
              price="$49"
              cta="Upgrade to Studio"
              features={[
                "Everything in Pro",
                "Team Collaboration",
                "Advanced Analytics",
                "White-Label Options",
                "Unlimited File Storage",
                "Dedicated Support",
              ]}
            />
          </div>

          {/* Comparison table */}
          <PixelBorder className="p-6 mb-16 overflow-x-auto">
            <table className="w-full text-xs min-w-[500px]">
              <thead>
                <tr style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "9px" }}>
                  <th className="text-left pb-4">Feature</th>
                  <th className="pb-4">Basic</th>
                  <th className="pb-4">Pro</th>
                  <th className="pb-4">Studio</th>
                </tr>
              </thead>
              <tbody className="text-[#5c5343]">
                {[
                  ["Projects", "1", "Unlimited", "Unlimited"],
                  ["Model Access", "Cell only", "All Models", "All Models"],
                  ["AI Messages / mo", "2,000", "50,000", "Unlimited"],
                  ["File Storage", "100MB", "10GB", "Unlimited"],
                  ["Team Collaboration", "—", "—", "✓"],
                ].map((row) => (
                  <tr key={row[0]} className="border-t" style={{ borderColor: "#e0d8c0" }}>
                    <td className="py-3 font-medium">{row[0]}</td>
                    <td className="py-3 text-center">{row[1]}</td>
                    <td className="py-3 text-center">{row[2]}</td>
                    <td className="py-3 text-center">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PixelBorder>

          {/* FAQ */}
          <div className="space-y-3 max-w-2xl mx-auto">
            <FAQItem q="Can I cancel anytime?" a="Yes — you can cancel your subscription at any time from your account settings, no questions asked." />
            <FAQItem q="Do you offer refunds?" a="We offer a 14-day money-back guarantee on all paid plans." />
            <FAQItem q="What models are included?" a="Basic includes Cell only. Pro and Studio include full access to Thread, Pixel, and Cell." />
          </div>
        </section>

        {/* Meme / Terminal */}
        <section id="memes" className="max-w-4xl mx-auto px-6 py-24">
          <PixelBorder className="p-0 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "#1a1410" }}>
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
              <span className="ml-2 text-[9px] text-[#EAE2C8]" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                Meme &amp; Wisdom
              </span>
            </div>
            <div className="p-8 bg-[#1a1410] text-[#7ABF6B] font-mono text-sm leading-relaxed flex items-center justify-between gap-6">
              <div>
                <p className="mb-3">&quot;It worked on my machine.&quot;</p>
                <p className="text-[#EAE2C8]/70 text-xs">
                  &quot;I don&apos;t always test my code, but when I do, I do it in production.&quot;
                </p>
              </div>
              <div className="shrink-0 hidden sm:block">
                <svg width="56" height="56" viewBox="0 0 16 16" shapeRendering="crispEdges">
                  <rect x="2" y="2" width="12" height="12" fill={COLORS.yellow} stroke={COLORS.border} strokeWidth="0.4" />
                  <rect x="5" y="6" width="1" height="1" fill={COLORS.border} />
                  <rect x="10" y="6" width="1" height="1" fill={COLORS.border} />
                  <rect x="5" y="10" width="6" height="1" fill={COLORS.border} />
                </svg>
              </div>
            </div>
          </PixelBorder>
        </section>

        {/* Final CTA */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <PixelBorder className="p-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg mb-2" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                Ready to build something amazing?
              </h3>
              <p className="text-sm text-[#5c5343]">Join thousands of developers already using Fabion.</p>
            </div>
            <div className="flex gap-4 shrink-0">
              <PixelButton
                onClick={() => {
                  setAuthMode(true);
                  setAuthOpen(true);
                }}
              >
                Get Started
              </PixelButton>
              <PixelButton variant="secondary" onClick={() => scrollTo("models")}>
                Explore Models
              </PixelButton>
            </div>
          </PixelBorder>
        </section>

        {/* Footer */}
        <footer className="border-t-4 mt-8" style={{ borderColor: COLORS.border }}>
          <div className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-5 gap-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <IconMac size={22} />
                <span className="font-bold text-sm" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                  FABION
                </span>
              </div>
              <div className="flex gap-4">
                <span className="text-xs">GH</span>
                <span className="text-xs">DC</span>
                <span className="text-xs">TW</span>
              </div>
            </div>
            {[
              { h: "Product", items: ["Features", "Models", "Pricing"] },
              { h: "Resources", items: ["Docs", "Changelog", "Blog"] },
              { h: "Company", items: ["About", "Careers", "Contact"] },
              { h: "Legal", items: ["Privacy", "Terms"] },
            ].map((col) => (
              <div key={col.h}>
                <h4 className="text-[10px] uppercase tracking-widest mb-4" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                  {col.h}
                </h4>
                <ul className="space-y-2">
                  {col.items.map((it) => (
                    <li key={it} className="text-xs text-[#5c5343]">
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="text-center text-[10px] text-[#8a8069] pb-8">
            © 2026 Fabion Studio · Built for developers, by developers.
          </div>
        </footer>

        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} startInSignUp={authMode} />
      </div>
    </>
  );
}
