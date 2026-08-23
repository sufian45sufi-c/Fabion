/**
 * packages/core/index.js
 *
 * The core contracts for Fabion.
 *
 * Every other package imports from here.
 * Nothing in core depends on anything else in Fabion.
 * It is the foundation — keep it simple and stable.
 *
 * What lives here:
 *   - FabioState      — the states Fabio can be in
 *   - Tool            — what a tool looks like
 *   - Skill           — what a skill looks like
 *   - ModelProvider   — what a model adapter looks like
 *   - AgentEvent      — events the agent emits while working
 *   - Logger          — a simple logger used everywhere
 */

// ─── Fabio States ─────────────────────────────────────────────────────────────
//
// Fabio is the visual identity of the agent.
// These states drive both the desktop animation and the CLI display.

export const FabioState = {
  IDLE:     'idle',
  THINKING: 'thinking',
  WORKING:  'working',
  SUCCESS:  'success',
  ERROR:    'error',
  WAITING:  'waiting',
  SLEEPING: 'sleeping',
};

// ─── Tool ─────────────────────────────────────────────────────────────────────
//
// A Tool is something the agent can use to interact with the world.
// Every tool has a name, a description, and an execute() function.
// The permission level controls whether the agent needs to ask the user first.
//
// Permission levels:
//   read       — safe, read-only (list files, read file contents)
//   write      — creates or modifies files (ask if unsure)
//   execute    — runs shell commands (always explain what and why)
//   destructive — deletes things (always ask the user first)

export class Tool {
  constructor({ name, description, permission, execute }) {
    this.name        = name;
    this.description = description;
    this.permission  = permission; // 'read' | 'write' | 'execute' | 'destructive'
    this._execute    = execute;
  }

  /**
   * Run the tool.
   * Always returns { ok: true, output } or { ok: false, error }.
   * Never throws — errors are returned, not raised.
   */
  async execute(input) {
    try {
      const output = await this._execute(input);
      return { ok: true, output };
    } catch (err) {
      return { ok: false, error: err.message ?? String(err) };
    }
  }
}

// ─── Skill ────────────────────────────────────────────────────────────────────
//
// A Skill is a set of instructions the agent loads when it needs
// to do a specific kind of work — coding, debugging, git, etc.
// Skills are like system prompt extensions. They're modular and swappable.

export class Skill {
  constructor({ name, description, instructions, tools = [], examples = [] }) {
    this.name         = name;
    this.description  = description;
    this.instructions = instructions; // injected into the agent's context
    this.tools        = tools;        // list of tool names this skill uses
    this.examples     = examples;     // optional few-shot examples
  }
}

// ─── ModelProvider ────────────────────────────────────────────────────────────
//
// A ModelProvider is the adapter between the agent and a language model.
// The agent never talks to a model directly — it always goes through this.
// This means we can swap between Anthropic, OpenAI, Ollama, or our own model
// without changing any agent code.

export class ModelProvider {
  constructor({ id, name, description, isLocal = false }) {
    this.id          = id;
    this.name        = name;
    this.description = description;
    this.isLocal     = isLocal;
  }

  /**
   * Generate a response from a list of messages.
   * Returns { ok: true, text } or { ok: false, error }.
   * Subclasses must override this.
   */
  async generate(_messages, _options = {}) {
    throw new Error(`ModelProvider "${this.name}" must implement generate()`);
  }

  /**
   * Stream a response chunk by chunk.
   * Yields string chunks until done.
   * Subclasses can override this — default falls back to generate().
   */
  async *stream(messages, options = {}) {
    const result = await this.generate(messages, options);
    if (result.ok) {
      yield result.text;
    } else {
      yield `[Error: ${result.error}]`;
    }
  }

  /**
   * Check whether this provider is reachable.
   * Returns { ok: true } or { ok: false, error }.
   */
  async healthCheck() {
    throw new Error(`ModelProvider "${this.name}" must implement healthCheck()`);
  }
}

// ─── AgentEvent ───────────────────────────────────────────────────────────────
//
// The agent emits events while it works so the UI can react.
// Both the desktop and the CLI listen to these and update accordingly.

export const AgentEventType = {
  THINKING:       'thinking',       // agent is planning
  TOOL_CALL:      'tool_call',      // agent is about to use a tool
  TOOL_RESULT:    'tool_result',    // tool returned a result
  RESPONSE_CHUNK: 'response_chunk', // streaming text from the model
  DONE:           'done',           // agent finished the turn
  ERROR:          'error',          // something went wrong
};

// ─── Logger ───────────────────────────────────────────────────────────────────
//
// A minimal logger used across the entire codebase.
// Supports log levels and named contexts so you can tell where a log came from.
// Uses plain console — no external libraries.

export class Logger {
  constructor(context, level = 'info') {
    this.context = context;
    this.level   = level;

    // Level priority — lower number = more verbose
    this._levels = { debug: 0, info: 1, warn: 2, error: 3 };
  }

  _shouldLog(level) {
    return (this._levels[level] ?? 0) >= (this._levels[this.level] ?? 1);
  }

  _write(level, message, data) {
    if (!this._shouldLog(level)) return;
    const ts  = new Date().toISOString();
    const out = `[${ts}] [${level.toUpperCase()}] [${this.context}] ${message}`;
    if (level === 'error' || level === 'warn') {
      console.error(out, data ?? '');
    } else {
      console.log(out, data ?? '');
    }
  }

  debug(msg, data)  { this._write('debug', msg, data); }
  info(msg, data)   { this._write('info',  msg, data); }
  warn(msg, data)   { this._write('warn',  msg, data); }
  error(msg, data)  { this._write('error', msg, data); }

  // Create a child logger with a sub-context label
  child(subContext) {
    return new Logger(`${this.context}:${subContext}`, this.level);
  }
}

// The root logger — everyone else calls rootLogger.child('their-name')
export const rootLogger = new Logger('fabion');
