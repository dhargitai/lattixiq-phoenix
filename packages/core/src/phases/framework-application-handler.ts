import { BasePhaseHandler } from './base-handler';
import type {
  PhoenixPhase,
  PhaseContext,
  PhaseResponse,
  ValidationResult,
  FrameworkApplicationNotesContent,
  SessionArtifact,
} from '../types';

export class FrameworkApplicationHandler extends BasePhaseHandler {
  readonly phase: PhoenixPhase = 'framework_application';

  async processMessage(
    message: string,
    context: PhaseContext
  ): Promise<PhaseResponse> {
    const messageCount = this.countUserMessages(context);
    const existingNotes = this.getArtifactContent(context, 'framework_application_notes') as FrameworkApplicationNotesContent;
    
    const updatedNotes = this.updateApplicationNotes(message, existingNotes, context);
    const validation = await this.validateReadiness(context);
    
    const responseContent = this.generateApplicationResponse(updatedNotes, validation, messageCount);
    
    const artifact: Partial<SessionArtifact> = {
      artifactType: 'framework_application_notes',
      content: updatedNotes,
      phaseCreated: this.phase,
      version: existingNotes ? 2 : 1,
      isCurrent: true,
    };
    
    return this.createResponse(responseContent, {
      shouldTransition: validation.isValid && messageCount >= 3,
      nextPhase: validation.isValid ? 'commitment_memo_generation' : undefined,
      artifacts: [artifact],
    });
  }

  async validateReadiness(context: PhaseContext): Promise<ValidationResult> {
    const notes = this.getArtifactContent(context, 'framework_application_notes') as FrameworkApplicationNotesContent;
    const messageCount = this.countUserMessages(context);
    
    const elements = [
      this.createElement('framework_insights', this.isArrayWithContent(notes?.insights)),
      this.createElement('decisions', this.isArrayWithContent(notes?.decisions)),
      this.createElement('next_steps', this.isArrayWithContent(notes?.nextSteps)),
      this.createElement('minimum_messages', messageCount >= 3, true, `${messageCount}/3 messages`),
    ];
    
    const missingElements = elements
      .filter(e => e.required && !e.present)
      .map(e => e.name);
    
    return this.createValidationResult(
      missingElements.length === 0,
      elements,
      missingElements
    );
  }

  getNextPhase(context: PhaseContext): PhoenixPhase | null {
    return 'commitment_memo_generation';
  }

  protected getPhaseKeywords(): string[] {
    return ['apply', 'insight', 'decision', 'action', 'step', 'plan', 'approach'];
  }

  private updateApplicationNotes(
    message: string,
    existingNotes: FrameworkApplicationNotesContent | null,
    context: PhaseContext
  ): FrameworkApplicationNotesContent {
    const notes: FrameworkApplicationNotesContent = existingNotes || {
      frameworksApplied: [
        {
          frameworkId: 'mock-1',
          frameworkName: 'First Principles Thinking',
          application: 'Breaking down the problem to core components',
          insights: [],
          score: 0.85,
        }
      ],
      insights: [],
      decisions: [],
      nextSteps: [],
    };
    
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('insight') || lowerMessage.includes('realize') || 
        lowerMessage.includes('understand')) {
      notes.insights.push(message.substring(0, 200));
    }
    
    if (lowerMessage.includes('decide') || lowerMessage.includes('choose') || 
        lowerMessage.includes('will')) {
      notes.decisions.push(message.substring(0, 200));
    }
    
    if (lowerMessage.includes('next') || lowerMessage.includes('step') || 
        lowerMessage.includes('action')) {
      notes.nextSteps.push(message.substring(0, 200));
    }
    
    return notes;
  }

  private generateApplicationResponse(
    notes: FrameworkApplicationNotesContent,
    validation: ValidationResult,
    messageCount: number
  ): string {
    if (validation.isValid) {
      return `Excellent work applying the frameworks! Here's what we've discovered:

**Key Insights:**
${notes.insights.slice(0, 3).map(i => `- ${i}`).join('\n')}

**Decisions Made:**
${notes.decisions.slice(0, 3).map(d => `- ${d}`).join('\n')}

**Next Steps:**
${notes.nextSteps.slice(0, 3).map(s => `- ${s}`).join('\n')}

Now let's create your commitment memo to formalize this decision.`;
    }
    
    const prompts = [
      'Using First Principles, what are the fundamental truths about this situation?',
      'What insights emerge when you break this down to basics?',
      'What specific decision or direction is becoming clear?',
      'What are the immediate next steps you need to take?'
    ];
    
    return prompts[Math.min(messageCount, prompts.length - 1)];
  }
}