import OpenAI from "openai";
import { db } from "../db";
import { messages, chats, folders, documents } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { ragService } from "./ragService";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

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
    const [chat] = await db.insert(chats).values({
      userId,
      title,
      folderId,
      mode,
    }).returning();
    
    return chat;
  }

  async getChatHistory(chatId: string) {
    return await db.select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.createdAt);
  }

  async getUserChats(userId: string) {
    return await db.select({
      id: chats.id,
      title: chats.title,
      folderId: chats.folderId,
      mode: chats.mode,
      createdAt: chats.createdAt,
      updatedAt: chats.updatedAt,
    })
      .from(chats)
      .where(eq(chats.userId, userId))
      .orderBy(desc(chats.updatedAt));
  }

  async addMessage(chatId: string, role: string, content: string, sources?: any[], metadata?: any) {
    const [message] = await db.insert(messages).values({
      chatId,
      role,
      content,
      sources,
      metadata,
    }).returning();
    
    return message;
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
      const stream = await openai.chat.completions.create({
        model: "gpt-5",
        messages: conversationMessages as any,
        stream: true,
        max_completion_tokens: 8192,
      });

      let fullContent = "";
      let responseId = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        fullContent += content;
        
        if (!responseId && chunk.id) {
          responseId = chunk.id;
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
        await db.update(chats)
          .set({ title, updatedAt: new Date() })
          .where(eq(chats.id, context.chatId));
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
    const basePrompt = `You are JurisThis, an AI legal assistant specialized in Indian law. You provide accurate, well-researched responses about Indian legal matters including case law, statutes, legal procedures, and legal drafting.

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
