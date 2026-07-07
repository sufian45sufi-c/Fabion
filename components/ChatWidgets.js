import { useState, useRef, useEffect, useMemo } from "react";

export function CodeBlock({ code, language, onOpenCanvas }) {
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

export function FormattedText({ text, onOpenCanvas }) {
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

export function CanvasPanel({ code, language, onChange, onClose }) {
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

export function ModelDropdown({ persona, setPersona, effort, setEffort, thinking, setThinking }) {
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
              key={e.value}
              onClick={() => setEffort(e.value)}
              className="w-full text-left px-4 py-3 hover:bg-neutral-50 transition-colors flex items-center justify-between"
            >
              <span className="text-sm">
                {e.label}
                {e.isDefault && (
                  <span className="text-xs text-neutral-400 ml-2">Default</span>
                )}
              </span>
              {effort === e.value && (
                <svg className="w-4 h-4 text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}

          <div className="border-t border-neutral-100 px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Thinking</div>
              <div className="text-xs text-neutral-400">
                {isReasoningCapable ? "Show reasoning steps" : "Requires Extra or Max effort"}
              </div>
            </div>
            <button
              onClick={() => isReasoningCapable && setThinking(!thinking)}
              disabled={!isReasoningCapable}
              className={`w-10 h-5.5 rounded-full transition-colors relative shrink-0 ${
                thinking && isReasoningCapable ? "bg-neutral-900" : "bg-neutral-200"
              } ${!isReasoningCapable ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                  thinking && isReasoningCapable ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ChatListItem({ chat, isActive, onSelect, onRename, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(chat.title);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const commitRename = () => {
    const trimmed = draftTitle.trim();
    if (trimmed) onRename(chat.id, trimmed);
    setRenaming(false);
  };

  if (renaming) {
    return (
      <input
        autoFocus
        value={draftTitle}
        onChange={(e) => setDraftTitle(e.target.value)}
        onBlur={commitRename}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitRename();
          if (e.key === "Escape") setRenaming(false);
        }}
        className="w-full text-left px-4 py-2.5 rounded-lg text-sm mb-1 border border-neutral-300 focus:outline-none"
      />
    );
  }

  return (
    <div
      className={`group relative flex items-center rounded-lg mb-1 transition-colors ${
        isActive ? "bg-neutral-100" : "hover:bg-neutral-50"
      }`}
    >
      <button
        onClick={() => onSelect(chat.id)}
        className={`flex-1 text-left px-4 py-2.5 text-sm truncate ${
          isActive ? "font-medium" : "text-neutral-600"
        }`}
      >
        {chat.title}
      </button>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="px-2 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-neutral-900 transition-opacity"
      >
        ⋯
      </button>

      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 w-36 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 overflow-hidden"
        >
          <button
            onClick={() => {
              setRenaming(true);
              setMenuOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-xs hover:bg-neutral-50 transition-colors"
          >
            Rename
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              onDelete(chat.id);
            }}
            className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
