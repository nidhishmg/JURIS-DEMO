interface LocalLLMConfig {
  baseUrl: string;
  modelName: string;
  timeout: number;
}

interface LocalLLMRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

interface LocalLLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class LocalLLMService {
  private config: LocalLLMConfig;

  constructor() {
    this.config = {
      baseUrl: process.env.LOCAL_LLM_URL || 'http://localhost:11434', // Default Ollama URL
      modelName: process.env.LOCAL_LLM_MODEL || 'mistral:7b-instruct',
      timeout: parseInt(process.env.LOCAL_LLM_TIMEOUT || '30000'),
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error: any) {
      console.warn('Local LLM not available:', error.message);
      return false;
    }
  }

  async generateText(request: LocalLLMRequest): Promise<LocalLLMResponse> {
    try {
      const prompt = request.systemPrompt 
        ? `${request.systemPrompt}\n\nUser: ${request.prompt}\n\nAssistant:`
        : request.prompt;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.modelName,
          prompt: prompt,
          stream: false,
          options: {
            temperature: request.temperature || 0.7,
            num_predict: request.maxTokens || 2000,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Local LLM API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.response || '',
        usage: {
          prompt_tokens: data.prompt_eval_count || 0,
          completion_tokens: data.eval_count || 0,
          total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
      };
    } catch (error) {
      console.error('Error calling local LLM:', error);
      throw new Error(`Failed to generate text with local LLM: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async enhanceDraft(
    templateContent: string,
    userInputs: Record<string, any>,
    templateType: string
  ): Promise<string> {
    const systemPrompt = `You are a legal document assistant specializing in Indian law. Your task is to enhance and improve legal draft documents while maintaining their legal validity and professional structure.

Instructions:
1. Review the provided template and user inputs
2. Generate a professional, legally sound document
3. Use appropriate legal language and formatting
4. Include relevant legal provisions and citations where applicable
5. Ensure the document is comprehensive and well-structured
6. Maintain consistency with Indian legal standards and practices

Template Type: ${templateType}
User Inputs: ${JSON.stringify(userInputs, null, 2)}

Please enhance the following legal document template:`;

    const prompt = `${templateContent}

Please provide an enhanced version of this legal document that:
- Incorporates all the provided user inputs appropriately
- Uses proper legal language and structure
- Includes relevant legal references and citations
- Follows Indian legal document formatting standards
- Is comprehensive and professionally written

Enhanced Document:`;

    const response = await this.generateText({
      prompt,
      systemPrompt,
      maxTokens: 3000,
      temperature: 0.3, // Lower temperature for more consistent legal text
    });

    return response.content;
  }

  async improveDraftSection(
    sectionContent: string,
    sectionType: string,
    context: Record<string, any>
  ): Promise<string> {
    const systemPrompt = `You are a legal writing assistant. Improve the given section of a legal document while maintaining its legal validity and professional tone.

Section Type: ${sectionType}
Context: ${JSON.stringify(context, null, 2)}`;

    const prompt = `Please improve this legal document section:

${sectionContent}

Provide an improved version that:
- Uses more precise legal language
- Is properly structured and formatted
- Includes relevant legal references if applicable
- Maintains professional tone
- Is clear and comprehensive

Improved Section:`;

    const response = await this.generateText({
      prompt,
      systemPrompt,
      maxTokens: 1500,
      temperature: 0.3,
    });

    return response.content;
  }

  async validateDraft(draftContent: string, templateType: string): Promise<{
    isValid: boolean;
    suggestions: string[];
    issues: string[];
  }> {
    const systemPrompt = `You are a legal document reviewer specializing in Indian law. Review the provided document and identify any issues, missing elements, or areas for improvement.`;

    const prompt = `Please review this ${templateType} document and provide:

1. Validation status (valid/invalid)
2. List of suggestions for improvement
3. List of any legal issues or missing elements

Document:
${draftContent}

Provide your response in the following JSON format:
{
  "isValid": boolean,
  "suggestions": ["suggestion1", "suggestion2"],
  "issues": ["issue1", "issue2"]
}`;

    try {
      const response = await this.generateText({
        prompt,
        systemPrompt,
        maxTokens: 1000,
        temperature: 0.2,
      });

      // Try to parse JSON response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback if JSON parsing fails
      return {
        isValid: true,
        suggestions: ["Review completed - consider legal consultation"],
        issues: [],
      };
    } catch (error) {
      console.error('Error validating draft:', error);
      return {
        isValid: true,
        suggestions: ["Unable to validate - manual review recommended"],
        issues: [],
      };
    }
  }
}

export const localLlmService = new LocalLLMService();