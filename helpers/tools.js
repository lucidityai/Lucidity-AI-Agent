import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";
import { spawn } from "child_process";
import ora from 'ora';
import { chalk, OS, AGENT_PROMPT } from "../config.js";
import { callApi } from "./inference.js";
import { renderMarkdown } from "./ui.js";

let todo = {};

async function tool_create_agent(args) {
  const { task, timeout = 8 } = args;

  setTimeout(() => {
    return "Timeout hit";
  }, timeout * 1000 * 60);

  const messages = [
    { role: "user", content: task }
  ];

  while (true) {
    const response = await callApi(messages, AGENT_PROMPT);

    const textContent =
      typeof response.content === "string" ? response.content : "";
    const toolCalls = response.tool_calls || [];
    const toolResults = [];

    if (textContent) {
      console.log(`\n${chalk.cyan("[AGENT]")} ${renderMarkdown(textContent)}`);
    }

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments);
      const values = Object.values(toolArgs);
      const argPreview = (values.length > 0 ? String(values[0]) : "").substring(
        0,
        50,
      );

      console.log(
        `\n${chalk.green("[AGENT] " + toolName.charAt(0).toUpperCase() + toolName.slice(1))}${chalk.dim("(" + argPreview + ")")}`,
      );

      const result = await runTool(toolName, toolArgs);

      const resultLines = result.split("\n");
      let preview = resultLines[0].substring(0, 60);
      if (resultLines.length > 1) {
        preview += ` ... +${resultLines.length - 1} lines`;
      } else if (resultLines[0].length > 60) {
        preview += "...";
      }
      console.log(`  ${chalk.dim("⎿  " + preview)}`);

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolCall.id,
        content: result,
      });
    }

    const assistantMessage = { role: "assistant" };

    assistantMessage.content = textContent || "";

    if (toolCalls.length > 0) {
      assistantMessage.tool_calls = toolCalls;
    }
    messages.push(assistantMessage);

    if (toolResults.length === 0) {
      return assistantMessage
    }

    for (const toolResult of toolResults) {
      messages.push({
        role: "tool",
        tool_call_id: toolResult.tool_use_id,
        content: toolResult.content,
      });
    }
  }
}

async function tool_fetch(args) {
  const { url, show_html } = args;
  console.log(`Fetching ${url}`);
  return await fetch(url)
    .then((response) => response.text())
    .then((html) => {
      if (show_html) {
        return html;
      }
      const regex = /<(p|span|h[1-7]|div|li|td|th)[^>]*>(.*?)<\/\1>/gi;
      const matches = [...html.matchAll(regex)];
      const text = matches
        .map((match) => match[2].replace(/<[^>]*>/g, "").trim())
        .filter((t) => t)
        .join("\n");
      return text || html.replace(/<[^>]*>/g, "");
    });
}

function todo_add(list) {
  list = list.split ? list.split(",") : Array.from(list);
  list = list.map((item) => item.trim());
  for (const item of list) {
    if (item) {
      todo[item] = 0;
    }
  }
  return "Added TODO items successfully";
}

function todo_mark(item) {
  if (todo.includes(item)) {
    todo[item] = 1;
  }
  return "Marked TODO item successfully";
}

function todo_read() {
  let result =
    Object.entries(todo)
      .map(([index, value]) => `${index}: ${value ? "(DONE)" : "(NOT DONE)"}`)
      .join("\n") || "No TODO list set.";
  console.log(result);
  return result;
}

function todo_clear() {
  todo = {};
  return "Cleared TODO list successfully";
}

function globToRegex(glob) {
  let regexStr = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  regexStr = regexStr.replace(/\*\*/g, ".*");
  regexStr = regexStr.replace(/\*/g, "[^/]*");
  regexStr = regexStr.replace(/\?/g, ".");
  return new RegExp(`^${regexStr}$`);
}

async function read(args) {
  const content = await fs.readFile(args.path, "utf-8");
  const lines = content.split(/\r?\n/);
  const offset = args.offset ?? 0;
  const limit = args.limit ?? lines.length;
  const selected = lines.slice(offset, offset + limit);

  let result = "";
  selected.forEach((line, idx) => {
    const lineNum = offset + idx + 1;

    result += `${lineNum.toString().padStart(4)}| ${line}\n`;
  });
  return result.trimEnd();
}

async function write(args) {
  await fs.writeFile(args.path, args.content, "utf-8");
  return "ok";
}

async function edit(args) {
  const text = await fs.readFile(args.path, "utf-8");
  const { old: oldStr, new: newStr } = args;

  if (!text.includes(oldStr)) {
    return "error: old_string not found";
  }

  let count = 0;
  let pos = text.indexOf(oldStr);
  while (pos !== -1) {
    count++;
    pos = text.indexOf(oldStr, pos + 1);
  }

  if (!args.all && count > 1) {
    return `error: old_string appears ${count} times, must be unique (use all=true)`;
  }

  let replacement;
  if (args.all) {
    replacement = text.split(oldStr).join(newStr);
  } else {
    replacement = text.replace(oldStr, newStr);
  }

  await fs.writeFile(args.path, replacement, "utf-8");
  return "ok";
}

async function glob(args) {
  const rootPath = args.path ?? ".";
  const patternStr = args.pat;
  const fullPattern = path.join(rootPath, patternStr).replace(/\/+/g, "/");

  const regex = globToRegex(path.basename(fullPattern));
  const searchRoot = path.dirname(fullPattern);

  const files = [];

  async function walk(currentDir) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          const relPath = fullPath;

          let relFromRoot = path.relative(searchRoot, fullPath);

          if (path.sep === "\\") {
            relFromRoot = relFromRoot.replace(/\\/g, "/");
          }

          if (regex.test(relFromRoot)) {
            files.push(fullPath);
          }
        }
      }
    } catch (e) {}
  }

  await walk(searchRoot);

  const stats = await Promise.all(
    files.map(async (f) => ({
      path: f,
      mtime: (await fs.stat(f)).mtime.getTime(),
    })),
  );

  stats.sort((a, b) => b.mtime - a.mtime);

  const result = stats.map((s) => s.path).join("\n");
  return result || "none";
}

async function grep(args) {
  const rootPath = args.path ?? ".";
  const pattern = new RegExp(args.pat);
  const hits = [];

  async function search(currentDir) {
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch (e) {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await search(fullPath);
      } else if (entry.isFile()) {
        try {
          const content = await fs.readFile(fullPath, "utf-8");
          const lines = content.split(/\r?\n/);
          lines.forEach((line, idx) => {
            if (pattern.test(line)) {
              hits.push(`${fullPath}:${idx + 1}:${line.trimEnd()}`);
            }
          });
        } catch (e) {}
      }
    }
  }

  await search(rootPath);

  return hits.slice(0, 50).join("\n") || "none";
}

function bash(args, timeoutSeconds = 30) {
  return new Promise((resolve) => {
    const proc = spawn(args.cmd, [], {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const outputLines = [];

    proc.stdout.on("data", (data) => {
      const lines = data.toString().split(/\r?\n/);

      lines.forEach((line) => {
        if (line === "" && data.toString().endsWith("\n")) return;
        console.log(`  ${chalk.dim("│")} ${line}`);
        outputLines.push(line + "\n");
      });
    });

    proc.stderr.on("data", (data) => {
      const lines = data.toString().split(/\r?\n/);
      lines.forEach((line) => {
        if (line === "" && data.toString().endsWith("\n")) return;
        console.log(`  ${chalk.dim("│")} ${line}`);
        outputLines.push(line + "\n");
      });
    });

    const timeoutId = setTimeout(async () => {
      proc.kill();
      outputLines.push("\n(timed out after " + timeoutSeconds + "s)");
      resolve(outputLines.join("").trim() || "(empty)");
    }, timeoutSeconds * 1000);

    proc.on("close", () => {
      clearTimeout(timeoutId);
      resolve(outputLines.join("").trim() || "(empty)");
    });
  });
}

function dir(args) {
  const rootPath = args.path ?? ".";
  const entries = fsSync.readdirSync(rootPath, { withFileTypes: true });
  const result = entries.map((e) => e.name).join("\n");
  return result || "none";
}

export const TOOLS = {
  read: {
    description: "Read file with line numbers (file path, not directory)",
    params: { path: "string", offset: "number?", limit: "number?" },
    fn: read,
  },
  write: {
    description: "Write content to file",
    params: { path: "string", content: "string" },
    fn: write,
  },
  edit: {
    description:
      "Replace old with new in file (old must be unique unless all=true)",
    params: { path: "string", old: "string", new: "string", all: "boolean?" },
    fn: edit,
  },
  dir: {
    description: "List files in directory",
    params: { path: "string" },
    fn: dir,
  },
  glob: {
    description: "Find files by pattern, sorted by mtime",
    params: { pat: "string", path: "string?" },
    fn: glob,
  },
  grep: {
    description: "Search files for regex pattern",
    params: { pat: "string", path: "string?" },
    fn: grep,
  },
  bash: {
    description:
      "Run shell command (Operating System: " + OS + ") (timeout in seconds)",
    params: { cmd: "string", timeout: "number" },
    fn: bash,
  },
  read_todo: {
    description: "Read your TODO list",
    params: {},
    fn: todo_read,
  },
  add_todo: {
    description: "Add items to your TODO list, seperated by commma.",
    params: { list: "string" },
    fn: todo_add,
  },
  mark_todo: {
    description: "Mark an item on your TODO list as done.",
    params: { item: "string" },
    fn: todo_mark,
  },
  clear_todo: {
    description: "Clear your TODO list",
    params: {},
    fn: todo_clear,
  },
  fetch: {
    description:
      "Fetch content from a URL. Returns HTML if show_html=true, otherwise parses for text.",
    params: { url: "string", show_html: "boolean?" },
    fn: tool_fetch,
  },
};

export const TOOLS_OVERDRIVE = {
  create_agent: {
    description:
      "Create an agent. Timeout in minutes (agents take multiple minutes to work).",
    params: { task: "string", timeout: "number" },
    fn: tool_create_agent,
  },
};

export async function runTool(name, args) {
  try {
    const tool = TOOLS[name] || TOOLS_OVERDRIVE[name];
    if (!tool) return `error: tool ${name} not found`;
    return await tool.fn(args);
  } catch (err) {
    return `error: ${err.message}`;
  }
}

export function makeSchema() {
  const result = [];
  for (const [name, info] of Object.entries(TOOLS)) {
    const properties = {};
    const required = [];
    for (const [paramName, paramType] of Object.entries(info.params)) {
      const isOptional = paramType.endsWith("?");
      const baseType = paramType.slice(0, -1);
      const jsonType = baseType === "number" ? "integer" : baseType;

      properties[paramName] = { type: jsonType };
      if (!isOptional) required.push(paramName);
    }
    result.push({
      type: "function",
      function: {
        name: name,
        description: info.description,
        parameters: {
          type: "object",
          properties: properties,
          required: required,
        },
      },
    });
  }
  return result;
}

export function makeSchemaOverdrive() {
  const result = [];
  for (const [name, info] of Object.entries(TOOLS_OVERDRIVE)) {
    const properties = {};
    const required = [];
    for (const [paramName, paramType] of Object.entries(info.params)) {
      const isOptional = paramType.endsWith("?");
      const baseType = paramType.slice(0, -1);
      const jsonType = baseType === "number" ? "integer" : baseType;

      properties[paramName] = { type: jsonType };
      if (!isOptional) required.push(paramName);
    }
    result.push({
      type: "function",
      function: {
        name: name,
        description: info.description,
        parameters: {
          type: "object",
          properties: properties,
          required: required,
        },
      },
    });
  }
  return result;
}