/**
 * Phoenix Orchestrator - Main coordination engine for Phoenix Framework sessions
 * 
 * Orchestrates all services in proper sequence, manages phase transitions,
 * handles framework selection, tracks performance, and coordinates conversation branching.
 * 
 * Adapted from action-roadmap demo patterns for Phoenix Framework architecture.
 */

import type {
  IPhoenixOrchestrator,
  ISessionManager,
  IFrameworkSelector,
  IAIRouter,
  PhoenixPhase,
  PhaseContext,
  Session,
  CoreMessage,
  SessionArtifact,
  FrameworkSelection,
  PhaseTransition,
  AIModelType,
  PerformanceMetrics,
  OrchestrationResult,
  OrchestrationOptions,
} from '../types';
// Services are now injected via constructor
import { PhaseManager } from './phase-manager';
import { PhoenixError, ErrorCode } from '../utils/errors';
import { PerformanceTracker } from '../utils/performance-tracker';

// Phase handlers
import { ProblemIntakeHandler } from '../phases/problem-intake-handler';
import { DiagnosticInterviewHandler } from '../phases/diagnostic-interview-handler';
import { TypeClassificationHandler } from '../phases/type-classification-handler';
import { FrameworkSelectionHandler } from '../phases/framework-selection-handler';
import { FrameworkApplicationHandler } from '../phases/framework-application-handler';
import { CommitmentMemoHandler } from '../phases/commitment-memo-handler';
import type { PhaseHandler } from '../types';

/**
 * Message processing configuration
 */
export interface MessageProcessingConfig {
  /** Maximum processing time in milliseconds */
  maxProcessingTimeMs?: number;
  /** Enable framework selection during processing */
  enableFrameworkSelection?: boolean;
  /** Model override for this message */
  modelOverride?: AIModelType;
  /** Enable conversation branching */
  enableBranching?: boolean;
  /** Parent message ID for branching */
  parentMessageId?: string;
}

/**
 * Phoenix Orchestrator Implementation
 */
export class PhoenixOrchestrator implements IPhoenixOrchestrator {
  private sessionManager: ISessionManager;
  private frameworkSelector: IFrameworkSelector;
  private aiRouter: IAIRouter;
  private phaseManager: PhaseManager;
  private performanceTracker: PerformanceTracker;

  // Service health status cache (unused for now)
  // private healthStatus: Map<string, { healthy: boolean; lastCheck: Date }> = new Map();
  // private readonly healthCheckIntervalMs = 300000; // 5 minutes

  constructor(
    sessionManager?: ISessionManager,
    frameworkSelector?: IFrameworkSelector,
    aiRouter?: IAIRouter,
    phaseManager?: PhaseManager
  ) {
    // For now, we require dependencies to be injected since they need configuration
    if (!sessionManager) {
      throw new Error('SessionManager must be provided');
    }
    if (!frameworkSelector) {
      throw new Error('FrameworkSelector must be provided');
    }
    if (!aiRouter) {
      throw new Error('AIRouter must be provided');
    }
    if (!phaseManager) {
      throw new Error('PhaseManager must be provided');
    }
    
    this.sessionManager = sessionManager;
    this.frameworkSelector = frameworkSelector;
    this.aiRouter = aiRouter;
    this.phaseManager = phaseManager;
    this.performanceTracker = new PerformanceTracker();
  }

  /**
   * Process incoming message through appropriate phase handler
   */
  async processMessage(
    sessionId: string,
    message: string,
    config: MessageProcessingConfig = {}
  ): Promise<OrchestrationResult> {
    const operationId = `orchestrate-${sessionId}-${Date.now()}`;
    this.performanceTracker.startOperation(operationId, { operation: 'message_processing' });

    try {
      // Set processing timeout
      const timeoutMs = config.maxProcessingTimeMs || 180000; // 3 minutes default
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new PhoenixError(
          ErrorCode.TIMEOUT_ERROR,
          'Message processing timeout exceeded',
          { sessionId, operation: 'message_processing', details: { timeoutMs } }
        )), timeoutMs);
      });

      // Process message with timeout
      const result = await Promise.race([
        this.processMessageInternal(sessionId, message, config),
        timeoutPromise,
      ]);

      this.performanceTracker.endOperation(operationId);
      return result;
    } catch (error) {
      this.performanceTracker.endOperation(operationId, error as Error);
      throw error;
    }
  }

  /**
   * Internal message processing logic
   */
  private async processMessageInternal(
    sessionId: string,
    message: string,
    config: MessageProcessingConfig
  ): Promise<OrchestrationResult> {
    // Step 1: Load or validate session
    this.performanceTracker.startOperation('session_loading');
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new PhoenixError(
        ErrorCode.SESSION_NOT_FOUND,
        `Session not found: ${sessionId}`,
        { sessionId },
        true,
        ['Create a new session', 'Check the session ID']
      );
    }
    this.performanceTracker.endOperation('session_loading');

    // Step 2: Add message to conversation
    this.performanceTracker.startOperation('message_storage');
    const messageResult = await this.sessionManager.addMessage(sessionId, {
      sessionId,
      role: 'user',
      content: message,
      parentMessageId: config.parentMessageId,
      phaseNumber: this.getPhaseNumber(session.currentPhase),
      isActiveBranch: true,
      metadata: {},
      performanceMetrics: {},
    });
    const messageId = messageResult.id;
    this.performanceTracker.endOperation('message_storage');

    // Step 3: Get phase context
    const phaseContext = await this.buildPhaseContext(session, messageId);

    // Step 4: Check if phase transition is needed
    this.performanceTracker.startOperation('phase_validation');
    const validationResult = await this.phaseManager.validatePhaseReadiness(session, phaseContext);
    
    let shouldTransition = false;
    let nextPhase: PhoenixPhase | null = null;
    
    if (validationResult.isValid) {
      const nextPhases = this.phaseManager.getNextPhases(session.currentPhase);
      nextPhase = nextPhases.length > 0 ? nextPhases[0] : null;
      shouldTransition = !!nextPhase;
    }
    this.performanceTracker.endOperation('phase_validation');

    // Step 5: Handle framework selection if needed
    let frameworkSelections: FrameworkSelection[] = [];
    if (config.enableFrameworkSelection !== false && 
        (session.currentPhase === 'framework_selection' || shouldTransition)) {
      this.performanceTracker.startOperation('framework_selection');
      try {
        frameworkSelections = await this.handleFrameworkSelection(
          session,
          message,
          phaseContext
        );
      } catch (error) {
        // Framework selection failures are non-fatal - log and continue
        console.warn(`Framework selection failed for session ${sessionId}:`, error);
      }
      this.performanceTracker.endOperation('framework_selection');
    }

    // Step 6: Process message through current phase handler
    this.performanceTracker.startOperation('phase_processing');
    const phaseHandler = await this.getPhaseHandler(session.currentPhase);
    const phaseResponse = await phaseHandler.processMessage(
      message,
      phaseContext
    );
    
    // Merge any framework selections from phase response
    if (phaseResponse.frameworkSelections) {
      // Filter out partial selections that don't have required fields
      const validSelections = phaseResponse.frameworkSelections.filter(
        (selection): selection is FrameworkSelection => 
          selection.id !== undefined && selection.title !== undefined
      );
      frameworkSelections.push(...validSelections);
    }
    this.performanceTracker.endOperation('phase_processing');

    // Step 7: Use phase response content or generate AI response if needed
    this.performanceTracker.startOperation('ai_response');
    let aiResponse;
    
    if (phaseResponse.content) {
      // Use the content generated by the phase handler
      aiResponse = {
        content: phaseResponse.content,
        model: config.modelOverride || this.getDefaultModelForPhase(session.currentPhase),
        metrics: {}
      };
    } else {
      // Fallback to AI generation if no content from phase handler
      aiResponse = await this.generateAIResponse(
        session,
        phaseContext,
        frameworkSelections,
        message,
        config.modelOverride
      );
    }
    this.performanceTracker.endOperation('ai_response');

    // Step 8: Store AI response message
    const responseMessageResult = await this.sessionManager.addMessage(sessionId, {
      sessionId,
      role: 'assistant',
      content: aiResponse.content,
      modelUsed: aiResponse.model as AIModelType,
      parentMessageId: messageId,
      phaseNumber: this.getPhaseNumber(session.currentPhase),
      isActiveBranch: true,
      metadata: {},
      performanceMetrics: aiResponse.metrics || {},
    });
    const responseMessageId = responseMessageResult.id;

    // Step 9: Handle phase transition if needed
    let transitionResult: PhaseTransition | undefined;
    
    // Check if phase response indicates a transition should happen
    const shouldTransitionFromResponse = phaseResponse.shouldTransition && phaseResponse.nextPhase;
    const finalNextPhase = phaseResponse.nextPhase || nextPhase;
    
    if ((shouldTransition && nextPhase) || shouldTransitionFromResponse) {
      this.performanceTracker.startOperation('phase_transition');
      transitionResult = await this.handlePhaseTransition(
        session,
        finalNextPhase!,
        validationResult,
        responseMessageId
      );
      this.performanceTracker.endOperation('phase_transition');
    }

    // Step 10: Update session artifacts if needed
    if (phaseResponse.artifacts && phaseResponse.artifacts.length > 0) {
      const validArtifacts = phaseResponse.artifacts.filter(
        (artifact): artifact is SessionArtifact => 
          artifact.id !== undefined && artifact.sessionId !== undefined
      );
      if (validArtifacts.length > 0) {
        this.performanceTracker.startOperation('artifact_storage');
        await this.storeSessionArtifacts(sessionId, validArtifacts);
        this.performanceTracker.endOperation('artifact_storage');
      }
    }

    // Step 11: Compile orchestration result
    const result: OrchestrationResult = {
      sessionId,
      messageId: responseMessageId,
      content: aiResponse.content,
      currentPhase: transitionResult?.toPhase || session.currentPhase,
      previousPhase: transitionResult ? session.currentPhase : undefined,
      phaseTransition: transitionResult,
      frameworkSelections,
      artifacts: (phaseResponse.artifacts?.filter(
        (artifact): artifact is SessionArtifact => 
          artifact.id !== undefined && artifact.sessionId !== undefined
      ) || []),
      metrics: this.compileMetrics(aiResponse.metrics),
      conversationBranch: config.parentMessageId ? {
        parentMessageId: config.parentMessageId,
        branchMessageId: messageId,
      } : undefined,
    };

    return result;
  }

  /**
   * Handle conversation branching from a specific message
   */
  async branchConversation(
    sessionId: string,
    parentMessageId: string,
    newMessage: string,
    config: Omit<MessageProcessingConfig, 'parentMessageId'> = {}
  ): Promise<OrchestrationResult> {
    // Create branch using session manager
    const branchResult = await this.sessionManager.branchFromMessage(
      sessionId,
      parentMessageId
    );

    // Process new message in the branched context using the branch result
    console.debug('Branch created:', branchResult);
    return this.processMessage(sessionId, newMessage, {
      ...config,
      parentMessageId: parentMessageId,
      enableBranching: true,
    });
  }

  /**
   * Create a new decision sprint session
   */
  async createSession(
    userId: string,
    options: OrchestrationOptions = {}
  ): Promise<Session> {
    this.performanceTracker.startOperation('session_creation');
    
    try {
      const session = await this.sessionManager.createSession(userId, {
        enableConversationBranching: options.enableConversationBranching ?? true,
        modelPreferences: options.modelPreferences || {
          preferredModel: 'gemini-2.5-pro',
          fallbackModel: 'gpt-4.1',
        },
        performanceTracking: options.performanceTracking ?? true,
      });

      this.performanceTracker.endOperation('session_creation');
      return session;
    } catch (error) {
      this.performanceTracker.endOperation('session_creation', error as Error);
      throw error;
    }
  }

  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return {
      ...this.performanceTracker.getMetrics(),
      ...this.aiRouter.getPerformanceMetrics(),
    };
  }

  /**
   * Health check for all orchestrator dependencies
   */
  async healthCheck(): Promise<{
    overall: boolean;
    services: Record<string, boolean>;
    errors: string[];
  }> {
    const errors: string[] = [];
    const services: Record<string, boolean> = {};

    // Check session manager
    try {
      const sessionHealth = await this.sessionManager.healthCheck();
      services.sessionManager = sessionHealth.available;
      if (!sessionHealth.available && sessionHealth.error) {
        errors.push(`SessionManager: ${sessionHealth.error}`);
      }
    } catch (error) {
      services.sessionManager = false;
      errors.push(`SessionManager: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Check framework selector
    try {
      const frameworkHealth = await this.frameworkSelector.healthCheck();
      services.frameworkSelector = frameworkHealth.available;
      if (!frameworkHealth.available && frameworkHealth.error) {
        errors.push(`FrameworkSelector: ${frameworkHealth.error}`);
      }
    } catch (error) {
      services.frameworkSelector = false;
      errors.push(`FrameworkSelector: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Check AI router
    try {
      const aiHealth = await this.aiRouter.healthCheck();
      services.aiRouter = aiHealth.openai && aiHealth.google;
      if (!aiHealth.openai) errors.push('AIRouter: OpenAI not available');
      if (!aiHealth.google) errors.push('AIRouter: Google AI not available');
      errors.push(...aiHealth.errors);
    } catch (error) {
      services.aiRouter = false;
      errors.push(`AIRouter: ${error instanceof Error ? error.message : String(error)}`);
    }

    const overall = Object.values(services).every(status => status);

    return { overall, services, errors };
  }

  /**
   * Build phase context with current session state
   */
  private async buildPhaseContext(session: Session, currentMessageId: string): Promise<PhaseContext> {
    // Get conversation messages
    const messages = await this.sessionManager.getConversationMessages(session.id, currentMessageId);
    
    // Get current artifacts
    const artifacts = await this.sessionManager.getSessionArtifacts(session.id);
    
    return {
      sessionId: session.id,
      userId: session.userId,
      currentPhase: session.currentPhase,
      phaseState: session.phaseStates?.[session.currentPhase] || {},
      phaseData: session.phaseStates?.[session.currentPhase] || {},
      messages,
      artifacts: artifacts.filter(a => a.isCurrent),
      config: session.config,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  /**
   * Handle framework selection for current problem context
   */
  private async handleFrameworkSelection(
    session: Session,
    message: string,
    phaseContext: PhaseContext
  ): Promise<FrameworkSelection[]> {
    try {
      // Extract problem statement from conversation history
      const problemStatement = this.extractProblemStatement(phaseContext.messages);
      
      if (!problemStatement) {
        // Use current message as problem context
        return this.frameworkSelector.selectFrameworks(
          message,
          session.id,
          {
            maxFrameworks: 3,
            language: 'English',
            includeSuperModels: true,
            targetPersona: ['founder'], // Default to founder persona
          }
        );
      }

      return this.frameworkSelector.selectFrameworks(
        problemStatement,
        session.id,
        {
          maxFrameworks: 5,
          language: 'English',
          includeSuperModels: true,
          targetPersona: ['founder'],
        }
      );
    } catch (error) {
      throw new PhoenixError(
        ErrorCode.FRAMEWORK_SELECTION_FAILED,
        `Framework selection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { sessionId: session.id, details: { message } },
        true,
        ['Try again', 'Continue without framework selection']
      );
    }
  }

  /**
   * Generate AI response using appropriate model and context
   */
  private async generateAIResponse(
    session: Session,
    phaseContext: PhaseContext,
    frameworkSelections: FrameworkSelection[],
    userMessage: string,
    modelOverride?: AIModelType
  ): Promise<{ content: string; model: string; metrics: PerformanceMetrics }> {
    try {
      // Select appropriate model based on phase
      const taskType = this.getTaskTypeForPhase(session.currentPhase);
      const model = this.aiRouter.selectModel(
        taskType,
        modelOverride,
        session.config.modelPreferences
      );

      // Assemble context for AI prompt
      const context = this.aiRouter.assembleContext(
        phaseContext.messages,
        phaseContext.artifacts,
        frameworkSelections,
        phaseContext
      );

      // Add user message to context
      const messages = [
        { role: 'system' as const, content: context.systemPrompt },
        ...context.contextMessages,
        { role: 'user' as const, content: userMessage },
      ];

      // Generate AI response
      const response = await this.aiRouter.generateResponse(
        messages.map(m => `${m.role}: ${m.content}`).join('\n\n'),
        model,
        phaseContext
      );

      return {
        content: response.content,
        model: response.model,
        metrics: response.metrics,
      };
    } catch (error) {
      throw new PhoenixError(
        ErrorCode.AI_GENERATION_ERROR,
        `AI response generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { sessionId: session.id, phase: session.currentPhase },
        true,
        ['Try a different model', 'Simplify the input', 'Check API keys']
      );
    }
  }

  /**
   * Handle phase transition logic
   */
  private async handlePhaseTransition(
    session: Session,
    nextPhase: PhoenixPhase,
    validationResult: any,
    triggeringMessageId: string
  ): Promise<PhaseTransition> {
    try {
      const transition = await this.phaseManager.transitionToPhase(
        session.id,
        session.currentPhase,
        nextPhase,
        validationResult,
        `User interaction completed phase requirements`,
        triggeringMessageId
      );

      // Update session with new phase
      await this.sessionManager.updateSession(session.id, {
        currentPhase: nextPhase,
        phaseStates: {
          ...session.phaseStates,
          [nextPhase]: {},
        },
      });

      return transition;
    } catch (error) {
      throw new PhoenixError(
        ErrorCode.PHASE_VALIDATION_FAILED,
        `Phase transition failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { 
          sessionId: session.id,
          phase: session.currentPhase,
          details: { fromPhase: session.currentPhase, toPhase: nextPhase },
        },
        true,
        ['Try again', 'Continue in current phase']
      );
    }
  }

  /**
   * Store session artifacts from phase processing
   */
  private async storeSessionArtifacts(sessionId: string, artifacts: SessionArtifact[]): Promise<void> {
    try {
      for (const artifact of artifacts) {
        await this.sessionManager.saveArtifact(sessionId, artifact);
      }
    } catch (error) {
      throw new PhoenixError(
        ErrorCode.DATABASE_ERROR,
        `Failed to store session artifacts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { sessionId, details: { artifactCount: artifacts.length } },
        true,
        ['Try again', 'Continue without saving artifacts']
      );
    }
  }

  /**
   * Extract problem statement from conversation messages
   */
  private extractProblemStatement(messages: CoreMessage[]): string | null {
    // Look for the first substantial user message that looks like a problem description
    const userMessages = messages.filter(m => m.role === 'user');
    
    for (const message of userMessages) {
      if (message.content.length > 50 && 
          (message.content.includes('problem') ||
           message.content.includes('challenge') ||
           message.content.includes('decision') ||
           message.content.includes('struggling'))) {
        return message.content;
      }
    }

    // Fallback to first user message if it's substantial
    const firstUserMessage = userMessages[0];
    return firstUserMessage?.content.length > 30 ? firstUserMessage.content : null;
  }

  /**
   * Get task type for AI model selection based on phase
   */
  private getTaskTypeForPhase(phase: PhoenixPhase): 'analysis' | 'quick_response' | 'deep_thinking' | 'framework_selection' {
    switch (phase) {
      case 'problem_intake':
        return 'quick_response';
      case 'diagnostic_interview':
        return 'analysis';
      case 'type_classification':
        return 'analysis';
      case 'framework_selection':
        return 'framework_selection';
      case 'framework_application':
        return 'deep_thinking';
      case 'commitment_memo_generation':
        return 'deep_thinking';
      default:
        return 'analysis';
    }
  }

  /**
   * Get numeric phase number for message storage
   */
  private getPhaseNumber(phase: PhoenixPhase): number {
    const phaseNumbers: Record<PhoenixPhase, number> = {
      problem_intake: 1,
      diagnostic_interview: 2,
      type_classification: 3,
      framework_selection: 4,
      framework_application: 5,
      commitment_memo_generation: 6,
    };
    return phaseNumbers[phase] || 0;
  }

  /**
   * Get default AI model for each phase
   */
  private getDefaultModelForPhase(phase: PhoenixPhase): AIModelType {
    switch (phase) {
      case 'problem_intake':
        return 'gemini-2.5-flash'; // Quick responses for intake
      case 'diagnostic_interview':
        return 'gpt-4.1'; // Analysis for understanding problems
      case 'type_classification':
        return 'gpt-4.1'; // Analysis for classification
      case 'framework_selection':
        return 'gemini-2.5-pro'; // Deep thinking for selection
      case 'framework_application':
        return 'gemini-2.5-pro'; // Deep thinking for application
      case 'commitment_memo_generation':
        return 'gemini-2.5-pro'; // Deep thinking for final output
      default:
        return 'gpt-4.1';
    }
  }

  /**
   * Get phase handler for specific phase
   */
  private async getPhaseHandler(phase: PhoenixPhase): Promise<PhaseHandler> {
    switch (phase) {
      case 'problem_intake':
        return new ProblemIntakeHandler();
      case 'diagnostic_interview':
        return new DiagnosticInterviewHandler();
      case 'type_classification':
        return new TypeClassificationHandler();
      case 'framework_selection':
        return new FrameworkSelectionHandler();
      case 'framework_application':
        return new FrameworkApplicationHandler();
      case 'commitment_memo_generation':
        return new CommitmentMemoHandler();
      default:
        throw new PhoenixError(
          ErrorCode.VALIDATION_ERROR,
          `Unknown phase: ${phase}`,
          { context: 'PhoenixOrchestrator.getPhaseHandler' }
        );
    }
  }

  /**
   * Compile comprehensive metrics from all operations
   */
  private compileMetrics(aiMetrics: PerformanceMetrics): PerformanceMetrics {
    const orchestratorMetrics = this.performanceTracker.getMetrics();
    
    return {
      duration: orchestratorMetrics.duration,
      tokensUsed: aiMetrics.tokensUsed,
      tokensInput: aiMetrics.tokensInput,
      tokensOutput: aiMetrics.tokensOutput,
      cost: aiMetrics.cost,
      modelUsed: aiMetrics.modelUsed,
      operationId: orchestratorMetrics.operationId,
      // Include additional orchestration metrics
      ...orchestratorMetrics,
    };
  }
}