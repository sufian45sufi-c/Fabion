import { useState, useMemo, useRef, useEffect } from "react";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const EXT_LANGUAGE_MAP = {
  html: "html", css: "css", js: "javascript", jsx: "javascript",
  ts: "typescript", tsx: "typescript", py: "python", json: "json", md: "markdown",
};

function languageFromFilename(name) {
  const ext = name.split(".").pop()?.toLowerCase();
  return EXT_LANGUAGE_MAP[ext] || "plaintext";
}

export default function CodeWorkspace({ initialFiles, initialActive, onClose }) {
  const [files, setFiles] = useState(initialFiles);
  const [activeFile, setActiveFile] = useState(initialActive);
  const [view, setView] = useState("code"); // "code" | "preview"
  const [renamingFile, setRenamingFile] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const debounceRef = useRef(null);
  const [previewDoc, setPreviewDoc] = useState("");

  const fileNames = useMemo(() => Object.keys(files), [files]);
  const hasHtml = fileNames.some((f) => f.toLowerCase().endsWith(".html"));

  const buildPreview = () => {
    const htmlFile = fileNames.find((f) => f.toLowerCase().endsWith(".html"));
    const cssFiles = fileNames.filter((f) => f.toLowerCase().endsWith(".css"));
    const jsFiles = fileNames.filter((f) => f.toLowerCase().endsWith(".js") || f.toLowerCase().endsWith(".jsx"));

    let doc = htmlFile ? files[htmlFile] : "<!DOCTYPE html><html><head></head><body></body></html>";

    const styleTags = cssFiles.map((f) => `<style>\n${files[f]}\n</style>`).join("\n");
    const scriptTags = jsFiles.map((f) => `<script>\n${files[f]}\n<\/script>`).join("\n");

    if (doc.includes("</head>")) {
      doc = doc.replace("</head>", `${styleTags}\n</head>`);
    } else {
      doc = styleTags + doc;
    }

    if (doc.includes("</body>")) {
      doc = doc.replace("</body>", `${scriptTags}\n</body>`);
    } else {
      doc = doc + scriptTags;
    }

    setPreviewDoc(doc);
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(buildPreview, 400);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const handleEditorChange = (value) => {
    setFiles((prev) => ({ ...prev, [activeFile]: value ?? "" }));
  };

  const handleAddFile = () => {
    let base = "untitled.txt";
    let n = 1;
    while (files[base]) {
      base = `untitled${n}.txt`;
      n += 1;
    }
    setFiles((prev) => ({ ...prev, [base]: "" }));
    setActiveFile(base);
  };

  const handleDeleteFile = (name) => {
    setFiles((prev) => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
    if (activeFile === name) {
      const remaining = fileNames.filter((f) => f !== name);
      setActiveFile(remaining[0] || null);
    }
  };

  const commitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== renamingFile && !files[trimmed]) {
      setFiles((prev) => {
        const updated = { ...prev };
        updated[trimmed] = updated[renamingFile];
        delete updated[renamingFile];
        return updated;
      });
      if (activeFile === renamingFile) setActiveFile(trimmed);
    }
    setRenamingFile(null);
  };

  const handleDownloadAll = () => {
    fileNames.forEach((name) => {
      const blob = new Blob([files[name]], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="w-[50%] min-w-[420px] border-l border-zinc-800 flex flex-col h-screen shrink-0 bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-400">
            Editor
          </span>
          {hasHtml && (
            <div className="flex rounded-full border border-zinc-800 overflow-hidden text-[10px]">
              <button
                onClick={() => setView("code")}
                className={`px-3 py-1 uppercase tracking-widest transition-colors ${
                  view === "code" ? "bg-white text-black" : "text-zinc-400"
                }`}
              >
                Code
              </button>
              <button
                onClick={() => setView("preview")}
                className={`px-3 py-1 uppercase tracking-widest transition-colors ${
                  view === "preview" ? "bg-white text-black" : "text-zinc-400"
                }`}
              >
                Preview
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadAll}
            className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
          >
            Download all
          </button>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-sm">
            ✕
          </button>
        </div>
      </div>

      {view === "code" ? (
        <div className="flex flex-1 overflow-hidden">
          {/* File tree */}
          <div className="w-40 border-r border-zinc-800 overflow-y-auto shrink-0 p-2">
            <button
              onClick={handleAddFile}
              className="w-full text-left text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white transition-colors px-2 py-2 mb-1"
            >
              + New file
            </button>
            {fileNames.map((name) => (
              <div
                key={name}
                className={`group flex items-center rounded-md mb-0.5 ${
                  activeFile === name ? "bg-zinc-800" : "hover:bg-zinc-900"
                }`}
              >
                {renamingFile === name ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setRenamingFile(null);
                    }}
                    className="w-full bg-zinc-950 border border-zinc-700 text-white text-[11px] px-2 py-1.5 rounded-md focus:outline-none"
                  />
                ) : (
                  <>
                    <button
                      onClick={() => setActiveFile(name)}
                      onDoubleClick={() => {
                        setRenamingFile(name);
                        setRenameValue(name);
                      }}
                      className={`flex-1 text-left text-[11px] px-2 py-1.5 truncate ${
                        activeFile === name ? "text-white" : "text-zinc-400"
                      }`}
                      title="Double-click to rename"
                    >
                      {name}
                    </button>
                    <button
                      onClick={() => handleDeleteFile(name)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity px-1.5 text-[11px]"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            {activeFile ? (
              <MonacoEditor
                key={activeFile}
                height="100%"
                theme="vs-dark"
                path={activeFile}
                language={languageFromFilename(activeFile)}
                value={files[activeFile] || ""}
                onChange={handleEditorChange}
                options={{
                  fontSize: 13,
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 12 },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
                No file selected
              </div>
            )}
          </div>
        </div>
      ) : (
        <iframe title="preview" srcDoc={previewDoc} sandbox="allow-scripts" className="w-full h-full bg-white flex-1" />
      )}
    </div>
  );
}
