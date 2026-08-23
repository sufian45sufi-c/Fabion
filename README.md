# 🐾 Fabion

> **An AI-native desktop workspace, agentic CLI, and open-source AI model built around Fabio.**

Fabion is an open-source AI environment designed to go beyond the traditional chatbot.

Instead of simply asking an AI questions, Fabion is being built so an AI agent can **work alongside you** — understanding your projects, working with files, using tools, writing code, running commands, and helping you create.

At the center of Fabion is **Fabio**, the mascot and identity of the platform.

---

## ✦ The Vision

Fabion is built around one idea:

> **AI shouldn't just answer you. It should be able to work with you.**

Fabion combines a desktop environment, an agentic command-line interface, a shared agent runtime, a Skills system, and eventually its own AI model.

```text
                         FABION
                            │
              ┌─────────────┴─────────────┐
              │                           │
       FABION DESKTOP                FABION CLI
              │                           │
              └─────────────┬─────────────┘
                            │
                     FABION CORE
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
        MODEL             TOOLS             SKILLS
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                        WORKSPACE
                            │
                   Files / Code / Git
                            │
                          FABIO
```

---

## 🖥️ Fabion Desktop

Fabion Desktop is a native desktop AI workspace built with Electron.

It is intentionally **not designed like a traditional rectangular application**.

The interface is built around a floating, transparent, spatial experience with Fabio at the center.

The desktop environment is intended to provide:

* AI agent interaction
* Project workspaces
* File and code awareness
* Agent activity
* Terminal access
* Creative tools
* Skills
* Workspace context
* Fabio

---

## ⌘ Fabion CLI

Fabion also provides an agentic command-line interface.

```bash
fabion
```

The CLI is not intended to be just another AI chatbot in a terminal.

Fabio will eventually be able to work directly inside a project:

```text
Inspect project
      ↓
Understand context
      ↓
Plan
      ↓
Use tools
      ↓
Modify files
      ↓
Run commands
      ↓
Observe results
      ↓
Iterate
```

The Desktop and CLI are **not separate AI systems**.

They are two interfaces connected to the same Fabion core.

---

## 🧠 Fabion Core

Fabion Core is the shared agent runtime behind the Desktop and CLI.

It will be responsible for:

* Agent loops
* Context management
* Tool execution
* Workspace awareness
* Permissions
* Skills
* Model communication
* Agent state
* Task execution

The goal is to make the Desktop and CLI feel like two different ways of interacting with the **same Fabio**.

---

## 🧩 Skills

Fabion will have a modular Skills system.

Skills allow Fabio to gain specialized knowledge and workflows for different tasks.

Examples:

```text
coding
debugging
frontend
backend
git
architecture
documentation
research
```

Skills will be reusable across both Desktop and CLI.

---

## 🤖 Fabion Model

Fabion is also intended to eventually develop its own AI model.

The project will begin with small experimental models rather than attempting to immediately create a massive general-purpose model.

The model research will explore:

* Tokenization
* Embeddings
* Transformers
* Attention
* Training
* Dataset processing
* Evaluation
* Inference
* Fine-tuning
* Agentic capabilities

The long-term goal is to develop a model optimized for **coding, agentic work, and creative tasks**.

---

## 🐾 Fabio

Fabio is the main mascot of Fabion.

Fabio represents the agent that works with the user across the entire Fabion ecosystem.

Fabio is intended to have different states depending on what is happening:

```text
Idle
Thinking
Working
Waiting
Success
Error
```

The visual identity is pixel-inspired, minimal, and recognizable.

---

## 🏗️ Architecture

The project is being designed around a shared core rather than separate applications.

```text
                 ┌─────────────────┐
                 │      FABIO      │
                 └────────┬────────┘
                          │
                 ┌────────▼────────┐
                 │   Fabion Core   │
                 └────────┬────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
      Model             Tools             Skills
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                    Workspace
                          │
             ┌────────────┴────────────┐
             │                         │
          Desktop                     CLI
```

---

## 🛠️ Technology

Fabion is currently being developed around:

* Electron
* Node.js
* JavaScript / TypeScript
* GitHub
* GitHub Codespaces
* Agent runtime architecture
* Custom AI model research

The technology stack may evolve as the project grows.

---

## 📁 Project Structure

The repository is evolving toward a structure similar to:

```text
fabion/
│
├── apps/
│   ├── desktop/
│   └── cli/
│
├── packages/
│   ├── core/
│   ├── agents/
│   ├── tools/
│   ├── skills/
│   ├── workspace/
│   ├── terminal/
│   └── shared/
│
├── model/
│   ├── tokenizer/
│   ├── architecture/
│   ├── training/
│   ├── datasets/
│   ├── evaluation/
│   └── inference/
│
├── assets/
│   └── fabio/
│
├── docs/
│
├── scripts/
│
├── package.json
└── README.md
```

---

## 🚧 Status

**Fabion is currently in early development.**

The project is being built from the ground up.

Current priorities include:

* [ ] Repository foundation
* [ ] Electron desktop shell
* [ ] Floating Fabion interface
* [ ] Fabio integration
* [ ] Shared agent runtime
* [ ] Workspace system
* [ ] Agent tools
* [ ] Fabion CLI
* [ ] Skills system
* [ ] Model abstraction
* [ ] Fabion Model research

Features and architecture may change significantly during development.

---

## 🌎 Open Source

Fabion is being developed openly on GitHub.

The long-term goal is to create an ecosystem where developers can:

* Use Fabion
* Build Skills
* Create tools
* Contribute to the agent runtime
* Experiment with the model
* Extend the Desktop
* Extend the CLI
* Build new capabilities for Fabio

---

## 🔒 Security

Fabion is intended to interact with local projects, files, and terminal commands.

Security is therefore a core part of the architecture.

Fabion will use permission boundaries around potentially dangerous operations and will avoid exposing secrets or credentials.

**Never commit API keys, passwords, tokens, or other secrets to the repository.**

---

## 📜 License

Fabion is released under the **MIT License**.

See [`LICENSE`](LICENSE) for details.

---

## 🐾 The Goal

Fabion isn't meant to be:

> **"ChatGPT inside an Electron window."**

It is meant to become:

> **"An AI environment where Fabio can actually work with me."**

The Desktop is the environment.

The CLI is the power-user interface.

The Core is the agent runtime.

Skills are capabilities.

The Model provides intelligence.

And Fabio is the identity connecting everything together.

**Fabion is just getting started.** 🐾
