import Head from "next/head";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, get, set, push, remove } from "firebase/database";
import { auth, db } from "../lib/firebaseClient";

function deriveTitle(text) {
  const trimmed = text.trim();
  return trimmed.length > 40 ? trimmed.slice(0, 40) + "…" : trimmed;
}

function CodeBlock({ code, language, onOpenCanvas }) {
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
            onClick={() => onOpenCanvas(code, language)}
            className="text-[10px] uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
          >
            Open editor
          </button>
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

function FormattedText({ text, onOpenCanvas }) {
  const segments = text.split(/(```[\s\S]*?```)/g);
  return (
    <>
      {segments.map((segment, i) => {
        if (segment.startsWith("```")) {
          const match = segment.match(/```(\w+)?\n?([\s\S]*?)```/);
          const language = match?.[1] || "";
          const code = (match?.[2] || segment.replace(/```/g, "")).trim();
          return (
            <CodeBlock key={i} code={code} language={language} onOpenCanvas={onOpenCanvas} />
          );
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

const PREVIEWABLE = ["html", "css"];

function CanvasPanel({ code, language, onChange, onClose }) {
  const [tab, setTab] = useState("preview");
  const canPreview = PREVIEWABLE.includes((language || "").toLowerCase());

  const previewDoc = useMemo(() => {
    if (!canPreview) return "";
    if (language.toLowerCase() === "html") return code;
    return `<html><head><style>${code}</style></head><body><p style="font-family:sans-serif;color:#888;padding:2rem;">CSS preview — add matching HTML to see it fully rendered.</p></body></html>`;
  }, [code, language, canPreview]);

  return (
    <div className="w-[45%] min-w-[360px] border-l border-neutral-200 flex flex-col h-screen shrink-0 bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-widest text-neutral-500">
            {language || "code"}
          </span>
          {canPreview && (
            <div className="flex rounded-full border border-neutral-200 overflow-hidden text-[10px]">
              <button
                onClick={() => setTab("preview")}
                className={`px-3 py-1 uppercase tracking-widest transition-colors ${
                  tab === "preview" ? "bg-neutral-900 text-white" : "text-neutral-500"
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setTab("code")}
                className={`px-3 py-1 uppercase tracking-widest transition-colors ${
                  tab === "code" ? "bg-neutral-900 text-white" : "text-neutral-500"
                }`}
              >
                Code
              </button>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-900 transition-colors text-sm"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {canPreview && tab === "preview" ? (
          <iframe
            title="preview"
            srcDoc={previewDoc}
            sandbox=""
            className="w-full h-full bg-white"
          />
        ) : (
          <textarea
            value={code}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            className="w-full h-full p-4 bg-neutral-900 text-neutral-100 text-xs font-mono leading-relaxed resize-none focus:outline-none"
          />
        )}
      </div>
    </div>
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
  const [showEffort, setShowEffort] =
