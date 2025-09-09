import type {
  PhoenixPhase,
  PhaseHandler,
  PhaseContext,
  PhaseResponse,
  ValidationResult,
  ValidationElement,
} from '../types';

export abstract class BasePhaseHandler implements PhaseHandler {
  abstract readonly phase: PhoenixPhase;
  protected readonly defaultMaxMessages = 10;
  protected readonly defaultMinMessages = 2;

  abstract processMessage(
    message: string,
    context: PhaseContext
  ): Promise<PhaseResponse>;

  abstract validateReadiness(
    context: PhaseContext
  ): Promise<ValidationResult>;

  abstract getNextPhase(
    context: PhaseContext
  ): Promise<PhoenixPhase | null>;

  protected createResponse(
    content: string,
    options: Partial<PhaseResponse> = {}
  ): PhaseResponse {
    return {
      content,
      shouldTransition: false,
      ...options,
    };
  }

  protected createValidationResult(
    isValid: boolean,
    elements: ValidationElement[],
    missingElements?: string[],
    warnings?: string[]
  ): ValidationResult {
    const score = elements.length > 0
      ? elements.reduce((sum, e) => sum + e.score, 0) / elements.length
      : 0;

    return {
      isValid,
      isReady: isValid,
      score,
      requiredElements: elements,
      elements: elements,
      missingElements,
      warnings,
    };
  }

  protected createElement(
    name: string,
    present: boolean,
    required: boolean = true,
    details?: string
  ): ValidationElement {
    return {
      name,
      required,
      present,
      isPresent: present,
      score: present ? 1.0 : 0.0,
      details: details || (present ? 'Element found' : 'Element missing'),
    };
  }

  protected getPhaseNumber(phase: PhoenixPhase): number {
    const phaseOrder: PhoenixPhase[] = [
      'problem_intake',
      'diagnostic_interview', 
      'type_classification',
      'framework_selection',
      'framework_application',
      'commitment_memo_generation'
    ];
    return phaseOrder.indexOf(phase) + 1;
  }

  protected countUserMessages(context: PhaseContext): number {
    return context.messages.filter(
      m => m.phaseNumber === this.getPhaseNumber(this.phase) && m.role === 'user'
    ).length;
  }

  protected hasArtifact(
    context: PhaseContext,
    artifactType: string
  ): boolean {
    return context.artifacts.some(
      a => a.artifactType === artifactType && 
           a.phaseCreated === this.phase && 
           a.isCurrent
    );
  }

  protected getArtifactContent(
    context: PhaseContext,
    artifactType: string
  ): any | null {
    const artifact = context.artifacts.find(
      a => a.artifactType === artifactType && 
           a.phaseCreated === this.phase && 
           a.isCurrent
    );
    
    return artifact ? artifact.content : null;
  }

  protected extractFromContent(
    content: any,
    path: string
  ): any {
    const parts = path.split('.');
    let current = content;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }
    
    return current;
  }

  protected isArrayWithContent(value: any): boolean {
    return Array.isArray(value) && value.length > 0;
  }

  protected isNonEmptyString(value: any): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }

  protected analyzeMessageContent(
    messages: string[]
  ): {
    hasSubstantiveContent: boolean;
    averageLength: number;
    keywordsFound: string[];
  } {
    const keywords = this.getPhaseKeywords();
    const foundKeywords = new Set<string>();
    let totalLength = 0;
    
    messages.forEach(msg => {
      totalLength += msg.length;
      keywords.forEach(keyword => {
        if (msg.toLowerCase().includes(keyword.toLowerCase())) {
          foundKeywords.add(keyword);
        }
      });
    });
    
    return {
      hasSubstantiveContent: totalLength > 100 && foundKeywords.size > 0,
      averageLength: messages.length > 0 ? totalLength / messages.length : 0,
      keywordsFound: Array.from(foundKeywords),
    };
  }

  protected abstract getPhaseKeywords(): string[];
}