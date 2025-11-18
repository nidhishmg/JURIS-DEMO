// Utilities and stubs for offline mode (no external LLM/API calls)

const OFFLINE = String(process.env.OFFLINE_MODE || "").toLowerCase() === "true";

export const isOffline = () => OFFLINE;

// Deterministic pseudo-embedding generator for offline similarity
// Produces a fixed-length vector based on character codes and simple hashing
export function pseudoEmbedding(text: string, dim = 256): number[] {
  const vec = new Array(dim).fill(0);
  // Simple rolling hash to distribute characters
  let h1 = 2166136261;
  let h2 = 16777619;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 16777619);
    h2 = (h2 ^ ((c << 5) | (c >>> 27))) >>> 0;
    const idx = (h1 ^ h2 ^ i) >>> 0;
    vec[idx % dim] += ((c % 13) - 6) / 7; // values roughly in [-~0.85, ~1.0]
  }
  // Normalize to unit length to make cosine similarity meaningful
  let norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map(v => v / norm);
}

// Create a short, helpful offline response template using context
export function offlineChatCompose(userMessage: string, mode: string, context: { sources?: any[] }): string {
  const header = `Offline mode: AI generation is disabled. Here's a structured helper draft based on your query.`;
  const modeLine = `Mode: ${mode || "general"}`;
  const summary = `User query: ${userMessage}`;
  const sources = (context.sources || []).slice(0, 5)
    .map((s: any, i: number) => `  ${i + 1}. ${s.title || s.id} (similarity: ${s.similarity?.toFixed?.(2) ?? "n/a"})`)
    .join("\n");

  const guidance = `Next steps for you:
- Review the listed source excerpts above.
- Paste a local model's output (e.g., Ollama) if you want richer analysis.
- If information is missing, note it explicitly as [INSUFFICIENT SOURCE].`;

  return [header, modeLine, summary, sources ? `Sources:\n${sources}` : "No sources found in your workspace.", guidance].join("\n\n");
}

// Offline analysis generator: returns deterministic JSON structures per step
export function offlineAnalysisForStep(
  step: string,
  chunksText: string,
  prior: Record<string, any>,
  requiredFields: string[] | undefined
): any {
  // Heuristics: pull first ~500 chars as context preview
  const preview = chunksText.slice(0, 500).replace(/\s+/g, ' ').trim();

  // Generic scaffold with common fields
  const base: any = {
    step,
    anchor: `offline:${step}`,
    notes: `Offline placeholder generated locally. Review and replace with a locally-run model's output if needed.`,
    contextPreview: preview,
    derivedFrom: Object.keys(prior),
  };

  // Fill out step-specific reasonable placeholders
  switch (step) {
    case 'metadata':
      base.caseTitle = guessCaseTitle(preview);
      base.court = guessCourt(preview);
      base.date = guessDate(preview);
      break;
    case 'summary':
      base.brief = `This is a brief offline summary scaffold. Replace with a local model's summary.`;
      base.keyPoints = extractBullets(preview, 3);
      break;
    case 'facts':
      base.facts = extractBullets(preview, 5);
      break;
    case 'timeline':
      base.events = extractBullets(preview, 4).map((t: string, i: number) => ({ when: `T${i + 1}`, what: t }));
      break;
    case 'issues':
      base.issues = extractBullets(preview, 3).map((t: string) => ({ question: t }));
      break;
    case 'ratio':
      base.ratioDecidendi = extractBullets(preview, 2);
      break;
    case 'obiter':
      base.observations = extractBullets(preview, 2);
      break;
    case 'precedents':
      base.citations = extractCitations(preview);
      break;
    default:
      base.details = extractBullets(preview, 3);
  }

  if (requiredFields && Array.isArray(requiredFields)) {
    for (const f of requiredFields) {
      if (!(f in base)) base[f] = null;
    }
  }

  return base;
}

function extractBullets(text: string, n: number): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.slice(0, n);
}

function extractCitations(text: string) {
  // Very naive citation-like pattern finder
  const matches = Array.from(text.matchAll(/\b[A-Z]{2,} v\. [A-Z][\w]+\b|\b\d{4} SCC \d+\b/g))
    .slice(0, 3)
    .map(m => ({ cite: m[0] }));
  return matches.length ? matches : [{ cite: null }];
}

function guessCourt(text: string) {
  if (/supreme court/i.test(text)) return 'Supreme Court of India';
  if (/high court/i.test(text)) return 'High Court';
  return null;
}

function guessDate(text: string) {
  const m = text.match(/\b(\d{1,2}[-\/ ](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*[-\/ ]\d{2,4}|\d{4}-\d{2}-\d{2})\b/i);
  return m ? m[0] : null;
}

function guessCaseTitle(text: string) {
  const m = text.match(/\b([A-Z][\w]+)\s+v\.\s+([A-Z][\w]+)/);
  return m ? `${m[1]} v. ${m[2]}` : null;
}
