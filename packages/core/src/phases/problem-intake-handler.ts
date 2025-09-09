import { BasePhaseHandler } from './base-handler';
import type {
  PhoenixPhase,
  PhaseContext,
  PhaseResponse,
  ValidationResult,
  ProblemBriefContent,
  SessionArtifact,
} from '../types';

export class ProblemIntakeHandler extends BasePhaseHandler {
  readonly phase: PhoenixPhase = 'problem_intake';

  async processMessage(
    message: string,
    context: PhaseContext
  ): Promise<PhaseResponse> {
    const messageCount = this.countUserMessages(context);
    const existingBrief = this.getArtifactContent(context, 'problem_brief') as ProblemBriefContent;
    
    const updatedBrief = await this.extractProblemElements(message, existingBrief, context);
    
    const validation = await this.validateReadiness(context);
    
    let responseContent = '';
    
    if (messageCount === 1) {
      responseContent = this.generateInitialResponse(updatedBrief);
    } else {
      responseContent = this.generateFollowUpResponse(updatedBrief, validation);
    }
    
    const artifact: Partial<SessionArtifact> = {
      artifactType: 'problem_brief',
      content: updatedBrief,
      phaseCreated: this.phase,
      version: existingBrief ? 2 : 1,
      isCurrent: true,
    };
    
    return this.createResponse(responseContent, {
      shouldTransition: validation.isValid && messageCount >= this.defaultMinMessages,
      nextPhase: validation.isValid ? 'diagnostic_interview' : undefined,
      artifacts: [artifact],
    });
  }

  async validateReadiness(context: PhaseContext): Promise<ValidationResult> {
    const brief = this.getArtifactContent(context, 'problem_brief') as ProblemBriefContent;
    const messageCount = this.countUserMessages(context);
    
    const elements = [
      this.createElement(
        'problem_statement',
        this.isNonEmptyString(brief?.problemStatement)
      ),
      this.createElement(
        'context',
        this.isNonEmptyString(brief?.context)
      ),
      this.createElement(
        'urgency',
        !!brief?.urgency
      ),
      this.createElement(
        'minimum_messages',
        messageCount >= this.defaultMinMessages,
        true,
        `${messageCount}/${this.defaultMinMessages} messages`
      ),
    ];
    
    const missingElements = elements
      .filter(e => e.required && !e.present)
      .map(e => e.name);
    
    const warnings = [];
    if (messageCount >= this.defaultMaxMessages) {
      warnings.push('Maximum messages reached for this phase');
    }
    
    return this.createValidationResult(
      missingElements.length === 0,
      elements,
      missingElements,
      warnings
    );
  }

  async getNextPhase(context: PhaseContext): Promise<PhoenixPhase | null> {
    const validation = await this.validateReadiness(context);
    return validation.isValid ? 'diagnostic_interview' : null;
  }

  protected getPhaseKeywords(): string[] {
    return [
      'problem', 'challenge', 'issue', 'decision', 'choice',
      'urgent', 'important', 'critical', 'deadline', 'timeline',
      'context', 'background', 'situation', 'stakeholder'
    ];
  }

  private async extractProblemElements(
    message: string,
    existingBrief: ProblemBriefContent | null,
    _context: PhaseContext
  ): Promise<ProblemBriefContent> {
    const brief: ProblemBriefContent = existingBrief || {
      problemStatement: '',
      context: '',
      stakeholders: [],
      constraints: [],
      successCriteria: [],
      urgency: 'short-term',
      complexity: 'moderate',
      decisionType: 'hybrid',
      keyInsights: [],
    };
    
    if (!brief.problemStatement && message.length > 50) {
      brief.problemStatement = message;
    }
    
    if (message.toLowerCase().includes('context') || 
        message.toLowerCase().includes('background')) {
      brief.context = message;
    }
    
    const urgencyKeywords = {
      'immediate': ['urgent', 'asap', 'now', 'today', 'emergency'],
      'short-term': ['week', 'soon', 'quickly', 'short'],
      'long-term': ['month', 'quarter', 'year', 'future', 'planning'],
    };
    
    for (const [urgency, keywords] of Object.entries(urgencyKeywords)) {
      if (keywords.some(k => message.toLowerCase().includes(k))) {
        brief.urgency = urgency as 'immediate' | 'short-term' | 'long-term';
        break;
      }
    }
    
    const stakeholderMatches = message.match(/(?:stakeholder|involve|team|department|customer|user|manager|executive|board)/gi);
    if (stakeholderMatches) {
      brief.stakeholders = [...new Set([...brief.stakeholders, ...stakeholderMatches])];
    }
    
    return brief;
  }

  private generateInitialResponse(brief: ProblemBriefContent): string {
    return `I understand you're facing a decision. Let me help you clarify and structure this problem.

From what you've shared, I can see this involves: ${brief.problemStatement || 'a decision that needs to be made'}.

To better understand your situation, could you tell me:
- What's the broader context or background of this decision?
- Who are the key stakeholders affected?
- What constraints are you working within?
- How urgent is this decision?`;
  }

  private generateFollowUpResponse(
    brief: ProblemBriefContent,
    validation: ValidationResult
  ): string {
    const missing = validation.missingElements || [];
    
    if (missing.length === 0) {
      return `Great! I have a clear understanding of your problem:

**Problem:** ${brief.problemStatement}
**Context:** ${brief.context}
**Urgency:** ${brief.urgency}
${brief.stakeholders.length > 0 ? `**Stakeholders:** ${brief.stakeholders.join(', ')}` : ''}

Let's move on to explore this problem in more depth through our diagnostic interview.`;
    }
    
    const questions = [];
    if (missing.includes('context')) {
      questions.push('What\'s the broader context or background?');
    }
    if (missing.includes('urgency')) {
      questions.push('How urgent is this decision (immediate, weeks, months)?');
    }
    
    return `Thank you for that information. To complete our problem intake, I need to understand:

${questions.map(q => `- ${q}`).join('\n')}

This will help me better guide you through the decision-making process.`;
  }
}