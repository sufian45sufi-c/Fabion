/**
 * apps/desktop/renderer/app.js
 *
 * All UI logic for the Fabion desktop.
 *
 * This file runs in the browser context (inside Electron's renderer process).
 * It cannot access Node.js directly — it talks to the main process
 * only through window.fabion (defined in preload.js).
 *
 * Responsibilities:
 *   - Build and mount the UI into #app
 *   - Handle user input (prompt bar, dock buttons)
 *   - Display messages in the chat view
 *   - Communicate with the backend at /api/chat
 *   - Update Fabio's visual state
 *
 * What this file does NOT do:
 *   - No agent logic (that's in packages/agents)
 *   - No model logic (that's in packages/core)
 *   - No window management (that's in main.js)
 */

// ─── SVG icons ─────────────────────────────────────────────────────────────
// Inline SVGs — no external icon library needed.

const icons = {
  folder: `<svg viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>`,
  github: `<svg viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.72-4.03-1.42-4.03-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.19.69.8.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>`,
  groups: `<svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`,
  camera: `<svg viewBox="0 0 24 24"><path d="M20 5h-3.17L15 3H9L7.17 5H4C2.9 5 2 5.9 2 7v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-8 13c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`,
  attach: `<svg viewBox="0 0 24 24"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>`,
  mic:    `<svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>`,
  send:   `<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`,
  stop:   `<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>`,
};

// ─── App state ─────────────────────────────────────────────────────────────

const state = {
  messages:    [],      // full conversation history
  isChatting:  false,   // whether the chat view is showing
  isGenerating: false,  // whether a response is being generated
  abortController: null,
  currentFolder: null,
};

// ─── Mount ─────────────────────────────────────────────────────────────────
// Build the HTML structure and inject it into #app.
// Called once on page load.

function mount() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <main>

      <!-- Fabio mascot — click to wake him -->
      <div class="fabio-wrap" id="fabio-wrap">
        <img src="../public/fabio.png" alt="Fabio" draggable="false" />
      </div>

      <!-- Main workspace card -->
      <div class="workspace">

        <!-- Content area: shows initial view or chat -->
        <div class="content-area">

          <!-- Shown before any message is sent -->
          <div class="initial-view" id="initial-view">
            <button class="choose-folder-btn" id="btn-folder">
              ${icons.folder}
              <span>Choose folder</span>
            </button>
          </div>

          <!-- Chat messages appear here -->
          <div class="chat-view" id="chat-view">
            <div id="messages-scroll"></div>
          </div>

        </div>

        <!-- Status bar at the bottom of the card -->
        <div class="statusbar">
          <div class="statusbar-item" id="folder-item">
            ${icons.folder}
            <span id="folder-label">no folder open</span>
          </div>
          <span class="statusbar-sep">|</span>
          <div class="statusbar-item">
            ${icons.github}
            <span>Repository</span>
          </div>
        </div>

      </div>

      <!-- Prompt row: dock buttons + input bar -->
      <div class="prompt-row">

        <!-- Floating action dock (left of the prompt bar) -->
        <div class="dock-left">
          <button class="dock-btn" id="btn-team"   title="Agent Team">${icons.groups}</button>
          <button class="dock-btn" id="btn-snap"   title="Snapshot">${icons.camera}</button>
          <button class="dock-btn" id="btn-attach" title="Attach files">${icons.attach}</button>
        </div>

        <!-- Pill-shaped prompt input -->
        <div class="prompt-bar">
          <input
            id="prompt-input"
            class="prompt-input"
            type="text"
            placeholder="Ask Fabio, Cody, or Slyte to do something..."
            autocomplete="off"
            spellcheck="false"
          />
          <button class="prompt-send" id="btn-send">
            <span id="send-icon">${icons.mic}</span>
          </button>
        </div>

      </div>

    </main>
  `;

  attachEventListeners();
}

// ─── Event listeners ────────────────────────────────────────────────────────
// Called once after mount(). Binds all interaction to DOM elements.

function attachEventListeners() {
  const promptInput = document.getElementById('prompt-input');
  const sendBtn     = document.getElementById('btn-send');

  // Update the send button icon as the user types
  promptInput.addEventListener('input', () => updateSendIcon());

  // Enter key sends the message
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Send button
  sendBtn.addEventListener('click', handleSend);

  // Fabio — click to wake him up
  document.getElementById('fabio-wrap').addEventListener('click', wakeFabio);

  // Choose folder button
  document.getElementById('btn-folder').addEventListener('click', chooseFolder);

  // Dock buttons
  document.getElementById('btn-team').addEventListener('click', () => {
    fillAndSend('Review the current project and tell me what should be improved.');
  });
  document.getElementById('btn-snap').addEventListener('click', () => {
    fillAndSend('Take a snapshot of the current workspace and analyze it.');
  });
  document.getElementById('btn-attach').addEventListener('click', handleAttach);
}

// ─── Send icon state ────────────────────────────────────────────────────────
// The icon changes depending on what's happening:
//   - Empty input, not generating → mic
//   - Text in input, not generating → send arrow
//   - Generating → stop square

function updateSendIcon() {
  const input    = document.getElementById('prompt-input');
  const sendBtn  = document.getElementById('btn-send');
  const sendIcon = document.getElementById('send-icon');

  if (state.isGenerating) {
    sendIcon.innerHTML    = icons.stop;
    sendBtn.className     = 'prompt-send stopping';
    return;
  }

  if (input.value.trim().length > 0) {
    sendIcon.innerHTML = icons.send;
    sendBtn.className  = 'prompt-send has-text';
  } else {
    sendIcon.innerHTML = icons.mic;
    sendBtn.className  = 'prompt-send';
  }
}

// ─── Handle send ────────────────────────────────────────────────────────────

async function handleSend() {
  // If generating, clicking send stops the generation
  if (state.isGenerating) {
    stopGeneration();
    return;
  }

  const input = document.getElementById('prompt-input');
  const text  = input.value.trim();
  if (!text) return;

  // Switch to chat view on first message
  showChatView();

  // Add user message to state and render it
  state.messages.push({ role: 'user', content: text });
  input.value = '';
  updateSendIcon();
  renderMessages();

  // Send to backend
  await sendToBackend(text);
}

// ─── Backend communication ─────────────────────────────────────────────────
// Sends the conversation to /api/chat and handles the response.
// Supports both streaming (SSE) and plain JSON responses.

async function sendToBackend(userText) {
  if (state.isGenerating) return;

  state.isGenerating    = true;
  state.abortController = new AbortController();
  updateSendIcon();

  // Add an empty assistant message that will fill in as the response streams
  const assistantMsg = { role: 'assistant', content: '' };
  state.messages.push(assistantMsg);
  const assistantIndex = state.messages.length - 1;

  // Show thinking dots while waiting for the first chunk
  showThinkingDots();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: state.messages.slice(0, -1), // don't send the empty assistant turn
        agent:    'Fabio',
      }),
      signal: state.abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    // Handle streaming vs plain JSON
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      // Plain JSON response
      const data = await response.json();
      state.messages[assistantIndex].content = extractText(data);
      renderMessages();
    } else {
      // Streaming response (SSE)
      await readStream(response, assistantIndex);
    }

  } catch (err) {
    if (err.name === 'AbortError') {
      // User pressed stop — keep whatever was generated so far
      if (!state.messages[assistantIndex].content) {
        state.messages[assistantIndex].content = 'Stopped.';
      }
    } else {
      // Backend not connected yet — show a friendly message
      state.messages[assistantIndex].content =
        'No backend connected yet.\n\n' +
        'The agent runtime will be connected in Phase 3. ' +
        'The UI, Fabio, and the prompt bar are all working correctly.';
    }
    renderMessages();

  } finally {
    state.isGenerating    = false;
    state.abortController = null;
    updateSendIcon();
  }
}

// ─── Stream reader ──────────────────────────────────────────────────────────
// Reads a Server-Sent Events stream and appends chunks to the message.

async function readStream(response, assistantIndex) {
  const reader  = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer    = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      if (buffer.trim()) processChunk(buffer, assistantIndex);
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by double newlines
    const parts = buffer.split(/\n\n/);
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      processChunk(part, assistantIndex);
    }
  }
}

function processChunk(chunk, assistantIndex) {
  for (const line of chunk.split(/\r?\n/)) {
    let data = line.trim();
    if (!data || data.startsWith('event:')) continue;
    if (data.startsWith('data:')) data = data.slice(5).trim();
    if (!data || data === '[DONE]') continue;

    try {
      const parsed = JSON.parse(data);
      const text   = extractText(parsed);
      if (text) {
        state.messages[assistantIndex].content += text;
        renderMessages();
      }
    } catch {
      // Raw text streaming (not JSON)
      state.messages[assistantIndex].content += data;
      renderMessages();
    }
  }
}

// ─── Extract text from various API response formats ─────────────────────────
// Different backends return text in different shapes.
// This handles the most common ones.

function extractText(data) {
  if (!data)                            return '';
  if (typeof data === 'string')         return data;
  if (typeof data.content === 'string') return data.content;
  if (typeof data.text    === 'string') return data.text;
  if (typeof data.response=== 'string') return data.response;

  // OpenAI-style
  if (Array.isArray(data.choices) && data.choices[0]) {
    const choice = data.choices[0];
    return choice.delta?.content ?? choice.message?.content ?? choice.text ?? '';
  }

  // Anthropic-style content blocks
  if (Array.isArray(data.content)) {
    return data.content.map(b => b.text ?? '').join('');
  }

  return '';
}

// ─── Render ─────────────────────────────────────────────────────────────────

function renderMessages() {
  const scroll = document.getElementById('messages-scroll');
  scroll.innerHTML = '';

  for (const msg of state.messages) {
    const el = document.createElement('div');
    el.className = msg.role === 'user' ? 'msg-user' : 'msg-assistant';
    el.textContent = msg.content;
    scroll.appendChild(el);
  }

  scroll.scrollTop = scroll.scrollHeight;
}

function showThinkingDots() {
  const scroll = document.getElementById('messages-scroll');
  // Remove the empty assistant bubble and replace with animated dots
  const allBubbles = scroll.querySelectorAll('.msg-user, .msg-assistant');
  allBubbles[allBubbles.length - 1]?.remove();

  const dots = document.createElement('div');
  dots.className = 'thinking-dots';
  dots.id        = 'thinking-dots';
  dots.innerHTML = '<span>●</span><span>●</span><span>●</span>';
  scroll.appendChild(dots);
  scroll.scrollTop = scroll.scrollHeight;
}

// ─── View switching ─────────────────────────────────────────────────────────

function showChatView() {
  if (state.isChatting) return;
  state.isChatting = true;
  document.getElementById('initial-view').classList.add('hidden');
  document.getElementById('chat-view').classList.add('active');
}

// ─── Actions ────────────────────────────────────────────────────────────────

function wakeFabio() {
  showChatView();
  state.messages.push({ role: 'assistant', content: 'Fabio is ready. What are we building?' });
  renderMessages();
}

function chooseFolder() {
  // In Electron, this would open a native folder picker via IPC.
  // For now, update the label as a placeholder.
  document.getElementById('folder-label').textContent = 'workspace_dir';
  state.currentFolder = 'workspace_dir';
}

function fillAndSend(text) {
  const input = document.getElementById('prompt-input');
  input.value = text;
  updateSendIcon();
  handleSend();
}

function handleAttach() {
  const fileInput    = document.createElement('input');
  fileInput.type     = 'file';
  fileInput.multiple = true;

  fileInput.onchange = (e) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const names = files.map(f => f.name).join(', ');
    showChatView();
    state.messages.push({ role: 'user', content: `Attached: ${names}` });
    renderMessages();
    fillAndSend(`Files attached: ${names}. What should I do with them?`);
  };

  fileInput.click();
}

function stopGeneration() {
  state.abortController?.abort();
}

// ─── Boot ───────────────────────────────────────────────────────────────────
// Mount the UI when the page loads.

mount();
