import { Sandbox } from "@vercel/sandbox";

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { files, command } = req.body;

  if (!files || !command) {
    return res.status(400).json({ error: "files and command are required" });
  }

  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  let sandbox;

  try {
    sandbox = await Sandbox.create({
      timeout: 60_000,
    });

    // Write each file into the sandbox filesystem
    for (const [path, contents] of Object.entries(files)) {
      await sandbox.writeFiles([{ path, content: Buffer.from(contents, "utf-8") }]);
    }

    const cmdParts = command.trim().split(" ");
    const proc = await sandbox.runCommand({
      cmd: cmdParts[0],
      args: cmdParts.slice(1),
      stdout: "pipe",
      stderr: "pipe",
    });

    for await (const chunk of proc.stdout) {
      res.write(chunk);
    }
    for await (const chunk of proc.stderr) {
      res.write(chunk);
    }

    res.write(`\n\n[process exited with code ${proc.exitCode}]`);
    res.end();
  } catch (err) {
    console.error(err);
    res.write(`\nSandbox error: ${err.message || "Unknown error"}`);
    res.end();
  } finally {
    if (sandbox) {
      await sandbox.stop().catch(() => {});
    }
  }
}
