import OpenAI from "openai";
import { db } from "../db";
import { embeddings, documents, folders } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

interface RetrievedContext {
  sources: Array<{
    id: string;
    title: string;
    content: string;
    metadata: any;
    similarity?: number;
  }>;
  metadata: {
    totalSources: number;
    folderScoped: boolean;
    retrievalMethod: string;
  };
}

export class RAGService {
  // Simple in-memory vector store for MVP
  private vectorStore = new Map<string, { embedding: number[], content: string, metadata: any }>();

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: text,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error("Embedding generation error:", error);
      throw new Error("Failed to generate embedding");
    }
  }

  async indexDocument(documentId: string, chunks: string[]) {
    try {
      const document = await db.select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);

      if (!document[0]) {
        throw new Error("Document not found");
      }

      const doc = document[0];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await this.generateEmbedding(chunk);
        
        // Store in database
        await db.insert(embeddings).values({
          documentId,
          chunkIndex: i,
          content: chunk,
          embedding: JSON.stringify(embedding),
          metadata: {
            title: doc.title,
            fileName: doc.fileName,
            folderId: doc.folderId,
          }
        });

        // Store in memory for quick access (MVP implementation)
        const key = `${documentId}_${i}`;
        this.vectorStore.set(key, {
          embedding,
          content: chunk,
          metadata: {
            documentId,
            title: doc.title,
            fileName: doc.fileName,
            folderId: doc.folderId,
            chunkIndex: i,
          }
        });
      }

      // Update document chunks count
      await db.update(documents)
        .set({ 
          chunksCount: chunks.length,
          updatedAt: new Date()
        })
        .where(eq(documents.id, documentId));

    } catch (error) {
      console.error("Document indexing error:", error);
      throw new Error("Failed to index document");
    }
  }

  async retrieveContext(query: string, folderId?: string): Promise<RetrievedContext> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
      // For MVP, use in-memory similarity search
      const similarities = [];
      
      for (const [key, stored] of this.vectorStore.entries()) {
        // If folder is specified, only search within that folder
        if (folderId && stored.metadata.folderId !== folderId) {
          continue;
        }
        
        const similarity = this.cosineSimilarity(queryEmbedding, stored.embedding);
        similarities.push({
          key,
          similarity,
          ...stored
        });
      }
      
      // Sort by similarity and take top 5
      const topMatches = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5)
        .filter(match => match.similarity > 0.7); // Threshold for relevance

      const sources = topMatches.map(match => ({
        id: match.metadata.documentId,
        title: match.metadata.title,
        content: match.content,
        metadata: {
          fileName: match.metadata.fileName,
          chunkIndex: match.metadata.chunkIndex,
          similarity: match.similarity,
        },
        similarity: match.similarity,
      }));

      return {
        sources,
        metadata: {
          totalSources: sources.length,
          folderScoped: !!folderId,
          retrievalMethod: "cosine_similarity"
        }
      };

    } catch (error) {
      console.error("Context retrieval error:", error);
      return {
        sources: [],
        metadata: {
          totalSources: 0,
          folderScoped: !!folderId,
          retrievalMethod: "error"
        }
      };
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async processDocumentText(text: string): Promise<string[]> {
    // Simple chunking strategy - split by paragraphs and combine small ones
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    const chunks = [];
    let currentChunk = "";
    
    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > 1000) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    if (currentChunk) chunks.push(currentChunk.trim());
    
    return chunks.filter(chunk => chunk.length > 50); // Filter out very small chunks
  }

  async searchStatutes(query: string): Promise<any[]> {
    // Mock statute search - in production this would query official legal databases
    const commonStatutes = [
      {
        title: "Indian Penal Code, 1860",
        sections: ["Section 420 - Cheating", "Section 498A - Domestic Violence"],
        url: "https://legislative.gov.in/sites/default/files/A1860-45.pdf"
      },
      {
        title: "Code of Criminal Procedure, 1973", 
        sections: ["Section 41 - Arrest", "Section 439 - Bail"],
        url: "https://legislative.gov.in/sites/default/files/A1974-02.pdf"
      },
      {
        title: "Bharatiya Nyaya Sanhita, 2023",
        sections: ["Section 318 - Cheating (replaces IPC 420)"],
        url: "https://legislative.gov.in/acts-of-parliament-of-india"
      }
    ];

    return commonStatutes.filter(statute => 
      statute.title.toLowerCase().includes(query.toLowerCase()) ||
      statute.sections.some(section => section.toLowerCase().includes(query.toLowerCase()))
    );
  }
}

export const ragService = new RAGService();
