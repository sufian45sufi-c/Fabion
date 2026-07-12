import { useState, useRef, useEffect } from "react";

export default function AgentBrowser({ sessionId, onClose }) {
  const [screenshot, setScreenshot] = useState(null);
  const [currentUrl, setCurrentUrl] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState([]);
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const addLog = (entry) => setLog((prev) => [...prev.slice(-50), entry]);

  const performAction = async (action, label) => {
    setLoading(true);
    addLog(`→ ${label}`);
    try {
      const res = await fetch("/api/browser-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action }),
      });
      const data = await res.json();

      if (data.error) {
        addLog(`✕ Error: ${data.error}`);
      } else {
        setScreenshot(data.screenshot);
        setCurrentUrl(data.url);
        addLog(`✓ ${data.title || data.url}`);
      }
    } catch (err) {
      addLog(`✕ Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    let url = urlInput.trim();
    if (!url.startsWith("http")) url = "https://" + url;
    performAction({ type: "navigate", url }, `Navigating to ${url}`);
  };

  const handleClose = async () => {
    fetch("/api/browser-close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});
    onClose();
  };

  return (
    <div className="w-[55%] min-w-[480px] border-l border-zinc-800 flex flex-col h-screen shrink-0 bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-400">SearchFab</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${loading ? "bg-zinc-800 text-zinc-400" : "bg-green-900/40 text-green-400"}`}>
            {loading ? "Working..." : "Ready"}
          </span>
        </div>
        <button onClick={handleClose} className="text-zinc-500 hover:text-white transition-colors text-sm">✕</button>
      </div>

      <form onSubmit={handleNavigate} className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 shrink-0">
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Enter a URL, or let the AI navigate..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
        />
        <button type="submit" disabled={loading} className="text-[10px] uppercase tracking-widest bg-white text-black px-3 py-1.5 rounded-full disabled:opacity-50">
          Go
        </button>
      </form>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
          {screenshot ? (
            <img src={`data:image/png;base64,${screenshot}`} alt="Browser view" className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="text-zinc-600 text-sm">No page loaded yet — enter a URL or ask the AI to browse somewhere.</div>
          )}
        </div>

        <div className="h-32 border-t border-zinc-800 overflow-y-auto px-4 py-2 font-mono text-[11px] text-zinc-400 shrink-0">
          {log.map((entry, i) => (
            <div key={i}>{entry}</div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
