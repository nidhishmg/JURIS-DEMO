import { storage } from "../storage";

interface CitationResult {
  citation: string;
  found: boolean;
  source?: string;
  sourceUrl?: string;
  excerpt?: string;
  overruled: boolean;
  confidence: number;
}

export class CitationService {
  async verifyCitations(citations: string[]): Promise<CitationResult[]> {
    const results: CitationResult[] = [];
    
    for (const citation of citations) {
      try {
        const result = await this.verifySingleCitation(citation);
        results.push(result);
      } catch (error) {
        console.error(`Error verifying citation ${citation}:`, error);
        results.push({
          citation,
          found: false,
          overruled: false,
          confidence: 0,
        });
      }
    }
    
    return results;
  }

  private async verifySingleCitation(citation: string): Promise<CitationResult> {
    // Check if we have this citation cached
    const cached = await storage.getCitationVerification(citation);
    if (cached) {
      return {
        citation: cached.citation,
        found: cached.found,
        source: cached.source || undefined,
        sourceUrl: cached.sourceUrl || undefined,
        excerpt: cached.excerpt || undefined,
        overruled: cached.overruled || false,
        confidence: cached.confidence || 0,
      };
    }

    // Perform verification (mock implementation for MVP)
    const result = await this.performCitationLookup(citation);
    
    // Cache the result
    await storage.createCitationVerification({
      citation,
      found: result.found,
      source: result.source,
      sourceUrl: result.sourceUrl,
      excerpt: result.excerpt,
      overruled: result.overruled,
      confidence: result.confidence,
    });
    
    return result;
  }

  private async performCitationLookup(citation: string): Promise<CitationResult> {
    // Mock citation verification - in production, this would query:
    // 1. SCC/Manupatra APIs (if licensed)
    // 2. IndianKanoon API
    // 3. High Court websites
    // 4. Supreme Court website
    
    const normalizedCitation = citation.toLowerCase().trim();
    
    // Mock some known citations for demonstration
    const knownCitations = [
      {
        pattern: /arnesh kumar.*state.*bihar/,
        found: true,
        source: "SCC Online",
        sourceUrl: "https://www.scconline.com/DocumentLink/...",
        excerpt: "The Supreme Court in Arnesh Kumar v. State of Bihar laid down guidelines...",
        overruled: false,
        confidence: 95,
      },
      {
        pattern: /section\s+(41|420)\s+(crpc|ipc)/,
        found: true,
        source: "Legislative Database",
        sourceUrl: "https://legislative.gov.in/...",
        excerpt: "Section 41 of the Code of Criminal Procedure...",
        overruled: false,
        confidence: 100,
      },
      {
        pattern: /\d{4}.*scc.*\d+/,
        found: true,
        source: "SCC",
        sourceUrl: "https://www.supremecourtcases.com/...",
        excerpt: "Supreme Court case reported in SCC...",
        overruled: false,
        confidence: 85,
      }
    ];

    for (const known of knownCitations) {
      if (known.pattern.test(normalizedCitation)) {
        return {
          citation,
          found: known.found,
          source: known.source,
          sourceUrl: known.sourceUrl,
          excerpt: known.excerpt,
          overruled: known.overruled,
          confidence: known.confidence,
        };
      }
    }

    // If not found in known citations, try IndianKanoon search
    return await this.searchIndianKanoon(citation);
  }

  private async searchIndianKanoon(citation: string): Promise<CitationResult> {
    try {
      // Mock IndianKanoon API call
      // In production, this would be: await fetch('https://api.indiankanoon.org/search/...')
      
      // For now, return a generic "not found" result
      return {
        citation,
        found: false,
        source: "IndianKanoon",
        overruled: false,
        confidence: 0,
      };
    } catch (error) {
      console.error("IndianKanoon search error:", error);
      return {
        citation,
        found: false,
        overruled: false,
        confidence: 0,
      };
    }
  }

  async getVerificationStats(userId: string) {
    // Get verification statistics for user's citations
    return storage.getCitationStats();
  }

  convertIPCtoBNS(ipcSection: string): { bnsSection: string; description: string } | null {
    // IPC to BNS conversion mapping
    const ipcToBnsMap: Record<string, { bns: string; desc: string }> = {
      "420": { bns: "318", desc: "Cheating - IPC Section 420 is now BNS Section 318" },
      "498A": { bns: "85", desc: "Domestic Violence - IPC Section 498A is now BNS Section 85" },
      "302": { bns: "103", desc: "Murder - IPC Section 302 is now BNS Section 103" },
      "376": { bns: "64", desc: "Rape - IPC Section 376 is now BNS Section 64" },
      "325": { bns: "122", desc: "Voluntarily causing grievous hurt" },
      "324": { bns: "118", desc: "Voluntarily causing hurt by dangerous weapons" },
      "323": { bns: "115", desc: "Voluntarily causing hurt" },
      "379": { bns: "303", desc: "Theft" },
      "380": { bns: "305", desc: "Theft in dwelling house" },
    };

    const section = ipcSection.replace(/[^\d]/g, ''); // Extract just the number
    const mapping = ipcToBnsMap[section];

    if (mapping) {
      return {
        bnsSection: mapping.bns,
        description: mapping.desc,
      };
    }

    return null;
  }

  convertBNSToIPC(bnsSection: string): { ipcSection: string; description: string } | null {
    // Reverse mapping
    const bnsToIpcMap: Record<string, { ipc: string; desc: string }> = {
      "318": { ipc: "420", desc: "Cheating - BNS Section 318 was IPC Section 420" },
      "85": { ipc: "498A", desc: "Domestic Violence - BNS Section 85 was IPC Section 498A" },
      "103": { ipc: "302", desc: "Murder - BNS Section 103 was IPC Section 302" },
      "64": { ipc: "376", desc: "Rape - BNS Section 64 was IPC Section 376" },
      "122": { ipc: "325", desc: "Voluntarily causing grievous hurt" },
      "118": { ipc: "324", desc: "Voluntarily causing hurt by dangerous weapons" },
      "115": { ipc: "323", desc: "Voluntarily causing hurt" },
      "303": { ipc: "379", desc: "Theft" },
      "305": { ipc: "380", desc: "Theft in dwelling house" },
    };

    const section = bnsSection.replace(/[^\d]/g, '');
    const mapping = bnsToIpcMap[section];

    if (mapping) {
      return {
        ipcSection: mapping.ipc,
        description: mapping.desc,
      };
    }

    return null;
  }
}

export const citationService = new CitationService();
