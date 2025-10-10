import OpenAI from "openai";

// Using OpenRouter as the LLM provider
// OpenRouter provides access to multiple models with OpenAI-compatible API
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_MAIN || process.env.OPENAI_API_KEY || "default_key",
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.REPLIT_DOMAINS || "http://localhost:5000",
    "X-Title": "JURIS Legal Assistant"
  }
});

export { openai };
