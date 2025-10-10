// LLM Prompt Templates for Judgment Analysis
// Each template includes: system instructions, user prompt, and expected output format

export interface AnalysisPrompt {
  step: string;
  systemPrompt: string;
  userPromptTemplate: string;
  outputFormat: string;
  requiredFields: string[];
}

export const analysisPrompts: Record<string, AnalysisPrompt> = {
  // Step 1: Metadata Extraction
  metadata: {
    step: 'metadata',
    systemPrompt: `You are a legal metadata extraction specialist for Indian court judgments. Extract structured case information from the judgment text with precise citations to paragraph/page numbers.`,
    userPromptTemplate: `Extract the following metadata from this judgment:

JUDGMENT TEXT:
{judgmentChunks}

Extract and return JSON with:
1. caseName: Full case title (e.g., "State of Punjab v. Ajaib Singh")
2. citation: Primary citation (e.g., "AIR 1953 SC 10")
3. court: Court name (e.g., "Supreme Court of India", "Delhi High Court")
4. bench: Bench composition (e.g., "Division Bench of 2 judges", "Constitutional Bench of 5 judges")
5. judges: Array of judge names
6. date: Decision date (YYYY-MM-DD format)
7. anchors: Object mapping each field to {page, paragraph} citation

IMPORTANT: Include precise anchors (page and paragraph numbers) for each extracted field.`,
    outputFormat: 'JSON',
    requiredFields: ['caseName', 'citation', 'court', 'bench', 'judges', 'date', 'anchors']
  },

  // Step 2: Facts Extraction
  facts: {
    step: 'facts',
    systemPrompt: `You are a legal facts extraction specialist. Extract only the factual background of the case, distinguishing between admitted facts and disputed facts. Provide precise paragraph/page citations.`,
    userPromptTemplate: `Extract the factual background from this judgment:

JUDGMENT TEXT:
{judgmentChunks}

METADATA CONTEXT:
{metadata}

Extract and return JSON with:
1. admittedFacts: Array of undisputed facts, each with {text, anchor: {page, paragraph}}
2. disputedFacts: Array of contested facts, each with {text, anchor: {page, paragraph}}
3. proceduralHistory: Array of procedural events (lower court proceedings, appeals), each with {text, anchor: {page, paragraph}}
4. parties: Object with {appellant: {name, role, anchor}, respondent: {name, role, anchor}, intervenors: [{name, role, anchor}]}

Anchor each fact AND party information to specific paragraph and page numbers.`,
    outputFormat: 'JSON',
    requiredFields: ['admittedFacts', 'disputedFacts', 'proceduralHistory', 'parties']
  },

  // Step 3: Timeline Generation
  timeline: {
    step: 'timeline',
    systemPrompt: `You are a legal timeline specialist. Create a chronological timeline of events from the judgment, including both factual events and procedural milestones. Each event must have a date and citation.`,
    userPromptTemplate: `Generate a chronological timeline from this judgment:

JUDGMENT TEXT:
{judgmentChunks}

FACTS CONTEXT:
{facts}

Extract and return JSON with:
1. events: Array of chronological events, each with:
   - date: Event date (YYYY-MM-DD, or "Unknown" if not specified)
   - description: Brief event description
   - type: "factual" | "procedural" | "legal"
   - anchor: {page, paragraph}

Sort events chronologically. Include both factual events and court proceedings.`,
    outputFormat: 'JSON',
    requiredFields: ['events']
  },

  // Step 4: Issues Identification
  issues: {
    step: 'issues',
    systemPrompt: `You are a legal issues identification specialist. Extract the key legal questions and issues framed by the court. Distinguish between main issues and subsidiary issues.`,
    userPromptTemplate: `Identify the legal issues from this judgment:

JUDGMENT TEXT:
{judgmentChunks}

FACTS CONTEXT:
{facts}

Extract and return JSON with:
1. mainIssues: Array of primary legal questions, each with:
   - issueNumber: Sequential number
   - question: The legal question posed
   - anchor: {page, paragraph}
2. subsidiaryIssues: Array of secondary/derivative issues
3. issuesFraming: Verbatim text of how court framed the issues with anchor

Focus on questions of law, not facts.`,
    outputFormat: 'JSON',
    requiredFields: ['mainIssues', 'subsidiaryIssues', 'issuesFraming']
  },

  // Step 5: Arguments Analysis
  arguments: {
    step: 'arguments',
    systemPrompt: `You are a legal arguments analysis specialist. Extract and organize arguments presented by each party, along with court's consideration of those arguments.`,
    userPromptTemplate: `Analyze the arguments from this judgment:

JUDGMENT TEXT:
{judgmentChunks}

ISSUES CONTEXT:
{issues}

Extract and return JSON with:
1. appellantArguments: Array of arguments by appellant/petitioner, each with:
   - summary: Argument summary
   - supportingAuthorities: Array of cases/statutes cited
   - anchor: {page, paragraph}
2. respondentArguments: Array of arguments by respondent
3. courtAnalysis: Array of court's consideration/response to each argument, each with:
   - analysis: Court's response/reasoning
   - relatedArgument: Which argument this addresses
   - anchor: {page, paragraph}

Link arguments to specific issues where applicable.`,
    outputFormat: 'JSON',
    requiredFields: ['appellantArguments', 'respondentArguments', 'courtAnalysis']
  },

  // Step 6: Ratio Decidendi (Binding Law)
  ratio: {
    step: 'ratio',
    systemPrompt: `You are a legal ratio decidendi extraction specialist. Identify the binding legal principles that form the basis of the decision. Ratio decidendi is the legal reasoning necessary for the decision.`,
    userPromptTemplate: `Extract the ratio decidendi from this judgment:

JUDGMENT TEXT:
{judgmentChunks}

ISSUES CONTEXT:
{issues}

Extract and return JSON with:
1. ratioStatements: Array of binding legal propositions, each with:
   - principle: The legal principle established
   - relatedIssue: Which issue this ratio addresses
   - anchor: {page, paragraph}
   - verbatimQuote: Exact quote from judgment
2. holdings: Final decision/verdict on each issue, each with {decision, relatedIssue, anchor: {page, paragraph}}
3. legalTests: Any tests or standards established by the court, each with {testName, description, anchor: {page, paragraph}}

Ratio must be necessary for the decision, not merely persuasive observations.`,
    outputFormat: 'JSON',
    requiredFields: ['ratioStatements', 'holdings', 'legalTests']
  },

  // Step 7: Obiter Dicta (Non-binding Observations)
  obiter: {
    step: 'obiter',
    systemPrompt: `You are a legal obiter dicta extraction specialist. Identify observations, remarks, and legal discussions that are NOT essential to the decision but may be persuasive.`,
    userPromptTemplate: `Extract obiter dicta from this judgment:

JUDGMENT TEXT:
{judgmentChunks}

RATIO CONTEXT:
{ratio}

Extract and return JSON with:
1. obiterStatements: Array of non-binding observations, each with:
   - observation: The court's remark/observation
   - context: Why this was discussed (though not necessary for decision)
   - anchor: {page, paragraph}
   - verbatimQuote: Exact quote
2. dicta: General legal discussions or commentary, each with {discussion, anchor: {page, paragraph}}
3. hypotheticals: Any hypothetical scenarios discussed, each with {scenario, anchor: {page, paragraph}}

Clearly distinguish from ratio - these are NOT binding.`,
    outputFormat: 'JSON',
    requiredFields: ['obiterStatements', 'dicta', 'hypotheticals']
  },

  // Step 8: Statutes & Provisions
  statutes: {
    step: 'statutes',
    systemPrompt: `You are a legal statutes and provisions extraction specialist. Extract all statutes, sections, articles, and legal provisions cited in the judgment. For IPC provisions, provide BNS equivalents.`,
    userPromptTemplate: `Extract statutes and provisions from this judgment:

JUDGMENT TEXT:
{judgmentChunks}

Extract and return JSON with:
1. statutes: Array of statutes/acts cited, each with:
   - name: Full statute name (e.g., "Indian Penal Code, 1860")
   - sections: Array of specific sections/articles cited
   - anchor: {page, paragraph} where first cited
2. ipcToBns: For IPC provisions, map to BNS equivalents:
   - ipcSection: Old IPC section
   - bnsSection: Corresponding BNS section
   - description: What the provision addresses
3. constitutionalProvisions: Separate array for Constitution articles
4. interpretationNotes: How the court interpreted each provision, each with {statute, section, interpretation, anchor: {page, paragraph}}

Include full citation format for each statute.`,
    outputFormat: 'JSON',
    requiredFields: ['statutes', 'ipcToBns', 'constitutionalProvisions', 'interpretationNotes']
  },

  // Step 9: Precedents Cited
  precedents: {
    step: 'precedents',
    systemPrompt: `You are a legal precedents extraction specialist. Extract all case law citations, categorize by treatment (followed, distinguished, overruled), and provide precise anchors.`,
    userPromptTemplate: `Extract precedents cited from this judgment:

JUDGMENT TEXT:
{judgmentChunks}

Extract and return JSON with:
1. precedents: Array of cases cited, each with:
   - caseName: Case title
   - citation: Full citation (e.g., "AIR 1973 SC 1461")
   - treatment: "followed" | "distinguished" | "overruled" | "referred" | "approved"
   - proposition: Legal proposition for which case was cited
   - anchor: {page, paragraph}
2. bindingPrecedents: Supreme Court cases that bound the court, each with {caseName, citation, proposition, anchor: {page, paragraph}}
3. persuasivePrecedents: High Court or foreign cases cited persuasively, each with {caseName, citation, proposition, anchor: {page, paragraph}}
4. overruledCases: Any precedents explicitly overruled, each with {caseName, citation, reason, anchor: {page, paragraph}}

Verify citations are accurate and complete.`,
    outputFormat: 'JSON',
    requiredFields: ['precedents', 'bindingPrecedents', 'persuasivePrecedents', 'overruledCases']
  },

  // Step 10: Executive Summary
  summary: {
    step: 'summary',
    systemPrompt: `You are a legal summary specialist. Create a comprehensive yet concise executive summary of the judgment suitable for lawyers and law students.`,
    userPromptTemplate: `Generate an executive summary from this judgment:

JUDGMENT TEXT:
{judgmentChunks}

ANALYSIS CONTEXT:
Metadata: {metadata}
Facts: {facts}
Timeline: {timeline}
Issues: {issues}
Arguments: {arguments}
Ratio: {ratio}
Obiter: {obiter}
Statutes: {statutes}
Precedents: {precedents}

Generate and return JSON with:
1. headnote: One-paragraph summary (150-200 words) covering facts, issues, and decision
2. keyTakeaways: Array of 3-5 bullet points with main legal principles
3. practicalImplications: How this judgment affects legal practice
4. relatedAreas: Legal domains this judgment impacts (e.g., "Criminal Law", "Evidence Law")
5. verdict: Final outcome (e.g., "Appeal allowed", "Writ dismissed")
6. anchors: Citations to key paragraphs supporting the summary

Make it accessible but legally accurate.`,
    outputFormat: 'JSON',
    requiredFields: ['headnote', 'keyTakeaways', 'practicalImplications', 'relatedAreas', 'verdict', 'anchors']
  }
};

// Helper function to generate prompt with context
export function generateAnalysisPrompt(
  step: string,
  judgmentChunks: string,
  context: Record<string, any> = {}
): { system: string; user: string; outputFormat: string } {
  const template = analysisPrompts[step];
  
  if (!template) {
    throw new Error(`Unknown analysis step: ${step}`);
  }

  // Replace placeholders in user prompt
  let userPrompt = template.userPromptTemplate.replace('{judgmentChunks}', judgmentChunks);
  
  // Replace context placeholders (using replaceAll to avoid regex escaping issues)
  for (const [key, value] of Object.entries(context)) {
    const placeholder = `{${key}}`;
    const contextValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    userPrompt = userPrompt.replaceAll(placeholder, contextValue);
  }

  return {
    system: template.systemPrompt,
    user: userPrompt,
    outputFormat: template.outputFormat
  };
}

// Analysis step execution order
export const analysisStepOrder = [
  'metadata',
  'facts',
  'timeline',
  'issues',
  'arguments',
  'ratio',
  'obiter',
  'statutes',
  'precedents',
  'summary'
];
