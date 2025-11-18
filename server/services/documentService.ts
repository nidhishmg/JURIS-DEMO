import { storage } from '../storage';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const OUTPUT_DIR = path.join(process.cwd(), 'uploads', 'generated');

export async function prepareAndSaveDocument(requestId: string, userId: string, templateId: string, draftText: string, parsedJson: any, confidence: number) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const docId = 'doc-' + crypto.randomUUID();
  const html = renderHtml(draftText);
  const htmlPath = path.join(OUTPUT_DIR, `${docId}.html`);
  await fs.writeFile(htmlPath, html, 'utf-8');

  let pdfPath: string | null = null;
  try {


    // Try to use puppeteer if available
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    pdfPath = path.join(OUTPUT_DIR, `${docId}.pdf`);
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
    await browser.close();
  } catch (err: any) {
    console.warn('Puppeteer not available or PDF generation failed, skipping PDF:', err.message || err);
  }

  const urls: any = { html: `file://${htmlPath}` };
  if (pdfPath) urls.pdf = `file://${pdfPath}`;

  const docRecord = await storage.createDocument({ id: docId, request_id: requestId, user_id: userId, template_id: templateId, status: 'generated', urls_json: urls, confidence, citations: parsedJson?.citations || [], created_at: new Date().toISOString() });

  return { docRecord, urls };
}

function renderHtml(draftText: string) {
  // Basic sanitization - escape script tags
  const sanitized = draftText.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Draft</title><style>body{font-family: serif; margin:40px; line-height:1.4;} h1,h2,h3{font-weight:700;} pre{white-space:pre-wrap;}</style></head><body>${sanitized}</body></html>`;
}
