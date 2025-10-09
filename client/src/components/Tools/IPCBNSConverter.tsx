import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import {
  RefreshCcwIcon,
  ArrowRightIcon,
  BookOpenIcon,
  AlertCircleIcon,
} from 'lucide-react';

interface ConversionResult {
  bnsSection?: string;
  ipcSection?: string;
  description?: string;
}

interface IPCBNSConverterProps {
  open: boolean;
  onClose: () => void;
}

export default function IPCBNSConverter({ open, onClose }: IPCBNSConverterProps) {
  const [ipcSection, setIpcSection] = useState('');
  const [bnsSection, setBnsSection] = useState('');
  const [ipcResult, setIpcResult] = useState<ConversionResult | null>(null);
  const [bnsResult, setBnsResult] = useState<ConversionResult | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const { toast } = useToast();

  const handleIPCtoBNS = async () => {
    if (!ipcSection.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter an IPC section number",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsConverting(true);
      const response = await fetch(`/api/citations/convert/ipc-to-bns?section=${encodeURIComponent(ipcSection)}`);
      
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
        throw new Error('Conversion failed');
      }

      const data = await response.json();
      
      if (data) {
        setIpcResult(data);
        toast({
          title: "Conversion Complete",
          description: `IPC Section ${ipcSection} → BNS Section ${data.bnsSection}`,
        });
      } else {
        setIpcResult(null);
        toast({
          title: "No Mapping Found",
          description: `No BNS equivalent found for IPC Section ${ipcSection}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Conversion Failed",
        description: "Failed to convert IPC to BNS. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handleBNStoIPC = async () => {
    if (!bnsSection.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter a BNS section number",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsConverting(true);
      const response = await fetch(`/api/citations/convert/bns-to-ipc?section=${encodeURIComponent(bnsSection)}`);
      
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
        throw new Error('Conversion failed');
      }

      const data = await response.json();
      
      if (data) {
        setBnsResult(data);
        toast({
          title: "Conversion Complete",
          description: `BNS Section ${bnsSection} → IPC Section ${data.ipcSection}`,
        });
      } else {
        setBnsResult(null);
        toast({
          title: "No Mapping Found",
          description: `No IPC equivalent found for BNS Section ${bnsSection}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Conversion Failed",
        description: "Failed to convert BNS to IPC. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl" data-testid="ipc-bns-converter-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCcwIcon className="w-6 h-6 text-primary" />
            IPC ↔ BNS Converter
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircleIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">About This Tool</p>
                <p>
                  Convert between the Indian Penal Code (IPC, 1860) and the Bharatiya Nyaya Sanhita (BNS, 2023).
                  The BNS replaces the IPC and came into effect on July 1, 2024.
                </p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="ipc-to-bns" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ipc-to-bns">IPC → BNS</TabsTrigger>
              <TabsTrigger value="bns-to-ipc">BNS → IPC</TabsTrigger>
            </TabsList>

            <TabsContent value="ipc-to-bns" className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="ipc-section">IPC Section Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ipc-section"
                      placeholder="e.g., 420, 498A, 302"
                      value={ipcSection}
                      onChange={(e) => setIpcSection(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleIPCtoBNS()}
                      data-testid="input-ipc-section"
                    />
                    <Button 
                      onClick={handleIPCtoBNS}
                      disabled={isConverting}
                      data-testid="button-convert-ipc-to-bns"
                    >
                      {isConverting ? (
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                      ) : (
                        <>
                          Convert
                          <ArrowRightIcon className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the IPC section number (e.g., 420 for Cheating)
                  </p>
                </div>

                {ipcResult && (
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-sm">
                            IPC Section {ipcSection}
                          </Badge>
                          <RefreshCcwIcon className="w-4 h-4 text-green-600" />
                          <Badge className="bg-green-600 text-white text-sm">
                            BNS Section {ipcResult.bnsSection}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-900 mb-1">Description:</p>
                          <p className="text-sm text-green-800">{ipcResult.description}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-green-700">
                          <BookOpenIcon className="w-3 h-3" />
                          <span>Effective from July 1, 2024</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="bns-to-ipc" className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="bns-section">BNS Section Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="bns-section"
                      placeholder="e.g., 318, 85, 103"
                      value={bnsSection}
                      onChange={(e) => setBnsSection(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleBNStoIPC()}
                      data-testid="input-bns-section"
                    />
                    <Button 
                      onClick={handleBNStoIPC}
                      disabled={isConverting}
                      data-testid="button-convert-bns-to-ipc"
                    >
                      {isConverting ? (
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                      ) : (
                        <>
                          Convert
                          <ArrowRightIcon className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the BNS section number (e.g., 318 for Cheating)
                  </p>
                </div>

                {bnsResult && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-blue-600 text-white text-sm">
                            BNS Section {bnsSection}
                          </Badge>
                          <RefreshCcwIcon className="w-4 h-4 text-blue-600" />
                          <Badge variant="secondary" className="text-sm">
                            IPC Section {bnsResult.ipcSection}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-900 mb-1">Description:</p>
                          <p className="text-sm text-blue-800">{bnsResult.description}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-blue-700">
                          <BookOpenIcon className="w-3 h-3" />
                          <span>Legacy IPC provision (pre-July 2024)</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="w-full" data-testid="button-close-converter">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
