import { call } from "./ai.js";
import { getSystemPrompt } from "./system.js";
import { parseToolCall } from "./parser.js";
import {
  createFile,
  createDir,
  deleteFile,
  findReplace,
  readFile,
  bash,
  tool_list,
} from "./tools.js";

// OVERDRIVE


// Prompts. They may sound corny but its abusing statistical labels to get better results

let available_agents = ["debug", "code", "cybersecurity", "refinement"];
let availale_tools = ["create", "create_dir", "delete", "findReplace", "read", "bash"];
const prompts = {
    "orchestrator": `
    You are an orchestrator, you may call on any agent that you see fit to solve this problem.

    Call an agent by responding in the following text format:
    Format:
    <tool_call>
    {'arguments': {'name': '...', 'task': '...'}, 'name': 'agent_deploy'}
    </tool_call>

    When finished running agents, ensuring each task is finished, you may run this tool by responding in the following text format:
    Format:
    <tool_call>
    {'arguments': {'message': '...'}, 'name': 'finish'}
    </tool_call>


    Where "name" is the agent name and "task" is the task for the agent to solve, be detailed as for the agent does not have the conversational context that you do.

    Note: You may only call one agent at a time. No calling multiple.

    Available agents:

    "debug": Specializes in debugging program errors.
    "code": Specializes in editing code.
    "cybersecurity": Specializes in cybersecurity.
    "refinement": Specializes in code refinement and robustness.

    You must call a agent. You cannot do anything yourself.

    `,
    "debug": `
    You are an expert debugger.

    Follow this process to debug:

    1. Think through the error, where might it come from?
    2. Find canidate files that might be causing the error.
    3. Investigate each call that the candidate file makes.
    4. Investigate the calls that thet call makes, continue this process of investigation until you locate the error.
    5. Patch the error
    `,
    "code": `
    You are an expert coder.

    Follow this process to code:

    1. Think about the parts of the code that your editing may affect
    2. Look into the calls that your code will make, ensure that they are correct according to the code
    3. Add the code
    `,
    "cybersecurity": `
    You are an cybersecurity expert.
    
    Utilize this checklist to secure a given file or codebase:

    1. Explore for obvious/common vulnerabilities
    2. Patch any found vulnerabilities
    3. Look for possible exposure points in the code
    4. Patch any found exposure points
    `,
    "refinement": `
    You are an expert code refiner.

    Follow this checklist to refine code:

    1. Ensure that your code is robust to edge cases
    2. Ensure that the code has proper error handling
    3. Prevent fundemental vulnerabilities such as data leaking through error messages
    4. Prevent bypasses to security functionality
    `
}

async function runAgent(agent, task) {

    let agentMessages = [
        { role: "system", content: getSystemPrompt() + "\n\n" + prompts[agent] },
        { role: "user", content: task }
    ]

    while (1) {

        let response = await call(agentMessages);
        let total_tool_responses = ""
        let result
        agentMessages = response[1];
        response = response[0];

        // parse response for tool calls
        let tool_calls = parseToolCall(response);

        for (let i = 0; i < tool_calls.length; i++){
            if (tool_calls[i].name === "finish") {
                console.log("Agent " + agent + " Complete");
                return tool_calls[i].arguments.message;
            }

            let tool = tool_list.find(t => t.name === tool_calls[i].name);

            if (!tool) {
                console.error("Error: Tool not found: " + tool_calls[i].name);
                total_tool_responses += "Error: Tool not found: " + tool_calls[i].name + "\n";
                continue;
            }

            let args = tool_calls[i].arguments;
            let argsArray = Object.values(args);

            result = tool.func(...argsArray);

            total_tool_responses += result + "\n";
            agentMessages.push({ role: "user", content: "Tool results:\n" + result });

        }

        }

}


async function overdrive(task){

    let agent = "orchestrator";

    let orca_messages = [
        { role: "system", content: "You are an orchestrator AI that delegates tasks to specialized agents. You have no tools yourself.\n\n" + prompts["orchestrator"]},
        { role: "user", content: task }
    ]

    // Allow the orchestrator to make an initial selection
    console.log("Overdrive Initiated");

    // Oh just another lonely night, are you willing to sacrafice ya life?

    while (1) {

        let response = await call(orca_messages);
        let total_tool_responses = ""
        orca_messages = response[1];
        response = response[0];

        // parse response for tool calls
        let tool_calls = parseToolCall(response);

        for (let i = 0; i < tool_calls.length; i++) {

            let tool_call = tool_calls[i];

            if (tool_call.name === "finish") {
                console.log("Overdrive Complete");
                return tool_call.arguments.message;
            }

            if (tool_call.name === "agent_deploy") {

                agent = tool_call.arguments.name;

                if (!available_agents.includes(agent)) {
                    total_tool_responses += "\nInvalid agent: " + agent;
                }
                else {
                    let result = await runAgent(agent, tool_call.arguments.task);
                    total_tool_responses += "\nAgent " + agent + " result: " + result;
                }

            }
            else {
                total_tool_responses += "\nInvalid tool call: " + JSON.stringify(tool_call)
            }
        }

        orca_messages.push({ role: "user", content: "Tool results:\n" + total_tool_responses });

    }

}

export { overdrive }