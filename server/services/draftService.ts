import { db } from "../db";
import { templates, drafts, folders } from "@shared/schema";
import { eq } from "drizzle-orm";
import { chatService } from "./chatService";
import fs from "fs/promises";
import path from "path";

interface TemplateField {
  name: string;
  type: string;
  required: boolean;
  placeholder?: string;
  validation?: any;
}

interface GenerateDraftRequest {
  templateId: string;
  folderId?: string;
  userId: string;
  inputs: Record<string, any>;
  title: string;
}

export class DraftService {
  async getTemplates() {
    return await db.select().from(templates).where(eq(templates.isActive, true));
  }

  async getTemplate(templateId: string) {
    const [template] = await db.select()
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1);
    
    return template;
  }

  async generateDraft(request: GenerateDraftRequest) {
    const template = await this.getTemplate(request.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Build context from folder if provided
    let folderContext = {};
    if (request.folderId) {
      const [folder] = await db.select()
        .from(folders)
        .where(eq(folders.id, request.folderId))
        .limit(1);
      
      if (folder?.metadata) {
        folderContext = folder.metadata as any;
      }
    }

    // Merge folder context with user inputs
    const allInputs = { ...folderContext, ...request.inputs };

    // Generate draft content using template
    const { contentHtml, contentText, missingFields } = this.processTemplate(
      template.template as any,
      allInputs
    );

    // Extract citations from content
    const citations = this.extractCitations(contentHtml);

    // Save draft to database
    const [draft] = await db.insert(drafts).values({
      templateId: request.templateId,
      folderId: request.folderId,
      userId: request.userId,
      title: request.title,
      contentHtml,
      contentText,
      inputs: allInputs,
      citations,
    }).returning();

    return {
      ...draft,
      missingFields,
      citations,
    };
  }

  private processTemplate(templateStructure: any[], inputs: Record<string, any>) {
    let contentHtml = "";
    let contentText = "";
    const missingFields: string[] = [];

    for (const section of templateStructure) {
      const { heading, content } = section;
      
      // Process heading
      const processedHeading = this.replacePlaceholders(heading, inputs, missingFields);
      contentHtml += `<h2>${processedHeading}</h2>\n`;
      contentText += `${processedHeading}\n\n`;

      // Process content
      if (content) {
        const processedContent = this.replacePlaceholders(content, inputs, missingFields);
        contentHtml += `<p>${processedContent}</p>\n\n`;
        contentText += `${processedContent}\n\n`;
      }
    }

    return { contentHtml, contentText, missingFields };
  }

  private replacePlaceholders(text: string, inputs: Record<string, any>, missingFields: string[]): string {
    return text.replace(/\[([^\]]+)\]/g, (match, fieldName) => {
      const value = inputs[fieldName];
      if (value) {
        return value;
      } else {
        if (!missingFields.includes(fieldName)) {
          missingFields.push(fieldName);
        }
        return `<span class="bg-amber-100 px-1">[INSERT: ${fieldName}]</span>`;
      }
    });
  }

  private extractCitations(html: string): any[] {
    const citations: any[] = [];
    
    // Look for common citation patterns
    const patterns = [
      /\b\d{4}\s*\)\s*\d+\s+SCC\s+\d+/g, // SCC citations
      /AIR\s+\d{4}\s+SC\s+\d+/g, // AIR citations
      /Section\s+\d+\w*\s+\w+/g, // Statute sections
    ];

    patterns.forEach(pattern => {
      const matches = html.match(pattern);
      if (matches) {
        matches.forEach(match => {
          citations.push({
            text: match.trim(),
            type: this.determineCitationType(match),
            verified: false,
          });
        });
      }
    });

    return citations;
  }

  private determineCitationType(citation: string): string {
    if (citation.includes('SCC')) return 'case_law';
    if (citation.includes('AIR')) return 'case_law';
    if (citation.includes('Section')) return 'statute';
    return 'unknown';
  }

  async getUserDrafts(userId: string) {
    return await db.select({
      id: drafts.id,
      title: drafts.title,
      status: drafts.status,
      templateId: drafts.templateId,
      folderId: drafts.folderId,
      createdAt: drafts.createdAt,
      updatedAt: drafts.updatedAt,
    })
      .from(drafts)
      .where(eq(drafts.userId, userId));
  }

  async getDraft(draftId: string) {
    const [draft] = await db.select()
      .from(drafts)
      .where(eq(drafts.id, draftId))
      .limit(1);
    
    return draft;
  }

  async updateDraft(draftId: string, updates: Partial<typeof drafts.$inferInsert>) {
    const [updatedDraft] = await db.update(drafts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(drafts.id, draftId))
      .returning();
    
    return updatedDraft;
  }

  async loadTemplatesFromFiles() {
    const templatesDir = path.join(process.cwd(), 'server', 'templates');
    
    try {
      const files = await fs.readdir(templatesDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      for (const file of jsonFiles) {
        const filePath = path.join(templatesDir, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const templateData = JSON.parse(fileContent);

        // Upsert template (insert or update if exists)
        await db.insert(templates)
          .values(templateData)
          .onConflictDoUpdate({
            target: templates.id,
            set: {
              ...templateData,
              updatedAt: new Date(),
            }
          });
      }

      console.log(`Loaded ${jsonFiles.length} templates from files`);
    } catch (error) {
      console.error('Error loading templates from files:', error);
    }
  }
}

export const draftService = new DraftService();
