# Fabion

> **An AI-native desktop workspace, agentic CLI, and open-source AI model built around Fabio.**

Fabion is an open-source AI environment designed to go beyond the traditional chatbot.

Instead of simply talking to an AI, Fabion is designed to let an AI agent **work alongside you** — understanding your projects, working with files, using tools, writing code, and helping you create.

At the center of Fabion is **Fabio**, the mascot and identity of the platform.

---

## ✦ What is Fabion?

Fabion is being built as an ecosystem consisting of:

### 🖥️ Fabion Desktop

A futuristic AI-native desktop workspace built with Electron.

Fabion Desktop is designed around a floating, minimal interface rather than a traditional application window.

It will eventually provide:

* AI agents
* Project workspaces
* File management
* Coding
* Creative tools
* Agent activity
* Skills
* Terminal access
* Workspace context
* Fabio

---

### ⌘ Fabion CLI

A powerful agentic coding environment for the terminal.

```bash
fabion
```

The CLI is designed to let Fabio work directly with your projects.

Eventually Fabio will be able to:

* Inspect repositories
* Read and understand files
* Search codebases
* Create files
* Edit files
* Run commands
* Work with Git
* Debug projects
* Use specialized Skills
* Plan and execute tasks
* Ask for permission when needed

The Desktop and CLI are designed to share the same underlying agent runtime.

---

### 🧠 Fabion Model

Fabion also aims to develop its own AI model.

The goal is not to immediately build a massive model.

Instead, Fabion Model will begin with small experimental models and gradually explore:

* Tokenization
* Transformers
* Attention
* Training
* Datasets
* Fine-tuning
* Evaluation
* Inference
* Agentic capabilities

The long-term goal is a model designed specifically for **agentic coding and creative work**.

---

## 🧩 Fabion Architecture

The long-term architecture looks roughly like this:

```text
                       FABION

                         │
             ┌───────────┴───────────┐
             │                       │
        FABION DESKTOP           FABION CLI
             │                       │
             └───────────┬───────────┘
                         │
                  AGENT RUNTIME
                         │
          ┌──────────────┼──────────────┐
          │              │              │
        MODEL          TOOLS          SKILLS
          │              │              │
          └──────────────┼──────────────┘
                         │
                     WORKSPACE
                         │
              Files / Code / Git / Terminal
                         │
                       FABIO
```

The **Agent Runtime** is the core of the system.

The Desktop and CLI are interfaces to that runtime rather than completely separate AI systems.

---

## 🐾 Fabio

Fabio is the main mascot and identity of Fabion.

He represents the agent that works with you across the Fabion ecosystem.

Fabio will eventually have different states depending on what the agent is doing:

```text
Idle
Thinking
Working
Waiting
Success
Error
```

The visual language of Fabio is intentionally pixel-inspired, minimal, and recognizable.

---

## 🧠 Skills

Fabion will have a modular Skills system.

Skills give agents specialized capabilities and instructions.

Examples:

```text
coding
debugging
frontend
backend
git
research
documentation
architecture
```

Skills will eventually be shared between the Desktop and CLI.

---

## 🛠️ Technology

The project is currently being designed around:

* Electron
* Node.js
* TypeScript
* GitHub
* GitHub Codespaces
* Agent runtime architecture
* Custom AI model research

The technology stack may evolve as Fabion develops.

---

## 🚧 Project Status

Fabion is currently in **early development**.

The architecture, Desktop application, CLI, agent runtime, Skills system, and model research are being built incrementally.

Expect things to change.

This project is not yet production-ready.

---

## 🌎 Open Source

Fabion is being developed openly on GitHub.

The long-term goal is to build an ecosystem where developers can:

* Use Fabion
* Build Skills
* Create tools
* Contribute to the agent runtime
* Experiment with the model
* Improve the Desktop
* Improve the CLI
* Build on top of Fabion

---

## 📁 Repository Structure

The project will evolve toward a structure similar to:

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
│   ├── model-runtime/
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
└── docs/
```

---

## 🚀 Vision

Fabion is being built around one simple idea:

> **AI shouldn't just answer you. It should be able to work with you.**

The ultimate goal is to create an AI environment where Fabio can understand your workspace, use tools, build software, create things, and collaborate with you across Desktop and CLI.

**Fabion is just getting started.**

🐾
