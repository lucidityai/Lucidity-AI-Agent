import { OpenAI } from "openai";
import { api_key, api_base, model } from "./config.js";

const client = new OpenAI({
    baseURL: api_base,
    apiKey: api_key,
});

async function compress(messages) {

    // check that type is array
    if (!Array.isArray(messages)) {
        console.log(messages);
        throw new Error("Messages must be an array");
    }

    messages.push({ role: "user", content: "Summarize the past conversation into < 500 words. Capture essential facts and context." });
    try {
    let response = ""
    let generation = await client.chat.completions.create({
        model: model,
        messages: messages,
        temperature: 0.5,
        max_tokens:15_000,
        stream:true,
    })
    for await (const chunk of generation) {response += chunk.choices[0].delta.content}

    messages.push({ role: "assistant", content: response });
    return [response, messages];

    return response["choices"][0]["message"]["content"];

    } catch (error) {
        // clearly not a context window issue
        throw new Error(error);
    }
}

async function call(messages) {
    try {
    let response = ""

    let generation = await client.chat.completions.create({
        model: model,
        messages: messages,
        temperature: 0.5,
        max_tokens:15000,
        stream:true,
    })

    for await (const chunk of generation) {response += chunk.choices[0].delta.content}
    messages.push({ role: "assistant", content: response });
    return [response, messages];

    } catch (error) {
        throw new Error(error);
        // chances are, its a context window issue, compress the messages and retry via a recursive call
        let compressed = await compress(messages);
        let newMessages = [
            {"role": "system", "content": compressed},
            {"role": "user", "content": messages[messages.length - 1]["content"]}
        ];
        return await call(newMessages);
    }
}

export { call };