import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./localAuth";
import { chatService } from "./services/chatService";
import { draftService } from "./services/draftService";
import { citationService } from "./services/citationService";
import { ragService } from "./services/ragService";
import { pdfExtractionService } from "./services/pdfExtractionService";
import { chunkingService } from "./services/chunkingService";
import { analysisService } from "./services/analysisService";
import { insertFolderSchema, insertChatSchema, insertMessageSchema, insertDraftSchema, generateDraftSchema } from "@shared/schema";
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
// Create a simple normalizeInput function inline since draftHelpers module doesn't exist
const normalizeInput = (data: any) => {
  // Basic normalization - can be expanded as needed
  if (!data || typeof data !== 'object') return {};
  return { ...data };
};
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health endpoint (no auth required)
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // For local development, return the mock user directly
      const user = {
        id: userId,
        email: req.user.claims.email,
        name: req.user.claims.name
      };
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Folder routes
  app.get('/api/folders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const folders = await storage.getUserFolders(userId);
      res.json(folders);
    } catch (error) {
      console.error("Error fetching folders:", error);
      res.status(500).json({ message: "Failed to fetch folders" });
    }
  });

  app.post('/api/folders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertFolderSchema.parse(req.body);
      const folder = await storage.createFolder({ ...validatedData, userId });
      res.json(folder);
    } catch (error) {
      console.error("Error creating folder:", error);
      res.status(500).json({ message: "Failed to create folder" });
    }
  });

  app.get('/api/folders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const folder = await storage.getFolder(req.params.id);
      if (!folder || folder.userId !== userId) {
        return res.status(404).json({ message: "Folder not found" });
      }
      res.json(folder);
    } catch (error) {
      console.error("Error fetching folder:", error);
      res.status(500).json({ message: "Failed to fetch folder" });
    }
  });

  app.put('/api/folders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const folder = await storage.getFolder(req.params.id);
      if (!folder || folder.userId !== userId) {
        return res.status(404).json({ message: "Folder not found" });
      }
      const updatedFolder = await storage.updateFolder(req.params.id, req.body);
      res.json(updatedFolder);
    } catch (error) {
      console.error("Error updating folder:", error);
      res.status(500).json({ message: "Failed to update folder" });
    }
  });

  app.delete('/api/folders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const folder = await storage.getFolder(req.params.id);
      if (!folder || folder.userId !== userId) {
        return res.status(404).json({ message: "Folder not found" });
      }
      await storage.deleteFolder(req.params.id);
      res.json({ message: "Folder deleted successfully" });
    } catch (error) {
      console.error("Error deleting folder:", error);
      res.status(500).json({ message: "Failed to delete folder" });
    }
  });

  app.get('/api/folders/:id/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const folder = await storage.getFolder(req.params.id);
      if (!folder || folder.userId !== userId) {
        return res.status(404).json({ message: "Folder not found" });
      }
      const documents = await storage.getFolderDocuments(req.params.id);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Chat routes
  app.get('/api/chats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const chats = await chatService.getUserChats(userId);
      res.json(chats);
    } catch (error) {
      console.error("Error fetching chats:", error);
      res.status(500).json({ message: "Failed to fetch chats" });
    }
  });

  // Draft Generator webhook - Node 0
  app.post('/api/v1/drafts', async (req: any, res) => {
    try {
      // Authentication: Bearer token or API key in header
      const authHeader = req.headers?.authorization || req.headers?.Authorization;
      const apiKey = req.headers['x-api-key'] || req.headers['x-api-key'];
      let userId = null;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        // For simplicity in local dev, accept token 'local-dev-token' mapping to mock user
        const token = authHeader.split(' ')[1];
        if (token === 'local-dev-token') userId = 'local-user';
      } else if (apiKey && apiKey === 'local-dev-key') {
        userId = 'local-user';
      }

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!req.is('application/json')) {
        return res.status(415).json({ message: 'Content-Type must be application/json' });
      }

      const body = req.body;
      const request_id = body.idempotency_key || (body.request_id) || (require('crypto').randomUUID());

      // Persist raw payload
      await storage.createIncomingRequest({ request_id, user_id: userId, template_id: body.template_id, raw_payload: body });

      // Immediately run schema validation and normalization asynchronously (but respond 202)
      setTimeout(async () => {
        try {
          // Validate using AJV against schema files stored in server/templates/schemas
          const schemaDir = path.join(process.cwd(), 'server', 'templates', 'schemas');
          const schemaFile = path.join(schemaDir, `${body.template_id}.schema.json`);
          let validationReport: any[] = [];
          let valid = true;

          if (fs.existsSync(schemaFile)) {
            const raw = fs.readFileSync(schemaFile, 'utf-8');
            const schema = JSON.parse(raw);
            const ajv = new Ajv({ allErrors: true, strict: false });
            addFormats(ajv);
            const validate = ajv.compile(schema);
            const ok = validate(body.form_data || {});
            if (!ok) {
              valid = false;
              validationReport = (validate.errors || []).map(e => ({ message: e.message, instancePath: e.instancePath, severity: 'critical' }));
            }
          } else {
            // No schema found, treat as valid but log warning
            validationReport.push({ message: 'Schema not found for template', severity: 'warning' });
          }

          await storage.createAuditLog({ request_id, node: 'Validate Input', status: valid ? 'ok' : 'failed', message: JSON.stringify(validationReport) });

          if (!valid) {
            await storage.updateIncomingRequest(request_id, { status: 'validation_failed', validation_report: validationReport });
            // In a full workflow this would trigger a callback or 400 return. Here we store and exit.
            return;
          }

          // Normalize
          const normalized = normalizeInput(body.form_data || {});
          await storage.createNormalizedRequest({ request_id, normalized_data: normalized, user_id: userId, template_id: body.template_id });
          await storage.createAuditLog({ request_id, node: 'Normalize Data', status: 'ok', message: 'Normalization complete' });
          // Continue building prompt and LLM call (orchestrate here)
          try {
            const { buildPrompt, callLlmWithPrompt } = await import('./services/promptService');
            const { prepareAndSaveDocument } = await import('./services/documentService');
            const { systemPrompt, userPrompt } = await buildPrompt(request_id, body.template_id, normalized);
            await storage.createAuditLog({ request_id, node: 'Build Prompt', status: 'ok', message: 'Prompt built' });

            const llmResult = await callLlmWithPrompt(request_id, systemPrompt, userPrompt);
            await storage.createAuditLog({ request_id, node: 'AI Legal Drafter', status: 'ok', message: 'LLM called' });

            // Persist llm outputs already done in promptService; now prepare final document
            const docRes = await prepareAndSaveDocument(request_id, userId, body.template_id, llmResult.formatted, llmResult.parsedJson, llmResult.confidence);

            // Update incoming request
            await storage.updateIncomingRequest(request_id, { status: 'completed', document_id: docRes.docRecord.id, download_urls: docRes.urls, confidence: llmResult.confidence });
            await storage.createAuditLog({ request_id, node: 'Prepare Final Document', status: 'ok', message: 'Document prepared' });

            // If callback_url provided in body, attempt callback
            if (body.callback_url) {
              try {
                await fetch(body.callback_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request_id, document_id: docRes.docRecord.id, status: 'success', download_urls: docRes.urls, confidence: llmResult.confidence }) });
              } catch (cbErr) {
                await storage.createAuditLog({ request_id, node: 'Callback', status: 'error', message: String(cbErr) });
              }
            }
          } catch (pipelineErr) {
            console.error('Pipeline error:', pipelineErr);
            await storage.updateIncomingRequest(request_id, { status: 'failed', error: String(pipelineErr) });
            await storage.createAuditLog({ request_id, node: 'pipeline', status: 'error', message: String(pipelineErr) });
          }
        } catch (innerErr) {
          console.error('Async processing error:', innerErr);
          await storage.createAuditLog({ request_id, node: 'async_processing', status: 'error', message: String(innerErr) });
        }
      }, 10);

      res.status(202).json({ request_id });
    } catch (error) {
      console.error('Error in /api/v1/drafts:', error);
      res.status(500).json({ message: 'Failed to accept draft request' });
    }
  });

  // Synchronous draft generation for immediate UI display
  app.post('/api/drafts/generate-sync', isAuthenticated, async (req: any, res) => {
    console.log('🎯 SYNC DRAFT REQUEST RECEIVED');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    try {
      const userId = req.user.claims.sub;
      const { templateId, inputs, title } = req.body;
      console.log(`Processing draft for template: ${templateId}, user: ${userId}`);
      
      // Import services
      const { normalizeInput } = await import('./services/draftHelpers');
      const { buildPrompt, callLlmWithPrompt } = await import('./services/promptService');
      const { prepareAndSaveDocument } = await import('./services/documentService');
      
      // Simple HTML renderer function
      const renderHtml = (text: string) => {
        const sanitized = text.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
        return `<div>${sanitized.replace(/\n/g, '<br>')}</div>`;
      };
      
      const requestId = crypto.randomUUID();
      
      // Normalize inputs
      const normalized = normalizeInput(inputs);
      
      // Build prompt and call LLM
      const { systemPrompt, userPrompt } = await buildPrompt(requestId, templateId, normalized);
      const llmResult = await callLlmWithPrompt(requestId, systemPrompt, userPrompt);
      
      // Prepare document
      const docRes = await prepareAndSaveDocument(requestId, userId, templateId, llmResult.formatted, llmResult.parsedJson, llmResult.confidence);
      
      // Create draft record in legacy format for compatibility
      const draft = await storage.createDraft({
        templateId,
        folderId: req.body.folderId,
        userId,
        title,
        contentHtml: renderHtml(llmResult.formatted),
        contentText: llmResult.formatted,
        inputs: normalized,
        citations: llmResult.parsedJson?.citations || [],
        status: 'draft',
        documentId: docRes.docRecord.id,
        downloadUrls: docRes.urls,
        confidence: llmResult.confidence,
        llmEnhanced: true
      });
      
      res.json(draft);
    } catch (error: any) {
      console.error('Error in sync draft generation:', error);
      res.status(500).json({ message: error.message || 'Failed to generate draft' });
    }
  });

  // Status endpoint
  app.get('/api/v1/drafts/:requestId/status', async (req: any, res) => {
    const r = storage.incomingRequests.get(req.params.requestId);
    if (!r) return res.status(404).json({ message: 'Not found' });
    res.json({ request_id: r.request_id, status: r.status, document_id: r.document_id, confidence: r.confidence, download_urls: r.download_urls, error: r.error });
  });

  // Direct HTML download (local simulation)
  app.get('/api/v1/documents/:documentId/html', async (req: any, res) => {
    const doc = await storage.getDocument(req.params.documentId);
    if (!doc) return res.status(404).send('Not found');
    const htmlUrl: string | undefined = doc.urls_json?.html;
    if (!htmlUrl || !htmlUrl.startsWith('file://')) return res.status(404).send('HTML not available');
    const fsPath = htmlUrl.replace('file://','');
    try {
      const data = await (await import('fs/promises')).readFile(fsPath, 'utf-8');
      res.setHeader('Content-Type','text/html');
      res.send(data);
    } catch (e) {
      res.status(500).send('Failed to read file');
    }
  });

  // PDF download endpoint
  app.get('/api/drafts/:id/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const draft = await storage.getDraft(req.params.id);
      if (!draft || !draft.documentId) {
        return res.status(404).json({ message: 'Draft or document not found' });
      }
      
      const doc = await storage.getDocument(draft.documentId);
      if (!doc) return res.status(404).send('Document not found');
      
      const pdfUrl: string | undefined = doc.urls_json?.pdf;
      if (!pdfUrl || !pdfUrl.startsWith('file://')) {
        return res.status(404).send('PDF not available');
      }
      
      const fsPath = pdfUrl.replace('file://','');
      const fs = await import('fs/promises');
      const data = await fs.readFile(fsPath);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${draft.title}.pdf"`);
      res.send(data);
    } catch (error) {
      console.error('Error serving PDF:', error);
      res.status(500).send('Failed to serve PDF');
    }
  });

  app.post('/api/chats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Allow empty body; validate if provided but don't block
      const parsed = insertChatSchema.partial().safeParse(req.body ?? {});
      const data = parsed.success ? parsed.data : {};

      const chat = await chatService.createChat(
        userId,
        (data as any).title || undefined,
        (data as any).folderId || undefined,
        (data as any).mode || 'general'
      );
      res.json(chat);
    } catch (error) {
      console.error("Error creating chat:", error);
      const message = error instanceof Error ? error.message : 'Failed to create chat';
      res.status(500).json({ message, code: 'CHAT_CREATE_FAILED' });
    }
  });

  app.get('/api/chats/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const messages = await chatService.getChatHistory(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/chats/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertMessageSchema.parse({ 
        ...req.body, 
        chatId: req.params.id 
      });
      
      const message = await chatService.addMessage(
        req.params.id,
        validatedData.role,
        validatedData.content,
        validatedData.sources ? (Array.isArray(validatedData.sources) ? validatedData.sources : [validatedData.sources]) : undefined,
        validatedData.metadata || undefined
      );
      res.json(message);
    } catch (error) {
      console.error("Error adding message:", error);
      res.status(500).json({ message: "Failed to add message" });
    }
  });

  // Document routes
  app.post('/api/documents/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const file = req.file;
      const folderId = req.body.folderId;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Verify folder ownership
      if (folderId) {
        const folder = await storage.getFolder(folderId);
        if (!folder || folder.userId !== userId) {
          return res.status(404).json({ message: "Folder not found" });
        }
      }

      // Persist file to disk under uploads/documents for indexing and later reference
      const { writeFile, mkdir } = await import('fs/promises');
      const { join } = await import('path');

      const baseDir = join(process.cwd(), 'uploads', 'documents', userId);
      await mkdir(baseDir, { recursive: true });
      const filename = `${Date.now()}-${file.originalname}`;
      const filePath = join(baseDir, filename);
      await writeFile(filePath, file.buffer);

      const s3Url = `uploads/documents/${userId}/${filename}`;

      // Attempt basic extraction for PDFs; fallback to text for plaintext files
      let extractedText = '';
      const isPDF = /pdf/i.test(file.mimetype) || /\.pdf$/i.test(file.originalname);
      if (isPDF) {
        try {
          const extraction = await pdfExtractionService.extractFromPath(s3Url);
          extractedText = extraction.pages.map(p => p.text).join('\n\n');
        } catch (exErr) {
          console.warn('PDF extraction failed for document upload, storing without extracted text:', exErr);
        }
      } else if (/text|json|csv/i.test(file.mimetype)) {
        extractedText = file.buffer.toString('utf8');
      }

      const document = await storage.createDocument({
        title: file.originalname,
        fileName: file.originalname,
        fileSize: file.size,
        contentType: file.mimetype,
        folderId,
        uploadedBy: userId,
        s3Url,
        extractedText: extractedText || null,
      });

      // Index document for RAG (non-blocking - don't fail upload if indexing fails)
      try {
        const sourceText = extractedText || file.buffer.toString('utf8');
        const chunks = await ragService.processDocumentText(sourceText);
        await ragService.indexDocument(document.id, chunks);
        console.log(`Document ${document.id} indexed successfully`);
      } catch (indexError) {
        // Log the error but don't fail the upload
        console.warn(`Failed to index document ${document.id} for RAG:`, indexError);
        console.warn("Document uploaded successfully but not indexed. In online mode, set API key to enable embedding; in offline mode, pseudo-embeddings are used.");
      }

      res.json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.delete('/api/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const document = await storage.getDocument(req.params.id);
      if (!document || document.uploadedBy !== userId) {
        return res.status(404).json({ message: "Document not found" });
      }
      await storage.deleteDocument(req.params.id);
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Template routes
  app.get('/api/templates', isAuthenticated, async (req, res) => {
    try {
      const templates = await draftService.getTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.get('/api/templates/:id', isAuthenticated, async (req, res) => {
    try {
      const template = await draftService.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  // Draft routes
  app.get('/api/drafts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const drafts = await draftService.getUserDrafts(userId);
      res.json(drafts);
    } catch (error) {
      console.error("Error fetching drafts:", error);
      res.status(500).json({ message: "Failed to fetch drafts" });
    }
  });

  app.post('/api/drafts/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = generateDraftSchema.parse(req.body);
      
      const draft = await draftService.generateDraft({
        templateId: validatedData.templateId,
        folderId: validatedData.folderId,
        userId,
        inputs: validatedData.inputs,
        title: validatedData.title,
      });
      
      res.json(draft);
    } catch (error) {
      console.error("Error generating draft:", error);
      res.status(500).json({ message: "Failed to generate draft" });
    }
  });

  app.get('/api/drafts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const draft = await draftService.getDraft(req.params.id);
      if (!draft || draft.userId !== userId) {
        return res.status(404).json({ message: "Draft not found" });
      }
      res.json(draft);
    } catch (error) {
      console.error("Error fetching draft:", error);
      res.status(500).json({ message: "Failed to fetch draft" });
    }
  });

  app.put('/api/drafts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const draft = await draftService.getDraft(req.params.id);
      if (!draft || draft.userId !== userId) {
        return res.status(404).json({ message: "Draft not found" });
      }
      const updatedDraft = await draftService.updateDraft(req.params.id, req.body);
      res.json(updatedDraft);
    } catch (error) {
      console.error("Error updating draft:", error);
      res.status(500).json({ message: "Failed to update draft" });
    }
  });

  // LLM Enhancement routes
  app.post('/api/drafts/:id/enhance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const enhancedDraft = await draftService.enhanceDraftWithLLM(req.params.id, userId);
      res.json(enhancedDraft);
    } catch (error: any) {
      console.error("Error enhancing draft:", error);
      res.status(500).json({ 
        message: error.message || "Failed to enhance draft with LLM" 
      });
    }
  });

  app.post('/api/drafts/:id/validate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validation = await draftService.validateDraftWithLLM(req.params.id, userId);
      res.json(validation);
    } catch (error: any) {
      console.error("Error validating draft:", error);
      res.status(500).json({ 
        message: error.message || "Failed to validate draft with LLM" 
      });
    }
  });

  // Citation routes
  app.post('/api/citations/verify', isAuthenticated, async (req, res) => {
    try {
      const { citations } = req.body;
      const results = await citationService.verifyCitations(citations);
      res.json(results);
    } catch (error) {
      console.error("Error verifying citations:", error);
      res.status(500).json({ message: "Failed to verify citations" });
    }
  });

  app.get('/api/citations/convert/ipc-to-bns', isAuthenticated, async (req, res) => {
    try {
      const { section } = req.query;
      const result = citationService.convertIPCtoBNS(section as string);
      res.json(result);
    } catch (error) {
      console.error("Error converting IPC to BNS:", error);
      res.status(500).json({ message: "Failed to convert IPC to BNS" });
    }
  });

  app.get('/api/citations/convert/bns-to-ipc', isAuthenticated, async (req, res) => {
    try {
      const { section } = req.query;
      const result = citationService.convertBNSToIPC(section as string);
      res.json(result);
    } catch (error) {
      console.error("Error converting BNS to IPC:", error);
      res.status(500).json({ message: "Failed to convert BNS to IPC" });
    }
  });

  // Search routes
  app.get('/api/search/statutes', isAuthenticated, async (req, res) => {
    try {
      const { q } = req.query;
      const results = await ragService.searchStatutes(q as string);
      res.json(results);
    } catch (error) {
      console.error("Error searching statutes:", error);
      res.status(500).json({ message: "Failed to search statutes" });
    }
  });

  // Judgment Analysis routes
  app.post('/api/analysis/judgment', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sourceType, sourceUrl, folderId } = req.body;
      const file = req.file;

      // Validate input
      if (!sourceType || !['upload', 'url', 'citation'].includes(sourceType)) {
        return res.status(400).json({ message: "Invalid sourceType. Must be 'upload', 'url', or 'citation'" });
      }

      if (sourceType === 'upload' && !file) {
        return res.status(400).json({ message: "File is required for upload sourceType" });
      }

      if ((sourceType === 'url' || sourceType === 'citation') && !sourceUrl) {
        return res.status(400).json({ message: "sourceUrl is required for url/citation sourceType" });
      }

      // Verify folder ownership if folderId provided
      if (folderId) {
        const folder = await storage.getFolder(folderId);
        if (!folder) {
          return res.status(404).json({ message: "Folder not found" });
        }
        if (folder.userId !== userId) {
          return res.status(403).json({ message: "Unauthorized: Cannot add judgment to this folder" });
        }
      }

      // Store file if uploaded
      let s3Path = null;
      if (file) {
        const { writeFile, mkdir } = await import('fs/promises');
        const { join } = await import('path');
        
        // Create directory structure
        const uploadDir = join(process.cwd(), 'uploads', 'judgments', userId);
        await mkdir(uploadDir, { recursive: true });
        
        // Generate unique filename
        const filename = `${Date.now()}-${file.originalname}`;
        const filePath = join(uploadDir, filename);
        s3Path = `uploads/judgments/${userId}/${filename}`;
        
        // Write file to disk
        await writeFile(filePath, file.buffer);
        console.log(`File persisted: ${filePath} (${file.size} bytes)`);
      }

      // Create judgment record
      const judgment = await storage.createJudgment({
        sourceUrl: sourceUrl || null,
        s3Path,
        caseName: null, // Will be extracted during analysis
        court: null,
        bench: null,
        date: null,
        citation: sourceType === 'citation' ? sourceUrl : null,
        pages: null,
        uploadedBy: userId,
        folderId: folderId || null,
      });

      // Create analysis record with "processing" status
      const analysis = await storage.createAnalysis({
        judgmentId: judgment.id,
        status: 'processing',
        result: null,
        error: null,
        createdBy: userId,
      });

      // Return 202 Accepted with analysis_id
      res.status(202).json({
        analysis_id: analysis.id,
        status: 'processing',
        message: 'Judgment ingestion started. Analysis in progress.',
      });

      // Process judgment in background (non-blocking)
      (async () => {
        try {
          let extractionResult;
          let chunkingResult;

          if (s3Path) {
            // FILE UPLOAD: Extract from uploaded PDF
            console.log(`Starting PDF extraction for judgment ${judgment.id}...`);
            extractionResult = await pdfExtractionService.extractFromPath(s3Path);
            
            // Update judgment with extracted metadata
            await storage.updateJudgment(judgment.id, {
              caseName: extractionResult.metadata?.title || null,
              pages: extractionResult.totalPages,
            });
            
            console.log(`PDF extracted: ${extractionResult.totalPages} pages using ${extractionResult.extractionMethod} method`);
            
            // Chunk the extracted text with page/paragraph anchors
            chunkingResult = await chunkingService.chunkPages(extractionResult.pages, judgment.id);
            console.log(`Chunking complete: ${chunkingResult.totalChunks} chunks, ${chunkingResult.statistics.totalParagraphs} paragraphs, avg size ${chunkingResult.statistics.averageChunkSize} chars`);
          } else if (sourceUrl) {
            // Check if sourceUrl is a citation (not a URL)
            const isCitation = sourceType === 'citation' || !sourceUrl.match(/^https?:\/\//i);
            
            if (isCitation) {
              // CITATION: Need to resolve citation to URL first (TODO: implement citation resolver)
              throw new Error(`Citation resolution not yet implemented. Please provide a direct PDF URL instead of citation: "${sourceUrl}"`);
            }
            
            // URL: Fetch and extract from URL
            console.log(`Fetching judgment from URL: ${sourceUrl}...`);
            extractionResult = await pdfExtractionService.extractFromUrl(sourceUrl);
            
            // Update judgment with extracted metadata
            await storage.updateJudgment(judgment.id, {
              caseName: extractionResult.metadata?.title || null,
              pages: extractionResult.totalPages,
            });
            
            console.log(`PDF extracted from URL: ${extractionResult.totalPages} pages using ${extractionResult.extractionMethod} method`);
            
            // Chunk the extracted text
            chunkingResult = await chunkingService.chunkPages(extractionResult.pages, judgment.id);
            console.log(`Chunking complete: ${chunkingResult.totalChunks} chunks`);
          } else {
            throw new Error('No source provided for judgment analysis');
          }
          
          // Run full LLM analysis pipeline
          await analysisService.runFullAnalysis(judgment.id, analysis.id, extractionResult, chunkingResult.chunks);
          
          // TODO: Store chunks in database for RAG indexing (future enhancement)
          // TODO: Index chunks in vector store (future enhancement)
        } catch (error) {
          console.error(`Judgment analysis failed for ${judgment.id}:`, error);
          // Update analysis status to failed
          await storage.updateAnalysis(analysis.id, {
            status: 'failed',
            error: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      })();

      console.log(`Judgment analysis queued: judgment_id=${judgment.id}, analysis_id=${analysis.id}, source=${s3Path || sourceUrl}`);

    } catch (error) {
      console.error("Error ingesting judgment:", error);
      res.status(500).json({ message: "Failed to ingest judgment" });
    }
  });

  app.get('/api/analysis/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analysis = await storage.getAnalysis(req.params.id);
      
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      // Get associated judgment
      const judgment = await storage.getJudgment(analysis.judgmentId);
      
      // Check access permission
      if (judgment && judgment.uploadedBy !== userId) {
        return res.status(403).json({ message: "Unauthorized access" });
      }

      res.json({
        ...analysis,
        judgment,
      });
    } catch (error) {
      console.error("Error fetching analysis:", error);
      res.status(500).json({ message: "Failed to fetch analysis" });
    }
  });

  // Load templates on startup
  await draftService.loadTemplatesFromFiles();

  const httpServer = createServer(app);
  
  // WebSocket setup for chat streaming
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket, req: any) => {
    console.log('WebSocket connected');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        const { type, chatId, content, userId, folderId, mode } = message;

        if (type === 'chat_message' && ws.readyState === WebSocket.OPEN) {
          const context = {
            userId,
            chatId,
            folderId,
            mode: mode || 'general',
          };

          try {
            for await (const response of chatService.streamChatResponse(context, content)) {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'chat_response',
                  ...response,
                }));
              }
            }
          } catch (error) {
            console.error('Chat streaming error:', error);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to generate response',
              }));
            }
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
          }));
        }
      }
    });

    ws.on('close', () => {
      console.log('WebSocket disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return httpServer;
}
