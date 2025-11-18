import { openai } from '../openai';
import { storage } from '../storage';
import { pdfExtractionService, type ExtractionResult } from './pdfExtractionService';
import { chunkingService, type JudgmentChunk } from './chunkingService';
import { analysisPrompts, generateAnalysisPrompt, analysisStepOrder } from './analysisPrompts';
import { isOffline, offlineAnalysisForStep } from './offline';

export interface AnalysisStepResult {
  step: string;
  result: any;
  anchors: any[];
  model: string;
  tokensUsed: number;
  timestamp: string;
}

export interface CompleteAnalysisResult {
  steps: Record<string, AnalysisStepResult>;
  summary: any;
  totalTokensUsed: number;
  completedAt: string;
}

class AnalysisService {
  private readonly MAX_CHUNKS_PER_STEP = 20; // Limit chunks to avoid token overflow
  private readonly MODEL = 'openai/gpt-4o-mini'; // Use GPT-4 Omni Mini for cost efficiency

  async analyzeJudgment(
    judgmentId: string,
    extractionResult: ExtractionResult,
    chunks: JudgmentChunk[]
  ): Promise<CompleteAnalysisResult> {
    const stepResults: Record<string, AnalysisStepResult> = {};
    const stepContext: Record<string, any> = {};
    let totalTokens = 0;

    console.log(`Starting multi-step analysis for judgment ${judgmentId} with ${chunks.length} chunks`);

    // Execute each analysis step in sequence
    for (const step of analysisStepOrder) {
      try {
        console.log(`Executing analysis step: ${step}`);
        
        // Select relevant chunks for this step (simplified - in production, use semantic search)
        const relevantChunks = this.selectRelevantChunks(chunks, step);
        const chunksText = relevantChunks.map(c => c.text).join('\n\n');
        
        // Generate prompt with context from previous steps
        const { system, user, outputFormat } = generateAnalysisPrompt(
          step,
          chunksText,
          stepContext
        );
        
        // Offline path: synthesize result locally without network calls
        if (isOffline()) {
          const template = analysisPrompts[step];
          const parsedResult = offlineAnalysisForStep(step, chunksText, stepContext, template?.requiredFields);
          const anchors = this.extractAnchors(parsedResult);
          stepResults[step] = {
            step,
            result: parsedResult,
            anchors,
            model: 'offline',
            tokensUsed: 0,
            timestamp: new Date().toISOString(),
          };
          stepContext[step] = parsedResult;
          continue;
        }

        // Online path: Call LLM with structured output
        const response = await this.callLLMWithRetry(system, user, step);

        // Parse and validate response
        const parsedResult = this.parseAndValidateResponse(response.content, step);

        // Extract anchors from result
        const anchors = this.extractAnchors(parsedResult);

        // Store step result
        stepResults[step] = {
          step,
          result: parsedResult,
          anchors,
          model: this.MODEL,
          tokensUsed: (response as any).usage?.total_tokens || 0,
          timestamp: new Date().toISOString(),
        };

        // Add this step's result to context for next steps
        stepContext[step] = parsedResult;
        totalTokens += (response as any).usage?.total_tokens || 0;
        
        console.log(`Completed step ${step}: ${anchors.length} anchors extracted, ${response.usage?.total_tokens} tokens used`);
        
      } catch (error) {
        console.error(`Failed to execute step ${step}:`, error);
        throw new Error(`Analysis step '${step}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      steps: stepResults,
      summary: stepResults.summary?.result || null,
      totalTokensUsed: totalTokens,
      completedAt: new Date().toISOString(),
    };
  }

  private selectRelevantChunks(chunks: JudgmentChunk[], step: string): JudgmentChunk[] {
    // Simplified selection: Take first N chunks
    // In production: Use vector similarity search based on step type
    
    // For metadata/summary, prefer early chunks (headers, case details)
    if (step === 'metadata' || step === 'summary') {
      return chunks.slice(0, this.MAX_CHUNKS_PER_STEP);
    }
    
    // For facts/timeline, prefer middle chunks (narrative)
    if (step === 'facts' || step === 'timeline') {
      const start = Math.floor(chunks.length * 0.2);
      return chunks.slice(start, start + this.MAX_CHUNKS_PER_STEP);
    }
    
    // For ratio/obiter/precedents, prefer later chunks (reasoning, conclusion)
    if (step === 'ratio' || step === 'obiter' || step === 'precedents') {
      const start = Math.max(0, chunks.length - this.MAX_CHUNKS_PER_STEP);
      return chunks.slice(start);
    }
    
    // Default: take middle chunks
    const start = Math.max(0, Math.floor((chunks.length - this.MAX_CHUNKS_PER_STEP) / 2));
    return chunks.slice(start, start + this.MAX_CHUNKS_PER_STEP);
  }

  private async callLLMWithRetry(
    systemPrompt: string,
    userPrompt: string,
    step: string,
    retries = 2
  ): Promise<any> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await openai.chat.completions.create({
          model: this.MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3, // Lower temperature for more consistent outputs
          max_tokens: 4000,
        });

        return response.choices[0].message;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        console.warn(`LLM call failed for step ${step}, attempt ${attempt + 1}/${retries + 1}:`, error);
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  private parseAndValidateResponse(content: string | null | undefined, step: string): any {
    if (!content) {
      throw new Error(`No content in LLM response for step ${step}`);
    }

    try {
      const parsed = JSON.parse(content);
      
      // Validate required fields exist
      const template = analysisPrompts[step];
      if (template) {
        for (const field of template.requiredFields) {
          if (!(field in parsed)) {
            console.warn(`Missing required field '${field}' in step ${step}`);
          }
        }
      }
      
      return parsed;
    } catch (error) {
      throw new Error(`Failed to parse JSON response for step ${step}: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  }

  private extractAnchors(result: any): any[] {
    const anchors: any[] = [];

    const extractFromValue = (value: any, path: string = '') => {
      if (value && typeof value === 'object') {
        if ('anchor' in value && value.anchor) {
          anchors.push({
            path,
            anchor: value.anchor
          });
        }
        
        if (Array.isArray(value)) {
          value.forEach((item, index) => extractFromValue(item, `${path}[${index}]`));
        } else {
          Object.entries(value).forEach(([key, val]) => {
            extractFromValue(val, path ? `${path}.${key}` : key);
          });
        }
      }
    };

    extractFromValue(result);
    return anchors;
  }

  async runFullAnalysis(
    judgmentId: string, 
    analysisId: string,
    extractionResult?: ExtractionResult,
    chunks?: JudgmentChunk[]
  ): Promise<void> {
    try {
      console.log(`Starting full analysis for judgment ${judgmentId}, analysis ${analysisId}`);
      
      // If extraction result and chunks not provided, extract and chunk
      if (!extractionResult || !chunks) {
        const judgment = await storage.getJudgment(judgmentId);
        if (!judgment || !judgment.s3Path) {
          throw new Error(`Judgment ${judgmentId} not found or has no file`);
        }

        // Extract text from PDF
        console.log(`Extracting text from ${judgment.s3Path}`);
        extractionResult = await pdfExtractionService.extractFromPath(judgment.s3Path);
        
        // Chunk the text
        console.log(`Chunking ${extractionResult.pages.length} pages`);
        const chunkingResult = await chunkingService.chunkPages(extractionResult.pages, judgmentId);
        chunks = chunkingResult.chunks;
      }
      
      // Run analysis pipeline
      const analysisResult = await this.analyzeJudgment(
        judgmentId,
        extractionResult,
        chunks
      );
      
      // Update analysis in database
      await storage.updateAnalysis(analysisId, {
        status: 'completed',
        result: analysisResult,
        error: null,
      });
      
      console.log(`Analysis ${analysisId} completed successfully. Total tokens: ${analysisResult.totalTokensUsed}`);
      
    } catch (error) {
      console.error(`Analysis failed for judgment ${judgmentId}:`, error);
      
      // Update analysis status to failed
      await storage.updateAnalysis(analysisId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const analysisService = new AnalysisService();
