import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Chat, Folder, Message, StreamMessage } from '@/types';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { isUnauthorizedError } from '@/lib/authUtils';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import {
  FolderIcon,
  SearchIcon,
  BellIcon,
  PanelRightIcon,
  PanelRightCloseIcon,
} from 'lucide-react';

interface ChatAreaProps {
  activeChat: Chat | null;
  activeFolder: Folder | null;
  onChatUpdate: (chat: Chat) => void;
  onToggleRightPanel: () => void;
}

export default function ChatArea({ 
  activeChat, 
  activeFolder, 
  onChatUpdate, 
  onToggleRightPanel 
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<StreamMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const { isConnected, sendMessage } = useWebSocket({
    onMessage: (message: StreamMessage) => {
      if (message.isComplete) {
        // Message is complete, add to messages and clear streaming
        setStreamingMessage(null);
        loadChatMessages(); // Reload messages to get the saved message
      } else {
        // Update streaming message
        setStreamingMessage(prev => {
          if (!prev || prev.id !== message.id) {
            return message;
          }
          return {
            ...prev,
            content: prev.content + message.content,
            sources: message.sources,
            metadata: message.metadata,
          };
        });
      }
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Connection Error",
        description: "Lost connection to chat service. Please refresh the page.",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (activeChat) {
      loadChatMessages();
    } else {
      setMessages([]);
      setStreamingMessage(null);
    }
  }, [activeChat]);

  const loadChatMessages = async () => {
    if (!activeChat) return;

    try {
      setIsLoading(true);
      const chatMessages = await api.getChatMessages(activeChat.id);
      setMessages(chatMessages);
    } catch (error: any) {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to load chat messages",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content: string, attachments?: any[]) => {
    if (!activeChat || !user) return;

    try {
      // Add user message to local state immediately
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        chatId: activeChat.id,
        role: 'user',
        content,
        attachments,
        createdAt: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, userMessage]);

      // Send message via WebSocket for streaming response
      if (isConnected) {
        sendMessage({
          type: 'chat_message',
          chatId: activeChat.id,
          content,
          userId: user.id,
          folderId: activeFolder?.id,
          mode: activeChat.mode,
        });
      } else {
        toast({
          title: "Connection Error",
          description: "Not connected to chat service. Please refresh the page.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const toggleRightPanel = () => {
    setShowRightPanel(!showRightPanel);
    onToggleRightPanel();
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <FolderIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No chat selected
          </h3>
          <p className="text-muted-foreground">
            Start a new conversation or select an existing chat from the sidebar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden" data-testid="chat-area">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Folder Context Badge */}
          {activeFolder && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg">
              <FolderIcon className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent" data-testid="folder-context">
                {activeFolder.name}
              </span>
              <Badge variant="secondary" className="text-xs">
                Folder Mode
              </Badge>
            </div>
          )}
          
          {/* Global Search */}
          <div className="relative hidden md:block">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search cases, statutes, and judgments..."
              className="w-96 pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="input-global-search"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <BellIcon className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </Button>

          {/* Toggle Right Panel */}
          <Button variant="ghost" size="sm" onClick={toggleRightPanel} data-testid="button-toggle-panel">
            {showRightPanel ? <PanelRightCloseIcon className="w-5 h-5" /> : <PanelRightIcon className="w-5 h-5" />}
          </Button>

          {/* User Profile */}
          <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted rounded-lg cursor-pointer transition-colors">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                {user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block">
              <p className="text-sm font-medium" data-testid="user-name">
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email}
              </p>
              <p className="text-xs text-muted-foreground">Premium</p>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <p className="text-muted-foreground ml-3">Loading messages...</p>
              </div>
            ) : messages.length === 0 && !streamingMessage ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Start your legal research
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Ask questions about Indian law, analyze judgments, generate legal drafts, 
                  or verify citations. I'm here to assist with your legal work.
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage 
                    key={message.id} 
                    message={message} 
                    user={user}
                  />
                ))}
                
                {/* Streaming Message */}
                {streamingMessage && (
                  <ChatMessage 
                    message={{
                      id: streamingMessage.id,
                      chatId: activeChat.id,
                      role: 'assistant',
                      content: streamingMessage.content,
                      sources: streamingMessage.sources,
                      metadata: streamingMessage.metadata,
                      createdAt: new Date().toISOString(),
                    }}
                    user={user}
                    isStreaming={true}
                  />
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Input */}
      <ChatInput 
        onSendMessage={handleSendMessage}
        disabled={!isConnected}
        activeFolder={activeFolder}
      />
    </div>
  );
}
