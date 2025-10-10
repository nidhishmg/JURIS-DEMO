import { readFile } from 'fs/promises';
import { join } from 'path';
import { createWorker } from 'tesseract.js';

export interface PageContent {
  pageNumber: number;
  text: string;
  method: 'digital' | 'ocr';
}

export interface ExtractionResult {
  pages: PageContent[];
  totalPages: number;
  extractionMethod: 'digital' | 'ocr' | 'hybrid';
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
  };
}

class PDFExtractionService {
  private readonly MIN_TEXT_LENGTH = 50; // Threshold to determine if PDF has text

  async extractFromPath(filePath: string): Promise<ExtractionResult> {
    try {
      const absolutePath = filePath.startsWith('/') 
        ? filePath 
        : join(process.cwd(), filePath);
      
      const buffer = await readFile(absolutePath);
      return await this.extractFromBuffer(buffer);
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error(`Failed to extract PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async extractFromBuffer(buffer: Buffer): Promise<ExtractionResult> {
    // Try digital extraction first
    const digitalResult = await this.extractDigitalText(buffer);
    
    // Check if we got meaningful text
    const totalText = digitalResult.pages.reduce((sum, page) => sum + page.text.length, 0);
    
    if (totalText > this.MIN_TEXT_LENGTH * digitalResult.totalPages) {
      // Digital extraction successful
      return {
        ...digitalResult,
        extractionMethod: 'digital',
      };
    }
    
    // Fallback to OCR for scanned PDFs
    console.log('Minimal text found, using OCR...');
    const ocrResult = await this.extractWithOCR(buffer);
    
    return {
      ...ocrResult,
      extractionMethod: 'ocr',
      metadata: digitalResult.metadata,
    };
  }

  private async extractDigitalText(buffer: Buffer): Promise<Omit<ExtractionResult, 'extractionMethod'>> {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    
    // pdf-parse doesn't provide page-by-page text by default
    // We'll use the text and split it heuristically
    const pages: PageContent[] = [];
    const lines = data.text.split('\n');
    
    // Estimate page breaks (simple heuristic - can be improved)
    const linesPerPage = Math.ceil(lines.length / data.numpages) || 1;
    
    for (let i = 0; i < data.numpages; i++) {
      const start = i * linesPerPage;
      const end = Math.min((i + 1) * linesPerPage, lines.length);
      const pageText = lines.slice(start, end).join('\n');
      
      pages.push({
        pageNumber: i + 1,
        text: pageText,
        method: 'digital',
      });
    }
    
    return {
      pages,
      totalPages: data.numpages,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
        keywords: data.info?.Keywords,
      },
    };
  }

  private async extractWithOCR(buffer: Buffer): Promise<Omit<ExtractionResult, 'extractionMethod' | 'metadata'>> {
    const { fromBuffer } = await import('pdf2pic');
    const { writeFile, mkdir, rm } = await import('fs/promises');
    const { tmpdir } = await import('os');
    const { join } = await import('path');
    
    // Create temp directory for PDF conversion
    const tempDir = join(tmpdir(), `pdf-ocr-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    
    try {
      // Get page count first
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(buffer);
      const totalPages = pdfData.numpages;
      
      // Configure pdf2pic
      const convert = fromBuffer(buffer, {
        density: 300, // High DPI for better OCR
        format: 'png',
        savePath: tempDir,
        saveFilename: 'page',
        width: 2000,
        height: 2000,
      });
      
      const pages: PageContent[] = [];
      const worker = await createWorker('eng');
      
      try {
        // Convert and OCR each page
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          console.log(`OCR processing page ${pageNum}/${totalPages}...`);
          
          // Convert page to image buffer
          const result = await convert(pageNum, { responseType: 'buffer' });
          
          if (!result.buffer) {
            throw new Error(`Failed to convert page ${pageNum} to image`);
          }
          
          // OCR the image
          const ocrResult = await worker.recognize(result.buffer);
          
          pages.push({
            pageNumber: pageNum,
            text: ocrResult.data.text,
            method: 'ocr',
          });
        }
      } finally {
        await worker.terminate();
      }
      
      return {
        pages,
        totalPages,
      };
    } finally {
      // Cleanup temp directory
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp OCR directory:', cleanupError);
      }
    }
  }

  async extractMetadata(filePath: string): Promise<ExtractionResult['metadata']> {
    const absolutePath = filePath.startsWith('/') 
      ? filePath 
      : join(process.cwd(), filePath);
    
    const buffer = await readFile(absolutePath);
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    
    return {
      title: data.info?.Title,
      author: data.info?.Author,
      subject: data.info?.Subject,
      keywords: data.info?.Keywords,
    };
  }
}

export const pdfExtractionService = new PDFExtractionService();
