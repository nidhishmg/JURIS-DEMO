import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { chatService } from "./services/chatService";
import { draftService } from "./services/draftService";
import { citationService } from "./services/citationService";
import { ragService } from "./services/ragService";
import { pdfExtractionService } from "./services/pdfExtractionService";
import { insertFolderSchema, insertChatSchema, insertMessageSchema, insertDraftSchema, generateDraftSchema } from "@shared/schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
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

  app.post('/api/chats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertChatSchema.parse(req.body);
      const chat = await chatService.createChat(
        userId, 
        validatedData.title || undefined, 
        validatedData.folderId || undefined, 
        validatedData.mode || undefined
      );
      res.json(chat);
    } catch (error) {
      console.error("Error creating chat:", error);
      res.status(500).json({ message: "Failed to create chat" });
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

      const document = await storage.createDocument({
        title: file.originalname,
        fileName: file.originalname,
        fileSize: file.size,
        contentType: file.mimetype,
        folderId,
        uploadedBy: userId,
        s3Url: `uploads/${userId}/${Date.now()}-${file.originalname}`, // Mock S3 URL
        extractedText: file.buffer.toString(), // Mock text extraction
      });

      // Index document for RAG (non-blocking - don't fail upload if indexing fails)
      try {
        const chunks = await ragService.processDocumentText(file.buffer.toString());
        await ragService.indexDocument(document.id, chunks);
        console.log(`Document ${document.id} indexed successfully`);
      } catch (indexError) {
        // Log the error but don't fail the upload
        console.warn(`Failed to index document ${document.id} for RAG:`, indexError);
        console.warn("Document uploaded successfully but not indexed. Set OPENAI_API_KEY to enable RAG indexing.");
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

      // Process PDF extraction in background (non-blocking)
      if (s3Path) {
        (async () => {
          try {
            console.log(`Starting PDF extraction for judgment ${judgment.id}...`);
            const extractionResult = await pdfExtractionService.extractFromPath(s3Path);
            
            // Update judgment with extracted metadata
            await storage.updateJudgment(judgment.id, {
              caseName: extractionResult.metadata?.title || null,
              pages: extractionResult.totalPages,
            });
            
            console.log(`PDF extracted: ${extractionResult.totalPages} pages using ${extractionResult.extractionMethod} method`);
            
            // TODO: Continue with chunking and RAG indexing
            // TODO: Trigger LLM analysis pipeline
          } catch (error) {
            console.error(`PDF extraction failed for judgment ${judgment.id}:`, error);
            // Update analysis status to failed
            await storage.updateAnalysis(analysis.id, {
              status: 'failed',
              error: `PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
          }
        })();
      }

      console.log(`Judgment analysis queued: judgment_id=${judgment.id}, analysis_id=${analysis.id}, s3_path=${s3Path}`);

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
