import { openai } from "../openai";
import { storage } from "../storage";
import { ragService } from "./ragService";
import { isOffline, offlineChatCompose } from "./offline";

interface ChatContext {
  userId: string;
  chatId: string;
  folderId?: string;
  mode: string;
}

interface StreamResponse {
  id: string;
  content: string;
  sources: any[];
  metadata: any;
}

export class ChatService {
  async createChat(userId: string, title?: string, folderId?: string, mode = "general") {
    const chat = await storage.createChat({ userId, title, folderId, mode });
    return chat;
  }

  async getChatHistory(chatId: string) {
    return await storage.getChatMessages(chatId);
  }

  async getUserChats(userId: string) {
    return await storage.getUserChats(userId);
  }

  async addMessage(chatId: string, role: string, content: string, sources?: any[], metadata?: any) {
    return await storage.createMessage({ chatId, role, content, sources, metadata });
  }

  async *streamChatResponse(context: ChatContext, userMessage: string) {
    // Add user message to database
    await this.addMessage(context.chatId, "user", userMessage);

    // Get chat history for context
    const history = await this.getChatHistory(context.chatId);
    
    // Retrieve relevant context using RAG
    const retrievedContext = await ragService.retrieveContext(userMessage, context.folderId);
    
    // Build system prompt based on mode
    const systemPrompt = this.buildSystemPrompt(context.mode, retrievedContext);
    
    // Build conversation messages
    const conversationMessages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10).map(msg => ({ // Last 10 messages for context
        role: msg.role as "user" | "assistant",
        content: msg.content
      })),
      { role: "user", content: userMessage }
    ];

    try {
      // Offline path: compose local response and simulate streaming
      if (isOffline()) {
        const offlineText = offlineChatCompose(userMessage, context.mode, retrievedContext);
        const responseId = `offline-${Date.now()}`;
        let fullContent = "";
        const chunkSize = 60;
        for (let i = 0; i < offlineText.length; i += chunkSize) {
          const piece = offlineText.slice(i, i + chunkSize);
          fullContent += piece;
          yield {
            id: responseId,
            content: piece,
            sources: retrievedContext.sources,
            metadata: retrievedContext.metadata,
            isComplete: false,
          } as StreamResponse;
        }
        const assistantMessage = await this.addMessage(
          context.chatId,
          "assistant",
          fullContent,
          retrievedContext.sources,
          retrievedContext.metadata
        );
        if (history.length <= 1) {
          const title = this.generateChatTitle(userMessage);
          await storage.updateChat(context.chatId, { title, updatedAt: new Date() } as any);
        }
        yield {
          id: assistantMessage.id,
          content: "",
          sources: retrievedContext.sources,
          metadata: retrievedContext.metadata,
          isComplete: true,
        } as StreamResponse;
        return;
      }

      // Online path: call OpenAI via OpenRouter
      const stream = await openai.chat.completions.create({
        model: "openai/gpt-4o",
        messages: conversationMessages as any,
        stream: true,
        max_completion_tokens: 8192,
      });

      let fullContent = "";
      let responseId = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        fullContent += content;
        
        if (!responseId && (chunk as any).id) {
          responseId = (chunk as any).id as string;
        }

        yield {
          id: responseId,
          content,
          sources: retrievedContext.sources,
          metadata: retrievedContext.metadata,
          isComplete: false,
        } as StreamResponse;
      }

      // Save assistant response to database
      const assistantMessage = await this.addMessage(
        context.chatId, 
        "assistant", 
        fullContent,
        retrievedContext.sources,
        retrievedContext.metadata
      );

      // Update chat title if this is the first exchange
      if (history.length <= 1) {
        const title = this.generateChatTitle(userMessage);
        await storage.updateChat(context.chatId, { title, updatedAt: new Date() } as any);
      }

      yield {
        id: assistantMessage.id,
        content: "",
        sources: retrievedContext.sources,
        metadata: retrievedContext.metadata,
        isComplete: true,
      } as StreamResponse;

    } catch (error) {
      console.error("Chat streaming error:", error);
      throw new Error("Failed to generate response");
    }
  }

  private buildSystemPrompt(mode: string, context: any): string {
    const basePrompt = `You are JURIS, an AI legal assistant specialized in Indian law. You provide accurate, well-researched responses about Indian legal matters including case law, statutes, legal procedures, and legal drafting.

CRITICAL INSTRUCTIONS:
- Only assert claims found in the provided context chunks
- If information is missing from context, state "Insufficient source material"
- Always cite sources with document IDs and paragraph references
- Maintain formal legal English appropriate for Indian legal practice
- Structure responses with clear sections when analyzing cases or statutes`;

    const modeSpecificPrompts = {
      general: basePrompt,
      
      case: basePrompt + `

CASE ANALYSIS MODE:
Focus on analyzing legal cases and judgments. Structure responses as:
1. Quick Answer (2-3 lines)
2. Facts (key factual matrix)
3. Issues (legal questions raised)
4. Decision (court's ruling)
5. Reasoning (court's rationale)
6. Ratio Decidendi vs Obiter Dicta
7. Precedential value and current status`,

      drafting: basePrompt + `

DRAFTING MODE:
Assist with legal document drafting and templates. Always:
- Use formal legal language appropriate for Indian courts
- Follow proper legal document structure
- Include mandatory clauses and procedural requirements
- Highlight missing information as [INSERT: fieldName]
- Suggest relevant legal precedents and statutory provisions`,

      statute: basePrompt + `

STATUTE EXPLANATION MODE:
Provide detailed explanations of Indian statutes and legal provisions:
- Break down complex legal language into clear explanations
- Explain the legislative intent and scope
- Provide relevant case law interpretations
- Compare with related provisions
- Highlight recent amendments or changes`
    };

    let prompt = modeSpecificPrompts[mode as keyof typeof modeSpecificPrompts] || basePrompt;

    if (context.sources && context.sources.length > 0) {
      prompt += `\n\nRELEVANT CONTEXT:\n`;
      context.sources.forEach((source: any, index: number) => {
        prompt += `[${index + 1}] Document: ${source.title}\nContent: ${source.content}\n\n`;
      });
    }

    return prompt;
  }

  private generateChatTitle(firstMessage: string): string {
    // Simple title generation from first message
    const words = firstMessage.split(' ').slice(0, 6);
    return words.join(' ').replace(/[^\w\s]/gi, '').trim() || "New Legal Query";
  }
}

export const chatService = new ChatService();
