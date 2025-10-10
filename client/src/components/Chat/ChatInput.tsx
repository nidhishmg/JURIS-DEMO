import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Folder } from '@/types';
import {
  PlusIcon,
  SendIcon,
  PaperclipIcon,
  SlidersIcon,
  MenuIcon,
} from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (content: string, attachments?: any[]) => void;
  disabled?: boolean;
  activeFolder: Folder | null;
}

export default function ChatInput({ onSendMessage, disabled = false, activeFolder }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [activeMode, setActiveMode] = useState('general');
  const [attachments, setAttachments] = useState<any[]>([]);

  const modes = [
    { id: 'general', label: 'General' },
    { id: 'case', label: 'Case Analysis' },
    { id: 'drafting', label: 'Drafting' },
    { id: 'statute', label: 'Statute Lookup' },
  ];

  const handleSubmit = () => {
    if (!message.trim() || disabled) return;

    onSendMessage(message.trim(), attachments);
    setMessage('');
    setAttachments([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newAttachments = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      file,
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
    event.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-border bg-card p-4" data-testid="chat-input">
      <div className="max-w-4xl mx-auto">
        {/* Mode Selector Tabs */}
        <div className="flex gap-2 mb-3">
          {modes.map((mode) => (
            <Button
              key={mode.id}
              variant={activeMode === mode.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveMode(mode.id)}
              data-testid={`mode-${mode.id}`}
            >
              {mode.label}
            </Button>
          ))}
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachments.map((attachment, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="flex items-center gap-1"
              >
                <PaperclipIcon className="w-3 h-3" />
                <span className="text-xs">{attachment.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Input Box */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                activeMode === 'general' 
                  ? "Ask about Indian law, analyze judgments, generate drafts, or verify citations..."
                  : activeMode === 'case'
                  ? "Analyze a judgment or ask about case law..."
                  : activeMode === 'drafting'
                  ? "Generate or review legal drafts..."
                  : "Look up statute sections and bare acts..."
              }
              className="resize-none pr-24 min-h-[44px] max-h-32"
              disabled={disabled}
              data-testid="textarea-message"
            />
            
            {/* Attachment and Options */}
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <input
                type="file"
                id="message-file-upload"
                className="hidden"
                multiple
                accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => document.getElementById('message-file-upload')?.click()}
                disabled={disabled}
                data-testid="button-attach-file"
              >
                <PaperclipIcon className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={disabled}
                data-testid="button-tone-settings"
              >
                <SlidersIcon className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={disabled}
                data-testid="button-prompt-templates"
              >
                <MenuIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Send Button */}
          <Button
            onClick={handleSubmit}
            disabled={!message.trim() || disabled}
            className="px-4 py-3 flex items-center gap-2"
            data-testid="button-send-message"
          >
            <SendIcon className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Helper Text */}
        <p className="text-xs text-muted-foreground mt-2 text-center">
          JURIS can make mistakes. Verify important legal information with official sources.
          {activeFolder && (
            <span className="ml-2 text-accent">
              • Responses will prioritize {activeFolder.name} context
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
