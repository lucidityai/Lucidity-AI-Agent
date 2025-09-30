// LucidityAI Agent, (C) 2025 LucidityAI
// https://lucidityai.app
// BIG POE

import fs from "fs";
import path from "path";
import figlet from "figlet";
import termkit from "terminal-kit";
const term = termkit.terminal;
import { api_key, api_base, model, actions } from "./mgt/config.js";
import { call } from "./mgt/ai.js";
import { options, print } from "./mgt/ui.js";
import { getSystemPrompt } from "./mgt/system.js";
import { parseToolCall, removeToolCall } from "./mgt/parser.js";
import {
  createFile,
  createDir,
  deleteFile,
  findReplace,
  readFile,
  bash,
  tool_list,
} from "./mgt/tools.js";
import { overdrive } from "./mgt/overdrive.js";
// check for config (/lc_config/config.json) file

let messages = [{ role: "system", content: getSystemPrompt() }]; // new conversation
let maxIterations = 50; 
let currentIteration = 0;
let maxMessagesInMemory = 100; 

async function doTask(input) {
  // Validate input
  if (typeof input !== 'string' || input.trim().length === 0) {
    print("Error: Input must be a non-empty string", "red");
    return;
  }

  currentIteration = 0;

  // push to messages
  messages.push({ role: "user", content: input.trim() });
  let inThink = true;

  while (inThink && currentIteration < maxIterations) {
    currentIteration++;
    // make call
    let response = await call(messages);


    messages = response[1];
    response = response[0];

    // parse response for tool calls
    let tool_calls = parseToolCall(response); // may be more than one, putting this as a reminder

    // if no tool calls found, return the response directly
    if (!tool_calls || tool_calls.length === 0) {
      return removeToolCall(response);
    }

    for (let tcall in tool_calls) {
      // yes, we can do this, no you can't stop me
      // check if its a valid call
      let tool_call = tool_calls[tcall];
      let tool_name = tool_call["name"];
      let tool_args = tool_call["arguments"];
      let tool = tool_list.find((tool) => tool.name == tool_name);
      let total_tool_responses = "";
      let option = [];
      let resp = "";
      // if tool is "finish" set inThink to false

      if (tool_name == "finish") {
        inThink = false;
        print(tool_args["message"], "green");
        return;
      }

      if (tool_name == "question") {
        print(tool_args["q"], "blue");
        option = [
          tool_args["a1"],
          tool_args["a2"],
          tool_args["a3"],
          "Enter custom response",
        ].filter((o) => o != null && o !== undefined);

        resp = await options(...option);
        if (resp === "Enter custom response") {
          print("Enter your custom response:", "yellow");
          resp = await term.inputField().promise;
          resp = resp.trim();
        }
        total_tool_responses += "User selected option: " + resp;
      }

      if (tool) {
        try {
          print("Running tool: " + tool_name, "green");
          if (
            typeof tool_args === "object" &&
            tool_args !== null &&
            !Array.isArray(tool_args)
          ) {
            const argsArray = Object.values(tool_args);

            // actions can have two states: auto-accept, ask
            if (actions == "auto-accept") {
              try {
                const result = tool.func(...argsArray, messages);
                total_tool_responses += result || "Tool executed successfully";
              } catch (toolError) {
                print("Tool execution failed: " + toolError.message, "red");
                total_tool_responses += "Error: " + toolError.message;
              }
            } else {
              print("Do you want to run " + tool_name + "? (y/n)", "yellow");
              let input = await term.inputField().promise;
              input = input.trim();
              if (input == "y") {
                try {
                  const result = tool.func(...argsArray, messages);
                  total_tool_responses += result || "Tool executed successfully";
                } catch (toolError) {
                  print("Tool execution failed: " + toolError.message, "red");
                  total_tool_responses += "Error: " + toolError.message;
                }
              } else {
                total_tool_responses += "Tool execution cancelled by user";
              }
            }
          } else {
            print(
              "Error: Tool arguments are not a valid object. Type: " +
                typeof tool_args,
              "red"
            );
            total_tool_responses += "Error: Invalid tool arguments format";
          }
        } catch (e) {
          print("Critical Tool Call Error: " + e.message, "red");
          total_tool_responses += "Critical Error: " + e.message;
          // Don't recurse on critical errors to avoid infinite loops
        }
      }

      // assuming we've made it this far, the recursion didn't mess up

      messages.push({ role: "user", content: total_tool_responses });
    }
  }

  if (currentIteration >= maxIterations) {
    print(`Warning: Maximum iterations (${maxIterations}) reached. Stopping to prevent infinite loop.`, "yellow");
  }

  // Prevent memory bloat by trimming old messages if conversation gets too long
  if (messages.length > maxMessagesInMemory) {
    const systemMessage = messages[0]; // Keep system message
    const recentMessages = messages.slice(-maxMessagesInMemory + 1); // Keep recent messages
    messages = [systemMessage, ...recentMessages];
    print(`Memory management: Trimmed conversation to ${maxMessagesInMemory} messages`, "gray");
  }
}

figlet("LucidityAI Agent", { font: "slant" }, function (err, data) {
  if (err) {
    console.error("Figlet rendering failed:", err.message || err);
    return;
  }
  console.log(data);
}).then(async () => {
  while (1) {
    term.magenta("> ");
    let input = await term.inputField().promise;
    input = input.trim();
    console.log("\n"); // Add newline for proper formatting

    // Input validation
    if (typeof input !== 'string') {
      print("Error: Invalid input type", "red");
      continue;
    }

    if (input == "exit") {
      process.exit();
    }

    if (input.trim().length === 0) {
      print("Please enter a command or 'exit' to quit.", "yellow");
      continue;
    }

    if (input.includes("overdrive")) {
      overdrive(input.replace("overdrive", "").trim());
    }
    else{
      await doTask(input), "white"; // this is where the magic happens
    }
  }
});
