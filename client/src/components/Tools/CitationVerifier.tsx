import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  AlertTriangleIcon, 
  ExternalLinkIcon,
  LoaderIcon,
  InfoIcon
} from 'lucide-react';

interface CitationVerifierProps {
  open: boolean;
  onClose: () => void;
}

interface CitationResult {
  citation: string;
  found: boolean;
  source?: string;
  sourceUrl?: string;
  excerpt?: string;
  overruled: boolean;
  confidence: number;
}

export default function CitationVerifier({ open, onClose }: CitationVerifierProps) {
  const [citationText, setCitationText] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [results, setResults] = useState<CitationResult[]>([]);
  const { toast } = useToast();

  const handleVerify = async () => {
    if (!citationText.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter at least one citation to verify",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsVerifying(true);
      
      const citations = citationText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const response = await fetch('/api/citations/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ citations }),
      });

      if (!response.ok) {
        if (response.status === 401) {
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
        throw new Error('Verification failed');
      }

      const data = await response.json();
      setResults(data);
      
      const foundCount = data.filter((r: CitationResult) => r.found).length;
      toast({
        title: "Verification Complete",
        description: `Verified ${citations.length} citation(s). ${foundCount} found.`,
      });
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: "Failed to verify citations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClear = () => {
    setCitationText('');
    setResults([]);
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) {
      return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">High Confidence</Badge>;
    } else if (confidence >= 50) {
      return <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">Medium Confidence</Badge>;
    } else {
      return <Badge className="bg-red-500/10 text-red-700 dark:text-red-400">Low Confidence</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col" data-testid="citation-verifier-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5" />
            Citation Verifier
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Input Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Citations (one per line)</label>
            <Textarea
              placeholder="Enter citations to verify, one per line. Examples:&#10;Arnesh Kumar v. State of Bihar&#10;Section 420 IPC&#10;2014 SCC 556"
              value={citationText}
              onChange={(e) => setCitationText(e.target.value)}
              className="min-h-[120px] font-mono text-sm"
              data-testid="input-citations"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <InfoIcon className="w-3 h-3" />
              Enter case names, section references, or SCC citations
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handleVerify} 
              disabled={isVerifying || !citationText.trim()}
              className="flex-1"
              data-testid="button-verify"
            >
              {isVerifying ? (
                <>
                  <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4 mr-2" />
                  Verify Citations
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleClear}
              disabled={isVerifying}
              data-testid="button-clear"
            >
              Clear
            </Button>
          </div>

          {/* Results Section */}
          {results.length > 0 && (
            <>
              <Separator />
              <div className="flex-1 overflow-hidden flex flex-col">
                <h3 className="text-sm font-medium mb-2">Verification Results ({results.length})</h3>
                <ScrollArea className="flex-1">
                  <div className="space-y-3 pr-4">
                    {results.map((result, index) => (
                      <Card 
                        key={index} 
                        className={`${
                          result.found 
                            ? 'border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-950/20' 
                            : 'border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-950/20'
                        }`}
                        data-testid={`result-citation-${index}`}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-mono flex items-start justify-between gap-2">
                            <span className="flex-1">{result.citation}</span>
                            <div className="flex items-center gap-2">
                              {result.overruled && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangleIcon className="w-3 h-3 mr-1" />
                                  Overruled
                                </Badge>
                              )}
                              {result.found ? (
                                <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                              ) : (
                                <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                              )}
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {result.found ? (
                            <>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary" className="text-xs">
                                  {result.source || 'Unknown Source'}
                                </Badge>
                                {getConfidenceBadge(result.confidence)}
                                {result.sourceUrl && (
                                  <a
                                    href={result.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                  >
                                    View Source
                                    <ExternalLinkIcon className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                              {result.excerpt && (
                                <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
                                  {result.excerpt}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Citation not found in available databases. Please verify manually.
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              data-testid="button-close-verifier"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
