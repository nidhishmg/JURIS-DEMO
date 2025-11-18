import { randomUUID } from 'crypto';

// In-memory storage implementation to remove DB dependency for local development
type AnyRecord = Record<string, any>;

  class InMemoryStorage {
    users = new Map<string, AnyRecord>();
    organizations = new Map<string, AnyRecord>();
    folders = new Map<string, AnyRecord>();
    documents = new Map<string, AnyRecord>();
    chats = new Map<string, AnyRecord>();
    messages = new Map<string, AnyRecord>();
    templates = new Map<string, AnyRecord>();
    drafts = new Map<string, AnyRecord>();
    embeddings = new Map<string, AnyRecord>();
    citationVerifications = new Map<string, AnyRecord>();
    judgments = new Map<string, AnyRecord>();
    analyses = new Map<string, AnyRecord>();
  // Draft generator specific
  incomingRequests = new Map<string, AnyRecord>();
  normalizedRequests = new Map<string, AnyRecord>();
  promptHistory = new Map<string, AnyRecord>();
  llmOutputs = new Map<string, AnyRecord>();
  auditLogs = new Map<string, AnyRecord>();

    // Utilities
  now() { return new Date().toISOString(); }
  ts(v?: string) { return v ? new Date(v).getTime() : 0; }

    async getUser(id: string) {
      return this.users.get(id);
    }

    async upsertUser(userData: AnyRecord) {
      const id = userData.id || randomUUID();
      const existing = this.users.get(id) || {};
      const merged = { ...existing, ...userData, id, updatedAt: this.now(), createdAt: existing.createdAt || this.now() };
      this.users.set(id, merged);
      return merged;
    }

    async getUserFolders(userId: string) {
      return Array.from(this.folders.values())
        .filter(f => f.userId === userId)
        .sort((a,b) => this.ts(b.updatedAt) - this.ts(a.updatedAt));
    }

    async createFolder(folder: AnyRecord) {
      const id = folder.id || randomUUID();
      const obj = { id, ...folder, createdAt: this.now(), updatedAt: this.now() };
      this.folders.set(id, obj);
      return obj;
    }

    async getFolder(id: string) { return this.folders.get(id); }

    async updateFolder(id: string, updates: AnyRecord) {
      const existing = this.folders.get(id);
      if (!existing) throw new Error('Folder not found');
      const updated = { ...existing, ...updates, updatedAt: this.now() };
      this.folders.set(id, updated);
      return updated;
    }

    async deleteFolder(id: string) { this.folders.delete(id); }

    // Documents
    async createDocument(document: AnyRecord) {
      const id = document.id || randomUUID();
      const obj = { id, ...document, createdAt: this.now(), updatedAt: this.now() };
      this.documents.set(id, obj);
      return obj;
    }

    async getDocument(id: string) { return this.documents.get(id); }

    async updateDocument(id: string, updates: AnyRecord) {
      const existing = this.documents.get(id);
      if (!existing) throw new Error('Document not found');
      const updated = { ...existing, ...updates, updatedAt: this.now() };
      this.documents.set(id, updated);
      return updated;
    }

    async getFolderDocuments(folderId: string) {
      return Array.from(this.documents.values())
        .filter(d => d.folderId === folderId)
        .sort((a,b) => this.ts(b.createdAt) - this.ts(a.createdAt));
    }

    async deleteDocument(id: string) { this.documents.delete(id); }

    // Chat & messages
    async createChat(chat: AnyRecord) {
      const id = chat.id || randomUUID();
      const obj = { id, ...chat, createdAt: this.now(), updatedAt: this.now() };
      this.chats.set(id, obj);
      return obj;
    }

    async getUserChats(userId: string) {
      return Array.from(this.chats.values())
        .filter(c => c.userId === userId)
        .sort((a,b) => this.ts(b.updatedAt) - this.ts(a.updatedAt));
    }

    async getChat(id: string) { return this.chats.get(id); }

    async updateChat(id: string, updates: AnyRecord) {
      const existing = this.chats.get(id);
      if (!existing) throw new Error('Chat not found');
      const updated = { ...existing, ...updates, updatedAt: this.now() };
      this.chats.set(id, updated);
      return updated;
    }

    async createMessage(message: AnyRecord) {
      const id = message.id || randomUUID();
      const obj = { id, ...message, createdAt: this.now() };
      this.messages.set(id, obj);
      return obj;
    }

    async getChatMessages(chatId: string) {
      return Array.from(this.messages.values()).filter(m => m.chatId === chatId).sort((a,b) => (new Date(a.createdAt)).getTime() - (new Date(b.createdAt)).getTime());
    }

    // Drafts/templates
    async createDraft(draft: AnyRecord) {
      const id = draft.id || randomUUID();
      const obj = { id, ...draft, createdAt: this.now(), updatedAt: this.now() };
      this.drafts.set(id, obj);
      return obj;
    }

    // Incoming requests
    async createIncomingRequest(data: AnyRecord) {
      const id = data.request_id || randomUUID();
      const obj = { request_id: id, ...data, received_at: this.now(), status: data.status || 'received' };
      this.incomingRequests.set(id, obj);
      return obj;
    }

    async updateIncomingRequest(requestId: string, updates: AnyRecord) {
      const existing = this.incomingRequests.get(requestId);
      if (!existing) throw new Error('Incoming request not found');
      const updated = { ...existing, ...updates, updated_at: this.now() };
      this.incomingRequests.set(requestId, updated);
      return updated;
    }

    // Normalized requests
    async createNormalizedRequest(data: AnyRecord) {
      const id = data.request_id || randomUUID();
      const obj = { request_id: id, ...data, normalized_at: this.now() };
      this.normalizedRequests.set(id, obj);
      return obj;
    }

    // Prompt history
    async createPromptHistory(data: AnyRecord) {
      const id = data.id || randomUUID();
      const obj = { id, ...data, created_at: this.now() };
      this.promptHistory.set(id, obj);
      return obj;
    }

    // LLM outputs
    async createLlmOutput(data: AnyRecord) {
      const id = data.id || randomUUID();
      const obj = { id, ...data, created_at: this.now() };
      this.llmOutputs.set(id, obj);
      return obj;
    }

    // Audit logs
    async createAuditLog(data: AnyRecord) {
      const id = data.id || randomUUID();
      const obj = { id, ...data, ts: this.now() };
      this.auditLogs.set(id, obj);
      return obj;
    }

    async getUserDrafts(userId: string) {
      return Array.from(this.drafts.values())
        .filter(d => d.userId === userId)
        .sort((a,b) => this.ts(b.updatedAt) - this.ts(a.updatedAt));
    }

    async getDraft(id: string) { return this.drafts.get(id); }

    async updateDraft(id: string, updates: AnyRecord) {
      const existing = this.drafts.get(id);
      if (!existing) throw new Error('Draft not found');
      const updated = { ...existing, ...updates, updatedAt: this.now() };
      this.drafts.set(id, updated);
      return updated;
    }

    // Templates
    async getTemplates() {
      return Array.from(this.templates.values()).filter(t => t.isActive !== false);
    }

    async getTemplate(id: string) { return this.templates.get(id); }

    async upsertTemplate(template: AnyRecord) {
      const id = template.id || randomUUID();
      const existing = this.templates.get(id) || {};
      const merged = { ...existing, ...template, id, updatedAt: this.now(), createdAt: existing.createdAt || this.now() };
      this.templates.set(id, merged);
      return merged;
    }

    // Embeddings
    async createEmbedding(embedding: AnyRecord) {
      const id = embedding.id || randomUUID();
      const obj = { id, ...embedding, createdAt: this.now() };
      this.embeddings.set(id, obj);
      return obj;
    }

    async getDocumentEmbeddings(documentId: string) {
      return Array.from(this.embeddings.values()).filter(e => e.documentId === documentId).sort((a,b) => a.chunkIndex - b.chunkIndex);
    }

    // Citation verifications
    async getCitationVerification(citation: string) {
      return Array.from(this.citationVerifications.values()).find(v => v.citation === citation);
    }

    async createCitationVerification(data: AnyRecord) {
      const id = data.id || randomUUID();
      const obj = { id, ...data, createdAt: this.now() };
      this.citationVerifications.set(id, obj);
      return obj;
    }

    async getCitationStats() {
      const stats = Array.from(this.citationVerifications.values());
      const uniqueSources = new Set(stats.map(v => v.source).filter(Boolean));
      return {
        totalVerified: stats.length,
        averageConfidence: stats.length ? stats.reduce((s,v) => s + (v.confidence||0), 0) / stats.length : 0,
        sources: Array.from(uniqueSources),
      };
    }

    // Judgments & analyses
    async createJudgment(j: AnyRecord) { const id = j.id || randomUUID(); const obj = { id, ...j, createdAt: this.now() }; this.judgments.set(id, obj); return obj; }
    async getJudgment(id: string) { return this.judgments.get(id); }
    async getUserJudgments(userId: string) { return Array.from(this.judgments.values()).filter(j => j.uploadedBy === userId); }
    async updateJudgment(id: string, updates: AnyRecord) { const ex = this.judgments.get(id); if (!ex) throw new Error('Judgment not found'); const upd = { ...ex, ...updates, updatedAt: this.now() }; this.judgments.set(id, upd); return upd; }

    async createAnalysis(a: AnyRecord) { const id = a.id || randomUUID(); const obj = { id, ...a, createdAt: this.now(), updatedAt: this.now() }; this.analyses.set(id, obj); return obj; }
    async getAnalysis(id: string) { return this.analyses.get(id); }
    async getJudgmentAnalysis(judgmentId: string) { return Array.from(this.analyses.values()).find(a => a.judgmentId === judgmentId); }
    async updateAnalysis(id: string, updates: AnyRecord) { const ex = this.analyses.get(id); if (!ex) throw new Error('Analysis not found'); const upd = { ...ex, ...updates, updatedAt: this.now() }; this.analyses.set(id, upd); return upd; }
  }

  export const storage = new InMemoryStorage();
