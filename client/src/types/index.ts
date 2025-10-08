export interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  privacy: 'private' | 'firm' | 'public';
  jurisdiction?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Chat {
  id: string;
  title?: string;
  folderId?: string;
  mode: 'general' | 'case' | 'drafting' | 'statute';
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: any[];
  sources?: any[];
  verificationStatus?: 'verified' | 'unverified' | 'pending';
  metadata?: any;
  createdAt: string;
}

export interface Document {
  id: string;
  title: string;
  fileName: string;
  fileSize?: number;
  contentType?: string;
  folderId?: string;
  s3Url?: string;
  extractedText?: string;
  metadata?: any;
  createdAt: string;
}

export interface Template {
  id: string;
  category: string;
  title: string;
  description?: string;
  requiredInputs: string[];
  template: any[];
  uiHints?: any;
}

export interface Draft {
  id: string;
  templateId: string;
  folderId?: string;
  title: string;
  contentHtml: string;
  contentText?: string;
  inputs?: any;
  citations?: any[];
  verificationStatus?: string;
  version: number;
  status: 'draft' | 'review' | 'final';
  createdAt: string;
  updatedAt: string;
}

export interface StreamMessage {
  id: string;
  content: string;
  sources: any[];
  metadata: any;
  isComplete: boolean;
}

export interface Citation {
  text: string;
  type: 'case_law' | 'statute' | 'unknown';
  verified: boolean;
  source?: string;
  sourceUrl?: string;
  excerpt?: string;
  confidence?: number;
}
