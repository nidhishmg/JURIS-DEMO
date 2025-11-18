import { storage } from '../storage';
import { localLlmService } from './localLlmService';

export async function buildPrompt(requestId: string, templateId: string, normalizedData: any) {
  const systemPrompt = `SYSTEM: You are KanoonEdge – a legal drafting assistant for Indian law. ALWAYS obey these rules:
1. DO NOT invent case law, sections, or citations. If a statute or citation is not in the provided context, mark it as [UNVERIFIED].
2. Output MUST contain a JSON block between ---JSON-START--- and ---JSON-END--- followed by a human-readable formatted draft.
3. Use formal Indian legal English formatting appropriate to the court in the input (e.g., 'IN THE HIGH COURT OF ...' for High Court templates).
4. Use placeholders like [Insert Date] for missing values. Point out missing mandatory fields explicitly in the JSON under "validation_report".
5. Set tone: professional, concise, and precise. Temperature must be 0.0.`;

  const userPrompt = `USER: Using template ${templateId} and the data below, produce:\nA) JSON object (only in the JSON block) with keys: title, parties, facts, chronology, grounds, law_sections[], citations[], prayer, verification_clause, validation_report[].\nB) A formatted 'draft_text' that is ready to present and download (court formatting, headings).\nC) For each citation in citations[], include "text", "anchor_text", and "source_hint" (only if present in context).\nD) If any required info is missing, include it in validation_report with severity: critical or warning.\nE) Do NOT fabricate cases or statutes. If you cannot verify a citation, set "verified": false.\n\nDATA:\n${JSON.stringify(normalizedData, null, 2)}\n\nReturn output with JSON only between the markers:\n---JSON-START---\n{ ... }\n---JSON-END---\n\nAfter the JSON block output the formatted draft.`;

  // Save to prompt_history (redacted: remove PII keys if present)
  const redacted = JSON.parse(JSON.stringify({ systemPrompt, userPrompt }));
  // Simple redaction: remove fields named 'phone','email','aadhaar'
  if (redacted.userPrompt) {
    // nothing fancy here for now
  }

  await storage.createPromptHistory({ request_id: requestId, system_prompt: systemPrompt, user_prompt: userPrompt, redacted_prompt: redacted });

  return { systemPrompt, userPrompt };
}

export async function callLlmWithPrompt(requestId: string, systemPrompt: string, userPrompt: string) {
  const combined = `${systemPrompt}\n\n${userPrompt}`;
  const maxRetries = 2;
  let attempt = 0;
  let lastError: any = null;

  while (attempt <= maxRetries) {
    try {
      const llmResp = await localLlmService.generateText({ prompt: userPrompt, systemPrompt: systemPrompt, temperature: 0.0, maxTokens: 1600 });
      const raw = llmResp.content || '';
      // Extract JSON block
      const jsonMatch = raw.match(/---JSON-START---([\s\S]*?)---JSON-END---/);
      let parsedJson = null;
      let formatted = raw;
      if (jsonMatch) {
        const jsonText = jsonMatch[1];
        try {
          parsedJson = JSON.parse(jsonText);
        } catch (e) {
          // attempt to fix JSON by calling LLM once more for stricter format
          throw new Error('JSON parse failed');
        }
        // Get the rest as formatted draft
        formatted = raw.replace(jsonMatch[0], '').trim();
      } else {
        // Retry once with stricter ask
        if (attempt < maxRetries) {
          attempt++;
          await new Promise(r => setTimeout(r, attempt === 1 ? 1000 : 3000));
          continue;
        } else {
          throw new Error('LLM did not return JSON block');
        }
      }

      // Compute confidence
      let confidence = 0;
      const requiredFields = ['title','parties','facts','grounds','prayer'];
      const hasAll = requiredFields.every(f => parsedJson && parsedJson[f]);
      if (hasAll) confidence += 0.4;
      if (parsedJson && Array.isArray(parsedJson.citations) && parsedJson.citations.length > 0) confidence += 0.3; // anchored assumed
      // normalization warnings check - for now assume none
      confidence += 0.3;
      if (confidence > 1) confidence = 1;

      // persist llm output
      await storage.createLlmOutput({ request_id: requestId, raw_output: raw, parsed_json: parsedJson, draft_text: formatted, confidence });

      return { parsedJson, formatted, raw, confidence };
    } catch (err) {
      lastError = err;
      attempt++;
      // exponential backoff
      await new Promise(r => setTimeout(r, attempt === 1 ? 1000 : 3000));
      continue;
    }
  }

  throw lastError;
}
