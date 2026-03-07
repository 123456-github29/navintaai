import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required for AI content generation.");
  }
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 120000,
    });
  }
  return client;
}

export async function chatJSON(opts: {
  system: string;
  user: string;
  model?: string;
}): Promise<string> {
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: opts.model || "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    temperature: 0.7,
  });
  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("No response from OpenAI");
  return text;
}

export async function chatText(opts: {
  system: string;
  user: string;
  model?: string;
}): Promise<string> {
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: opts.model || "gpt-4o",
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    temperature: 0.7,
  });
  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("No response from OpenAI");
  return text;
}
