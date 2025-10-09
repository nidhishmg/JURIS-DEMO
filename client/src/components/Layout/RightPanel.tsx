import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Folder, Document } from '@/types';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import {
  XIcon,
  FolderIcon,
  FileTextIcon,
  PlusIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  RefreshCcwIcon,
  BookOpenIcon,
  ZapIcon,
} from 'lucide-react';

interface RightPanelProps {
  activeFolder: Folder | null;
  onClose: () => void;
  onOpenIPCBNSConverter: () => void;
  onOpenCitationVerifier: () => void;
}

export default function RightPanel({ activeFolder, onClose, onOpenIPCBNSConverter, onOpenCitationVerifier }: RightPanelProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (activeFolder) {
      loadFolderDocuments();
    }
  }, [activeFolder]);

  const loadFolderDocuments = async () => {
    if (!activeFolder) return;

    try {
      setIsLoading(true);
      const docs = await api.getFolderDocuments(activeFolder.id);
      setDocuments(docs);
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
        description: "Failed to load folder documents",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeFolder || !event.target.files?.length) return;

    const file = event.target.files[0];
    try {
      const document = await api.uploadDocument(activeFolder.id, file);
      setDocuments(prev => [document, ...prev]);
      toast({
        title: "Document Uploaded",
        description: `${file.name} has been uploaded successfully.`,
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
        title: "Upload Failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    }
    
    // Reset input
    event.target.value = '';
  };

  return (
    <aside className="w-80 bg-card border-l border-border flex flex-col overflow-hidden" data-testid="right-panel">
      {/* Panel Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-serif font-semibold text-base">Context & Tools</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClose}
            data-testid="button-close-panel"
          >
            <XIcon className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Folder Memory Section */}
        {activeFolder && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <FolderIcon className="w-4 h-4 text-accent" />
              <h4 className="text-sm font-semibold">Folder Memory</h4>
            </div>
            <div className="space-y-2">
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Folder Name</p>
                  <p className="text-sm text-foreground" data-testid="folder-name">
                    {activeFolder.name}
                  </p>
                </CardContent>
              </Card>
              {activeFolder.jurisdiction && (
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Jurisdiction</p>
                    <p className="text-sm text-foreground">
                      {activeFolder.jurisdiction}
                    </p>
                  </CardContent>
                </Card>
              )}
              {activeFolder.metadata && (
                <>
                  {activeFolder.metadata.clientName && (
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Client Name</p>
                        <p className="text-sm text-foreground">
                          {activeFolder.metadata.clientName}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  {activeFolder.metadata.caseNumber && (
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Case Number</p>
                        <p className="text-sm text-foreground">
                          {activeFolder.metadata.caseNumber}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  {activeFolder.metadata.offence && (
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Offence</p>
                        <p className="text-sm text-foreground">
                          {activeFolder.metadata.offence}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Attached Documents */}
        {activeFolder && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <FileTextIcon className="w-4 h-4 text-secondary" />
              <h4 className="text-sm font-semibold">Documents</h4>
              <div className="ml-auto">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  data-testid="button-upload-document"
                >
                  <PlusIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {isLoading ? (
              <div className="text-center py-4">
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
                <p className="text-xs text-muted-foreground mt-2">Loading documents...</p>
              </div>
            ) : documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <Card key={doc.id} className="transition-colors hover:bg-muted/50 cursor-pointer">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <FileTextIcon className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate" data-testid={`doc-${doc.id}`}>
                            {doc.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : 'Unknown size'} • {
                              new Date(doc.createdAt).toLocaleDateString()
                            }
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <FileTextIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No documents yet</p>
                <p className="text-xs text-muted-foreground mt-1">Upload case files to get started</p>
              </div>
            )}
          </div>
        )}

        {/* Quick Tools */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <ZapIcon className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold">Quick Tools</h4>
          </div>
          <div className="space-y-2">
            <Button 
              variant="default" 
              size="sm" 
              className="w-full justify-start"
              data-testid="button-generate-draft"
            >
              <FileTextIcon className="w-4 h-4 mr-2" />
              Generate Draft
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={onOpenCitationVerifier}
              data-testid="button-verify-citations"
            >
              <CheckCircleIcon className="w-4 h-4 mr-2" />
              Verify Citations
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={onOpenIPCBNSConverter}
              data-testid="button-ipc-bns"
            >
              <RefreshCcwIcon className="w-4 h-4 mr-2" />
              IPC to BNS
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              data-testid="button-bare-act"
            >
              <BookOpenIcon className="w-4 h-4 mr-2" />
              Bare Act Lookup
            </Button>
          </div>
        </div>

        {/* Recent Sources */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpenIcon className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">Recent Sources</h4>
          </div>
          <div className="space-y-2">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <CheckCircleIcon className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-green-900 truncate">
                      Arnesh Kumar v. State of Bihar
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        Para 12-18
                      </Badge>
                      <span className="text-xs text-green-700">Verified</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <CheckCircleIcon className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-green-900 truncate">
                      Section 41 CrPC
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        Bare Act 2023
                      </Badge>
                      <span className="text-xs text-green-700">Verified</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangleIcon className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-amber-900 truncate">
                      Client Case File
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">
                        Local
                      </Badge>
                      <span className="text-xs text-amber-700">Unverified</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
