import { FabionAgent } from "@fabion/agents";
import { Skill } from "@fabion/core";
import { OpenRouterProvider } from "@fabion/core/qwen.js";
import { SiliconFlowProvider } from "@fabion/core/siliconflow.js";
import {
  readFileTool,
  listDirTool,
  writeFileTool,
  runCommandTool,
} from "@fabion/tools";
import { FabionTUI } from "./tui/app.js";

function createModel() {
  if (process.env.OPENROUTER_API_KEY) {
    return new OpenRouterProvider(process.env.FABION_MODEL);
  }

  if (process.env.SILICONFLOW_API_KEY) {
    return new SiliconFlowProvider(process.env.FABION_MODEL);
  }

  return undefined;
}

const codingSkill = new Skill({
  name: "coding",
  description: "Practical software development and debugging",
  instructions: [
    "Work as a senior coding partner inside the current workspace.",
    "Inspect relevant files before suggesting or changing code.",
    "Prefer small, focused changes that preserve existing patterns.",
    "Explain the plan briefly, identify affected files, and include validation steps.",
    "When a request is ambiguous, state the assumption you are making.",
  ].join("\n"),
  tools: ["read_file", "list_dir", "write_file", "run_command"],
});

const model = createModel();
const agent = new FabionAgent({
  model,
  tools: [readFileTool, listDirTool, writeFileTool, runCommandTool],
  skills: [codingSkill],
});

const tui = new FabionTUI({
  agent,
  modelName: model?.name ?? "no model connected",
});

await tui.start();
