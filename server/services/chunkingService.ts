import type { PageContent } from './pdfExtractionService';

export interface ChunkAnchor {
  pageNumber: number;
  paragraphNumber: number;
  startChar: number;
  endChar: number;
}

export interface JudgmentChunk {
  chunkId: string;
  text: string;
  anchor: ChunkAnchor;
  metadata: {
    pageNumber: number;
    paragraphNumber: number;
    wordCount: number;
    charCount: number;
  };
}

export interface ChunkingResult {
  chunks: JudgmentChunk[];
  totalChunks: number;
  statistics: {
    totalPages: number;
    totalParagraphs: number;
    averageChunkSize: number;
  };
}

class ChunkingService {
  private readonly MAX_CHUNK_SIZE = 1000; // characters
  private readonly MIN_CHUNK_SIZE = 200; // characters
  private readonly OVERLAP_SIZE = 100; // character overlap between chunks

  async chunkPages(pages: PageContent[], judgmentId: number): Promise<ChunkingResult> {
    const chunks: JudgmentChunk[] = [];
    let globalParagraphCounter = 0;
    let chunkCounter = 0;

    for (const page of pages) {
      const paragraphs = this.extractParagraphs(page.text);
      
      for (let paraIndex = 0; paraIndex < paragraphs.length; paraIndex++) {
        const paragraph = paragraphs[paraIndex];
        
        // Skip empty paragraphs
        if (paragraph.trim().length === 0) continue;
        
        // Increment paragraph counter only for non-empty paragraphs
        globalParagraphCounter++;
        
        // If paragraph fits in one chunk, use it as is
        if (paragraph.length <= this.MAX_CHUNK_SIZE) {
          chunks.push({
            chunkId: `${judgmentId}-${page.pageNumber}-${globalParagraphCounter}-${chunkCounter++}`,
            text: paragraph,
            anchor: {
              pageNumber: page.pageNumber,
              paragraphNumber: globalParagraphCounter,
              startChar: 0,
              endChar: paragraph.length,
            },
            metadata: {
              pageNumber: page.pageNumber,
              paragraphNumber: globalParagraphCounter,
              wordCount: this.countWords(paragraph),
              charCount: paragraph.length,
            },
          });
        } else {
          // Split long paragraphs into overlapping chunks
          const paraChunks = this.splitLongParagraph(
            paragraph,
            page.pageNumber,
            globalParagraphCounter,
            judgmentId,
            chunkCounter
          );
          chunks.push(...paraChunks);
          chunkCounter += paraChunks.length;
        }
      }
    }

    // Calculate statistics
    const totalChunkSize = chunks.reduce((sum, chunk) => sum + chunk.text.length, 0);
    const averageChunkSize = chunks.length > 0 ? totalChunkSize / chunks.length : 0;

    return {
      chunks,
      totalChunks: chunks.length,
      statistics: {
        totalPages: pages.length,
        totalParagraphs: globalParagraphCounter,
        averageChunkSize: Math.round(averageChunkSize),
      },
    };
  }

  private extractParagraphs(text: string): string[] {
    // Split by double newlines (paragraph breaks) or single newlines followed by indentation
    // This preserves legal document structure
    const paragraphs: string[] = [];
    
    // First split by double newlines
    let parts = text.split(/\n\n+/);
    
    // Then check for numbered paragraphs or indented lines that might be separate paragraphs
    for (const part of parts) {
      // Check if this part contains numbered paragraphs (e.g., "1. ", "2. ", "(1)", "(a)")
      const numberedParts = part.split(/\n(?=\d+\.|\([0-9a-z]+\)|[A-Z]\.|[a-z]\))/);
      
      if (numberedParts.length > 1) {
        paragraphs.push(...numberedParts);
      } else {
        paragraphs.push(part);
      }
    }
    
    return paragraphs.filter(p => p.trim().length > 0);
  }

  private splitLongParagraph(
    paragraph: string,
    pageNumber: number,
    paragraphNumber: number,
    judgmentId: number,
    startChunkCounter: number
  ): JudgmentChunk[] {
    const chunks: JudgmentChunk[] = [];
    let position = 0;
    let localChunkIndex = 0;

    while (position < paragraph.length) {
      // Calculate chunk end position
      let endPosition = Math.min(position + this.MAX_CHUNK_SIZE, paragraph.length);
      
      // If not at the end, try to break at sentence boundary
      if (endPosition < paragraph.length) {
        // Look for sentence endings (. ! ?) within last 200 chars
        const searchStart = Math.max(position + this.MIN_CHUNK_SIZE, endPosition - 200);
        const searchText = paragraph.substring(searchStart, endPosition);
        const sentenceEnd = searchText.match(/[.!?]\s/);
        
        if (sentenceEnd && sentenceEnd.index !== undefined) {
          endPosition = searchStart + sentenceEnd.index + 2; // Include punctuation and space
        }
      }
      
      const chunkText = paragraph.substring(position, endPosition).trim();
      
      chunks.push({
        chunkId: `${judgmentId}-${pageNumber}-${paragraphNumber}-${startChunkCounter + localChunkIndex}`,
        text: chunkText,
        anchor: {
          pageNumber,
          paragraphNumber,
          startChar: position,
          endChar: endPosition,
        },
        metadata: {
          pageNumber,
          paragraphNumber,
          wordCount: this.countWords(chunkText),
          charCount: chunkText.length,
        },
      });
      
      localChunkIndex++;
      
      // If we've reached the end of the paragraph, exit loop
      if (endPosition >= paragraph.length) {
        break;
      }
      
      // Move position forward with overlap
      position = Math.max(endPosition - this.OVERLAP_SIZE, position + this.MIN_CHUNK_SIZE);
    }

    return chunks;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  async chunkDocument(
    extractedText: string,
    judgmentId: number,
    pageNumber: number = 1
  ): Promise<ChunkingResult> {
    // For non-paginated text, treat as single page
    const pageContent: PageContent = {
      pageNumber,
      text: extractedText,
      method: 'digital',
    };
    
    return this.chunkPages([pageContent], judgmentId);
  }
}

export const chunkingService = new ChunkingService();
