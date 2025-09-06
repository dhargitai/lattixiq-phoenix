import type {
  PhoenixPhase,
  ValidationResult,
  ValidationElement,
  Session,
  Message,
  SessionArtifact,
  PhaseTransition,
  PhaseContext,
} from '../types';

export interface PhaseDefinition {
  phase: PhoenixPhase;
  name: string;
  description: string;
  requiredElements: string[];
  nextPhases: PhoenixPhase[];
  minMessages: number;
  maxMessages: number;
  timeout?: number;
  modelPreference?: string;
}

export class PhaseManager {
  private phaseDefinitions: Map<PhoenixPhase, PhaseDefinition>;
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
    this.phaseDefinitions = this.initializePhaseDefinitions();
  }

  private initializePhaseDefinitions(): Map<PhoenixPhase, PhaseDefinition> {
    const definitions: PhaseDefinition[] = [
      {
        phase: 'problem_intake',
        name: 'Problem Intake',
        description: 'Gather initial problem statement and context',
        requiredElements: ['problem_statement', 'context', 'urgency'],
        nextPhases: ['diagnostic_interview'],
        minMessages: 2,
        maxMessages: 10,
        timeout: 600000,
        modelPreference: 'gemini-2.5-flash',
      },
      {
        phase: 'diagnostic_interview',
        name: 'Diagnostic Interview',
        description: 'Deep dive into problem details and constraints',
        requiredElements: ['stakeholders', 'constraints', 'success_criteria', 'key_findings'],
        nextPhases: ['type_classification'],
        minMessages: 4,
        maxMessages: 20,
        timeout: 900000,
        modelPreference: 'gpt-4.1',
      },
      {
        phase: 'type_classification',
        name: 'Type Classification',
        description: 'Classify decision as Type 1 or Type 2',
        requiredElements: ['decision_type', 'confidence', 'reasoning'],
        nextPhases: ['framework_selection'],
        minMessages: 2,
        maxMessages: 8,
        timeout: 300000,
        modelPreference: 'gpt-4.1',
      },
      {
        phase: 'framework_selection',
        name: 'Framework Selection',
        description: 'Select relevant frameworks based on problem',
        requiredElements: ['frameworks_selected', 'relevance_scores'],
        nextPhases: ['framework_application'],
        minMessages: 1,
        maxMessages: 5,
        timeout: 300000,
        modelPreference: 'gemini-2.5-pro',
      },
      {
        phase: 'framework_application',
        name: 'Framework Application',
        description: 'Apply selected frameworks to the problem',
        requiredElements: ['framework_insights', 'decisions', 'next_steps'],
        nextPhases: ['commitment_memo_generation'],
        minMessages: 3,
        maxMessages: 15,
        timeout: 1200000,
        modelPreference: 'gemini-2.5-pro',
      },
      {
        phase: 'commitment_memo_generation',
        name: 'Commitment Memo Generation',
        description: 'Generate final commitment memo with decision and plan',
        requiredElements: ['decision', 'rationale', 'micro_bet', 'first_domino', 'success_metrics'],
        nextPhases: [],
        minMessages: 1,
        maxMessages: 5,
        timeout: 600000,
        modelPreference: 'gpt-4.1',
      },
    ];

    const map = new Map<PhoenixPhase, PhaseDefinition>();
    definitions.forEach(def => map.set(def.phase, def));
    return map;
  }

  getPhaseDefinition(phase: PhoenixPhase): PhaseDefinition | undefined {
    return this.phaseDefinitions.get(phase);
  }

  async validatePhaseReadiness(
    session: Session,
    context: PhaseContext
  ): Promise<ValidationResult> {
    const currentPhase = session.currentPhase;
    const definition = this.phaseDefinitions.get(currentPhase);
    
    if (!definition) {
      return {
        isValid: false,
        score: 0,
        requiredElements: [],
        missingElements: ['Phase definition not found'],
        warnings: [`Unknown phase: ${currentPhase}`],
      };
    }

    const elements: ValidationElement[] = [];
    const missingElements: string[] = [];
    const warnings: string[] = [];
    let totalScore = 0;

    const phaseMessages = context.messages.filter(
      m => m.phaseNumber === currentPhase && m.role === 'user'
    );
    
    if (phaseMessages.length < definition.minMessages) {
      warnings.push(`Minimum ${definition.minMessages} messages required, found ${phaseMessages.length}`);
    }
    
    if (phaseMessages.length >= definition.maxMessages) {
      warnings.push(`Maximum ${definition.maxMessages} messages reached`);
    }

    const phaseArtifacts = context.artifacts.filter(
      a => a.phaseCreated === currentPhase && a.isCurrent
    );
    const artifactContent = this.extractArtifactContent(phaseArtifacts);

    for (const elementName of definition.requiredElements) {
      const isPresent = this.checkElementPresence(elementName, artifactContent, context);
      const elementScore = isPresent ? 1.0 : 0.0;
      
      elements.push({
        name: elementName,
        required: true,
        present: isPresent,
        score: elementScore,
        details: isPresent ? 'Element found' : 'Element missing',
      });

      if (!isPresent) {
        missingElements.push(elementName);
      }
      totalScore += elementScore;
    }

    const averageScore = elements.length > 0 
      ? totalScore / elements.length 
      : 0;
    
    const isValid = missingElements.length === 0 && 
                   phaseMessages.length >= definition.minMessages;

    return {
      isValid,
      score: averageScore,
      requiredElements: elements,
      missingElements: missingElements.length > 0 ? missingElements : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  async transitionToPhase(
    session: Session,
    toPhase: PhoenixPhase,
    validationResults: ValidationResult,
    reason?: string,
    triggeredByMessageId?: string
  ): Promise<PhaseTransition> {
    const { data, error } = await this.supabase
      .from('phase_transitions')
      .insert({
        session_id: session.id,
        from_phase: session.currentPhase,
        to_phase: toPhase,
        validation_results: validationResults,
        transition_reason: reason,
        triggered_by_message_id: triggeredByMessageId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to log phase transition: ${error.message}`);
    }

    await this.supabase
      .from('sessions')
      .update({
        current_phase: toPhase,
        phase_states: {
          ...session.phaseStates,
          [session.currentPhase]: {
            completed: true,
            completedAt: new Date().toISOString(),
            validationScore: validationResults.score,
          },
          [toPhase]: {
            started: true,
            startedAt: new Date().toISOString(),
          },
        },
      })
      .eq('id', session.id);

    return this.transformPhaseTransition(data);
  }

  canTransitionTo(fromPhase: PhoenixPhase, toPhase: PhoenixPhase): boolean {
    const definition = this.phaseDefinitions.get(fromPhase);
    if (!definition) return false;
    return definition.nextPhases.includes(toPhase);
  }

  getNextPhases(currentPhase: PhoenixPhase): PhoenixPhase[] {
    const definition = this.phaseDefinitions.get(currentPhase);
    return definition ? definition.nextPhases : [];
  }

  isTerminalPhase(phase: PhoenixPhase): boolean {
    const definition = this.phaseDefinitions.get(phase);
    return definition ? definition.nextPhases.length === 0 : false;
  }

  async rollbackPhase(
    session: Session,
    toPhase: PhoenixPhase,
    reason: string
  ): Promise<Session> {
    if (!this.canRollbackTo(session.currentPhase, toPhase)) {
      throw new Error(`Cannot rollback from ${session.currentPhase} to ${toPhase}`);
    }

    await this.supabase
      .from('phase_transitions')
      .insert({
        session_id: session.id,
        from_phase: session.currentPhase,
        to_phase: toPhase,
        validation_results: {
          isValid: true,
          score: 0,
          requiredElements: [],
          warnings: ['Phase rollback'],
        },
        transition_reason: `Rollback: ${reason}`,
      });

    const { data, error } = await this.supabase
      .from('sessions')
      .update({
        current_phase: toPhase,
        phase_states: {
          ...session.phaseStates,
          [session.currentPhase]: {
            ...session.phaseStates[session.currentPhase],
            rolledBack: true,
            rolledBackAt: new Date().toISOString(),
          },
        },
      })
      .eq('id', session.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to rollback phase: ${error.message}`);
    }

    return this.transformSession(data);
  }

  private canRollbackTo(fromPhase: PhoenixPhase, toPhase: PhoenixPhase): boolean {
    const phaseOrder = [
      'problem_intake',
      'diagnostic_interview',
      'type_classification',
      'framework_selection',
      'framework_application',
      'commitment_memo_generation',
    ] as PhoenixPhase[];

    const fromIndex = phaseOrder.indexOf(fromPhase);
    const toIndex = phaseOrder.indexOf(toPhase);
    
    return fromIndex > toIndex && toIndex >= 0;
  }

  private checkElementPresence(
    elementName: string,
    artifactContent: Record<string, any>,
    context: PhaseContext
  ): boolean {
    switch (elementName) {
      case 'problem_statement':
        return !!artifactContent.problemStatement || 
               context.messages.some(m => m.content.length > 50);
      
      case 'context':
        return !!artifactContent.context;
      
      case 'urgency':
        return !!artifactContent.urgency;
      
      case 'stakeholders':
        return Array.isArray(artifactContent.stakeholders) && 
               artifactContent.stakeholders.length > 0;
      
      case 'constraints':
        return Array.isArray(artifactContent.constraints) && 
               artifactContent.constraints.length > 0;
      
      case 'success_criteria':
        return Array.isArray(artifactContent.successCriteria) && 
               artifactContent.successCriteria.length > 0;
      
      case 'key_findings':
        return Array.isArray(artifactContent.keyFindings) && 
               artifactContent.keyFindings.length > 0;
      
      case 'decision_type':
        return !!artifactContent.decisionType;
      
      case 'confidence':
        return artifactContent.confidence !== undefined;
      
      case 'reasoning':
        return !!artifactContent.reasoning;
      
      case 'frameworks_selected':
        return context.selectedFrameworks && 
               context.selectedFrameworks.length > 0;
      
      case 'relevance_scores':
        return context.selectedFrameworks?.every(f => f.relevanceScore > 0) || false;
      
      case 'framework_insights':
        return Array.isArray(artifactContent.insights) && 
               artifactContent.insights.length > 0;
      
      case 'decisions':
        return Array.isArray(artifactContent.decisions) && 
               artifactContent.decisions.length > 0;
      
      case 'next_steps':
        return Array.isArray(artifactContent.nextSteps) && 
               artifactContent.nextSteps.length > 0;
      
      case 'decision':
        return !!artifactContent.decision;
      
      case 'rationale':
        return !!artifactContent.rationale;
      
      case 'micro_bet':
        return !!artifactContent.microBet;
      
      case 'first_domino':
        return !!artifactContent.firstDomino;
      
      case 'success_metrics':
        return Array.isArray(artifactContent.successMetrics) && 
               artifactContent.successMetrics.length > 0;
      
      default:
        return false;
    }
  }

  private extractArtifactContent(artifacts: SessionArtifact[]): Record<string, any> {
    const content: Record<string, any> = {};
    
    for (const artifact of artifacts) {
      if (artifact.content && typeof artifact.content === 'object') {
        Object.assign(content, artifact.content);
      }
    }
    
    return content;
  }

  private transformPhaseTransition(data: any): PhaseTransition {
    return {
      id: data.id,
      sessionId: data.session_id,
      fromPhase: data.from_phase,
      toPhase: data.to_phase,
      validationResults: data.validation_results,
      transitionReason: data.transition_reason,
      triggeredByMessageId: data.triggered_by_message_id,
      transitionedAt: new Date(data.transitioned_at),
    };
  }

  private transformSession(data: any): Session {
    return {
      id: data.id,
      userId: data.user_id,
      status: data.status,
      currentPhase: data.current_phase,
      phaseStates: data.phase_states,
      config: data.config,
      metadata: data.metadata,
      startedAt: new Date(data.started_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      lastActivityAt: new Date(data.last_activity_at),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}