import {
  users,
  organizations,
  folders,
  documents,
  chats,
  messages,
  templates,
  drafts,
  embeddings,
  citationVerifications,
  type User,
  type UpsertUser,
  type Folder,
  type InsertFolder,
  type Document,
  type InsertDocument,
  type Chat,
  type InsertChat,
  type Message,
  type InsertMessage,
  type Template,
  type Draft,
  type InsertDraft,
  type Embedding,
  type InsertEmbedding,
  type CitationVerification,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Folder operations
  getUserFolders(userId: string): Promise<Folder[]>;
  createFolder(folder: InsertFolder): Promise<Folder>;
  getFolder(id: string): Promise<Folder | undefined>;
  updateFolder(id: string, updates: Partial<InsertFolder>): Promise<Folder>;
  deleteFolder(id: string): Promise<void>;
  
  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: string): Promise<Document | undefined>;
  getFolderDocuments(folderId: string): Promise<Document[]>;
  deleteDocument(id: string): Promise<void>;
  
  // Chat operations
  createChat(chat: InsertChat): Promise<Chat>;
  getUserChats(userId: string): Promise<Chat[]>;
  getChat(id: string): Promise<Chat | undefined>;
  updateChat(id: string, updates: Partial<InsertChat>): Promise<Chat>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getChatMessages(chatId: string): Promise<Message[]>;
  
  // Draft operations
  createDraft(draft: InsertDraft): Promise<Draft>;
  getUserDrafts(userId: string): Promise<Draft[]>;
  getDraft(id: string): Promise<Draft | undefined>;
  updateDraft(id: string, updates: Partial<InsertDraft>): Promise<Draft>;
  
  // Embedding operations
  createEmbedding(embedding: InsertEmbedding): Promise<Embedding>;
  getDocumentEmbeddings(documentId: string): Promise<Embedding[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Folder operations
  async getUserFolders(userId: string): Promise<Folder[]> {
    return await db
      .select()
      .from(folders)
      .where(eq(folders.userId, userId))
      .orderBy(desc(folders.updatedAt));
  }

  async createFolder(folder: InsertFolder): Promise<Folder> {
    const [created] = await db.insert(folders).values(folder).returning();
    return created;
  }

  async getFolder(id: string): Promise<Folder | undefined> {
    const [folder] = await db.select().from(folders).where(eq(folders.id, id));
    return folder;
  }

  async updateFolder(id: string, updates: Partial<InsertFolder>): Promise<Folder> {
    const [updated] = await db
      .update(folders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(folders.id, id))
      .returning();
    return updated;
  }

  async deleteFolder(id: string): Promise<void> {
    await db.delete(folders).where(eq(folders.id, id));
  }

  // Document operations
  async createDocument(document: InsertDocument): Promise<Document> {
    const [created] = await db.insert(documents).values(document).returning();
    return created;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async getFolderDocuments(folderId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.folderId, folderId))
      .orderBy(desc(documents.createdAt));
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Chat operations
  async createChat(chat: InsertChat): Promise<Chat> {
    const [created] = await db.insert(chats).values(chat).returning();
    return created;
  }

  async getUserChats(userId: string): Promise<Chat[]> {
    return await db
      .select()
      .from(chats)
      .where(eq(chats.userId, userId))
      .orderBy(desc(chats.updatedAt));
  }

  async getChat(id: string): Promise<Chat | undefined> {
    const [chat] = await db.select().from(chats).where(eq(chats.id, id));
    return chat;
  }

  async updateChat(id: string, updates: Partial<InsertChat>): Promise<Chat> {
    const [updated] = await db
      .update(chats)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(chats.id, id))
      .returning();
    return updated;
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    return created;
  }

  async getChatMessages(chatId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.createdAt);
  }

  // Draft operations
  async createDraft(draft: InsertDraft): Promise<Draft> {
    const [created] = await db.insert(drafts).values(draft).returning();
    return created;
  }

  async getUserDrafts(userId: string): Promise<Draft[]> {
    return await db
      .select()
      .from(drafts)
      .where(eq(drafts.userId, userId))
      .orderBy(desc(drafts.updatedAt));
  }

  async getDraft(id: string): Promise<Draft | undefined> {
    const [draft] = await db.select().from(drafts).where(eq(drafts.id, id));
    return draft;
  }

  async updateDraft(id: string, updates: Partial<InsertDraft>): Promise<Draft> {
    const [updated] = await db
      .update(drafts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(drafts.id, id))
      .returning();
    return updated;
  }

  // Embedding operations
  async createEmbedding(embedding: InsertEmbedding): Promise<Embedding> {
    const [created] = await db.insert(embeddings).values(embedding).returning();
    return created;
  }

  async getDocumentEmbeddings(documentId: string): Promise<Embedding[]> {
    return await db
      .select()
      .from(embeddings)
      .where(eq(embeddings.documentId, documentId))
      .orderBy(embeddings.chunkIndex);
  }
}

export const storage = new DatabaseStorage();
