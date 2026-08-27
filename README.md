# Fabion

> AI-native desktop workspace · Agentic CLI · Fabion Model

**Fabion** is an AI environment where Fabio can actually work with you and your computer.
Not a chatbot wrapper. Not a dashboard. A workspace.

---

## What is Fabion?

| Component          | Description                                |
| ------------------ | ------------------------------------------ |
| **Fabion Desktop** | Floating, spatial Electron workspace       |
| **Fabion CLI**     | Agentic coding tool — `fabion "build X"`   |
| **Fabion Model**   | Our own transformer model research project |

The mascot and identity of the platform is **Fabio** — the visual representation of the agent.

---

## Quick start (Codespaces or local)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/fabion.git
cd fabion

# 2. Run setup (installs pnpm and dependencies)
./scripts/setup.sh

# 3a. Run the CLI
pnpm dev:cli

# 3b. Run the Desktop (requires a display)
pnpm dev:desktop
```

### Environment variables

The CLI uses OpenRouter when `OPENROUTER_API_KEY` is set, or SiliconFlow when
`SILICONFLOW_API_KEY` is set. Set an optional `FABION_MODEL` to override the
provider's default model:

```bash
export OPENROUTER_API_KEY=your-api-key-here
export FABION_MODEL=your-model-id              # optional
pnpm dev:cli
```

Alternatively, use SiliconFlow:

```bash
export SILICONFLOW_API_KEY=your-api-key-here
pnpm dev:cli
```

Without either key, the CLI still runs in offline mode and explains that no
model is connected.

---

## Repository structure

```
fabion/
├── apps/
│   ├── desktop/          Electron + Vite desktop application
│   └── cli/              Fabion CLI binary
│
├── packages/
│   ├── shared/           Cross-cutting types, logger, utilities
│   ├── core/             Tool, Skill, Model, Agent interfaces
│   ├── model-runtime/    Model adapter implementations
│   ├── agents/           Agent runtime (Phase 3)
│   ├── tools/            Built-in tools: read_file, git, etc. (Phase 3)
│   ├── skills/           Modular skill system (Phase 5)
│   └── workspace/        Workspace context (Phase 3)
│
├── model/                Fabion Model research (Phase 7)
│   ├── tokenizer/
│   ├── architecture/
│   ├── training/
│   └── ...
│
├── assets/
│   └── fabio/            Fabio SVG and animation assets
│
├── docs/                 Architecture decisions and guides
└── scripts/              Dev and setup scripts
```

---

## Development phases

| Phase | Status          | Description                                  |
| ----- | --------------- | -------------------------------------------- |
| 1     | ✅ **Complete** | Monorepo foundation, CLI stub, Desktop shell |
| 2     | 🔲 Planned      | Desktop visual prototype                     |
| 3     | 🔲 Planned      | Agent runtime + tools                        |
| 4     | 🔲 Planned      | CLI agent connection                         |
| 5     | 🔲 Planned      | Skills system                                |
| 6     | 🔲 Planned      | Model abstraction                            |
| 7     | 🔲 Planned      | Fabion Model research                        |
| 8     | 🔲 Planned      | Full integration                             |

---

## Architecture

```
                    FABION
                       │
                ┌──────┴──────┐
                │             │
             Desktop         CLI
                │             │
                └──────┬──────┘
                       │
                 Agent Runtime
                       │
          ┌────────────┼────────────┐
          │            │            │
        Model        Tools        Skills
          │            │            │
          └────────────┼────────────┘
                       │
                   Workspace
                       │
              Files · Git · Terminal
```

The Desktop and CLI **do not** implement separate agent logic.
All agent behaviour lives in the shared runtime.

---

## Key design decisions

**Model adapter pattern** — The agent runtime never talks directly to a model.
It talks to a `ModelProvider` interface, which can be swapped between
local, remote, or the eventual Fabion Model without touching agent code.

**Low-powered hardware support** — Fabion does not require a large local GPU.
The architecture defaults to remote providers and adds local support optionally.

**Fabio is the identity** — Fabio is not an icon. Fabio is the visual
representation of the agent's current state and the core of Fabion's personality.

---

## License

MIT
