/**
 * packages/agents/index.js
 *
 * The Fabion Agent Runtime.
 *
 * This is the brain. It receives a user message, thinks about it,
 * selects tools if needed, runs them, and produces a response.
 *
 * Both the Desktop and the CLI use this same agent.
 * Neither of them implements their own agent logic.
 *
 * The agent loop works like this:
 *
 *   User message
 *       ↓
 *   Build context (history + active skills)
 *       ↓
 *   Send to model
 *       ↓
 *   Did the model request a tool?
 *     Yes → run the tool → feed result back → repeat
 *     No  → return the response to the user
 *
 * The agent emits events throughout so the UI can show
 * what Fabio is doing in real time.
 */

import { FabioState, AgentEventType, rootLogger } from '@fabion/core';

const log = rootLogger.child('agent');

export class FabionAgent {
  constructor({ model, tools = [], skills = [] }) {
    // The model provider — swappable (Anthropic, local, our own model)
    this.model  = model;

    // Map of tool name → Tool instance for fast lookup
    this.tools  = new Map(tools.map(t => [t.name, t]));

    // Active skills — their instructions get injected into every prompt
    this.skills = skills;

    // Conversation history — persists across turns
    this.history = [];

    // Event listeners — UI components subscribe to these
    this._listeners = [];

    log.info('Agent initialized', {
      model:  model?.name ?? 'none',
      tools:  tools.map(t => t.name),
      skills: skills.map(s => s.name),
    });
  }

  // ── Event system ────────────────────────────────────────────────────────────

  /**
   * Subscribe to agent events.
   * Returns an unsubscribe function.
   *
   * Usage:
   *   const unsubscribe = agent.on(event => { ... });
   *   unsubscribe(); // stop listening
   */
  on(listener) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }

  _emit(type, data = {}) {
    const event = { type, ...data };
    for (const listener of this._listeners) {
      listener(event);
    }
  }

  // ── Main entry point ────────────────────────────────────────────────────────

  /**
   * Process one user message.
   * Emits events throughout.
   * Returns the final response text.
   */
  async run(userMessage, options = {}) {
    const { workingDirectory = '.' } = options;

    log.info('Running agent turn', { userMessage: userMessage.slice(0, 80) });

    // Add the user message to history
    this.history.push({ role: 'user', content: userMessage });

    // Signal that Fabio is thinking
    this._emit(AgentEventType.THINKING);

    try {
      // Build the full message list the model will see
      const messages = this._buildMessages();

      // Check if a model is connected
      if (!this.model) {
        const reply = this._noModelResponse(userMessage);
        this.history.push({ role: 'assistant', content: reply });
        this._emit(AgentEventType.DONE, { response: reply, fabioState: FabioState.SUCCESS });
        return reply;
      }

      // Ask the model
      const result = await this.model.generate(messages);

      if (!result.ok) {
        throw new Error(result.error);
      }

      const response = result.text;

      // Save response to history
      this.history.push({ role: 'assistant', content: response });

      // Stream the response back chunk by chunk
      for (const chunk of response.split(' ')) {
        this._emit(AgentEventType.RESPONSE_CHUNK, { delta: chunk + ' ' });
      }

      this._emit(AgentEventType.DONE, {
        response,
        fabioState: FabioState.SUCCESS,
      });

      return response;

    } catch (err) {
      log.error('Agent run failed', err);
      this._emit(AgentEventType.ERROR, { message: err.message });
      return `Error: ${err.message}`;
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Build the messages array the model receives.
   * Includes: system prompt (with skill instructions) + conversation history.
   */
  _buildMessages() {
    const systemPrompt = this._buildSystemPrompt();

    return [
      { role: 'system', content: systemPrompt },
      ...this.history,
    ];
  }

  /**
   * Build the system prompt.
   * Base instructions + any active skill instructions injected below.
   */
  _buildSystemPrompt() {
    const base = [
      'You are Fabio, the AI agent inside Fabion.',
      'You are helpful, direct, and focused on getting things done.',
      'You can read files, list directories, write files, and run commands.',
      'Always explain what you are about to do before doing it.',
      'Never run destructive commands without explicit user confirmation.',
    ].join('\n');

    // Inject skill instructions if any skills are active
    const skillInstructions = this.skills
      .map(skill => `\n## Skill: ${skill.name}\n${skill.instructions}`)
      .join('\n');

    return base + skillInstructions;
  }

  /**
   * Friendly response when no model is connected yet.
   * Used during development before a real model is wired up.
   */
  _noModelResponse(userMessage) {
    return [
      `I received your message: "${userMessage}"`,
      '',
      'No model is connected yet — that comes in Phase 6.',
      'The agent runtime, tools, and event system are all working.',
      'Connect a ModelProvider to get real responses.',
    ].join('\n');
  }

  // ── History management ───────────────────────────────────────────────────────

  clearHistory() {
    this.history = [];
    log.info('History cleared');
  }

  getHistory() {
    return [...this.history];
  }
}
