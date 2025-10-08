import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ZapIcon, 
  Scale, 
  CalendarIcon, 
  UsersIcon, 
  CheckCircleIcon, 
  FileTextIcon, 
  FolderIcon, 
  DownloadIcon, 
  BookOpenIcon,
  InfoIcon 
} from 'lucide-react';

interface ResponseCardProps {
  content: string;
  sources?: any[];
  metadata?: any;
  verificationStatus?: string;
  isStreaming?: boolean;
}

export default function ResponseCard({ 
  content, 
  sources = [], 
  metadata, 
  verificationStatus, 
  isStreaming = false 
}: ResponseCardProps) {
  // Parse structured content for legal responses
  const parseContent = (text: string) => {
    const sections = {
      quickAnswer: '',
      facts: '',
      issues: '',
      decision: '',
      reasoning: '',
      statutes: '',
      precedents: '',
      application: '',
    };

    // Simple parsing - in production, this would be more sophisticated
    if (text.includes('Quick Answer') || text.includes('QUICK ANSWER')) {
      const match = text.match(/Quick Answer:?\s*(.+?)(?=\n\n|\n[A-Z]|$)/s);
      if (match) sections.quickAnswer = match[1].trim();
    }

    if (text.includes('Facts') || text.includes('FACTS')) {
      const match = text.match(/Facts:?\s*(.+?)(?=\n\n[A-Z]|$)/s);
      if (match) sections.facts = match[1].trim();
    }

    if (text.includes('Issues') || text.includes('ISSUES')) {
      const match = text.match(/Issues?:?\s*(.+?)(?=\n\n[A-Z]|$)/s);
      if (match) sections.issues = match[1].trim();
    }

    if (text.includes('Decision') || text.includes('DECISION')) {
      const match = text.match(/Decision:?\s*(.+?)(?=\n\n[A-Z]|$)/s);
      if (match) sections.decision = match[1].trim();
    }

    return { sections, fullText: text };
  };

  const { sections, fullText } = parseContent(content);

  // Extract citations from content
  const extractCitations = (text: string) => {
    const citations = [];
    const patterns = [
      /\b\d{4}\s*\)\s*\d+\s+SCC\s+\d+/g,
      /AIR\s+\d{4}\s+SC\s+\d+/g,
      /Section\s+\d+\w*\s+\w+/g,
    ];

    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        citations.push(...matches);
      }
    });

    return [...new Set(citations)]; // Remove duplicates
  };

  const citations = extractCitations(content);

  return (
    <Card className="bg-card border border-border rounded-xl overflow-hidden" data-testid="response-card">
      {/* Quick Answer Section */}
      {sections.quickAnswer && (
        <div className="p-4 bg-muted/30">
          <div className="flex items-start gap-2 mb-2">
            <ZapIcon className="w-5 h-5 text-accent mt-0.5" />
            <h3 className="font-serif font-semibold text-base text-foreground">Quick Answer</h3>
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            {sections.quickAnswer}
            {isStreaming && <span className="streaming-cursor"></span>}
          </p>
        </div>
      )}

      {/* Metadata Section */}
      {metadata && (
        <div className="px-4 py-3 border-t border-border bg-muted/10">
          <div className="flex flex-wrap gap-2">
            {metadata.court && (
              <Badge variant="outline" className="text-xs">
                <Scale className="w-3 h-3 mr-1" />
                {metadata.court}
              </Badge>
            )}
            {metadata.year && (
              <Badge variant="outline" className="text-xs">
                <CalendarIcon className="w-3 h-3 mr-1" />
                {metadata.year}
              </Badge>
            )}
            {metadata.bench && (
              <Badge variant="outline" className="text-xs">
                <UsersIcon className="w-3 h-3 mr-1" />
                {metadata.bench}
              </Badge>
            )}
            <div className="ml-auto">
              {verificationStatus === 'verified' && (
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-xs">
                  <CheckCircleIcon className="w-3 h-3" />
                  <span>Verified</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <CardContent className="p-4 space-y-4">
        {sections.facts && (
          <div>
            <h4 className="font-serif font-semibold text-sm text-foreground mb-2 flex items-center gap-2">
              <span className="w-1 h-4 bg-secondary rounded-full"></span>
              Facts of the Case
            </h4>
            <div className="ml-3 text-sm text-foreground leading-relaxed whitespace-pre-line">
              {sections.facts}
            </div>
          </div>
        )}

        {sections.issues && (
          <div>
            <h4 className="font-serif font-semibold text-sm text-foreground mb-2 flex items-center gap-2">
              <span className="w-1 h-4 bg-accent rounded-full"></span>
              Legal Issues Framed
            </h4>
            <div className="ml-3 text-sm text-foreground leading-relaxed whitespace-pre-line">
              {sections.issues}
            </div>
          </div>
        )}

        {sections.decision && (
          <div>
            <h4 className="font-serif font-semibold text-sm text-foreground mb-2 flex items-center gap-2">
              <span className="w-1 h-4 bg-green-600 rounded-full"></span>
              Decision & Key Directions
            </h4>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-sm text-green-900 leading-relaxed whitespace-pre-line">
                {sections.decision}
              </div>
            </div>
          </div>
        )}

        {/* Default content if no structured sections */}
        {!sections.quickAnswer && !sections.facts && !sections.issues && !sections.decision && (
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
            {fullText}
            {isStreaming && <span className="streaming-cursor"></span>}
          </div>
        )}

        {/* Citations Section */}
        {citations.length > 0 && (
          <div>
            <h4 className="font-serif font-semibold text-sm text-foreground mb-2 flex items-center gap-2">
              <span className="w-1 h-4 bg-secondary rounded-full"></span>
              Citations Referenced
            </h4>
            <div className="flex flex-wrap gap-2">
              {citations.map((citation, index) => (
                <button
                  key={index}
                  className="citation-chip bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20 transition-all duration-200"
                  data-testid={`citation-${index}`}
                >
                  {citation}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Sources Section */}
      {sources.length > 0 && (
        <div className="px-4 py-3 border-t border-border bg-muted/10">
          <div className="flex items-center gap-2 mb-2">
            <BookOpenIcon className="w-4 h-4 text-muted-foreground" />
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Sources
            </h5>
          </div>
          <div className="flex flex-wrap gap-2">
            {sources.map((source, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs font-mono"
                data-testid={`source-${index}`}
              >
                {source.title || source.name || `Source ${index + 1}`}
                {source.similarity && (
                  <span className="ml-1 opacity-75">
                    ({Math.round(source.similarity * 100)}%)
                  </span>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-4 py-3 border-t border-border bg-muted/5 flex flex-wrap gap-2">
        <Button 
          size="sm" 
          className="inline-flex items-center gap-1.5"
          data-testid="button-generate-draft"
        >
          <FileTextIcon className="w-4 h-4" />
          Generate Draft
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="inline-flex items-center gap-1.5"
          data-testid="button-verify-citations"
        >
          <CheckCircleIcon className="w-4 h-4" />
          Verify Citations
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="inline-flex items-center gap-1.5"
          data-testid="button-save-folder"
        >
          <FolderIcon className="w-4 h-4" />
          Save to Folder
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="inline-flex items-center gap-1.5"
          data-testid="button-export-pdf"
        >
          <DownloadIcon className="w-4 h-4" />
          Export PDF
        </Button>
      </div>
    </Card>
  );
}
