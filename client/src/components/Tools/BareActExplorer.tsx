import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  BookOpenIcon, 
  SearchIcon, 
  ExternalLinkIcon,
  LoaderIcon,
  InfoIcon,
  FileTextIcon
} from 'lucide-react';

interface BareActExplorerProps {
  open: boolean;
  onClose: () => void;
}

interface StatuteResult {
  title: string;
  sections: string[];
  url: string;
}

export default function BareActExplorer({ open, onClose }: BareActExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<StatuteResult[]>([]);
  const { toast } = useToast();

  const handleSearch = async (query?: string) => {
    const searchTerm = query || searchQuery;
    
    if (!searchTerm.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter a search term",
        variant: "destructive",
      });
      return;
    }

    // Update search query if passed directly
    if (query) {
      setSearchQuery(query);
    }

    try {
      setIsSearching(true);
      
      const response = await fetch(`/api/search/statutes?q=${encodeURIComponent(searchTerm)}`);

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
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data);
      
      toast({
        title: "Search Complete",
        description: `Found ${data.length} statute(s) matching "${searchTerm}"`,
      });
    } catch (error: any) {
      toast({
        title: "Search Failed",
        description: "Failed to search statutes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setResults([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();  // No parameter, uses state
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col" data-testid="bare-act-explorer-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpenIcon className="w-5 h-5" />
            Bare Act Explorer
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Search Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Statutes</label>
            <div className="flex gap-2">
              <Input
                placeholder="Search by statute name or section (e.g., 'IPC 420', 'CrPC', 'BNS')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
                data-testid="input-search-statute"
              />
              <Button 
                onClick={() => handleSearch()} 
                disabled={isSearching || !searchQuery.trim()}
                data-testid="button-search-statute"
              >
                {isSearching ? (
                  <>
                    <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <SearchIcon className="w-4 h-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <InfoIcon className="w-3 h-3" />
              Search for Indian Penal Code (IPC), CrPC, BNS, or specific sections
            </p>
          </div>

          {/* Quick Search Suggestions */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleSearch('IPC')}
              disabled={isSearching}
            >
              IPC
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleSearch('CrPC')}
              disabled={isSearching}
            >
              CrPC
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleSearch('BNS')}
              disabled={isSearching}
            >
              BNS
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleSearch('420')}
              disabled={isSearching}
            >
              Section 420
            </Button>
          </div>

          {/* Results Section */}
          {results.length > 0 && (
            <>
              <Separator />
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">Results ({results.length})</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleClear}
                    data-testid="button-clear-results"
                  >
                    Clear
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="space-y-3 pr-4">
                    {results.map((statute, index) => (
                      <Card 
                        key={index} 
                        className="border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20"
                        data-testid={`result-statute-${index}`}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1">
                              <FileTextIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                              <span>{statute.title}</span>
                            </div>
                            <Badge variant="secondary" className="text-xs whitespace-nowrap">
                              {statute.sections.length} section{statute.sections.length !== 1 ? 's' : ''}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Sections */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Relevant Sections:</p>
                            <div className="space-y-1">
                              {statute.sections.map((section, sectionIndex) => (
                                <div 
                                  key={sectionIndex}
                                  className="text-sm pl-3 border-l-2 border-blue-300 dark:border-blue-700 py-1"
                                >
                                  {section}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* View Full Act Link */}
                          {statute.url && (
                            <div className="pt-2">
                              <a
                                href={statute.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                data-testid={`link-statute-${index}`}
                              >
                                <ExternalLinkIcon className="w-3 h-3" />
                                View Full Bare Act
                              </a>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}

          {/* No Results Message */}
          {results.length === 0 && searchQuery && !isSearching && (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpenIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No statutes found matching "{searchQuery}"</p>
              <p className="text-xs mt-1">Try searching for IPC, CrPC, BNS, or specific section numbers</p>
            </div>
          )}

          {/* Initial State Message */}
          {results.length === 0 && !searchQuery && !isSearching && (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpenIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Search for Indian statutes</p>
              <p className="text-xs mt-1">Use the quick search buttons or enter your own query</p>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              data-testid="button-close-explorer"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
