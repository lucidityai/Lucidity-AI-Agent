import { OpenAI } from "openai";
import { api_key, api_base, model } from "./config.js";

const client = new OpenAI({
    baseURL: api_base,
    apiKey: api_key,
    timeout: 120000, // 2 minute timeout
});

function validateMessages(messages) {
    return messages.map(msg => {
        if (typeof msg.content === 'string') {
            return msg;
        }
        if (Array.isArray(msg.content)) {
            // Ensure each content object has a type field
            const validatedContent = msg.content.map(item => {
                if (typeof item === 'string') {
                    return { type: 'text', text: item };
                }
                if (item && typeof item === 'object' && !item.type) {
                    // If it's an object without a type, assume it's text
                    return { type: 'text', text: String(item) };
                }
                return item;
            });
            return { ...msg, content: validatedContent };
        }
        // If content is not string or array, convert to string
        return { ...msg, content: String(msg.content) };
    });
}

async function compress(messages) {

    // check that type is array
    if (!Array.isArray(messages)) {
        console.error('Messages validation failed:', messages);
        throw new Error("Messages must be an array");
    }

    messages.push({ role: "user", content: "Summarize the past conversation into < 500 words. Capture essential facts and context." });
    try {
    let response = ""
    let validatedMessages = validateMessages(messages);
    let generation = await client.chat.completions.create({
        model: model,
        messages: validatedMessages,
        temperature: 0.5,
        max_tokens:15_000,
        stream:true,
    })
    for await (const chunk of generation) {
        if (chunk?.choices?.[0]?.delta?.content) {
            response += chunk.choices[0].delta.content;
        }
    }

    messages.push({ role: "assistant", content: response });
    return [response, messages];

    //return response["choices"][0]["message"]["content"];

    } catch (error) {
        // clearly not a context window issue
        throw new Error(error);
    }
}

async function call(messages) {
    try {
    let response = ""
    let inToolCall = false;
    let buffer = "";

    let validatedMessages = validateMessages(messages);
    let generation = await client.chat.completions.create({
        model: model,
        messages: validatedMessages,
        temperature: 0.5,
        max_tokens:15000,
        stream:true,
    })

    for await (const chunk of generation) {

        if (chunk?.choices?.[0]?.delta?.content) {
            const content = chunk.choices[0].delta.content;
            response += content;
            buffer += content;

            if (buffer.includes("<think>")){
                const beforeToolCall = buffer.split("<think>")[0];
                process.stdout.write(beforeToolCall);
                buffer = "<think>" + buffer.split("<think>").slice(1).join("<think>");
                inToolCall = true;
            }

            if (inToolCall && buffer.includes("<think>")) {
                buffer = buffer.split("<think>").slice(1).join("<think>");
                inToolCall = false;
            }

            if (buffer.includes('<tool_call>')) {
                const beforeToolCall = buffer.split('<tool_call>')[0];
                process.stdout.write(beforeToolCall);
                buffer = '<tool_call>' + buffer.split('<tool_call>').slice(1).join('<tool_call>');
                inToolCall = true;
            }

            if (inToolCall && buffer.includes('</tool_call>')) {
                buffer = buffer.split('</tool_call>').slice(1).join('</tool_call>');
                inToolCall = false;
            }

            if (!inToolCall && !buffer.includes('<tool_call>')) {
                process.stdout.write(buffer);
                buffer = "";
            }
        }
    }

    // Print any remaining buffer
    if (buffer && !inToolCall) {
        process.stdout.write(buffer);
    }
    console.log(); // New line after streaming

    messages.push({ role: "assistant", content: response });
    return [response, messages];

    } catch (error) {
        console.error('API call failed:', error.message || error);
        // chances are, its a context window issue, compress the messages and retry via a recursive call
        let compressed = await compress(messages);
        let newMessages = [
            {"role": "system", "content": compressed[0]},
            {"role": "user", "content": messages[messages.length - 1]["content"]}
        ];
        return await call(newMessages);
    }
}

export { call };