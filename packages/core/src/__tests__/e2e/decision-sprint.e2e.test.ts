/**
 * End-to-End tests for complete decision sprint flows
 * 
 * These tests verify that the entire Phoenix Framework workflow
 * functions correctly from start to finish, including all services
 * working together seamlessly.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PhoenixOrchestrator } from '../../orchestration/phoenix-orchestrator';
import { SessionManager } from '../../services/session-manager';
import type { 
  Session, 
  CoreMessage, 
  SessionConfig,
  ProblemBriefContent,
  DiagnosticNotesContent,
  CommitmentMemoContent,
  ArtifactContent
} from '../../types';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Test configuration
const E2E_CONFIG = {
  testUser: 'e2e-test-user',
  timeout: 60000, // 60 seconds for E2E tests
  mockAI: true, // Use mock AI responses for consistent testing
};

// Type guard functions
function isProblemBriefContent(content: ArtifactContent): content is ProblemBriefContent {
  return 'problemStatement' in content && 'stakeholders' in content;
}

function isDiagnosticNotesContent(content: ArtifactContent): content is DiagnosticNotesContent {
  return 'keyFindings' in content && 'patterns' in content;
}

function isCommitmentMemoContent(content: ArtifactContent): content is CommitmentMemoContent {
  return 'decision' in content && 'rationale' in content;
}

describe('Decision Sprint E2E Tests', () => {
  let orchestrator: PhoenixOrchestrator;
  let sessionManager: SessionManager;
  let testSession: Session;
  let supabase: SupabaseClient;

  beforeAll(async () => {
    // Set up test environment with all required environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.GOOGLE_API_KEY = 'test-google-key';

    sessionManager = new SessionManager(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    orchestrator = new PhoenixOrchestrator();
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await setupMockDatabase();
    await setupMockAI();
    
    // Create a fresh test session for each test
    const config: SessionConfig = {
      enableBranching: true,
      enableFrameworkRecommendations: true,
      responseTimeout: 30000,
      maxMessagesPerPhase: 50,
      verboseMode: false,
      skipTutorials: false,
    };

    testSession = await sessionManager.createSession(E2E_CONFIG.testUser, config);
  });

  afterAll(async () => {
    // Clean up test data
  });

  describe('Complete Startup Decision Sprint', () => {
    it('should complete full pivot decision sprint workflow', async () => {
      const messages: CoreMessage[] = [
        {
          role: 'user',
          content: "I'm the founder of a B2B SaaS company with 50 employees. Our enterprise sales are declining 15% monthly, but we're seeing strong signals from consumer interest. Should I pivot to B2C?"
        }
      ];

      // Phase 1: Problem Intake
      let response = await orchestrator.processMessage(
        testSession.id,
        messages[0].content
      );

      expect(response.sessionId).toBe(testSession.id);
      expect(response.content).toContain('Phoenix Framework');
      expect(response.currentPhase).toBe('problem_intake');
      expect(response.artifacts?.[0]?.artifactType).toBe('problem_brief');

      const problemBriefArtifact = response.artifacts?.[0]?.content;
      expect(problemBriefArtifact).toBeDefined();
      
      if (problemBriefArtifact && isProblemBriefContent(problemBriefArtifact)) {
        expect(problemBriefArtifact.problemStatement).toContain('pivot');
        expect(problemBriefArtifact.stakeholders).toContain('employees');
        expect(problemBriefArtifact.urgency).toBe('immediate');
        expect(problemBriefArtifact.complexity).toBe('complex');
        expect(problemBriefArtifact.decisionType).toBe('1'); // Business decision
      } else {
        throw new Error('Expected problem brief content but got different type');
      }

      // Verify transition to diagnostic interview
      expect(response.phaseTransition?.fromPhase).toBe('problem_intake');
      expect(response.phaseTransition?.toPhase).toBe('diagnostic_interview');

      // Phase 2: Diagnostic Interview  
      const diagnosticMessage = {
        role: 'user' as const,
        content: "The main challenge is that our enterprise customers are churning because our product is overengineered for their needs, but consumer users love the simplicity. Our team is split - engineers want to stay B2B, sales team sees the B2C opportunity."
      };

      response = await orchestrator.processMessage(
        testSession.id,
        diagnosticMessage.content
      );

      expect(response.sessionId).toBe(testSession.id);
      expect(response.currentPhase).toBe('diagnostic_interview');
      expect(response.artifacts?.[0]?.artifactType).toBe('diagnostic_notes');

      const diagnosticNotesArtifact = response.artifacts?.[0]?.content;
      expect(diagnosticNotesArtifact).toBeDefined();
      
      if (diagnosticNotesArtifact && isDiagnosticNotesContent(diagnosticNotesArtifact)) {
        expect(diagnosticNotesArtifact.keyFindings).toContain('overengineered');
        // Note: DiagnosticNotesContent doesn't have stakeholderInsights, using patterns instead
        expect(diagnosticNotesArtifact.patterns).toContain('team split');
      } else {
        throw new Error('Expected diagnostic notes content but got different type');
      }

      // Phase 3: Framework Selection
      const frameworkMessage = {
        role: 'user' as const,
        content: "I'm ready to explore frameworks that can help me make this decision systematically."
      };

      response = await orchestrator.processMessage(
        testSession.id,
        frameworkMessage.content
      );

      expect(response.sessionId).toBe(testSession.id);
      expect(response.currentPhase).toBe('framework_selection');
      expect(response.frameworkSelections).toBeDefined();
      expect(response.frameworkSelections!.length).toBeGreaterThan(0);

      // Verify selected frameworks are relevant
      const selectedFrameworks = response.frameworkSelections!;
      const frameworkTitles = selectedFrameworks.map(f => f.knowledgeContentId);
      expect(frameworkTitles).toContain('Lean Startup Methodology');
      expect(selectedFrameworks[0].relevanceScore).toBeGreaterThan(0.8);

      // Phase 4: Framework Application
      const applicationMessage = {
        role: 'user' as const,
        content: "Let's apply the Lean Startup Methodology. I can see how the Build-Measure-Learn cycle applies - we built for enterprise, measured declining satisfaction, and now we're learning that consumers prefer our approach."
      };

      response = await orchestrator.processMessage(
        testSession.id,
        applicationMessage.content
      );

      expect(response.sessionId).toBeDefined();
      expect(response.currentPhase).toBe('framework_application');
      expect(response.artifacts[0]?.artifactType).toBe('framework_application_notes');

      // Phase 5: Commitment Memo
      const commitmentMessage = {
        role: 'user' as const,
        content: "Based on our analysis, I believe we should pivot to B2C. The data shows clear product-market fit with consumers, and we can leverage our existing technology. I'm ready to formalize this decision."
      };

      response = await orchestrator.processMessage(
        testSession.id,
        commitmentMessage.content
      );

      expect(response.sessionId).toBeDefined();
      expect(response.currentPhase).toBe('commitment_memo_generation');
      expect(response.artifacts[0]?.artifactType).toBe('commitment_memo');

      const commitmentMemoArtifact = response.artifacts[0]?.content;
      expect(commitmentMemoArtifact).toBeDefined();
      
      if (commitmentMemoArtifact && isCommitmentMemoContent(commitmentMemoArtifact)) {
        expect(commitmentMemoArtifact.decision).toContain('pivot to B2C');
        expect(commitmentMemoArtifact.rationale).toContain('product-market fit');
        expect(commitmentMemoArtifact.successMetrics).toBeDefined();
        expect(commitmentMemoArtifact.microBet).toBeDefined();
      } else {
        throw new Error('Expected commitment memo content but got different type');
      }

      // Verify session completion
      const session = await sessionManager.loadSession(testSession.id);
      expect(session?.status).toBe('completed');
      
      // Verify performance metrics were tracked
      const metrics = await orchestrator.getPerformanceMetrics();
      expect(metrics.totalTime).toBeGreaterThan(0);
      expect(metrics.duration).toBeGreaterThan(0);

      // Verify conversation history is complete
      const conversationMessages = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', testSession.id);
      expect(conversationMessages.data?.length).toBeGreaterThanOrEqual(10); // Multiple exchanges
      
      // Verify all artifacts were created
      const sessionArtifacts = await supabase
        .from('session_artifacts')
        .select('*')
        .eq('session_id', testSession.id);
      const artifactTypes = sessionArtifacts.data?.map((a: { artifact_type: string }) => a.artifact_type) || [];
      expect(artifactTypes).toContain('problem_brief');
      expect(artifactTypes).toContain('diagnostic_notes');
      expect(artifactTypes).toContain('framework_application');
      expect(artifactTypes).toContain('commitment_memo');
    });

    it('should handle career decision sprint (Type 2 decision)', async () => {
      const careerDecisionMessage = {
        role: 'user' as const,
        content: "I'm a senior software engineer at Google. I have an offer to join a Series A startup as CTO with significant equity, but it means leaving my stable job and moving my family. Should I take the risk?"
      };

      let response = await orchestrator.processMessage(
        testSession.id,
        careerDecisionMessage.content
      );

      expect(response.sessionId).toBeDefined();
      const artifactContent = response.artifacts[0]?.content;
      expect(artifactContent).toBeDefined();
      
      if (artifactContent && isProblemBriefContent(artifactContent)) {
        expect(artifactContent.decisionType).toBe('2'); // Personal decision
        expect(artifactContent.stakeholders).toContain('family');
        expect(artifactContent.complexity).toBe('complex');
      } else {
        throw new Error('Expected problem brief content but got different type');
      }

      // Continue through diagnostic phase
      const personalDiagnosticMessage = {
        role: 'user' as const,
        content: "My main concerns are financial security for my family, career growth potential, and the risk of startup failure. My spouse is supportive but worried about the income reduction in the short term."
      };

      response = await orchestrator.processMessage(
        testSession.id,
        personalDiagnosticMessage.content
      );

      const briefArtifactContent = response.artifacts[0]?.content;
      expect(briefArtifactContent).toBeDefined();
      
      if (briefArtifactContent && isDiagnosticNotesContent(briefArtifactContent)) {
        expect(briefArtifactContent.keyFindings).toContain('financial security');
        // Note: DiagnosticNotesContent doesn't have stakeholderInsights, using patterns instead
        expect(briefArtifactContent.patterns).toContain('spouse supportive');
      } else {
        throw new Error('Expected diagnostic notes content but got different type');
      }

      // Framework selection should focus on personal decision frameworks
      const personalFrameworkMessage = {
        role: 'user' as const,
        content: "I need frameworks that can help me weigh personal vs professional trade-offs."
      };

      response = await orchestrator.processMessage(
        testSession.id,
        personalFrameworkMessage.content
      );

      const selectedFrameworks = response.frameworkSelections;
      // Should include frameworks suitable for personal decisions
      expect(selectedFrameworks.some(f => 
        f.knowledgeContentId.includes('Decision Matrix') ||
        f.knowledgeContentId.includes('Values-Based')
      )).toBe(true);
    });

    it('should handle urgent decision sprint with compressed timeline', async () => {
      const urgentDecisionMessage = {
        role: 'user' as const,
        content: "I have 48 hours to decide whether to accept an acquisition offer for my company. The offer is $50M but I think we could be worth $100M in 18 months. My board is pushing me to accept."
      };

      let response = await orchestrator.processMessage(
        testSession.id,
        urgentDecisionMessage.content
      );

      expect(response.sessionId).toBeDefined();
      const urgentArtifactContent = response.artifacts[0]?.content;
      expect(urgentArtifactContent).toBeDefined();
      
      if (urgentArtifactContent && isProblemBriefContent(urgentArtifactContent)) {
        expect(urgentArtifactContent.urgency).toBe('immediate');
        expect(urgentArtifactContent.constraints).toContain('48 hours');
        expect(urgentArtifactContent.stakeholders).toContain('board');
      } else {
        throw new Error('Expected problem brief content but got different type');
      }

      // Framework selection should prioritize rapid decision-making frameworks
      const quickFrameworkMessage = {
        role: 'user' as const,
        content: "I need to make this decision quickly but systematically."
      };

      response = await orchestrator.processMessage(
        testSession.id,
        quickFrameworkMessage.content
      );

      const selectedFrameworks = response.frameworkSelections;
      expect(selectedFrameworks.some(f => 
        f.knowledgeContentId.includes('OODA Loop') ||
        f.knowledgeContentId.includes('Rapid Decision')
      )).toBe(true);

      // Should use faster AI models for urgent decisions
      expect(response.metrics.modelUsed).toBe('gemini-2.5-flash'); // Quick response model
    });
  });

  describe('Conversation Branching E2E', () => {
    it('should support exploration of different decision paths', async () => {
      // Start with initial problem
      const initialMessage = {
        role: 'user' as const,
        content: "Should I shut down my struggling startup or try a pivot?"
      };

      let response = await orchestrator.processMessage(
        testSession.id,
        initialMessage.content
      );

      expect(response.sessionId).toBeDefined();
      const originalMessageId = response.messageId;

      // Continue down one path (pivot)
      const pivotMessage = {
        role: 'user' as const,
        content: "I think a pivot might work. We have good technology but wrong market."
      };

      response = await orchestrator.processMessage(
        testSession.id,
        pivotMessage.content
      );

      expect(response.sessionId).toBeDefined();
      const pivotMessageId = response.messageId;

      // Now branch back to explore shutdown option
      const branchResult = await sessionManager.branchFromMessage(
        originalMessageId
      );

      expect(branchResult.id).toBeDefined();
      expect(branchResult.userId).toBe(testSession.userId);

      // Explore shutdown path
      const shutdownMessage = {
        role: 'user' as const,
        content: "Actually, let me explore the shutdown option. We're burning $50k/month and runway is limited."
      };

      response = await orchestrator.processMessage(
        testSession.id,
        shutdownMessage.content,
        { parentMessageId: originalMessageId }
      );

      expect(response.sessionId).toBeDefined();
      expect(response.messageId).not.toBe(pivotMessageId);

      // Verify both conversation branches exist
      const branchMessages = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', testSession.id);
      const allBranchMessages = branchMessages.data || [];
      type MessageRow = { parent_message_id: string; content: string };
      const pivotBranch = allBranchMessages.filter((m: MessageRow) => m.parent_message_id === originalMessageId && m.content.includes('pivot'));
      const shutdownBranch = allBranchMessages.filter((m: MessageRow) => m.parent_message_id === originalMessageId && m.content.includes('shutdown'));

      expect(pivotBranch.length).toBeGreaterThan(0);
      expect(shutdownBranch.length).toBeGreaterThan(0);
    });

    it('should maintain separate artifacts for different branches', async () => {
      // Create initial problem brief
      const initialMessage = {
        role: 'user' as const,
        content: "I need to decide between two job offers - one at a big tech company, one at a startup."
      };

      let response = await orchestrator.processMessage(
        testSession.id,
        initialMessage.content
      );

      // Continue with the test flow
      const branchPoint = response.messageId;

      // Branch 1: Focus on big tech
      const bigTechMessage = {
        role: 'user' as const,
        content: "The big tech offer has better compensation and stability, which is important for my family."
      };

      response = await orchestrator.processMessage(
        testSession.id,
        bigTechMessage.content
      );

      const bigTechArtifact = response.artifacts[0];

      // Branch 2: Focus on startup
      await sessionManager.branchFromMessage(branchPoint);

      const startupMessage = {
        role: 'user' as const,
        content: "The startup offer has more equity upside and learning opportunities, which aligns with my career goals."
      };

      response = await orchestrator.processMessage(
        testSession.id,
        startupMessage.content,
        { parentMessageId: branchPoint }
      );

      const startupArtifact = response.artifacts[0];

      // Verify artifacts are different
      expect(bigTechArtifact?.content).toBeDefined();
      expect(startupArtifact?.content).toBeDefined();
      
      if (bigTechArtifact?.content && isProblemBriefContent(bigTechArtifact.content)) {
        expect(bigTechArtifact.content.keyInsights).toContain('stability');
      }
      
      if (startupArtifact?.content && isProblemBriefContent(startupArtifact.content)) {
        expect(startupArtifact.content.keyInsights).toContain('equity upside');
      }
      
      expect(bigTechArtifact?.id).not.toBe(startupArtifact?.id);

      // Verify both artifacts are stored
      const artifacts = await supabase
        .from('session_artifacts')
        .select('*')
        .eq('session_id', testSession.id);
      const allArtifacts = artifacts.data || [];
      expect(allArtifacts.length).toBeGreaterThanOrEqual(3); // Original + 2 branches
    });
  });

  describe('Error Recovery and Edge Cases E2E', () => {
    it('should recover from AI service failures gracefully', async () => {
      // Mock AI service failure
      const mockFailureResponse = vi.fn().mockRejectedValueOnce(
        new Error('AI service temporarily unavailable')
      );

      vi.doMock('ai', () => ({
        generateText: mockFailureResponse.mockResolvedValueOnce({
          text: 'Fallback response after retry',
          usage: { totalTokens: 50 },
        }),
      }));

      const message = {
        role: 'user' as const,
        content: "I need help with a decision but the AI might fail."
      };

      const response = await orchestrator.processMessage(
        testSession.id,
        message.content
      );

      expect(response.sessionId).toBeDefined();
      expect(response.content).toContain('Fallback response');
      
      // Verify error was logged but didn't break the flow
      const performanceMetrics = await orchestrator.getPerformanceMetrics();
      expect(performanceMetrics.duration).toBeDefined();
    });

    it('should handle malformed user inputs gracefully', async () => {
      const malformedInputs = [
        '', // Empty string
        'x'.repeat(50000), // Very long input
        '🚀💡🤔' + '💭'.repeat(100), // Many emojis
        'SELECT * FROM users; DROP TABLE sessions;', // SQL injection attempt
        '<script>alert("xss")</script>', // XSS attempt
      ];

      for (const input of malformedInputs) {
        const response = await orchestrator.processMessage(testSession.id, input);
        
        expect(response.sessionId).toBeDefined();
        expect(response.content).toBeTruthy();
        expect(typeof response.content).toBe('string');
        
        // Verify no security issues
        expect(response.content).not.toContain('<script>');
        expect(response.content).not.toContain('DROP TABLE');
      }
    });

    it('should handle session state corruption and recovery', async () => {
      // Simulate corrupted session state
      const corruptedSession = {
        ...testSession,
        phaseStates: null, // Corrupted state
      };

      // Mock session retrieval to return corrupted session
      const mockSupabaseClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: corruptedSession,
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ ...corruptedSession, phaseStates: { problem_intake: { step: 'initial' } } }],
              error: null,
            }),
          }),
        }),
      };

      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => mockSupabaseClient),
      }));

      const message = {
        role: 'user' as const,
        content: "This should work even with corrupted state."
      };

      const response = await orchestrator.processMessage(
        testSession.id,
        message.content
      );

      // Should recover gracefully
      expect(response.sessionId).toBeDefined();
      const session = await sessionManager.loadSession(testSession.id);
      expect(session?.phaseStates).toBeDefined();
      expect(session?.currentPhase).toBe('problem_intake');
    });
  });

  describe('Performance and Scalability E2E', () => {
    it('should handle long conversation histories efficiently', async () => {
      const messageCount = 50;
      const performanceMessages = Array(messageCount).fill(null).map((_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Message ${i + 1} in a long conversation about startup decisions.`
      }));

      const startTime = Date.now();
      
      for (let i = 0; i < 10; i++) { // Add first 10 messages
        await orchestrator.processMessage(testSession.id, performanceMessages[i].content);
      }

      const endTime = Date.now();
      
      // Should complete within reasonable time even with long history
      expect(endTime - startTime).toBeLessThan(30000); // 30 seconds max

      // Verify conversation state is maintained
      const performanceTestMessages = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', testSession.id);
      expect(performanceTestMessages.data?.length).toBeGreaterThanOrEqual(10);
      
      // Performance metrics should show reasonable response times
      const metrics = await orchestrator.getPerformanceMetrics();
      expect(metrics.duration).toBeLessThan(3000); // 3 seconds average
    });

    it('should handle concurrent session processing', async () => {
      const concurrentSessions = 5;
      const sessionPromises = Array(concurrentSessions).fill(null).map(async (_, i) => {
        const config: SessionConfig = {
          enableConversationBranching: true,
          performanceTracking: true,
          defaultModel: 'gpt-4.1' as const,
        };
        
        const session = await sessionManager.createSession(`concurrent-user-${i}`, config);
        
        const response = await orchestrator.processMessage(
          session.id,
          `I'm user ${i} and I need help with a decision about my business.`
        );
        
        return { session, response };
      });

      const results = await Promise.all(sessionPromises);

      results.forEach((result, i) => {
        expect(result.response.sessionId).toBeDefined();
        expect(result.session.userId).toBe(`concurrent-user-${i}`);
        expect(result.response.content).toContain('Phoenix Framework');
      });
    });
  });

  async function setupMockDatabase() {
    // Set up comprehensive database mocks for E2E tests
    const mockSessionData = {
      id: testSession?.id || 'test-session-123',
      user_id: E2E_CONFIG.testUser,
      status: 'active',
      current_phase: 'problem_intake',
      phase_states: { problem_intake: { step: 'initial' } },
      config: {
        enableConversationBranching: true,
        performanceTracking: true,
        preferredModel: 'gpt-4.1',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockKnowledgeContent = [
      {
        id: 'lean-startup',
        title: 'Lean Startup Methodology',
        type: 'strategic-framework',
        definition: 'Build-measure-learn cycle for validated learning',
        key_takeaway: 'Fail fast, learn faster',
        hook: 'Turn assumptions into experiments',
        target_persona: ['founder', 'executive'],
        startup_phase: ['ideation', 'growth'],
        super_model: false,
        language: 'English',
      },
      {
        id: 'decision-matrix',
        title: 'Decision Matrix',
        type: 'tactical-tool',
        definition: 'Weighted scoring system for comparing options',
        key_takeaway: 'Quantify subjective decisions',
        hook: 'Make better choices with numbers',
        target_persona: ['founder', 'executive', 'product_manager'],
        startup_phase: ['growth', 'scale-up'],
        super_model: true,
        language: 'English',
      }
    ];

    const mockSupabaseClient = {
      from: vi.fn().mockImplementation((table: string) => ({
        insert: vi.fn().mockResolvedValue({
          data: [table === 'sessions' ? mockSessionData : {}],
          error: null,
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: table === 'sessions' ? mockSessionData : null,
              error: null,
            }),
            order: vi.fn().mockResolvedValue({
              data: table === 'messages' ? [] : 
                    table === 'session_artifacts' ? [] :
                    table === 'phase_transitions' ? [] : [],
              error: null,
            }),
          }),
          in: vi.fn().mockResolvedValue({
            data: table === 'knowledge_content' ? mockKnowledgeContent : [],
            error: null,
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [mockSessionData],
            error: null,
          }),
        }),
      })),
      rpc: vi.fn().mockResolvedValue({
        data: [
          { id: 'lean-startup', similarity: 0.89 },
          { id: 'decision-matrix', similarity: 0.85 },
        ],
        error: null,
      }),
    };

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => mockSupabaseClient),
    }));
  }

  async function setupMockAI() {
    if (!E2E_CONFIG.mockAI) return;

    // Mock OpenAI embeddings
    const mockEmbeddingsCreate = vi.fn().mockResolvedValue({
      data: [{ embedding: Array(1536).fill(0.1) }],
    });

    vi.doMock('openai', () => ({
      default: class MockOpenAI {
        embeddings = {
          create: mockEmbeddingsCreate,
        };
      },
    }));

    // Mock AI SDK responses
    const mockAIResponses = {
      problem_intake: "Welcome to the Phoenix Framework! I can see you're facing a significant decision about your startup's direction. The decline in enterprise sales while seeing consumer interest signals suggests a potential pivot opportunity. Let me help you structure this decision systematically.\n\nTo better understand your situation, I need to gather some additional context...",
      
      diagnostic_interview: "Thank you for that detailed context. I can see several key factors emerging: the product-market misalignment with enterprise customers, the organic consumer interest, and the internal team dynamics. Let me dive deeper into the root causes and implications...",
      
      framework_selection: "Based on your pivot decision and the complexity involved, I've identified three highly relevant frameworks that can guide your analysis:\n\n**1. Lean Startup Methodology (Relevance: 89%)**\n- Perfect for testing pivot hypotheses\n- Build-measure-learn cycle applies directly\n\n**2. Decision Matrix (Relevance: 85%)**\n- Systematic evaluation of B2B vs B2C options\n- Weighted scoring for multiple criteria\n\nLet's explore how these frameworks apply to your specific situation...",
      
      framework_application: "Excellent application of the Lean Startup methodology! You're absolutely right about the Build-Measure-Learn cycle - you built for enterprise, measured declining satisfaction, and now you're learning about consumer preferences. This systematic approach will help validate your pivot hypothesis...",
      
      commitment_memo: "Based on our comprehensive analysis through the Phoenix Framework, I'll help you formalize this decision into a clear commitment memo. Your reasoning is sound - the data shows strong product-market fit signals with consumers, and you have the technical foundation to execute this pivot..."
    };

    vi.doMock('ai', () => ({
      generateText: vi.fn().mockImplementation(({ messages }: { messages: any[] }) => {
        const lastMessage = messages[messages.length - 1]?.content || '';
        const phase = determinePhaseFromContext(lastMessage);
        
        return Promise.resolve({
          text: mockAIResponses[phase] || "I understand your situation and I'm here to help you work through this decision systematically.",
          usage: {
            totalTokens: 150,
            promptTokens: 100,
            completionTokens: 50,
          },
        });
      }),
      
      streamText: vi.fn().mockImplementation(({ messages }: { messages: any[] }) => {
        const lastMessage = messages[messages.length - 1]?.content || '';
        const phase = determinePhaseFromContext(lastMessage);
        const responseText = mockAIResponses[phase] || "Mock streaming response";
        
        return Promise.resolve({
          textStream: {
            async *[Symbol.asyncIterator]() {
              const words = responseText.split(' ');
              for (const word of words) {
                yield word + ' ';
                await new Promise(resolve => setTimeout(resolve, 10)); // Simulate streaming delay
              }
            },
          },
          finishReason: 'stop',
          usage: Promise.resolve({
            totalTokens: 150,
            promptTokens: 100,
            completionTokens: 50,
          }),
        });
      }),
    }));
  }

  function determinePhaseFromContext(content: string): 'problem_intake' | 'diagnostic_interview' | 'framework_selection' | 'framework_application' | 'commitment_memo' {
    if (content.includes('pivot') && content.includes('B2B') && content.includes('B2C')) {
      return 'problem_intake';
    }
    if (content.includes('team split') || content.includes('overengineered')) {
      return 'diagnostic_interview';
    }
    if (content.includes('framework') && content.includes('systematic')) {
      return 'framework_selection';
    }
    if (content.includes('Build-Measure-Learn') || content.includes('apply')) {
      return 'framework_application';
    }
    if (content.includes('formalize') || content.includes('decision')) {
      return 'commitment_memo';
    }
    return 'problem_intake';
  }
}, E2E_CONFIG.timeout);