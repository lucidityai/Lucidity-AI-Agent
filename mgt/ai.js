import { OpenAI } from "openai";
import { api_key, api_base, model } from "./config.js";
import { print } from "./ui.js";

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
            const validatedContent = msg.content.map(item => {
                if (typeof item === 'string') {
                    return { type: 'text', text: item };
                }
                if (item && typeof item === 'object' && !item.type) {
    
                    return { type: 'text', text: String(item) };
                }
                return item;
            });
            return { ...msg, content: validatedContent };
        }
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
        stream: false,
    })
    response = generation.choices[0].message.content;

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

    // add indicator that we are "thinking" ( cough cough loaiding but using marketing terms LOL )
    let terms = [
        "Majoring",
        "Dunking",
        "Feeling",
        "Locking in",
        "Wondering"
    ]
    print(terms[Math.floor(Math.random() * terms.length)] + "...", "yellow");

    let validatedMessages = validateMessages(messages);
    let generation = await client.chat.completions.create({
        model: model,
        messages: validatedMessages,
        temperature: 0.5,
        max_tokens:15000,
        stream:false,
    })
    response = generation.choices[0].message.content;

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