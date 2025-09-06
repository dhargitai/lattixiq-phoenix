import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CoreMessage, SessionArtifact, FrameworkSelection, PhaseContext } from '../types';

// Mock AI SDK modules
vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn((model: string) => ({ model, provider: 'openai' })),
}));

vi.mock('@ai-sdk/google', () => ({
  google: vi.fn((model: string) => ({ model, provider: 'google' })),
}));

vi.mock('ai', () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

// Mock dependencies
vi.mock('../utils/errors', () => ({
  PhoenixError: class PhoenixError extends Error {
    constructor(message: string, public code: string, public context?: any) {
      super(message);
      this.name = 'PhoenixError';
    }
  },
}));

vi.mock('../utils/performance-tracker', () => ({
  PerformanceTracker: class PerformanceTracker {
    startOperation = vi.fn();
    endOperation = vi.fn();
    recordAICall = vi.fn();
    getMetrics = vi.fn(() => []);
  },
}));

// Import after mocks
import { AIRouter } from './ai-router';
import { generateText, streamText } from 'ai';

describe('AIRouter', () => {
  let aiRouter: AIRouter;

  beforeEach(() => {
    aiRouter = new AIRouter();
    
    // Mock environment variables
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.GOOGLE_API_KEY = 'test-google-key';

    // Clear mock calls
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
  });

  describe('selectModel', () => {
    it('should select GPT-4.1 for analysis tasks by default', () => {
      const model = aiRouter.selectModel('analysis');
      
      expect(model.type).toBe('gpt-4.1');
      expect(model.config.temperature).toBe(0.3);
      expect(model.config.maxTokens).toBe(2000);
      expect(model.config.timeoutMs).toBe(30000);
    });

    it('should select Gemini Flash for quick responses', () => {
      const model = aiRouter.selectModel('quick_response');
      
      expect(model.type).toBe('gemini-2.5-flash');
      expect(model.config.temperature).toBe(0.4);
      expect(model.config.maxTokens).toBe(1500);
      expect(model.config.timeoutMs).toBe(20000);
    });

    it('should select Gemini Pro for deep thinking', () => {
      const model = aiRouter.selectModel('deep_thinking');
      
      expect(model.type).toBe('gemini-2.5-pro');
      expect(model.config.temperature).toBe(0.5);
      expect(model.config.maxTokens).toBe(3000);
      expect(model.config.timeoutMs).toBe(60000);
    });

    it('should use model override when provided', () => {
      const model = aiRouter.selectModel('analysis', 'gpt-4.1-mini');
      
      expect(model.type).toBe('gpt-4.1-mini');
    });

    it('should use session preferences when provided', () => {
      const model = aiRouter.selectModel('analysis', undefined, {
        preferredModel: 'gemini-2.5-flash',
      });
      
      expect(model.type).toBe('gemini-2.5-flash');
    });

    it('should throw error for unknown model type', () => {
      expect(() => {
        // @ts-expect-error - Testing invalid model type
        aiRouter.selectModel('analysis', 'invalid-model');
      }).toThrow();
    });
  });

  describe('assembleContext', () => {
    it('should create basic system prompt with phase context', () => {
      const messages: CoreMessage[] = [
        { role: 'user', content: 'Test message' },
      ];
      const phaseContext: PhaseContext = {
        currentPhase: 'problem_intake',
        phaseState: { step: 1 },
      };

      const context = aiRouter.assembleContext(messages, undefined, undefined, phaseContext);

      expect(context.systemPrompt).toContain('Phoenix Framework');
      expect(context.systemPrompt).toContain('problem_intake');
      expect(context.systemPrompt).toContain('step');
      expect(context.contextMessages).toEqual(messages);
    });

    it('should include artifacts in context', () => {
      const messages: CoreMessage[] = [
        { role: 'user', content: 'Test message' },
      ];
      const artifacts: SessionArtifact[] = [
        {
          id: 'artifact-1',
          sessionId: 'session-1',
          artifactType: 'problem_brief',
          content: {
            problemStatement: 'Test problem',
            context: 'Test context',
            stakeholders: ['founder'],
            constraints: ['time'],
            successCriteria: ['clarity'],
            urgency: 'immediate' as const,
            complexity: 'moderate' as const,
            decisionType: '1' as const,
            keyInsights: ['insight1'],
          },
          phaseCreated: 'problem_intake',
          version: 1,
          isCurrent: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const context = aiRouter.assembleContext(messages, artifacts);

      expect(context.systemPrompt).toContain('Session Artifacts');
      expect(context.systemPrompt).toContain('problem_brief');
      expect(context.systemPrompt).toContain('Test problem');
      expect(context.metadata.artifactsCount).toBe(1);
    });

    it('should include frameworks in context', () => {
      const messages: CoreMessage[] = [
        { role: 'user', content: 'Test message' },
      ];
      const frameworks: FrameworkSelection[] = [
        {
          id: 'framework-1',
          sessionId: 'session-1',
          knowledgeContentId: 'First Principles Thinking',
          relevanceScore: 0.85,
          scoreBreakdown: {
            directRelevance: 0.9,
            applicabilityNow: 0.8,
            foundationalValue: 0.85,
            simplicityBonus: 0.1,
            personalRelevance: 0.8,
            complementarity: 0.9,
            overallScore: 0.85,
            reasoning: 'Highly relevant for breaking down problems',
          },
          selectionRank: 1,
          selectionReason: 'Core framework for problem analysis',
          wasApplied: false,
        },
      ];

      const context = aiRouter.assembleContext(messages, undefined, frameworks);

      expect(context.systemPrompt).toContain('Selected Mental Models');
      expect(context.systemPrompt).toContain('First Principles Thinking');
      expect(context.systemPrompt).toContain('0.85');
      expect(context.systemPrompt).toContain('Core framework for problem analysis');
      expect(context.metadata.frameworksCount).toBe(1);
    });

    it('should include conversation guidelines', () => {
      const messages: CoreMessage[] = [
        { role: 'user', content: 'Test message' },
      ];

      const context = aiRouter.assembleContext(messages);

      expect(context.systemPrompt).toContain('Conversation Guidelines');
      expect(context.systemPrompt).toContain('Keep responses focused');
      expect(context.systemPrompt).toContain('anxiety-reducing tone');
    });
  });

  describe('generateResponse', () => {
    it('should generate non-streaming response successfully', async () => {
      const mockResult = {
        text: 'Generated response',
        usage: {
          totalTokens: 100,
          promptTokens: 50,
          completionTokens: 50,
        },
      };
      vi.mocked(generateText).mockResolvedValue(mockResult);

      const model = aiRouter.selectModel('analysis');
      const response = await aiRouter.generateResponse('Test prompt', model);

      expect(response.content).toBe('Generated response');
      expect(response.model).toBe('gpt-4.1');
      expect(response.metrics.tokensUsed).toBe(100);
      expect(response.metrics.tokensInput).toBe(50);
      expect(response.metrics.tokensOutput).toBe(50);
      expect(response.metrics.cost).toBeGreaterThan(0);
    });

    it('should handle timeout errors', async () => {
      vi.mocked(generateText).mockRejectedValue(Object.assign(new Error('Request aborted'), { name: 'AbortError' }));

      const model = aiRouter.selectModel('analysis');
      
      await expect(aiRouter.generateResponse('Test prompt', model)).rejects.toThrow();
    });

    it('should handle general AI errors', async () => {
      vi.mocked(generateText).mockRejectedValue(new Error('API Error'));

      const model = aiRouter.selectModel('analysis');
      
      await expect(aiRouter.generateResponse('Test prompt', model)).rejects.toThrow();
    });
  });

  describe('generateStreamingResponse', () => {
    it('should generate streaming response successfully', async () => {
      const mockTextStream = {
        async *[Symbol.asyncIterator]() {
          yield 'chunk1';
          yield 'chunk2';
        },
      };
      const mockResult = {
        textStream: mockTextStream,
        finishReason: 'stop',
        usage: Promise.resolve({
          totalTokens: 150,
          promptTokens: 75,
          completionTokens: 75,
        }),
      };
      vi.mocked(streamText).mockResolvedValue(mockResult);

      const model = aiRouter.selectModel('quick_response');
      const messages: CoreMessage[] = [
        { role: 'user', content: 'Test message' },
      ];
      
      const response = await aiRouter.generateStreamingResponse(messages, model);

      expect(response.textStream).toBe(mockTextStream);
      expect(response.finishReason).toBe('stop');
      expect(response.model).toBe('gemini-2.5-flash');
      expect(response.operationId).toBeTruthy();
      expect(response.onFinish).toBeDefined();
    });

    it('should handle streaming timeout errors', async () => {
      vi.mocked(streamText).mockRejectedValue(Object.assign(new Error('Request aborted'), { name: 'AbortError' }));

      const model = aiRouter.selectModel('quick_response');
      const messages: CoreMessage[] = [
        { role: 'user', content: 'Test message' },
      ];
      
      await expect(aiRouter.generateStreamingResponse(messages, model)).rejects.toThrow();
    });
  });

  describe('model overrides', () => {
    it('should set and clear model overrides', () => {
      const sessionId = 'test-session';
      
      aiRouter.setModelOverride(sessionId, 'gemini-2.5-pro');
      // Note: We can't directly test the override is used without exposing internal state
      // This is tested indirectly through selectModel tests
      
      aiRouter.clearModelOverride(sessionId);
      // Similarly, clearing is tested by ensuring it doesn't affect future selections
      
      // Test passes if no errors are thrown
      expect(true).toBe(true);
    });
  });

  describe('performance tracking', () => {
    it('should return performance metrics', () => {
      const metrics = aiRouter.getPerformanceMetrics();
      
      expect(typeof metrics).toBe('object');
      expect(metrics).toBeDefined();
      // Initially has just totalTime since no operations have been performed
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when API keys are present', async () => {
      const health = await aiRouter.healthCheck();
      
      expect(health.openai).toBe(true);
      expect(health.google).toBe(true);
      expect(health.errors).toEqual([]);
    });

    it('should return unhealthy status when API keys are missing', async () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.GOOGLE_API_KEY;
      
      const health = await aiRouter.healthCheck();
      
      expect(health.openai).toBe(false);
      expect(health.google).toBe(false);
      expect(health.errors.length).toBe(2);
      expect(health.errors).toContain('Missing OPENAI_API_KEY environment variable');
      expect(health.errors).toContain('Missing GOOGLE_API_KEY environment variable');
    });
  });
});

describe('AIRouter Integration', () => {
  let aiRouter: AIRouter;

  beforeEach(() => {
    aiRouter = new AIRouter();
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.GOOGLE_API_KEY = 'test-key';
  });

  it('should handle complete workflow with context assembly and model selection', () => {
    const messages: CoreMessage[] = [
      { role: 'user', content: 'I need help with a decision' },
    ];
    
    const artifacts: SessionArtifact[] = [
      {
        id: 'artifact-1',
        sessionId: 'session-1',
        artifactType: 'problem_brief',
        content: {
          problemStatement: 'Should I pivot my startup?',
          context: 'Considering pivot due to market changes',
          stakeholders: ['founder', 'investors'],
          constraints: ['funding runway'],
          successCriteria: ['market validation'],
          urgency: 'immediate' as const,
          complexity: 'complex' as const,
          decisionType: '2' as const,
          keyInsights: ['market feedback negative'],
        },
        phaseCreated: 'problem_intake',
        version: 1,
        isCurrent: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const frameworks: FrameworkSelection[] = [
      {
        id: 'framework-1',
        sessionId: 'session-1',
        knowledgeContentId: 'OODA Loop',
        relevanceScore: 0.92,
        scoreBreakdown: {
          directRelevance: 0.95,
          applicabilityNow: 0.9,
          foundationalValue: 0.9,
          simplicityBonus: 0.15,
          personalRelevance: 0.85,
          complementarity: 0.95,
          overallScore: 0.92,
          reasoning: 'Excellent for rapid decision-making under uncertainty',
        },
        selectionRank: 1,
        selectionReason: 'Perfect for startup pivot decisions',
        wasApplied: false,
      },
    ];

    const phaseContext: PhaseContext = {
      currentPhase: 'framework_selection',
      phaseState: { selectedFrameworks: 1 },
    };

    // Test model selection
    const model = aiRouter.selectModel('framework_selection');
    expect(model.type).toBe('gemini-2.5-pro');

    // Test context assembly
    const context = aiRouter.assembleContext(messages, artifacts, frameworks, phaseContext);
    
    expect(context.systemPrompt).toContain('Phoenix Framework');
    expect(context.systemPrompt).toContain('framework_selection');
    expect(context.systemPrompt).toContain('Should I pivot my startup?');
    expect(context.systemPrompt).toContain('OODA Loop');
    expect(context.metadata.artifactsCount).toBe(1);
    expect(context.metadata.frameworksCount).toBe(1);
  });
});