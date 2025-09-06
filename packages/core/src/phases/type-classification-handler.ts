import { BasePhaseHandler } from './base-handler';
import type {
  PhoenixPhase,
  PhaseContext,
  PhaseResponse,
  ValidationResult,
  ClassificationResultContent,
  SessionArtifact,
} from '../types';

export class TypeClassificationHandler extends BasePhaseHandler {
  readonly phase: PhoenixPhase = 'type_classification';

  async processMessage(
    message: string,
    context: PhaseContext
  ): Promise<PhaseResponse> {
    const existingClassification = this.getArtifactContent(context, 'classification_result') as ClassificationResultContent;
    const classification = await this.classifyDecisionType(message, context, existingClassification);
    
    const validation = await this.validateReadiness(context);
    const responseContent = this.generateClassificationResponse(classification, validation);
    
    const artifact: Partial<SessionArtifact> = {
      artifactType: 'classification_result',
      content: classification,
      phaseCreated: this.phase,
      version: existingClassification ? 2 : 1,
      isCurrent: true,
    };
    
    return this.createResponse(responseContent, {
      shouldTransition: validation.isValid,
      nextPhase: validation.isValid ? 'framework_selection' : undefined,
      artifacts: [artifact],
    });
  }

  async validateReadiness(context: PhaseContext): Promise<ValidationResult> {
    const classification = this.getArtifactContent(context, 'classification_result') as ClassificationResultContent;
    
    const elements = [
      this.createElement('decision_type', !!classification?.decisionType),
      this.createElement('confidence', classification?.confidence !== undefined),
      this.createElement('reasoning', this.isNonEmptyString(classification?.reasoning)),
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
    return 'framework_selection';
  }

  protected getPhaseKeywords(): string[] {
    return ['reversible', 'consequence', 'impact', 'type 1', 'type 2', 'door'];
  }

  private async classifyDecisionType(
    message: string,
    context: PhaseContext,
    existing: ClassificationResultContent | null
  ): Promise<ClassificationResultContent> {
    const problemBrief = this.getArtifactContent(context, 'problem_brief');
    const diagnosticNotes = this.getArtifactContent(context, 'diagnostic_notes');
    
    const characteristics = this.analyzeCharacteristics(message, problemBrief, diagnosticNotes);
    const decisionType = this.determineType(characteristics);
    const confidence = this.calculateConfidence(characteristics);
    
    return {
      decisionType,
      confidence,
      reasoning: this.generateReasoning(decisionType, characteristics),
      characteristics,
    };
  }

  private analyzeCharacteristics(message: string, problemBrief: any, notes: any): any {
    const lowerMessage = message.toLowerCase();
    const allContent = `${message} ${JSON.stringify(problemBrief)} ${JSON.stringify(notes)}`.toLowerCase();
    
    return {
      reversibility: this.assessReversibility(allContent),
      consequence: this.assessConsequence(allContent),
      informationAvailability: this.assessInformation(allContent),
      timeConstraint: this.assessTimeConstraint(problemBrief?.urgency),
    };
  }

  private assessReversibility(content: string): 'high' | 'medium' | 'low' {
    if (content.includes('permanent') || content.includes('irreversible') || 
        content.includes('can\'t undo')) return 'low';
    if (content.includes('easily reverse') || content.includes('change later') || 
        content.includes('pilot')) return 'high';
    return 'medium';
  }

  private assessConsequence(content: string): 'high' | 'medium' | 'low' {
    if (content.includes('critical') || content.includes('major impact') || 
        content.includes('company-wide')) return 'high';
    if (content.includes('minor') || content.includes('limited impact') || 
        content.includes('small')) return 'low';
    return 'medium';
  }

  private assessInformation(content: string): 'complete' | 'partial' | 'limited' {
    if (content.includes('all information') || content.includes('clear data') || 
        content.includes('well understood')) return 'complete';
    if (content.includes('uncertain') || content.includes('unknown') || 
        content.includes('limited data')) return 'limited';
    return 'partial';
  }

  private assessTimeConstraint(urgency?: string): 'tight' | 'moderate' | 'flexible' {
    if (urgency === 'immediate') return 'tight';
    if (urgency === 'long-term') return 'flexible';
    return 'moderate';
  }

  private determineType(characteristics: any): '1' | '2' | 'hybrid' {
    const type2Score = 
      (characteristics.reversibility === 'low' ? 2 : 0) +
      (characteristics.consequence === 'high' ? 2 : 0) +
      (characteristics.informationAvailability === 'limited' ? 1 : 0) +
      (characteristics.timeConstraint === 'flexible' ? 1 : 0);
    
    if (type2Score >= 4) return '2';
    if (type2Score <= 1) return '1';
    return 'hybrid';
  }

  private calculateConfidence(characteristics: any): number {
    const extremeCount = Object.values(characteristics)
      .filter(v => v === 'high' || v === 'low' || v === 'complete' || v === 'limited' || v === 'tight' || v === 'flexible')
      .length;
    
    return 0.5 + (extremeCount * 0.125);
  }

  private generateReasoning(type: string, characteristics: any): string {
    const reasons = [];
    
    if (characteristics.reversibility === 'low') {
      reasons.push('This decision appears difficult to reverse once made');
    }
    if (characteristics.consequence === 'high') {
      reasons.push('The potential consequences are significant');
    }
    
    const typeExplanation = type === '1' 
      ? 'This is a Type 1 decision - reversible with limited consequences. You can move quickly and adjust as needed.'
      : type === '2'
      ? 'This is a Type 2 decision - difficult to reverse with significant consequences. Take time to gather information and consult stakeholders.'
      : 'This has characteristics of both Type 1 and Type 2 decisions. Consider breaking it into smaller, reversible experiments where possible.';
    
    return `${reasons.join('. ')}. ${typeExplanation}`;
  }

  private generateClassificationResponse(
    classification: ClassificationResultContent,
    validation: ValidationResult
  ): string {
    if (!validation.isValid) {
      return `Let me understand the nature of this decision better:

- Can this decision be easily reversed or changed later?
- What's the magnitude of impact if things go wrong?
- How much information do you currently have?

These factors will help determine the best decision-making approach.`;
    }
    
    const typeDescription = classification.decisionType === '1'
      ? 'Type 1 (Reversible Door)'
      : classification.decisionType === '2'
      ? 'Type 2 (One-Way Door)'
      : 'Hybrid';
    
    return `Based on my analysis, this is a **${typeDescription}** decision.

${classification.reasoning}

**Decision Characteristics:**
- Reversibility: ${classification.characteristics.reversibility}
- Consequence Level: ${classification.characteristics.consequence}
- Information Available: ${classification.characteristics.informationAvailability}
- Time Pressure: ${classification.characteristics.timeConstraint}

**Confidence:** ${Math.round(classification.confidence * 100)}%

Now let's select the most appropriate frameworks to guide your decision-making process.`;
  }
}