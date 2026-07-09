import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const DEFAULT_FILES = {
  "package.json": {
    file: {
      contents: JSON.stringify(
        {
          name: "fabion-workspace",
          type: "module",
          scripts: { dev: "vite" },
          dependencies: {},
          devDependencies: { vite: "^5.0.0" },
        },
        null,
        2
      ),
    },
  },
  "index.html": {
    file: {
      contents: `<!DOCTYPE html>
<html>
<head><title>Fabion Workspace</title></head>
<body>
  <h1>Hello from Fabion</h1>
  <script type="module" src="/main.js"></script>
</body>
</html>`,
    },
  },
  "main.js": {
    file: {
      contents: `console.log("Fabion workspace ready.");`,
    },
  },
};

const EXT_LANGUAGE_MAP = {
  html: "html", css: "css", js: "javascript", jsx: "javascript",
  ts: "typescript", tsx: "typescript", json: "json", md: "markdown",
};

function languageFromFilename(name) {
  const ext = name.split(".").pop()?.toLowerCase();
  return EXT_LANGUAGE_MAP[ext] || "plaintext";
}

// Flattens the WebContainer FS tree into a simple { path: contents } map for the file list
function flattenTree(tree, prefix = "") {
  let out = {};
  for (const [name, node] of Object.entries(tree)) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (node.file) {
      out[path] = node.file.contents;
    } else if (node.directory) {
      out = { ...out, ...flattenTree(node.directory, path) };
    }
  }
  return out;
}

export default function DevWorkspace({ initialFiles, onClose }) {
  const [status, setStatus] = useState("booting"); // booting | ready | error
  const [errorMsg, setErrorMsg] = useState("");
  const [fileMap, setFileMap] = useState({});
  const [activeFile, setActiveFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [terminalCollapsed, setTerminalCollapsed] = useState(false);

  const containerRef = useRef(null);
  const shellProcessRef = useRef(null);
  const terminalContainerRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const writerRef = useRef(null);
  const bootedRef = useRef(false);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    let disposed = false;

    async function boot() {
      try {
        const { WebContainer } = await import("@webcontainer/api");
        const container = await WebContainer.boot();
        if (disposed) return;
        containerRef.current = container;

        const treeToMount = initialFiles && Object.keys(initialFiles).length > 0
          ? Object.fromEntries(
              Object.entries(initialFiles).map(([name, contents]) => [
                name,
                { file: { contents } },
              ])
            )
          : DEFAULT_FILES;

        await container.mount(treeToMount);
        setFileMap(flattenTree(treeToMount));
        setActiveFile(Object.keys(treeToMount)[0]);

        container.on("server-ready", (port, url) => {
          setPreviewUrl(url);
        });

        // Boot the interactive shell
        const shellProcess = await container.spawn("jsh", { terminal: { cols: 80, rows: 24 } });
        shellProcessRef.current = shellProcess;

        const { Terminal } = await import("@xterm/xterm");
        const { FitAddon } = await import("@xterm/addon-fit");
        const term = new Terminal({
          convertEol: true,
          fontSize: 13,
          theme: { background: "#09090b", foreground: "#e4e4e7" },
        });
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalContainerRef.current);
        fitAddon.fit();
        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        shellProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              term.write(data);
            },
          })
        );

        const input = shellProcess.input.getWriter();
        writerRef.current = input;
        term.onData((data) => {
          input.write(data);
        });

        setStatus("ready");
      } catch (err) {
        console.error(err);
        setErrorMsg(
          err?.message?.includes("SharedArrayBuffer")
            ? "This browser blocked the required cross-origin isolation headers. Try a hard refresh, or a different browser (Chrome/Edge recommended)."
            : err?.message || "Failed to boot the workspace."
        );
        setStatus("error");
      }
    }

    boot();

    return () => {
      disposed = true;
      xtermRef.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleResize = () => fitAddonRef.current?.fit();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const runCommand = useCallback((cmd) => {
    if (!writerRef.current) return;
    writerRef.current.write(cmd + "\n");
  }, []);

  const handleEditorChange = async (value) => {
    if (!activeFile || !containerRef.current) return;
    setFileMap((prev) => ({ ...prev, [activeFile]: value ?? "" }));
    try {
      await containerRef.current.fs.writeFile(activeFile, value ?? "");
    } catch (err) {
      console.error("Write failed:", err);
    }
  };

  const fileNames = Object.keys(fileMap);

  return (
    <div className="w-[55%] min-w-[480px] border-l border-zinc-800 flex flex-col h-screen shrink-0 bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-400">
            Dev Workspace
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full ${
              status === "ready"
                ? "bg-green-900/40 text-green-400"
                : status === "error"
                ? "bg-red-900/40 text-red-400"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {status === "booting" ? "Booting..." : status === "ready" ? "Running" : "Error"}
          </span>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-sm">
          ✕
        </button>
      </div>

      {status === "error" && (
        <div className="p-4 text-sm text-red-400">{errorMsg}</div>
      )}

      {status !== "error" && (
        <>
          <div className="flex flex-1 overflow-hidden">
            {/* File tree */}
            <div className="w-40 border-r border-zinc-800 overflow-y-auto shrink-0 p-2">
              {fileNames.length === 0 && (
                <div className="text-zinc-600 text-[11px] px-2 py-2">Loading files...</div>
              )}
              {fileNames.map((name) => (
                <button
                  key={name}
                  onClick={() => setActiveFile(name)}
                  className={`w-full text-left text-[11px] px-2 py-1.5 rounded-md truncate mb-0.5 ${
                    activeFile === name ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-900"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>

            {/* Editor + preview split */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-hidden" style={{ flexBasis: previewUrl ? "50%" : "100%" }}>
                {activeFile ? (
                  <MonacoEditor
                    key={activeFile}
                    height="100%"
                    theme="vs-dark"
                    path={activeFile}
                    language={languageFromFilename(activeFile)}
                    value={fileMap[activeFile] || ""}
                    onChange={handleEditorChange}
                    options={{
                      fontSize: 13,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
                    {status === "booting" ? "Starting workspace..." : "No file selected"}
                  </div>
                )}
              </div>

              {previewUrl && (
                <div className="border-t border-zinc-800 shrink-0" style={{ height: "50%" }}>
                  <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
                    <span className="text-[10px] uppercase tracking-widest text-zinc-500">Preview</span>
                    <button
                      onClick={() => setPreviewUrl(previewUrl + "")}
                      className="text-[10px] text-zinc-500 hover:text-white transition-colors"
                    >
                      Refresh
                    </button>
                  </div>
                  <iframe title="live-preview" src={previewUrl} className="w-full h-full bg-white" />
                </div>
              )}
            </div>
          </div>

          {/* Terminal */}
          <div
            className={`border-t border-zinc-800 shrink-0 transition-all ${
              terminalCollapsed ? "h-9" : "h-56"
            }`}
          >
            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">Terminal</span>
                {status === "ready" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => runCommand("npm install")}
                      className="text-[10px] text-zinc-500 hover:text-white transition-colors"
                    >
                      npm install
                    </button>
                    <button
                      onClick={() => runCommand("npm run dev")}
                      className="text-[10px] text-zinc-500 hover:text-white transition-colors"
                    >
                      npm run dev
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setTerminalCollapsed(!terminalCollapsed)}
                className="text-zinc-500 hover:text-white transition-colors text-xs"
              >
                {terminalCollapsed ? "▲" : "▼"}
              </button>
            </div>
            <div
              ref={terminalContainerRef}
              className={terminalCollapsed ? "hidden" : "h-[calc(100%-30px)] px-2 py-1"}
            />
          </div>
        </>
      )}
    </div>
  );
}
