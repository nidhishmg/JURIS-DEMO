import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Folder } from '@/types';
import { 
  UploadIcon, 
  FileTextIcon,
  LoaderIcon,
  CheckCircleIcon
} from 'lucide-react';

interface JudgmentAnalysisProps {
  open: boolean;
  onClose: () => void;
  folders: Folder[];
}

export default function JudgmentAnalysis({ open, onClose, folders }: JudgmentAnalysisProps) {
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url' | 'citation'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [citation, setCitation] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!folderId) {
      toast({
        title: "Folder Required",
        description: "Please select a case folder to organize the analysis",
        variant: "destructive",
      });
      return;
    }

    if (uploadMethod === 'file' && !selectedFile) {
      toast({
        title: "File Required",
        description: "Please select a PDF file to upload",
        variant: "destructive",
      });
      return;
    }

    if (uploadMethod === 'url' && !url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a judgment URL",
        variant: "destructive",
      });
      return;
    }

    if (uploadMethod === 'citation' && !citation.trim()) {
      toast({
        title: "Citation Required",
        description: "Please enter a case citation",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('folderId', folderId);
      formData.append('inputType', uploadMethod);
      
      if (uploadMethod === 'file' && selectedFile) {
        formData.append('file', selectedFile);
      } else if (uploadMethod === 'url') {
        formData.append('url', url);
      } else if (uploadMethod === 'citation') {
        formData.append('citation', citation);
      }

      const response = await fetch('/api/analysis/judgment', {
        method: 'POST',
        body: formData,
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
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setAnalysisId(data.analysisId);
      
      toast({
        title: "Analysis Started",
        description: "Your judgment is being analyzed. This may take a few minutes.",
      });

      // Reset form
      setSelectedFile(null);
      setUrl('');
      setCitation('');
      
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload judgment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUrl('');
    setCitation('');
    setFolderId('');
    setAnalysisId(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl" data-testid="dialog-judgment-analysis">
        <DialogHeader>
          <DialogTitle>Judgment Analysis</DialogTitle>
          <DialogDescription>
            Upload a court judgment for AI-powered analysis including facts, issues, reasoning, and precedents
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Case Folder Selection */}
          <div className="space-y-2">
            <Label htmlFor="folder">Case Folder *</Label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger id="folder" data-testid="select-folder">
                <SelectValue placeholder="Select a case folder" />
              </SelectTrigger>
              <SelectContent>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Upload Method Selection */}
          <div className="space-y-2">
            <Label>Upload Method</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={uploadMethod === 'file' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUploadMethod('file')}
                data-testid="button-method-file"
              >
                <UploadIcon className="w-4 h-4 mr-2" />
                PDF File
              </Button>
              <Button
                type="button"
                variant={uploadMethod === 'url' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUploadMethod('url')}
                data-testid="button-method-url"
              >
                URL
              </Button>
              <Button
                type="button"
                variant={uploadMethod === 'citation' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUploadMethod('citation')}
                data-testid="button-method-citation"
              >
                Citation
              </Button>
            </div>
          </div>

          {/* File Upload */}
          {uploadMethod === 'file' && (
            <div className="space-y-2">
              <Label htmlFor="file">Upload PDF *</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Input
                  id="file"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="input-file"
                />
                <label htmlFor="file" className="cursor-pointer">
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileTextIcon className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium">{selectedFile.name}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <UploadIcon className="w-8 h-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF files only (max 50MB)
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* URL Input */}
          {uploadMethod === 'url' && (
            <div className="space-y-2">
              <Label htmlFor="url">Judgment URL *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://indiankanoon.org/doc/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                data-testid="input-url"
              />
              <p className="text-xs text-muted-foreground">
                Enter a URL to a judgment from IndianKanoon, Supreme Court, or other legal databases
              </p>
            </div>
          )}

          {/* Citation Input */}
          {uploadMethod === 'citation' && (
            <div className="space-y-2">
              <Label htmlFor="citation">Case Citation *</Label>
              <Textarea
                id="citation"
                placeholder="Example: AIR 2023 SC 1234 or (2023) 5 SCC 678"
                value={citation}
                onChange={(e) => setCitation(e.target.value)}
                rows={3}
                data-testid="input-citation"
              />
              <p className="text-xs text-muted-foreground">
                Enter the full citation. The AI will attempt to locate and analyze the judgment.
              </p>
            </div>
          )}

          {/* Analysis Status */}
          {analysisId && (
            <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-secondary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Analysis in Progress</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your judgment is being analyzed. You can close this dialog and check the analysis results in your case folder.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
              data-testid="button-cancel"
            >
              {analysisId ? 'Close' : 'Cancel'}
            </Button>
            {!analysisId && (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isUploading}
                data-testid="button-analyze"
              >
                {isUploading ? (
                  <>
                    <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <FileTextIcon className="w-4 h-4 mr-2" />
                    Start Analysis
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
