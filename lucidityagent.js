import ora from 'ora';
import { chalk, AGENT_PROMPT, OVERDRIVE_PROMPT, MODEL, OS, chalkRainbow } from './config.js';
import { runTool } from './helpers/tools.js';
import { callApi } from './helpers/inference.js';
import { separator, renderMarkdown } from './helpers/ui.js';

function readLine(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);

    let buffer = '';
    const onData = (chunk) => {
      buffer += chunk.toString();
      if (buffer.includes('\n')) {
        process.stdin.removeListener('data', onData);
        process.stdin.pause();
        resolve(buffer.trim());
      }
    };

    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', onData);
  });
}

async function main() {
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n⏺ Exiting...'));
    process.exit(0);
  });

  console.log(`Horizon V2 - LucidityAI\n

 █████   █████                     ███                                    █████   █████  ████████
▒▒███   ▒▒███                     ▒▒▒                                    ▒▒███   ▒▒███  ███▒▒▒▒███
 ▒███    ▒███   ██████  ████████  ████   █████████  ██████  ████████      ▒███    ▒███ ▒▒▒    ▒███
 ▒███████████  ███▒▒███▒▒███▒▒███▒▒███  ▒█▒▒▒▒███  ███▒▒███▒▒███▒▒███     ▒███    ▒███    ███████
 ▒███▒▒▒▒▒███ ▒███ ▒███ ▒███ ▒▒▒  ▒███  ▒   ███▒  ▒███ ▒███ ▒███ ▒███     ▒▒███   ███    ███▒▒▒▒
 ▒███    ▒███ ▒███ ▒███ ▒███      ▒███    ███▒   █▒███ ▒███ ▒███ ▒███      ▒▒▒█████▒    ███      █
 █████   █████▒▒██████  █████     █████  █████████▒▒██████  ████ █████       ▒▒███     ▒██████████
▒▒▒▒▒   ▒▒▒▒▒  ▒▒▒▒▒▒  ▒▒▒▒▒     ▒▒▒▒▒  ▒▒▒▒▒▒▒▒▒  ▒▒▒▒▒▒  ▒▒▒▒ ▒▒▒▒▒         ▒▒▒      ▒▒▒▒▒▒▒▒▒▒
Using ${chalk.bold.green(MODEL)} - on ${chalk.bold.cyan(OS)} - at ${chalk.bold.cyan(new Date().toLocaleTimeString())}

  `);


  const messages = [];
  const systemPrompt = AGENT_PROMPT;

  while (true) {
    try {
      console.log(separator());
      const userInput = await readLine(`${chalk.bold.blue('❯')} `);
      console.log(separator());

      if (!userInput) continue;
      if (userInput === "/q" || userInput === "exit") break;
      if (userInput === "/c") {
        messages.length = 0;
        console.log(`${chalk.green('⏺ Cleared conversation')}`);
        continue;
      }

      messages.push({ role: "user", content: userInput });

      if (userInput.endsWith("/overdrive")) {
        console.log(`${chalkRainbow('⏺ Overdrive mode enabled. Creating new conversation...')}`);
        overdriveLoop(userInput.replace("/overdrive", ""));
      }

      while (true) {
        const spinner = ora({ text: 'Working...', color: 'cyan' }).start();
        const response = await callApi(messages, systemPrompt);
        spinner.stop();

        const textContent = typeof response.content === "string" ? response.content : "";
        const toolCalls = response.tool_calls || [];
        const toolResults = [];

        if (textContent) {
          console.log(`\n${chalk.cyan('⏺')} ${renderMarkdown(textContent)}`);
        }

        for (const toolCall of toolCalls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);
          const values = Object.values(toolArgs);
          const argPreview = (values.length > 0 ? String(values[0]) : "").substring(0, 50);

          console.log(`\n${chalk.green('⏺ ' + toolName.charAt(0).toUpperCase() + toolName.slice(1))}${chalk.dim('(' + argPreview + ')')}`);

          const result = await runTool(toolName, toolArgs);

          const resultLines = result.split('\n');
          let preview = resultLines[0].substring(0, 60);
          if (resultLines.length > 1) {
            preview += ` ... +${resultLines.length - 1} lines`;
          } else if (resultLines[0].length > 60) {
            preview += "...";
          }
          console.log(`  ${chalk.dim('⎿  ' + preview)}`);

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolCall.id,
            content: result
          });
        }

        const assistantMessage = { role: "assistant" };

        assistantMessage.content = textContent || "";

        if (toolCalls.length > 0) {
          assistantMessage.tool_calls = toolCalls;
        }
        messages.push(assistantMessage);

        if (toolResults.length === 0) {
          break;
        }

        for (const toolResult of toolResults) {
          messages.push({
            role: "tool",
            tool_call_id: toolResult.tool_use_id,
            content: toolResult.content
          });
        }
      }

      console.log();

    } catch (err) {
      console.error(`${chalk.red('⏺ Error: ' + err.message)}`);
      continue;
    }
  }
}


async function overdriveLoop(input) {
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n⏺ Exiting...'));
    process.exit(0);
  });


  const messages = [];
  const systemPrompt = OVERDRIVE_PROMPT;


  while (true) {
    try {
      let userInput
      if (messages.length == 0) {
      userInput = input.replace("/overdrive", "");
      }
      else {
      
      console.log(separator());
      userInput = await readLine(`${chalk.bold.blue('❯')} `);
      console.log(separator());
      
    }

      if (!userInput) continue;
      if (userInput === "/q" || userInput === "exit") break;
      if (userInput === "/c") {
        messages.length = 0;
        console.log(`${chalk.green('⏺ Cleared conversation')}`);
        continue;
      }

      messages.push({ role: "user", content: userInput });

      while (true) {
        const response = await callApi(messages, systemPrompt,1);

        const textContent = typeof response.content === "string" ? response.content : "";
        const toolCalls = response.tool_calls || [];
        const toolResults = [];

        if (textContent) {
          console.log(`\n${chalk.cyan('⏺')} ${renderMarkdown(textContent)}`);
        }

        for (const toolCall of toolCalls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);
          const values = Object.values(toolArgs);
          const argPreview = (values.length > 0 ? String(values[0]) : "").substring(0, 50);

          console.log(`\n${chalk.green('⏺ ' + toolName.charAt(0).toUpperCase() + toolName.slice(1))}${chalk.dim('(' + argPreview + ')')}`);

          const result = await runTool(toolName, toolArgs);

          const resultLines = result.split('\n');
          let preview = resultLines[0].substring(0, 60);
          if (resultLines.length > 1) {
            preview += ` ... +${resultLines.length - 1} lines`;
          } else if (resultLines[0].length > 60) {
            preview += "...";
          }
          console.log(`  ${chalk.dim('⎿  ' + preview)}`);

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolCall.id,
            content: result
          });
        }

        const assistantMessage = { role: "assistant" };

        assistantMessage.content = textContent || "";

        if (toolCalls.length > 0) {
          assistantMessage.tool_calls = toolCalls;
        }
        messages.push(assistantMessage);

        if (toolResults.length === 0) {
          break;
        }

        for (const toolResult of toolResults) {
          messages.push({
            role: "tool",
            tool_call_id: toolResult.tool_use_id,
            content: toolResult.content
          });
        }
      }

      console.log();

    } catch (err) {
      console.error(`${chalk.red('⏺ Error: ' + err.message)}`);
      continue;
    }
  }
}

main();
