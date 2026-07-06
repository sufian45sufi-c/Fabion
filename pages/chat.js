import Head from "next/head";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, get, set, push } from "firebase/database";
import { auth, db } from "../lib/firebaseClient";

function deriveTitle(text) {
  const trimmed = text.trim();
  return trimmed.length > 40 ? trimmed.slice(0, 40) + "…" : trimmed;
}

function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const extMap = {
      javascript: "js", js: "js", python: "py", html: "html", css: "css",
      json: "json", typescript: "ts", jsx: "jsx", tsx: "tsx", bash: "sh", shell: "sh",
    };
    const ext = extMap[language?.toLowerCase()] || "txt";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `snippet.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-neutral-800">
      <div className="flex items-center justify-between bg-neutral-800 px-4 py-2">
        <span className="text-[10px] uppercase tracking-widest text-neutral-400">
          {language || "code"}
        </span>
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="text-[10px] uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="text-[10px] uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
          >
            Download
          </button>
        </div>
      </div>
      <pre className="bg-neutral-900 text-neutral-100 p-4 overflow-x-auto text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function FormattedText({ text }) {
  const segments = text.split(/(```[\s\S]*?```)/g);
  return (
    <>
      {segments.map((segment, i) => {
        if (segment.startsWith("```")) {
          const match = segment.match(/```(\w+)?\n?([\s\S]*?)```/);
          const language = match?.[1] || "";
          const code = (match?.[2] || segment.replace(/```/g, "")).trim();
          return <CodeBlock key={i} code={code} language={language} />;
        }
        const boldParts = segment.split(/(\*\*[^*]+\*\*)/g);
        return (
          <span key={i}>
            {boldParts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={j}>{part.slice(2, -2)}</strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
          </span>
        );
      })}
    </>
  );
}

const PERSONAS = [
  { value: "thread", label: "Thread 1.0", desc: "Ultra-fast, direct answers" },
  { value: "pixel", label: "Pixel 1.0", desc: "Sharp, structured, code-focused" },
  { value: "cell", label: "Cell 1.0", desc: "Creative, multi-step reasoning" },
];

const EFFORTS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium", isDefault: true },
  { value: "high", label: "High" },
  { value: "extra", label: "Extra" },
  { value: "max", label: "Max" },
];

function ModelDropdown({ persona, setPersona, effort, setEffort, thinking, setThinking }) {
  const [open, setOpen] = useState(false);
  const [showEffort, setShowEffort] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setShowEffort(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activePersona = PERSONAS.find((p) => p.value === persona);
  const activeEffort = EFFORTS.find((e) => e.value === effort);
  const isReasoningCapable = effort === "extra" || effort === "max";

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => {
          setOpen(!open);
          setShowEffort(false);
        }}
        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-full border border-neutral-200 hover:border-neutral-400 transition-colors"
      >
        <span className="font-medium">{activePersona?.label}</span>
        <span className="text-neutral-400">{activeEffort?.label}</span>
        <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && !showEffort && (
        <div className="absolute bottom-full mb-2 left-0 w-72 bg-white border border-neutral-200 rounded-xl shadow-xl overflow-hidden z-50">
          {PERSONAS.map((p) => (
            <button
              key={p.value}
              onClick={() => {
                setPersona(p.value);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-neutral-50 transition-colors flex items-center justify-between"
            >
              <div>
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-xs text-neutral-400">{p.desc}</div>
              </div>
              {persona === p.value && (
                <svg className="w-4 h-4 text-neutral-900 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}

          <div className="border-t border-neutral-100">
            <button
              onClick={() => setShowEffort(true)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors"
            >
              <span className="text-sm font-medium">Effort</span>
              <span className="text-xs text-neutral-400 flex items-center gap-1">
                {activeEffort?.label}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 18l6-6-6-6" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      )}

      {open && showEffort && (
        <div className="absolute bottom-full mb-2 left-0 w-72 bg-white border border-neutral-200 rounded-xl shadow-xl overflow-hidden z-50">
          <button
            onClick={() => setShowEffort(false)}
            className="w-full text-left px-4 py-3 text-xs text-neutral-400 hover:bg-neutral-50 transition-colors border-b border-neutral-100"
          >
            ← Back
          </button>
          {EFFORTS.map((e) => (
            <button
