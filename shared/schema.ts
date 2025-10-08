import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  uuid,
  integer
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organizations for multi-tenant support
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  plan: varchar("plan").default("free"), // free, premium, enterprise
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User organization memberships
export const userOrganizations = pgTable("user_organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  role: varchar("role").default("member"), // member, admin, owner
  createdAt: timestamp("created_at").defaultNow(),
});

// Case folders for organizing legal work
export const folders = pgTable("folders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  organizationId: varchar("organization_id").references(() => organizations.id),
  userId: varchar("user_id").references(() => users.id).notNull(),
  privacy: varchar("privacy").default("private"), // private, firm, public
  jurisdiction: varchar("jurisdiction"),
  metadata: jsonb("metadata"), // client info, case details, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documents uploaded to folders
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  fileName: varchar("file_name").notNull(),
  fileSize: integer("file_size"),
  contentType: varchar("content_type"),
  folderId: varchar("folder_id").references(() => folders.id),
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  s3Url: varchar("s3_url"),
  extractedText: text("extracted_text"),
  metadata: jsonb("metadata"), // court, date, bench, citation info
  chunksCount: integer("chunks_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat conversations
export const chats = pgTable("chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title"),
  folderId: varchar("folder_id").references(() => folders.id), // null for general chats
  userId: varchar("user_id").references(() => users.id).notNull(),
  mode: varchar("mode").default("general"), // general, case, drafting, statute
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat messages
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").references(() => chats.id).notNull(),
  role: varchar("role").notNull(), // user, assistant, system
  content: text("content").notNull(),
  attachments: jsonb("attachments"), // file references
  sources: jsonb("sources"), // citation sources used
  verificationStatus: varchar("verification_status"), // verified, unverified, pending
  metadata: jsonb("metadata"), // additional structured data
  createdAt: timestamp("created_at").defaultNow(),
});

// Legal draft templates
export const templates = pgTable("templates", {
  id: varchar("id").primaryKey(),
  category: varchar("category").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  requiredInputs: jsonb("required_inputs").notNull(), // array of field definitions
  template: jsonb("template").notNull(), // template structure
  uiHints: jsonb("ui_hints"), // form field hints and validation
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Generated drafts
export const drafts = pgTable("drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => templates.id).notNull(),
  folderId: varchar("folder_id").references(() => folders.id),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: varchar("title").notNull(),
  contentHtml: text("content_html").notNull(),
  contentText: text("content_text"),
  inputs: jsonb("inputs"), // user provided inputs
  citations: jsonb("citations"), // extracted citations
  verificationStatus: varchar("verification_status").default("pending"),
  version: integer("version").default(1),
  status: varchar("status").default("draft"), // draft, review, final
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vector embeddings for RAG
export const embeddings = pgTable("embeddings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => documents.id),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  embedding: text("embedding").notNull(), // serialized vector
  metadata: jsonb("metadata"), // chunk metadata
  createdAt: timestamp("created_at").defaultNow(),
});

// Citation verification results
export const citationVerifications = pgTable("citation_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  citation: varchar("citation").notNull(),
  found: boolean("found").notNull(),
  source: varchar("source"), // SCC, IndianKanoon, etc.
  sourceUrl: varchar("source_url"),
  excerpt: text("excerpt"),
  overruled: boolean("overruled").default(false),
  confidence: integer("confidence"), // 0-100
  verifiedAt: timestamp("verified_at").defaultNow(),
});

// Export types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type InsertFolder = typeof folders.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
export type Chat = typeof chats.$inferSelect;
export type InsertChat = typeof chats.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type Template = typeof templates.$inferSelect;
export type Draft = typeof drafts.$inferSelect;
export type InsertDraft = typeof drafts.$inferInsert;
export type Embedding = typeof embeddings.$inferSelect;
export type InsertEmbedding = typeof embeddings.$inferInsert;
export type CitationVerification = typeof citationVerifications.$inferSelect;

// Validation schemas
export const insertFolderSchema = createInsertSchema(folders).pick({
  name: true,
  description: true,
  organizationId: true,
  privacy: true,
  jurisdiction: true,
  metadata: true,
});

export const insertChatSchema = createInsertSchema(chats).pick({
  title: true,
  folderId: true,
  mode: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  chatId: true,
  role: true,
  content: true,
  attachments: true,
  sources: true,
  metadata: true,
});

export const insertDraftSchema = createInsertSchema(drafts).pick({
  templateId: true,
  folderId: true,
  title: true,
  contentHtml: true,
  contentText: true,
  inputs: true,
});
