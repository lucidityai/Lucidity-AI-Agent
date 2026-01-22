import { API_KEY, API_URL, MODEL } from '../config.js';
import { makeSchema, makeSchemaOverdrive } from './tools.js';

export async function callApi(messages, systemPrompt, overdrive=false) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (API_KEY) {
    headers["Authorization"] = `Bearer ${API_KEY}`;
  } 

  const messagesWithSystem = [
    { role: "system", content: systemPrompt },
    ...messages
  ];

  const body = JSON.stringify({
    model: MODEL,
    max_tokens: 32000,
    messages: messagesWithSystem,
    tools: (overdrive) ? makeSchemaOverdrive() : makeSchema(),
  });

  const response = await fetch(API_URL, {
    method: "POST",
    headers: headers,
    body: body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API Error ${response.status}: ${text}`);
  }

  const data = await response.json();

  const choice = data.choices[0];
  const result = {};

  if (choice.message.content) {
    result.content = choice.message.content;
  }

  if (choice.message.tool_calls) {
    result.tool_calls = choice.message.tool_calls;
  }

  return result;
}
