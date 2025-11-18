import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Draft } from '@/types';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import {
  ArrowLeftIcon,
  EyeIcon,
  CheckCircleIcon,
  SaveIcon,
  DownloadIcon,
  AlertTriangleIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  AlignLeftIcon,
  ListIcon,
  LinkIcon,
  FileTextIcon,
  SparklesIcon,
  ShieldCheckIcon,
} from 'lucide-react';

interface DraftEditorProps {
  draft: Draft;
  onClose: () => void;
  onSave: (updatedDraft: Draft) => void;
}

export default function DraftEditor({ draft, onClose, onSave }: DraftEditorProps) {
  const [content, setContent] = useState(draft.contentHtml);
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { toast } = useToast();

  // Auto-save functionality
  useEffect(() => {
    const autoSave = setTimeout(() => {
      if (content !== draft.contentHtml) {
        handleSave();
      }
    }, 10000); // Auto-save every 10 seconds

    return () => clearTimeout(autoSave);
  }, [content, draft.contentHtml]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updatedDraft = await api.updateDraft(draft.id, {
        contentHtml: content,
        version: draft.version + 1,
      });
      setLastSaved(new Date());
      onSave(updatedDraft);
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
        description: "Failed to save draft",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
    try {
      const blob = await api.exportDraft(draft.id, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${draft.title}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Draft exported as ${format.toUpperCase()}`,
      });
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
        title: "Export Failed",
        description: "Failed to export draft. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEnhanceWithLLM = async () => {
    try {
      setIsEnhancing(true);
      const enhancedDraft = await api.enhanceDraftWithLLM(draft.id);
      
      setContent(enhancedDraft.contentHtml);
      onSave(enhancedDraft);
      
      toast({
        title: "Draft Enhanced",
        description: "Your draft has been enhanced using local AI",
      });
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
        title: "Enhancement Failed",
        description: error.message || "Failed to enhance draft with AI. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleValidateWithLLM = async () => {
    try {
      setIsValidating(true);
      const validation = await api.validateDraftWithLLM(draft.id);
      
      setValidationResult(validation);
      
      toast({
        title: "Validation Complete",
        description: validation.isValid 
          ? "Your draft looks good!" 
          : "Some issues were found. Check the validation results.",
        variant: validation.isValid ? "default" : "destructive",
      });
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
        title: "Validation Failed",
        description: error.message || "Failed to validate draft with AI. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = await api.downloadDraftPdf(draft.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${draft.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: "PDF is being downloaded",
      });
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download PDF",
        variant: "destructive",
      });
    }
  };

  const insertText = (before: string, after: string = '') => {
    const textarea = document.getElementById('draft-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    
    setContent(newText);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selectedText.length;
      textarea.focus();
    }, 0);
  };

  const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length;
  const citationCount = (content.match(/\b\d{4}\s*\)\s*\d+\s+SCC\s+\d+|\bSection\s+\d+\w*\s+\w+/g) || []).length;
  const missingFields = (content.match(/\[INSERT:\s*\w+\]/g) || []).length;

  return (
    <div className="flex flex-col h-full" data-testid="draft-editor">
      {/* Editor Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              data-testid="button-back"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="font-serif font-bold text-xl text-foreground">
                {draft.title}
              </h2>
              <p className="text-xs text-muted-foreground">
                {lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : 'Not saved'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnhanceWithLLM}
              disabled={isEnhancing}
              data-testid="button-enhance-llm"
            >
              {isEnhancing ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-1"></div>
              ) : (
                <SparklesIcon className="w-4 h-4 mr-1" />
              )}
              {isEnhancing ? 'Enhancing...' : 'Enhance with AI'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleValidateWithLLM}
              disabled={isValidating}
              data-testid="button-validate-llm"
            >
              {isValidating ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-1"></div>
              ) : (
                <ShieldCheckIcon className="w-4 h-4 mr-1" />
              )}
              {isValidating ? 'Validating...' : 'AI Validate'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreview(!isPreview)}
              data-testid="button-preview"
            >
              <EyeIcon className="w-4 h-4 mr-1" />
              {isPreview ? 'Edit' : 'Preview'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              data-testid="button-verify-citations"
            >
              <CheckCircleIcon className="w-4 h-4 mr-1" />
              Verify Citations
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              data-testid="button-save"
            >
              {isSaving ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-1"></div>
              ) : (
                <SaveIcon className="w-4 h-4 mr-1" />
              )}
              Save
            </Button>
          </div>
        </div>
        
        {/* Editor Toolbar */}
        {!isPreview && (
          <div className="flex items-center gap-1 p-2 bg-muted rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertText('<strong>', '</strong>')}
              data-testid="button-bold"
            >
              <BoldIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertText('<em>', '</em>')}
              data-testid="button-italic"
            >
              <ItalicIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertText('<u>', '</u>')}
              data-testid="button-underline"
            >
              <UnderlineIcon className="w-4 h-4" />
            </Button>
            
            <div className="w-px h-6 bg-border mx-1"></div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertText('<h2>', '</h2>')}
              data-testid="button-h2"
            >
              <span className="text-sm font-bold">H2</span>
            </Button>
            
            <div className="w-px h-6 bg-border mx-1"></div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertText('<ul><li>', '</li></ul>')}
              data-testid="button-list"
            >
              <ListIcon className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertText('<p style="text-align: center">', '</p>')}
              data-testid="button-center"
            >
              <AlignLeftIcon className="w-4 h-4" />
            </Button>
            
            <div className="w-px h-6 bg-border mx-1"></div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const citation = prompt('Enter citation:');
                if (citation) insertText(`<span class="font-mono text-secondary">${citation}</span>`);
              }}
              data-testid="button-citation"
            >
              <LinkIcon className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-hidden">
        {/* Validation Results */}
        {validationResult && (
          <div className="p-4 border-b border-border bg-muted/30">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4" />
              AI Validation Results
            </h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              {validationResult.suggestions && validationResult.suggestions.length > 0 && (
                <div>
                  <h5 className="font-medium text-green-600 mb-1">Suggestions:</h5>
                  <ul className="space-y-1">
                    {validationResult.suggestions.map((suggestion: string, i: number) => (
                      <li key={i} className="text-muted-foreground">• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
              {validationResult.issues && validationResult.issues.length > 0 && (
                <div>
                  <h5 className="font-medium text-amber-600 mb-1">Issues:</h5>
                  <ul className="space-y-1">
                    {validationResult.issues.map((issue: string, i: number) => (
                      <li key={i} className="text-muted-foreground">• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setValidationResult(null)}
            >
              Dismiss
            </Button>
          </div>
        )}

        {isPreview ? (
          <div className="h-full overflow-y-auto p-8 bg-white">
            <div 
              className="max-w-3xl mx-auto font-serif text-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: content }}
              data-testid="draft-preview"
            />
          </div>
        ) : (
          <div className="h-full p-4">
            <Textarea
              id="draft-editor"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full resize-none font-serif text-sm leading-relaxed"
              placeholder="Start editing your draft..."
              data-testid="textarea-draft-content"
            />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="p-3 border-t border-border bg-muted/5 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span data-testid="word-count">{wordCount} words</span>
          <span>•</span>
          <span data-testid="citation-count">{citationCount} citations</span>
          <span>•</span>
          {missingFields > 0 && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertTriangleIcon className="w-3 h-3" />
              <span data-testid="missing-fields">{missingFields} fields to complete</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            data-testid="button-download-pdf"
          >
            <DownloadIcon className="w-4 h-4 mr-1" />
            Download PDF
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleExport('docx')}
            data-testid="button-export-docx"
          >
            Export DOCX
          </Button>
        </div>
      </div>
    </div>
  );
}
