import OpenAI from "openai";
import { logApiCall } from "./apiLogger";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function chatJSON(opts: { system: string; user: string }): Promise<string> {
  return logApiCall({
    service: "openai",
    method: "POST",
    endpoint: "chat.completions (gpt-4o, json)",
    requestSummary: `system: ${opts.system.slice(0, 80)}… | user: ${opts.user.slice(0, 80)}…`,
    fn: async () => {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });
      return response.choices[0]?.message?.content || "";
    },
  });
}
