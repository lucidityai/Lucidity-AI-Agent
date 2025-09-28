// LucidityAI Agent, (C) 2025 LucidityAI
// https://lucidityai.app
// We Major

import fs from "fs";
import path from "path";
import figlet from "figlet";
import termkit from "terminal-kit";
const term = termkit.terminal;
import { api_key, api_base, model, actions } from "./mgt/config.js";
import { call } from "./mgt/ai.js";
import { print } from "./mgt/ui.js";
import { getSystemPrompt } from "./mgt/system.js";
import { parseToolCall, removeToolCall } from "./mgt/parser.js";
import {
  createFile,
  createDir,
  deleteFile,
  applyDiff,
  readFile,
  bash,
  tool_list,
} from "./mgt/tools.js";
// check for config (/lc_config/config.json) file

let messages = [{ role: "system", content: getSystemPrompt() }]; // new conversation

async function doTask(input) {
  // push to messages

  messages.push({ role: "user", content: input });
  let inThink = true;

  while (inThink) {
    // make call
    let response = await call(messages);

    if (response[1].length < messages.length) {
      print(
        "Warning: Context window exceeded. Automatic compression done.",
        "yellow"
      );
    }

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
                  // if tool is "finish" set inThink to false
      if (tool_name == "finish") {
        inThink = false;
        print(tool_args["message"], "green");
        return 
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
              total_tool_responses += tool.func(...argsArray, messages);
            } else {
              print("Do you want to run " + tool_name + "? (y/n)", "yellow");
              let input = await term.inputField().promise;
              input = input.trim();
              if (input == "y") {
                total_tool_responses += tool.func(...argsArray, messages);
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
          print("Tool Call Error: " + e, "red");
          // recursion
          await doTask("Tool Call Error: " + e);
        }
      }

      // assuming we've made it this far, the recursion didn't mess up

      messages.push({ role: "user", content: total_tool_responses });
    }
  }
}

figlet("LucidityAI Agent", { font: "nancyj" }, function (err, data) {
  if (err) {
    console.log("Something went wrong...");
    console.dir(err);
    return;
  }
  console.log(data);
}).then(async () => {
  while (1) {
    term.magenta("> ");
    let input = await term.inputField().promise;
    input = input.trim();
    console.log("\n"); // new line cause terminal-kit is weird and doesn't do it itself ( actual useless module )

    if (input == "exit") {
      process.exit();
    }

    // check for keywords
    let overdrive = false; // this will be pararell processing, Gemini 2.5 Pro DeepThink style

    if (input.includes("overdrive")) {
      overdrive = true;
      print("Overdrive Activated!\n", "red");
    }

    print(await doTask(input), "white"); // this is where the magic happens
  }
});
