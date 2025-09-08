import { BasePhaseHandler } from './base-handler';
import type {
  PhoenixPhase,
  PhaseContext,
  PhaseResponse,
  ValidationResult,
  DiagnosticNotesContent,
  SessionArtifact,
  ProblemBriefContent,
} from '../types';

export class DiagnosticInterviewHandler extends BasePhaseHandler {
  readonly phase: PhoenixPhase = 'diagnostic_interview';

  async processMessage(
    message: string,
    context: PhaseContext
  ): Promise<PhaseResponse> {
    const messageCount = this.countUserMessages(context);
    const existingNotes = this.getArtifactContent(context, 'diagnostic_notes') as DiagnosticNotesContent;
    const problemBrief = this.getArtifactContent(context, 'problem_brief') as ProblemBriefContent;
    
    const updatedNotes = await this.extractDiagnosticInsights(message, existingNotes, problemBrief);
    const updatedBrief = await this.enrichProblemBrief(message, problemBrief);
    
    const validation = await this.validateReadiness(context);
    
    const responseContent = this.generateDiagnosticResponse(
      updatedNotes,
      updatedBrief,
      validation,
      messageCount
    );
    
    const artifacts: Partial<SessionArtifact>[] = [
      {
        artifactType: 'diagnostic_notes',
        content: updatedNotes,
        phaseCreated: this.phase,
        version: existingNotes ? 2 : 1,
        isCurrent: true,
      },
      {
        artifactType: 'problem_brief',
        content: updatedBrief,
        phaseCreated: 'problem_intake',
        version: 2,
        isCurrent: true,
      },
    ];
    
    return this.createResponse(responseContent, {
      shouldTransition: validation.isValid && messageCount >= 4,
      nextPhase: validation.isValid ? 'type_classification' : undefined,
      artifacts,
    });
  }

  async validateReadiness(context: PhaseContext): Promise<ValidationResult> {
    const notes = this.getArtifactContent(context, 'diagnostic_notes') as DiagnosticNotesContent;
    const brief = this.getArtifactContent(context, 'problem_brief') as ProblemBriefContent;
    const messageCount = this.countUserMessages(context);
    
    const elements = [
      this.createElement(
        'stakeholders',
        this.isArrayWithContent(brief?.stakeholders)
      ),
      this.createElement(
        'constraints',
        this.isArrayWithContent(brief?.constraints)
      ),
      this.createElement(
        'success_criteria',
        this.isArrayWithContent(brief?.successCriteria)
      ),
      this.createElement(
        'key_findings',
        this.isArrayWithContent(notes?.keyFindings)
      ),
      this.createElement(
        'minimum_messages',
        messageCount >= 4,
        true,
        `${messageCount}/4 messages`
      ),
    ];
    
    const missingElements = elements
      .filter(e => e.required && !e.present)
      .map(e => e.name);
    
    const warnings = [];
    if (messageCount >= 20) {
      warnings.push('Maximum messages reached for diagnostic phase');
    }
    
    return this.createValidationResult(
      missingElements.length === 0,
      elements,
      missingElements,
      warnings
    );
  }

  getNextPhase(_context: PhaseContext): PhoenixPhase | null {
    return 'type_classification';
  }

  protected getPhaseKeywords(): string[] {
    return [
      'stakeholder', 'constraint', 'limitation', 'requirement',
      'success', 'goal', 'objective', 'outcome', 'metric',
      'risk', 'concern', 'opportunity', 'pattern', 'insight'
    ];
  }

  private async extractDiagnosticInsights(
    message: string,
    existingNotes: DiagnosticNotesContent | null,
    _problemBrief: ProblemBriefContent
  ): Promise<DiagnosticNotesContent> {
    const notes: DiagnosticNotesContent = existingNotes || {
      keyFindings: [],
      patterns: [],
      concerns: [],
      opportunities: [],
      recommendations: [],
    };
    
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('concern') || lowerMessage.includes('worry') || 
        lowerMessage.includes('risk')) {
      const concern = this.extractSentence(message, ['concern', 'worry', 'risk']);
      if (concern && !notes.concerns.includes(concern)) {
        notes.concerns.push(concern);
      }
    }
    
    if (lowerMessage.includes('opportunity') || lowerMessage.includes('potential') ||
        lowerMessage.includes('could')) {
      const opportunity = this.extractSentence(message, ['opportunity', 'potential', 'could']);
      if (opportunity && !notes.opportunities.includes(opportunity)) {
        notes.opportunities.push(opportunity);
      }
    }
    
    if (lowerMessage.includes('pattern') || lowerMessage.includes('trend') ||
        lowerMessage.includes('repeatedly')) {
      const pattern = this.extractSentence(message, ['pattern', 'trend', 'repeatedly']);
      if (pattern && !notes.patterns.includes(pattern)) {
        notes.patterns.push(pattern);
      }
    }
    
    if (message.length > 100 && notes.keyFindings.length < 10) {
      const finding = message.substring(0, 200);
      if (!notes.keyFindings.some(f => f.includes(finding.substring(0, 50)))) {
        notes.keyFindings.push(finding);
      }
    }
    
    return notes;
  }

  private async enrichProblemBrief(
    message: string,
    existingBrief: ProblemBriefContent
  ): Promise<ProblemBriefContent> {
    const brief = { ...existingBrief };
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('constraint') || lowerMessage.includes('limit') ||
        lowerMessage.includes('restriction')) {
      const constraint = this.extractSentence(message, ['constraint', 'limit', 'restriction']);
      if (constraint && !brief.constraints.includes(constraint)) {
        brief.constraints.push(constraint);
      }
    }
    
    if (lowerMessage.includes('success') || lowerMessage.includes('goal') ||
        lowerMessage.includes('achieve')) {
      const criteria = this.extractSentence(message, ['success', 'goal', 'achieve']);
      if (criteria && !brief.successCriteria.includes(criteria)) {
        brief.successCriteria.push(criteria);
      }
    }
    
    const stakeholderKeywords = ['team', 'department', 'customer', 'user', 'manager', 
                                 'executive', 'board', 'partner', 'vendor', 'investor'];
    stakeholderKeywords.forEach(keyword => {
      if (lowerMessage.includes(keyword) && !brief.stakeholders.includes(keyword)) {
        brief.stakeholders.push(keyword);
      }
    });
    
    if (lowerMessage.includes('complex') || lowerMessage.includes('complicated')) {
      brief.complexity = 'complex';
    } else if (lowerMessage.includes('simple') || lowerMessage.includes('straightforward')) {
      brief.complexity = 'simple';
    }
    
    return brief;
  }

  private extractSentence(text: string, keywords: string[]): string | null {
    const sentences = text.split(/[.!?]+/);
    for (const sentence of sentences) {
      if (keywords.some(k => sentence.toLowerCase().includes(k))) {
        return sentence.trim();
      }
    }
    return null;
  }

  private generateDiagnosticResponse(
    notes: DiagnosticNotesContent,
    brief: ProblemBriefContent,
    validation: ValidationResult,
    messageCount: number
  ): string {
    const missing = validation.missingElements || [];
    
    if (missing.length === 0 && messageCount >= 4) {
      return `Excellent! I now have a comprehensive understanding of your situation:

**Key Findings:**
${notes.keyFindings.slice(0, 3).map(f => `- ${f}`).join('\n')}

**Stakeholders:** ${brief.stakeholders.join(', ')}
**Main Constraints:** ${brief.constraints.slice(0, 3).join(', ')}
**Success Criteria:** ${brief.successCriteria.slice(0, 3).join(', ')}

${notes.concerns.length > 0 ? `**Concerns:** ${notes.concerns[0]}` : ''}
${notes.opportunities.length > 0 ? `**Opportunities:** ${notes.opportunities[0]}` : ''}

Now let's classify what type of decision this is to determine the best approach.`;
    }
    
    const questions = [];
    if (missing.includes('stakeholders')) {
      questions.push('Who are all the key stakeholders affected by this decision?');
    }
    if (missing.includes('constraints')) {
      questions.push('What constraints or limitations are you working within?');
    }
    if (missing.includes('success_criteria')) {
      questions.push('How will you measure success? What are your goals?');
    }
    
    if (questions.length > 0) {
      return `Let me dig deeper into a few more aspects:

${questions.map(q => `- ${q}`).join('\n')}

Understanding these will help me recommend the most appropriate decision-making approach.`;
    }
    
    const probeQuestions = [
      'What happens if you don\'t make this decision?',
      'What\'s the worst-case scenario you\'re trying to avoid?',
      'What similar decisions have you or your organization made before?',
      'What resources do you have available?',
      'What\'s your biggest concern about this decision?'
    ];
    
    const nextQuestion = probeQuestions[Math.min(messageCount - 1, probeQuestions.length - 1)];
    
    return `I'm building a clearer picture. ${nextQuestion}`;
  }
}