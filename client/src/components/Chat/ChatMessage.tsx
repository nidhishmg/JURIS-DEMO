import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Message } from '@/types';
import ResponseCard from './ResponseCard';
import { Scale } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  user: User | null;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, user, isStreaming = false }: ChatMessageProps) {
  if (message.role === 'user') {
    return (
      <div className="flex gap-4 fade-in" data-testid={`message-${message.id}`}>
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-medium">
            {user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm text-foreground leading-relaxed" data-testid="message-content">
            {message.content}
          </p>
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.attachments.map((attachment, index) => (
                <div key={index} className="text-xs text-muted-foreground">
                  📎 {attachment.name || 'Attachment'}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (message.role === 'assistant') {
    return (
      <div className="flex gap-4 fade-in" data-testid={`message-${message.id}`}>
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Scale className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          {isStreaming && !message.content ? (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <p className="text-sm text-foreground">
                  Analyzing your query<span className="streaming-cursor"></span>
                </p>
              </div>
            </div>
          ) : (
            <ResponseCard 
              content={message.content}
              sources={message.sources || []}
              metadata={message.metadata}
              verificationStatus={message.verificationStatus}
              isStreaming={isStreaming}
            />
          )}
        </div>
      </div>
    );
  }

  return null;
}
