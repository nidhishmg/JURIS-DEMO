import { apiRequest } from "@/lib/queryClient";
import { Folder, Chat, Message, Template, Draft, Document } from "@/types";

export const api = {
  // Chat API
  async createChat(data: { title?: string; folderId?: string; mode?: string }) {
    const response = await apiRequest("POST", "/api/chats", data);
    return response.json();
  },

  async getUserChats() {
    const response = await apiRequest("GET", "/api/chats");
    return response.json();
  },

  async getChatMessages(chatId: string) {
    const response = await apiRequest("GET", `/api/chats/${chatId}/messages`);
    return response.json();
  },

  async sendMessage(chatId: string, content: string, attachments?: any[]) {
    const response = await apiRequest("POST", `/api/chats/${chatId}/messages`, {
      content,
      attachments,
    });
    return response.json();
  },

  // Folder API
  async createFolder(data: { name: string; description?: string; privacy?: string; jurisdiction?: string; metadata?: any }) {
    const response = await apiRequest("POST", "/api/folders", data);
    return response.json();
  },

  async getUserFolders() {
    const response = await apiRequest("GET", "/api/folders");
    return response.json();
  },

  async getFolder(folderId: string) {
    const response = await apiRequest("GET", `/api/folders/${folderId}`);
    return response.json();
  },

  async updateFolder(folderId: string, data: Partial<Folder>) {
    const response = await apiRequest("PUT", `/api/folders/${folderId}`, data);
    return response.json();
  },

  async deleteFolder(folderId: string) {
    const response = await apiRequest("DELETE", `/api/folders/${folderId}`);
    return response.json();
  },

  // Document API
  async uploadDocument(folderId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', folderId);

    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  async getFolderDocuments(folderId: string) {
    const response = await apiRequest("GET", `/api/folders/${folderId}/documents`);
    return response.json();
  },

  async deleteDocument(documentId: string) {
    const response = await apiRequest("DELETE", `/api/documents/${documentId}`);
    return response.json();
  },

  // Template API
  async getTemplates() {
    const response = await apiRequest("GET", "/api/templates");
    return response.json();
  },

  async getTemplate(templateId: string) {
    const response = await apiRequest("GET", `/api/templates/${templateId}`);
    return response.json();
  },

  // Draft API
  async generateDraft(data: { templateId: string; folderId?: string; inputs: any; title: string }) {
    const response = await apiRequest("POST", "/api/drafts/generate-sync", data);
    return response.json();
  },

  async downloadDraftPdf(draftId: string) {
    const response = await apiRequest("GET", `/api/drafts/${draftId}/pdf`);
    return response.blob();
  },

  async getUserDrafts() {
    const response = await apiRequest("GET", "/api/drafts");
    return response.json();
  },

  async getDraft(draftId: string) {
    const response = await apiRequest("GET", `/api/drafts/${draftId}`);
    return response.json();
  },

  async updateDraft(draftId: string, data: { contentHtml?: string; status?: string; version?: number }) {
    const response = await apiRequest("PUT", `/api/drafts/${draftId}`, data);
    return response.json();
  },

  async enhanceDraftWithLLM(draftId: string) {
    const response = await apiRequest("POST", `/api/drafts/${draftId}/enhance`);
    return response.json();
  },

  async validateDraftWithLLM(draftId: string) {
    const response = await apiRequest("POST", `/api/drafts/${draftId}/validate`);
    return response.json();
  },

  async exportDraft(draftId: string, format: 'pdf' | 'docx') {
    const response = await apiRequest("GET", `/api/drafts/${draftId}/export?format=${format}`);
    return response.blob();
  },

  // Citation API
  async verifyCitations(citations: string[]) {
    const response = await apiRequest("POST", "/api/citations/verify", { citations });
    return response.json();
  },

  async convertIPCtoBNS(ipcSection: string) {
    const response = await apiRequest("GET", `/api/citations/convert/ipc-to-bns?section=${encodeURIComponent(ipcSection)}`);
    return response.json();
  },

  async convertBNSToIPC(bnsSection: string) {
    const response = await apiRequest("GET", `/api/citations/convert/bns-to-ipc?section=${encodeURIComponent(bnsSection)}`);
    return response.json();
  },

  // Search API
  async searchStatutes(query: string) {
    const response = await apiRequest("GET", `/api/search/statutes?q=${encodeURIComponent(query)}`);
    return response.json();
  },

  async searchCaseLaw(query: string, filters?: any) {
    const response = await apiRequest("POST", "/api/search/cases", { query, filters });
    return response.json();
  },
};
