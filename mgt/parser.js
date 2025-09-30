// hermes toolcall parser 

// reference https://github.com/NousResearch/Hermes-Function-Calling

function parseToolCall(message) {
    let regex = /<tool_call>\s*({.*?})\s*<\/tool_call>/g;
    let match = message.match(regex);
    let results = [];

    if (match) {
        for (let i = 0; i < match.length; i++) {
            let innerMatch = match[i].match(/<tool_call>\s*({.*?})\s*<\/tool_call>/);
            if (innerMatch) {
                let jsonString = innerMatch[1];
                jsonString = jsonString.replace(/'/g, '"');
                try {
                    const parsed = JSON.parse(jsonString);
                    // Validate required fields
                    if (!parsed.name || typeof parsed.name !== 'string') {
                        console.error("Tool call missing or invalid 'name' field");
                        continue;
                    }
                    if (!parsed.arguments || typeof parsed.arguments !== 'object') {
                        console.error("Tool call missing or invalid 'arguments' field");
                        continue;
                    }
                    results.push(parsed);
                } catch (error) {
                    console.error("Failed to parse tool call JSON:", error.message);
                    console.error("Input was:", jsonString);
                }
            }
        }
    }

    return results;
}

function removeToolCall(message) {
    // the point of this function is so we don't show the tool call in the UI
    let regex = /<tool_call>\s*({[\s\S]*?})\s*<\/tool_call>/g;
    return message.replace(regex, "");
}

export { parseToolCall, removeToolCall }