/**
 * Tests for PhoenixOrchestrator - Main coordination engine
 */

/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PhoenixOrchestrator } from './phoenix-orchestrator';
import { SessionManager } from '../services/session-manager';
import { FrameworkSelector } from '../services/framework-selector';
import { AIRouter } from '../services/ai-router';
import { PhaseManager } from './phase-manager';
import { PhoenixError, ErrorCode } from '../utils/errors';
import type {
  Session,
  CoreMessage,
  FrameworkSelection,
  PhaseTransition,
  ValidationResult,
} from '../types';

// Mock dependencies
vi.mock('../services/session-manager');
vi.mock('../services/framework-selector');
vi.mock('../services/ai-router');
vi.mock('./phase-manager');

describe('PhoenixOrchestrator', () => {
  let orchestrator: PhoenixOrchestrator;
  let mockSessionManager: vi.Mocked<SessionManager>;
  let mockFrameworkSelector: vi.Mocked<FrameworkSelector>;
  let mockAIRouter: vi.Mocked<AIRouter>;
  let mockPhaseManager: vi.Mocked<PhaseManager>;

  const mockSession: Session = {
    id: 'session-123',
    userId: 'user-123',
    status: 'active',
    currentPhase: 'problem_intake',
    phaseStates: {
      problem_intake: { step: 'initial' },
    },
    config: {
      enableConversationBranching: true,
      performanceTracking: true,
    },
    metadata: {},
    startedAt: new Date('2024-01-01T00:00:00Z'),
    lastActivityAt: new Date('2024-01-01T01:00:00Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T01:00:00Z'),
  };

  const mockMessages: CoreMessage[] = [
    {
      role: 'user',
      content: 'I need help deciding whether to pivot my startup',
    },
  ];

  const mockFrameworkSelections: FrameworkSelection[] = [
    {
      id: 'selection-1',
      sessionId: 'session-123',
      knowledgeContentId: 'framework-1',
      relevanceScore: 0.85,
      scoreBreakdown: {
        directRelevance: 0.9,
        applicabilityNow: 0.8,
        foundationalValue: 0.85,
        simplicityBonus: 0.1,
        personalRelevance: 0.8,
        complementarity: 0.9,
        overallScore: 0.85,
        reasoning: 'Highly relevant for startup pivoting decisions',
      },
      selectionRank: 1,
      selectionReason: 'Primary framework for strategic pivoting',
      wasApplied: false,
      selectedAt: new Date('2024-01-01T00:45:00Z'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mocked instances
    mockSessionManager = {
      getSession: vi.fn(),
      addMessage: vi.fn(),
      getConversationMessages: vi.fn(),
      getSessionArtifacts: vi.fn(),
      updateSession: vi.fn(),
      saveArtifact: vi.fn(),
      branchFromMessage: vi.fn(),
      createSession: vi.fn(),
      healthCheck: vi.fn(),
    } as any;

    mockFrameworkSelector = {
      selectFrameworks: vi.fn(),
      healthCheck: vi.fn(),
    } as any;

    mockAIRouter = {
      selectModel: vi.fn(),
      assembleContext: vi.fn(),
      generateResponse: vi.fn(),
      getPerformanceMetrics: vi.fn(),
      healthCheck: vi.fn(),
    } as any;

    mockPhaseManager = {
      getPhaseHandler: vi.fn(),
      transitionToPhase: vi.fn(),
    } as any;

    // Mock phase handler
    const mockPhaseHandler = {
      validateReadiness: vi.fn().mockResolvedValue({
        isReady: true,
        score: 0.8,
        elements: [],
      }),
      getNextPhase: vi.fn().mockReturnValue('diagnostic_interview'),
      processMessage: vi.fn().mockResolvedValue({
        content: 'Phase processed successfully',
        shouldTransition: true,
        nextPhase: 'diagnostic_interview',
        artifacts: [],
      }),
    };

    mockPhaseManager.getPhaseHandler.mockReturnValue(mockPhaseHandler);

    // Create orchestrator with mocked dependencies
    orchestrator = new PhoenixOrchestrator(
      mockSessionManager,
      mockFrameworkSelector,
      mockAIRouter,
      mockPhaseManager
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('processMessage', () => {
    beforeEach(() => {
      // Setup default mock responses
      mockSessionManager.getSession.mockResolvedValue(mockSession);
      mockSessionManager.addMessage.mockResolvedValue('msg-new');
      mockSessionManager.getConversationMessages.mockResolvedValue(mockMessages);
      mockSessionManager.getSessionArtifacts.mockResolvedValue([]);
      mockFrameworkSelector.selectFrameworks.mockResolvedValue(mockFrameworkSelections);
      
      mockAIRouter.selectModel.mockReturnValue({
        type: 'gemini-2.5-pro',
        provider: {} as any,
        config: {
          temperature: 0.5,
          maxTokens: 3000,
          timeoutMs: 60000,
        },
      });

      mockAIRouter.assembleContext.mockReturnValue({
        systemPrompt: 'You are the Phoenix Framework',
        contextMessages: mockMessages,
        metadata: {},
      });

      mockAIRouter.generateResponse.mockResolvedValue({
        content: 'AI response content',
        model: 'gemini-2.5-pro',
        metrics: {
          duration: 1500,
          tokensUsed: 250,
          tokensInput: 100,
          tokensOutput: 150,
          cost: 0.001,
          modelUsed: 'gemini-2.5-pro',
          operationId: 'ai-op-1',
        },
      });

      const mockValidation: ValidationResult = {
        isValid: true,
        score: 0.8,
        requiredElements: [],
      };
      
      mockPhaseManager.transitionToPhase.mockResolvedValue({
        id: 'transition-1',
        sessionId: 'session-123',
        fromPhase: 'problem_intake',
        toPhase: 'diagnostic_interview',
        validationResults: mockValidation,
        transitionReason: 'Phase completed successfully',
        triggeringMessageId: 'msg-new',
        transitionedAt: new Date(),
        newPhaseState: { step: 'initial' },
      } as PhaseTransition);
    });

    it('should successfully process a message through all orchestration steps', async () => {
      const result = await orchestrator.processMessage(
        'session-123',
        'I need help with a pivoting decision',
        { enableFrameworkSelection: true }
      );

      expect(result).toMatchObject({
        sessionId: 'session-123',
        content: 'AI response content',
        currentPhase: 'diagnostic_interview',
        previousPhase: 'problem_intake',
        frameworkSelections: mockFrameworkSelections,
      });

      expect(mockSessionManager.getSession).toHaveBeenCalledWith('session-123');
      expect(mockSessionManager.addMessage).toHaveBeenCalledTimes(2); // User + AI messages
      expect(mockFrameworkSelector.selectFrameworks).toHaveBeenCalled();
      expect(mockAIRouter.generateResponse).toHaveBeenCalled();
      expect(mockPhaseManager.transitionToPhase).toHaveBeenCalled();
    });

    it('should handle session not found error', async () => {
      mockSessionManager.getSession.mockResolvedValue(null);

      await expect(
        orchestrator.processMessage('invalid-session', 'test message')
      ).rejects.toThrow(PhoenixError);

      await expect(
        orchestrator.processMessage('invalid-session', 'test message')
      ).rejects.toThrow('Session not found');
    });

    it('should handle framework selection disabled', async () => {
      const result = await orchestrator.processMessage(
        'session-123',
        'test message',
        { enableFrameworkSelection: false }
      );

      expect(result.frameworkSelections).toEqual([]);
      expect(mockFrameworkSelector.selectFrameworks).not.toHaveBeenCalled();
    });

    it('should handle framework selection failure gracefully', async () => {
      mockFrameworkSelector.selectFrameworks.mockRejectedValue(
        new Error('Framework selection failed')
      );

      // Should continue processing despite framework selection failure
      const result = await orchestrator.processMessage(
        'session-123',
        'test message',
        { enableFrameworkSelection: true }
      );

      expect(result).toBeDefined();
      expect(result.frameworkSelections).toEqual([]);
    });

    it('should handle AI response generation failure', async () => {
      mockAIRouter.generateResponse.mockRejectedValue(
        new Error('AI generation failed')
      );

      await expect(
        orchestrator.processMessage('session-123', 'test message')
      ).rejects.toThrow(PhoenixError);
    });

    it('should apply processing timeout', async () => {
      // Make AI generation hang
      mockAIRouter.generateResponse.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 5000))
      );

      await expect(
        orchestrator.processMessage('session-123', 'test message', {
          maxProcessingTimeMs: 100,
        })
      ).rejects.toThrow('timeout');
    }, 10000);

    it('should handle model override', async () => {
      await orchestrator.processMessage(
        'session-123',
        'test message',
        { modelOverride: 'gpt-4.1' }
      );

      expect(mockAIRouter.selectModel).toHaveBeenCalledWith(
        'quick_response',
        'gpt-4.1',
        mockSession.config.modelPreferences
      );
    });

    it('should skip phase transition when not ready', async () => {
      const mockHandler = mockPhaseManager.getPhaseHandler.mock.results[0].value;
      mockHandler.validateReadiness.mockResolvedValue({
        isReady: false,
        score: 0.3,
        elements: [],
      });

      const result = await orchestrator.processMessage(
        'session-123',
        'incomplete message'
      );

      expect(result.phaseTransition).toBeUndefined();
      expect(result.currentPhase).toBe('problem_intake');
      expect(mockPhaseManager.transitionToPhase).not.toHaveBeenCalled();
    });
  });

  describe('branchConversation', () => {
    beforeEach(() => {
      mockSessionManager.getSession.mockResolvedValue(mockSession);
      mockSessionManager.branchFromMessage.mockResolvedValue({
        newBranchId: 'branch-123',
        parentMessageId: 'msg-parent',
      });
      mockSessionManager.addMessage.mockResolvedValue('msg-branch');
      mockSessionManager.getConversationMessages.mockResolvedValue(mockMessages);
      mockSessionManager.getSessionArtifacts.mockResolvedValue([]);
      
      mockAIRouter.selectModel.mockReturnValue({
        type: 'gemini-2.5-pro',
        provider: {} as any,
        config: { temperature: 0.5, maxTokens: 3000, timeoutMs: 60000 },
      });

      mockAIRouter.assembleContext.mockReturnValue({
        systemPrompt: 'You are the Phoenix Framework',
        contextMessages: mockMessages,
        metadata: {},
      });

      mockAIRouter.generateResponse.mockResolvedValue({
        content: 'Branched response',
        model: 'gemini-2.5-pro',
        metrics: {
          duration: 1000,
          tokensUsed: 200,
          tokensInput: 80,
          tokensOutput: 120,
          cost: 0.0008,
          modelUsed: 'gemini-2.5-pro',
          operationId: 'branch-op',
        },
      });
    });

    it('should successfully create and process a conversation branch', async () => {
      const result = await orchestrator.branchConversation(
        'session-123',
        'msg-parent',
        'What if I try a different approach?'
      );

      expect(result.conversationBranch).toMatchObject({
        parentMessageId: 'msg-parent',
        branchMessageId: expect.any(String),
      });

      expect(mockSessionManager.branchFromMessage).toHaveBeenCalledWith(
        'session-123',
        'msg-parent'
      );
    });
  });

  describe('createSession', () => {
    beforeEach(() => {
      mockSessionManager.createSession.mockResolvedValue(mockSession);
    });

    it('should create a new session with default options', async () => {
      const session = await orchestrator.createSession('user-123');

      expect(session).toEqual(mockSession);
      expect(mockSessionManager.createSession).toHaveBeenCalledWith('user-123', {
        enableConversationBranching: true,
        performanceTracking: true,
      });
    });

    it('should create session with custom options', async () => {
      const options = {
        enableConversationBranching: false,
        performanceTracking: false,
      };

      await orchestrator.createSession('user-123', options);

      expect(mockSessionManager.createSession).toHaveBeenCalledWith('user-123', {
        ...options,
        performanceTracking: false,
      });
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return combined performance metrics', () => {
      const mockMetrics = {
        duration: 2000,
        tokensUsed: 300,
        tokensInput: 120,
        tokensOutput: 180,
        cost: 0.0012,
        modelUsed: 'gemini-2.5-pro',
        operationId: 'test-op',
      };

      mockAIRouter.getPerformanceMetrics.mockReturnValue(mockMetrics);

      const metrics = orchestrator.getPerformanceMetrics();

      expect(metrics).toMatchObject(mockMetrics);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all services are available', async () => {
      mockSessionManager.healthCheck.mockResolvedValue({ available: true });
      mockFrameworkSelector.healthCheck.mockResolvedValue({ available: true });
      mockAIRouter.healthCheck.mockResolvedValue({
        openai: true,
        google: true,
        errors: [],
      });

      const health = await orchestrator.healthCheck();

      expect(health).toEqual({
        overall: true,
        services: {
          sessionManager: true,
          frameworkSelector: true,
          aiRouter: true,
        },
        errors: [],
      });
    });

    it('should return unhealthy status when services fail', async () => {
      mockSessionManager.healthCheck.mockResolvedValue({
        available: false,
        error: 'Database connection failed',
      });
      mockFrameworkSelector.healthCheck.mockResolvedValue({ available: true });
      mockAIRouter.healthCheck.mockResolvedValue({
        openai: false,
        google: true,
        errors: ['Missing OPENAI_API_KEY'],
      });

      const health = await orchestrator.healthCheck();

      expect(health.overall).toBe(false);
      expect(health.services.sessionManager).toBe(false);
      expect(health.services.aiRouter).toBe(false);
      expect(health.errors).toContain('SessionManager: Database connection failed');
      expect(health.errors).toContain('AIRouter: OpenAI not available');
    });

    it('should handle service health check exceptions', async () => {
      mockSessionManager.healthCheck.mockRejectedValue(new Error('Service crashed'));

      const health = await orchestrator.healthCheck();

      expect(health.overall).toBe(false);
      expect(health.services.sessionManager).toBe(false);
      expect(health.errors).toContain('SessionManager: Service crashed');
    });
  });

  describe('error handling', () => {
    it('should wrap and re-throw errors with proper context', async () => {
      mockSessionManager.getSession.mockResolvedValue(mockSession);
      mockSessionManager.addMessage.mockResolvedValue('msg-1');
      mockSessionManager.getConversationMessages.mockResolvedValue(mockMessages);
      mockSessionManager.getSessionArtifacts.mockResolvedValue([]);
      mockAIRouter.generateResponse.mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      await expect(
        orchestrator.processMessage('session-123', 'test message')
      ).rejects.toThrow(PhoenixError);

      try {
        await orchestrator.processMessage('session-123', 'test message');
      } catch (error) {
        expect(error).toBeInstanceOf(PhoenixError);
        expect((error as PhoenixError).code).toBe(ErrorCode.AI_GENERATION_ERROR);
        expect((error as PhoenixError).context).toMatchObject({
          sessionId: 'session-123',
          phase: 'problem_intake',
        });
      }
    });
  });

  describe('phase-specific behavior', () => {
    it('should use correct task type for different phases', async () => {
      const testCases = [
        { phase: 'problem_intake', expectedTaskType: 'quick_response' },
        { phase: 'diagnostic_interview', expectedTaskType: 'analysis' },
        { phase: 'framework_application', expectedTaskType: 'deep_thinking' },
        { phase: 'framework_selection', expectedTaskType: 'framework_selection' },
      ];

      for (const { phase, expectedTaskType } of testCases) {
        const sessionWithPhase = { ...mockSession, currentPhase: phase as any };
        mockSessionManager.getSession.mockResolvedValue(sessionWithPhase);

        await orchestrator.processMessage('session-123', 'test message');

        expect(mockAIRouter.selectModel).toHaveBeenCalledWith(
          expectedTaskType,
          undefined,
          undefined
        );

        vi.clearAllMocks();
        // Reset common mocks for next iteration
        mockSessionManager.addMessage.mockResolvedValue('msg-new');
        mockSessionManager.getConversationMessages.mockResolvedValue(mockMessages);
        mockSessionManager.getSessionArtifacts.mockResolvedValue([]);
        mockAIRouter.generateResponse.mockResolvedValue({
          content: 'response',
          model: 'test-model',
          metrics: {} as any,
        });
        mockAIRouter.selectModel.mockReturnValue({
          type: 'gemini-2.5-pro',
          provider: {} as any,
          config: { temperature: 0.5, maxTokens: 3000, timeoutMs: 60000 },
        });
        mockAIRouter.assembleContext.mockReturnValue({
          systemPrompt: 'test',
          contextMessages: [],
          metadata: {},
        });
      }
    });
  });
});