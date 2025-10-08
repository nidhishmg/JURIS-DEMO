import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, BookOpenIcon, FileTextIcon, SearchIcon, CheckCircleIcon, RefreshCcwIcon } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/20">
        <div className="absolute inset-0 bg-grid-small-black/[0.2] bg-grid-small" />
        <div className="relative">
          <div className="mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 lg:px-8 lg:pt-24">
            <div className="text-center">
              <div className="flex justify-center mb-8">
                <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center">
                  <Scale className="w-12 h-12 text-primary-foreground" />
                </div>
              </div>
              <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                <span className="block">JurisThis</span>
                <span className="block text-primary">AI Legal Assistant for Indian Law</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-xl text-muted-foreground">
                Your intelligent companion for case law research, judgment analysis, legal drafting, and citation verification. 
                Built specifically for Indian legal practice.
              </p>
              <div className="mx-auto mt-10 max-w-sm">
                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={() => window.location.href = '/api/login'}
                  data-testid="button-login"
                >
                  Get Started
                </Button>
                <p className="mt-3 text-sm text-muted-foreground">
                  Sign in to access your legal workspace
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-serif font-bold text-foreground">Powerful Legal Tools</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Everything you need for modern legal practice in India
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="relative overflow-hidden">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <SearchIcon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Case Law Search</CardTitle>
                <CardDescription>
                  AI-powered search across Supreme Court and High Court judgments with intelligent summarization
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
                  <FileTextIcon className="w-6 h-6 text-secondary" />
                </div>
                <CardTitle>Judgment Analysis</CardTitle>
                <CardDescription>
                  Structured analysis of legal judgments with facts, issues, reasoning, and precedential value
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <FileTextIcon className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Draft Generator</CardTitle>
                <CardDescription>
                  Generate professional legal drafts including bail applications, legal notices, and writ petitions
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Citation Verifier</CardTitle>
                <CardDescription>
                  Verify legal citations and check for overruled judgments with multi-source validation
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
                  <RefreshCcwIcon className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle>IPC ↔ BNS Converter</CardTitle>
                <CardDescription>
                  Convert between Indian Penal Code sections and Bharatiya Nyaya Sanhita provisions
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                  <BookOpenIcon className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>Bare Act Explorer</CardTitle>
                <CardDescription>
                  Interactive exploration of Indian statutes with AI-powered explanations and interpretations
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Case Folders Section */}
      <section className="py-16 bg-muted/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div>
              <h2 className="text-3xl font-serif font-bold text-foreground">
                Organize with Case Folders
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Create dedicated workspaces for each legal matter. Upload documents, organize chats, 
                generate drafts, and maintain complete case files with built-in collaboration tools.
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center mt-1">
                    <span className="w-2 h-2 bg-primary-foreground rounded-full" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Document Management</h3>
                    <p className="text-muted-foreground">Upload FIRs, judgments, and case documents with automatic text extraction</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center mt-1">
                    <span className="w-2 h-2 bg-primary-foreground rounded-full" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Context-Aware AI</h3>
                    <p className="text-muted-foreground">AI responses prioritize folder-specific documents and case context</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center mt-1">
                    <span className="w-2 h-2 bg-primary-foreground rounded-full" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Team Collaboration</h3>
                    <p className="text-muted-foreground">Share folders with colleagues and maintain audit trails</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-10 lg:mt-0">
              <Card className="p-6 bg-card">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-accent/20 flex items-center justify-center">
                      <Scale className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-semibold">State v. Kumar Bail</p>
                      <p className="text-sm text-muted-foreground">12 chats, 8 docs</p>
                    </div>
                  </div>
                  <div className="pl-11 space-y-2 text-sm">
                    <p className="text-muted-foreground">📄 FIR_420_Kumar.pdf</p>
                    <p className="text-muted-foreground">💬 Arnesh Kumar guidelines analysis</p>
                    <p className="text-muted-foreground">📝 Bail application draft</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-serif font-bold text-primary-foreground">
            Ready to transform your legal practice?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/90">
            Join thousands of legal professionals using JurisThis to streamline their research, 
            analysis, and drafting workflows.
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            className="mt-8"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-cta-login"
          >
            Start Your Legal AI Journey
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
              <Scale className="w-6 h-6 text-primary" />
              <span className="font-serif font-bold text-lg">JurisThis</span>
            </div>
            <p className="text-muted-foreground">
              AI Legal Assistant for Indian Law
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Built with ❤️ for the Indian legal community
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
