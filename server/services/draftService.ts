import { storage } from "../storage";
import { chatService } from "./chatService";
import { localLlmService } from "./localLlmService";
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
    return storage.getTemplates();
  }

  async getTemplate(templateId: string) {
    return storage.getTemplate(templateId);
  }

  async generateDraft(request: GenerateDraftRequest) {
    const template = await this.getTemplate(request.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Build context from folder if provided
    let folderContext = {};
    if (request.folderId) {
      const folder = await storage.getFolder(request.folderId);
      if (folder?.metadata) folderContext = folder.metadata as any;
    }

    // Merge folder context with user inputs
    const allInputs = { ...folderContext, ...request.inputs };

    // Generate initial draft content using template
    const { contentHtml, contentText, missingFields } = this.processTemplate(
      template.template as any,
      allInputs
    );

    // Check if local LLM is available and enhance the draft
    let enhancedContentHtml = contentHtml;
    let enhancedContentText = contentText;
    let llmEnhanced = false;

    try {
      const isLocalLlmAvailable = await localLlmService.isAvailable();
      
      if (isLocalLlmAvailable && contentText.trim()) {
        console.log('Enhancing draft with local LLM...');
        
        const enhancedContent = await localLlmService.enhanceDraft(
          contentText,
          allInputs,
          template.title
        );

        if (enhancedContent && enhancedContent.trim()) {
          // Convert enhanced content to HTML
          enhancedContentHtml = this.convertTextToHtml(enhancedContent);
          enhancedContentText = enhancedContent;
          llmEnhanced = true;
          console.log('Draft successfully enhanced with local LLM');
        }
      } else if (!isLocalLlmAvailable) {
        console.log('Local LLM not available, using template-only generation');
      }
    } catch (error) {
      console.error('Error enhancing draft with local LLM:', error);
      // Continue with original template-based content
    }

    // Extract citations from content
    const citations = this.extractCitations(enhancedContentHtml);

    // Save draft to database
    const draft = await storage.createDraft({
      templateId: request.templateId,
      folderId: request.folderId,
      userId: request.userId,
      title: request.title,
      contentHtml: enhancedContentHtml,
      contentText: enhancedContentText,
      inputs: allInputs,
      citations,
      status: 'draft',
    });

    return {
      ...draft,
      missingFields,
      citations,
      llmEnhanced,
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

  private convertTextToHtml(text: string): string {
    // Convert plain text to HTML with basic formatting
    return text
      .split('\n\n')
      .map(paragraph => {
        if (paragraph.trim()) {
          // Check if it looks like a heading (all caps, short, etc.)
          if (paragraph.length < 100 && paragraph === paragraph.toUpperCase() && paragraph.trim().endsWith(':')) {
            return `<h3>${paragraph.trim()}</h3>`;
          }
          // Check if it starts with a number (like 1., 2., etc.)
          if (/^\d+\./.test(paragraph.trim())) {
            return `<ol><li>${paragraph.replace(/^\d+\.\s*/, '').trim()}</li></ol>`;
          }
          // Check if it starts with a bullet point
          if (/^[-•*]/.test(paragraph.trim())) {
            return `<ul><li>${paragraph.replace(/^[-•*]\s*/, '').trim()}</li></ul>`;
          }
          // Regular paragraph
          return `<p>${paragraph.trim()}</p>`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
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
    return storage.getUserDrafts(userId);
  }

  async getDraft(draftId: string) {
    return storage.getDraft(draftId);
  }

  async updateDraft(draftId: string, updates: Partial<any>) {
    return storage.updateDraft(draftId, updates as any);
  }

  async enhanceDraftWithLLM(draftId: string, userId: string) {
    const draft = await storage.getDraft(draftId);
    if (!draft || draft.userId !== userId) {
      throw new Error("Draft not found or access denied");
    }

    try {
      const isLocalLlmAvailable = await localLlmService.isAvailable();
      
      if (!isLocalLlmAvailable) {
        throw new Error("Local LLM is not available");
      }

      const template = await this.getTemplate(draft.templateId);
      if (!template) {
        throw new Error("Template not found");
      }

      console.log('Enhancing existing draft with local LLM...');
      
      const enhancedContent = await localLlmService.enhanceDraft(
        draft.contentText,
        draft.inputs,
        template.title
      );

      if (enhancedContent && enhancedContent.trim()) {
        const enhancedContentHtml = this.convertTextToHtml(enhancedContent);
        const citations = this.extractCitations(enhancedContentHtml);

        const updatedDraft = await storage.updateDraft(draftId, {
          contentHtml: enhancedContentHtml,
          contentText: enhancedContent,
          citations,
          updatedAt: new Date(),
        });

        console.log('Draft successfully enhanced with local LLM');
        return {
          ...updatedDraft,
          llmEnhanced: true,
        };
      } else {
        throw new Error("Failed to generate enhanced content");
      }
    } catch (error) {
      console.error('Error enhancing draft with local LLM:', error);
      throw error;
    }
  }

  async validateDraftWithLLM(draftId: string, userId: string) {
    const draft = await storage.getDraft(draftId);
    if (!draft || draft.userId !== userId) {
      throw new Error("Draft not found or access denied");
    }

    try {
      const isLocalLlmAvailable = await localLlmService.isAvailable();
      
      if (!isLocalLlmAvailable) {
        throw new Error("Local LLM is not available");
      }

      const template = await this.getTemplate(draft.templateId);
      if (!template) {
        throw new Error("Template not found");
      }

      console.log('Validating draft with local LLM...');
      
      const validation = await localLlmService.validateDraft(
        draft.contentText,
        template.title
      );

      console.log('Draft validation completed');
      return validation;
    } catch (error) {
      console.error('Error validating draft with local LLM:', error);
      throw error;
    }
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

        // Upsert template into in-memory storage
        await storage.upsertTemplate(templateData);
      }

      console.log(`Loaded ${jsonFiles.length} templates from files`);
    } catch (error) {
      console.error('Error loading templates from files:', error);
    }
  }
}

export const draftService = new DraftService();
