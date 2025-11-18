import { readFileSync } from 'fs';

export function normalizeInput(formData: Record<string, any>) {
  // Simple normalization: trim strings, title case names
  const normalized: Record<string, any> = { ...formData };

  function titleCase(s: string) {
    return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  for (const k of Object.keys(normalized)) {
    const v = normalized[k];
    if (typeof v === 'string') {
      normalized[k] = v.trim();
    }
    if (k.toLowerCase().includes('name') && typeof normalized[k] === 'string') {
      normalized[k] = titleCase(normalized[k]);
    }
  }

  // Normalize offence_sections field
  if (normalized.offence_sections) {
    const raw = Array.isArray(normalized.offence_sections) ? normalized.offence_sections : [String(normalized.offence_sections)];
    normalized.offence_sections = raw.map((s: string) => {
      const m = s.match(/(\d{1,4})\s*(IPC|BNS)?/i);
      if (m) {
        return { section: m[1], code: (m[2] || 'IPC').toUpperCase() };
      }
      return { raw: s };
    });
  }

  // Default fields
  normalized.language = normalized.language || 'en-IN';
  normalized.style = normalized.style || 'court_formal';
  normalized.template_version = normalized.template_version || '1.0';

  return normalized;
}

// Lightweight OCR placeholder: returns empty extracted data or minimal metadata
export async function extractTextFromPdf(buffer: Buffer) {
  // For local dev we won't run heavy OCR; return empty or basic metadata
  return { text: '', extracted: {} };
}
