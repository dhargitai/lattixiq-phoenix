import { BasePhaseHandler } from './base-handler';
import type {
  PhoenixPhase,
  PhaseContext,
  PhaseResponse,
  ValidationResult,
  FrameworkApplicationNotesContent,
  FrameworkSelection,
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
    const selectedFrameworks = this.getSelectedFrameworks(context);
    
    const updatedNotes = this.updateApplicationNotes(message, existingNotes, context);
    const validation = await this.validateReadiness(context);
    
    const responseContent = this.generateApplicationResponse(updatedNotes, validation, messageCount, selectedFrameworks);
    
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

  async validateReadiness(_context: PhaseContext): Promise<ValidationResult> {
    const notes = this.getArtifactContent(_context, 'framework_application_notes') as FrameworkApplicationNotesContent;
    const messageCount = this.countUserMessages(_context);
    
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

  async getNextPhase(_context: PhaseContext): Promise<PhoenixPhase | null> {
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
    // Get selected frameworks from phase data or previous context
    const selectedFrameworks = this.getSelectedFrameworks(context);
    
    const notes: FrameworkApplicationNotesContent = existingNotes || {
      frameworksApplied: selectedFrameworks.map(framework => ({
        frameworkId: framework.knowledgeContentId,
        frameworkName: framework.title || 'Unknown Framework',
        application: framework.selectionReason || 'Framework application in progress',
        insights: [],
        score: framework.relevanceScore,
      })),
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
    messageCount: number,
    selectedFrameworks: FrameworkSelection[] = []
  ): string {
    if (validation.isValid) {
      const frameworkNames = notes.frameworksApplied.map(f => f.frameworkName).join(', ');
      return `Excellent work applying the frameworks! Here's what we've discovered using ${frameworkNames}:

**Key Insights:**
${notes.insights.slice(0, 3).map(i => `- ${i}`).join('\n')}

**Decisions Made:**
${notes.decisions.slice(0, 3).map(d => `- ${d}`).join('\n')}

**Next Steps:**
${notes.nextSteps.slice(0, 3).map(s => `- ${s}`).join('\n')}

Now let's create your commitment memo to formalize this decision.`;
    }
    
    return this.generateFrameworkPrompts(selectedFrameworks, messageCount);
  }

  /**
   * Get selected frameworks from context
   */
  private getSelectedFrameworks(context: PhaseContext): FrameworkSelection[] {
    // First try to get from current phase data
    if (context.phaseData?.frameworkSelections) {
      return context.phaseData.frameworkSelections as FrameworkSelection[];
    }

    // Try to get from session artifacts or previous phases
    // Look for framework selections in recent messages or artifacts
    const recentMessages = context.messages
      .filter(m => m.role === 'assistant')
      .slice(-3); // Get last 3 assistant messages

    for (const message of recentMessages) {
      if (message.metadata?.frameworkSelections) {
        return message.metadata.frameworkSelections as FrameworkSelection[];
      }
    }

    // Fallback: return empty array if no frameworks found
    return [];
  }

  /**
   * Generate framework-specific application prompts
   */
  private generateFrameworkPrompts(selectedFrameworks: FrameworkSelection[], messageCount: number): string {
    if (selectedFrameworks.length === 0) {
      return this.generateGenericPrompts(messageCount);
    }

    const framework = selectedFrameworks[messageCount % selectedFrameworks.length];
    const frameworkName = framework.title || 'the selected framework';

    const frameworkPrompts = [
      `Let's apply ${frameworkName}. What are the key components when you break this problem down using this approach?`,
      `Using ${frameworkName}, what insights are emerging about your situation?`,
      `How does ${frameworkName} help clarify the decision you need to make?`,
      `Based on your analysis with ${frameworkName}, what are your next steps?`
    ];

    return frameworkPrompts[Math.min(messageCount, frameworkPrompts.length - 1)];
  }

  /**
   * Generate generic prompts when no specific frameworks are available
   */
  private generateGenericPrompts(messageCount: number): string {
    const prompts = [
      'What are the fundamental truths about this situation?',
      'What insights are emerging as you think through this problem?',
      'What specific decision or direction is becoming clear?',
      'What are the immediate next steps you need to take?'
    ];
    
    return prompts[Math.min(messageCount, prompts.length - 1)];
  }
}