import Head from "next/head";
import { useState, useEffect } from "react";
import AuthModal from "../components/AuthModal";

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <Head>
        <title>Fabion | AI Agent</title>
        <link
          href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital@1&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div
        className="bg-[#0c0c0c] text-white min-h-screen selection:bg-white selection:text-black antialiased"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <nav
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between px-6 py-2 rounded-full border border-[#1f1f1f] transition-all duration-500 backdrop-blur-xl ${
            scrolled ? "bg-[#0c0c0c]/80 w-[90%] md:w-[700px] shadow-2xl" : "bg-[#0c0c0c]/40 w-[90%] md:w-[700px]"
          }`}
        >
          <div className="font-bold tracking-tighter text-sm cursor-pointer px-2">FABION</div>
          <div className="hidden md:flex gap-6 text-[10px] uppercase tracking-widest text-[#9A9A9A]">
            <a href="#models" className="hover:text-white transition-colors duration-300">
              Models
            </a>
            <a href="#features" className="hover:text-white transition-colors duration-300">
              Features
            </a>
            <a href="#demo" className="hover:text-white transition-colors duration-300">
              Demo
            </a>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => {
                setAuthMode(false);
                setAuthOpen(true);
              }}
              className="text-[10px] uppercase tracking-widest text-[#9A9A9A] hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthMode(true);
                setAuthOpen(true);
              }}
              className="text-[10px] uppercase tracking-widest bg-white text-black px-4 py-1.5 rounded-full hover:bg-gray-200 transition-all"
            >
              Sign Up
            </button>
          </div>
        </nav>

        <section id="hero" className="min-h-screen flex flex-col justify-center items-center px-6 pt-20">
          <h1
            className="text-[80px] md:text-[140px] italic leading-[0.9] mb-8 text-center"
            style={{ fontFamily: "'EB Garamond', serif" }}
          >
            Fabion
          </h1>
          <p className="text-[#9A9A9A] text-center max-w-sm mb-12 text-sm">
            The intelligence that works, not waits. Built for thinking, creating, and executing.
          </p>
          <div className="flex gap-4">
            
              href="#models"
              className="px-8 py-3 bg-white text-black text-[10px] uppercase tracking-widest font-bold rounded-full hover:scale-105 transition-transform"
            >
              Start Building
            </a>
          </div>
        </section>

        <section id="models" className="py-32 px-8 max-w-6xl mx-auto border-t border-[#1f1f1f]">
          <h2 className="text-4xl italic mb-20" style={{ fontFamily: "'EB Garamond', serif" }}>
            Three models. One intelligence.
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-8 border border-[#1f1f1f] rounded-2xl hover:border-white/20 transition-all bg-[#0e0e0e]">
              <h3 className="text-2xl mb-4" style={{ fontFamily: "'EB Garamond', serif" }}>
                Thread
              </h3>
              <p className="text-[#9A9A9A] text-sm leading-relaxed mb-8">
                Ultra-fast reasoning for quick, direct answers.
              </p>
              <div className="w-full h-[1px] bg-[#1f1f1f] mb-6" />
              <button className="text-[10px] uppercase tracking-widest text-[#9A9A9A] hover:text-white transition-colors">
                Explore →
              </button>
            </div>

            <div className="p-8 border border-[#1f1f1f] rounded-2xl hover:border-white/20 transition-all bg-[#0e0e0e]">
              <h3 className="text-2xl mb-4" style={{ fontFamily: "'EB Garamond', serif" }}>
                Pixel
              </h3>
              <p className="text-[#9A9A9A] text-sm leading-relaxed mb-8">
                Sharp, structured, and precise — built for code.
              </p>
              <div className="w-full h-[1px] bg-[#1f1f1f] mb-6" />
              <button className="text-[10px] uppercase tracking-widest text-[#9A9A9A] hover:text-white transition-colors">
                Explore →
              </button>
            </div>

            <div className="p-8 border border-[#1f1f1f] rounded-2xl hover:border-white/20 transition-all bg-[#0e0e0e]">
              <h3 className="text-2xl mb-4" style={{ fontFamily: "'EB Garamond', serif" }}>
                Cell
              </h3>
              <p className="text-[#9A9A9A] text-sm leading-relaxed mb-8">
                Creative, multi-step reasoning for complex problems.
              </p>
              <div className="w-full h-[1px] bg-[#1f1f1f] mb-6" />
              <button className="text-[10px] uppercase tracking-widest text-[#9A9A9A] hover:text-white transition-colors">
                Explore →
              </button>
            </div>
          </div>
        </section>

        <section id="features" className="py-32 px-8 max-w-6xl mx-auto border-t border-[#1f1f1f]">
          <h2 className="text-4xl italic mb-20" style={{ fontFamily: "'EB Garamond', serif" }}>
            Designed to disappear.
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-10 h-10 border border-[#1f1f1f] rounded-full flex items-center justify-center">
                <span className="text-xs text-[#9A9A9A]">01</span>
              </div>
              <h4 className="text-lg font-medium">Reasoning</h4>
              <p className="text-[#9A9A9A] text-sm">Engineered for high-throughput intelligent processing.</p>
            </div>
            <div className="space-y-4">
              <div className="w-10 h-10 border border-[#1f1f1f] rounded-full flex items-center justify-center">
                <span className="text-xs text-[#9A9A9A]">02</span>
              </div>
              <h4 className="text-lg font-medium">Code</h4>
              <p className="text-[#9A9A9A] text-sm">Engineered for high-throughput intelligent processing.</p>
            </div>
            <div className="space-y-4">
              <div className="w-10 h-10 border border-[#1f1f1f] rounded-full flex items-center justify-center">
                <span className="text-xs text-[#9A9A9A]">03</span>
              </div>
              <h4 className="text-lg font-medium">Research</h4>
              <p className="text-[#9A9A9A] text-sm">Engineered for high-throughput intelligent processing.</p>
            </div>
            <div className="space-y-4">
              <div className="w-10 h-10 border border-[#1f1f1f] rounded-full flex items-center justify-center">
                <span className="text-xs text-[#9A9A9A]">04</span>
              </div>
              <h4 className="text-lg font-medium">Automation</h4>
              <p className="text-[#9A9A9A] text-sm">Engineered for high-throughput intelligent processing.</p>
            </div>
            <div className="space-y-4">
              <div className="w-10 h-10 border border-[#1f1f1f] rounded-full flex items-center justify-center">
                <span className="text-xs text-[#9A9A9A]">05</span>
              </div>
              <h4 className="text-lg font-medium">Memory</h4>
              <p className="text-[#9A9A9A] text-sm">Engineered for high-throughput intelligent processing.</p>
            </div>
            <div className="space-y-4">
              <div className="w-10 h-10 border border-[#1f1f1f] rounded-full flex items-center justify-center">
                <span className="text-xs text-[#9A9A9A]">06</span>
              </div>
              <h4 className="text-lg font-medium">Multi-chat</h4>
              <p className="text-[#9A9A9A] text-sm">Engineered for high-throughput intelligent processing.</p>
            </div>
          </div>
        </section>

        <section id="demo"
