import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Template, Draft } from '@/types';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import DraftEditor from './DraftEditor';
import {
  FileTextIcon,
  MailIcon,
  Scale,
  UserIcon,
  GavelIcon,
  ShieldIcon,
  AlertTriangleIcon,
  BriefcaseIcon,
  EyeOffIcon,
  FileIcon,
  CheckCircleIcon,
  ZapIcon,
} from 'lucide-react';

interface DraftGeneratorProps {
  folderId?: string;
  onClose: () => void;
  onDraftGenerated: (draft: Draft) => void;
}

export default function DraftGenerator({ folderId, onClose, onDraftGenerated }: DraftGeneratorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [generatedDraft, setGeneratedDraft] = useState<Draft | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<'select' | 'form' | 'editor'>('select');
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const templatesData = await api.getTemplates();
      setTemplates(templatesData);
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
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setFormData({});
    setStep('form');
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateDraft = async () => {
    if (!selectedTemplate) return;

    try {
      setIsGenerating(true);
      const draft = await api.generateDraft({
        templateId: selectedTemplate.id,
        folderId,
        inputs: formData,
        title: `${selectedTemplate.title} - ${new Date().toLocaleDateString()}`,
      });

      setGeneratedDraft(draft);
      setStep('editor');
      onDraftGenerated(draft);
      
      if (draft.llmEnhanced) {
        const confidence = draft.confidence ? Math.round(draft.confidence * 100) : 0;
        toast({
          title: "Draft Generated & Enhanced",
          description: `Your draft has been created using local AI (${confidence}% confidence)`,
        });
      } else {
        toast({
          title: "Draft Generated",
          description: "Your draft has been created using the template",
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
        description: "Failed to generate draft",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getTemplateIcon = (templateId: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      bail_application: <Scale className="w-5 h-5" />,
      legal_notice: <MailIcon className="w-5 h-5" />,
      writ_petition: <Scale className="w-5 h-5" />,
      consumer_complaint: <UserIcon className="w-5 h-5" />,
      civil_suit: <GavelIcon className="w-5 h-5" />,
      pil_petition: <ShieldIcon className="w-5 h-5" />,
      criminal_complaint: <AlertTriangleIcon className="w-5 h-5" />,
      employment_contract: <BriefcaseIcon className="w-5 h-5" />,
      nda_agreement: <EyeOffIcon className="w-5 h-5" />,
      court_affidavit: <FileIcon className="w-5 h-5" />,
    };
    
    return iconMap[templateId] || <FileTextIcon className="w-5 h-5" />;
  };

  const renderTemplateSelection = () => (
    <div className="grid md:grid-cols-2 gap-6 p-6">
      {/* Left: Template Selection */}
      <div>
        <h3 className="font-serif font-semibold text-lg mb-4">Top 10 Legal Templates</h3>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-muted rounded-lg h-16"></div>
            ))}
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedTemplate?.id === template.id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => handleTemplateSelect(template)}
                  data-testid={`template-${template.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-primary mt-0.5">
                        {getTemplateIcon(template.id)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground mb-1">
                          {template.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {template.description}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {template.category}
                        </Badge>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <CheckCircleIcon className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Right: Template Preview */}
      <div>
        <h3 className="font-serif font-semibold text-lg mb-4">Template Preview</h3>
        {selectedTemplate ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="text-primary">
                  {getTemplateIcon(selectedTemplate.id)}
                </div>
                <div>
                  <CardTitle className="text-base">{selectedTemplate.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedTemplate.description}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Required Fields:</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedTemplate.requiredInputs.map((field) => (
                    <Badge key={field} variant="outline" className="text-xs">
                      {field.replace(/([A-Z])/g, ' $1').trim()}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Category:</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedTemplate.category}
                </p>
              </div>
              <Button 
                className="w-full mt-4"
                onClick={() => setStep('form')}
                data-testid="button-continue-form"
              >
                Continue to Form
                <ZapIcon className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <FileTextIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Select a template to see its preview and required fields
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  const renderDynamicForm = () => {
    if (!selectedTemplate) return null;

    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-serif font-semibold text-lg">
              {selectedTemplate.title} Details
            </h3>
            <p className="text-sm text-muted-foreground">
              Fill in the required information to generate your draft
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            data-testid="button-auto-fill"
          >
            Auto-fill from folder
          </Button>
        </div>

        <ScrollArea className="h-96">
          <div className="space-y-4 pr-4">
            {selectedTemplate.requiredInputs.map((field) => {
              const fieldConfig = selectedTemplate.uiHints?.formFields?.[field] || {};
              const fieldLabel = field.replace(/([A-Z])/g, ' $1').trim();

              return (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field} className="text-sm font-medium">
                    {fieldLabel}
                    {fieldConfig.validation === 'required' && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>

                  {fieldConfig.type === 'textarea' ? (
                    <Textarea
                      id={field}
                      placeholder={fieldConfig.placeholder || `Enter ${fieldLabel.toLowerCase()}`}
                      value={formData[field] || ''}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      rows={3}
                      className="resize-none"
                      data-testid={`input-${field}`}
                    />
                  ) : fieldConfig.type === 'select' ? (
                    <select
                      id={field}
                      value={formData[field] || ''}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      data-testid={`select-${field}`}
                    >
                      <option value="">Select {fieldLabel.toLowerCase()}</option>
                      {fieldConfig.options?.map((option: string) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : fieldConfig.type === 'number' ? (
                    <Input
                      id={field}
                      type="number"
                      placeholder={fieldConfig.placeholder || `Enter ${fieldLabel.toLowerCase()}`}
                      value={formData[field] || ''}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      data-testid={`input-${field}`}
                    />
                  ) : (
                    <Input
                      id={field}
                      type="text"
                      placeholder={fieldConfig.placeholder || `Enter ${fieldLabel.toLowerCase()}`}
                      value={formData[field] || ''}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      data-testid={`input-${field}`}
                    />
                  )}

                  {fieldConfig.maxChars && (
                    <p className="text-xs text-muted-foreground">
                      {(formData[field]?.length || 0)} / {fieldConfig.maxChars} characters
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between mt-6 pt-6 border-t">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="w-4 h-4 text-amber-500" />
            <p className="text-sm text-muted-foreground">
              Missing fields will be highlighted in the draft
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setStep('select')}
              data-testid="button-back-select"
            >
              Back to Templates
            </Button>
            <Button 
              onClick={handleGenerateDraft} 
              disabled={isGenerating}
              data-testid="button-generate"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <ZapIcon className="w-4 h-4 mr-2" />
                  Generate Draft
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="draft-generator-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileTextIcon className="w-6 h-6 text-primary" />
            Draft Generator
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {step === 'select' && renderTemplateSelection()}
          {step === 'form' && renderDynamicForm()}
          {step === 'editor' && generatedDraft && (
            <DraftEditor
              draft={generatedDraft}
              onClose={onClose}
              onSave={(updatedDraft) => {
                setGeneratedDraft(updatedDraft);
                onDraftGenerated(updatedDraft);
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
