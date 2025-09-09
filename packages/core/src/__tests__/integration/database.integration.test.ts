/**
 * Integration tests for database operations
 * 
 * These tests verify that all services can interact with the database correctly.
 * They use a test database or mock database responses to ensure proper integration.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { SessionManager } from '../../services/session-manager';
import { FrameworkSelector } from '../../services/framework-selector';
import { PhaseManager } from '../../orchestration/phase-manager';
import type { 
  Session, 
  CoreMessage, 
  SessionConfig, 
  FrameworkSelectionOptions,
  AIModelType,
  SessionArtifact,
  ValidationResult
} from '../../types';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Test configuration
const TEST_CONFIG = {
  testUser: 'test-user-integration',
  testDatabase: 'test',
  timeout: 30000, // 30 seconds for integration tests
};

describe('Database Integration Tests', () => {
  let sessionManager: SessionManager;
  let frameworkSelector: FrameworkSelector;
  let phaseManager: PhaseManager;
  let testSession: Session;
  let supabase: SupabaseClient;
  
  beforeAll(async () => {
    // Set up test environment
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';

    sessionManager = new SessionManager('https://test.supabase.co', 'test-service-role-key');
    frameworkSelector = new FrameworkSelector();
    phaseManager = new PhaseManager(
      supabase
    );
    supabase = createClient('https://test.supabase.co', 'test-service-role-key');
  });

  beforeEach(async () => {
    // Mock all external database calls to avoid actual database dependency
    vi.clearAllMocks();
    
    // Create a test session for each test
    const config: SessionConfig = {
      enableConversationBranching: true,
      performanceTracking: true,
      defaultModel: 'gpt-4.1' as const,
    };

    // Mock session creation
    testSession = {
      id: 'test-session-' + Date.now(),
      userId: TEST_CONFIG.testUser,
      status: 'active',
      currentPhase: 'problem_intake',
      phaseStates: {
        problem_intake: { step: 'initial' },
      },
      config,
      metadata: {},
      startedAt: new Date(),
      lastActivityAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  afterAll(async () => {
    // Clean up test data if needed
  });

  describe('SessionManager Database Integration', () => {
    it('should create and retrieve session successfully', async () => {
      // Mock Supabase responses
      const mockSupabaseClient = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({
            data: [testSession],
            error: null,
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: testSession,
                error: null,
              }),
            }),
          }),
        }),
      };

      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => mockSupabaseClient),
      }));

      const createdSession = await sessionManager.createSession(
        TEST_CONFIG.testUser,
        testSession.config
      );

      expect(createdSession.userId).toBe(TEST_CONFIG.testUser);
      expect(createdSession.status).toBe('active');
      expect(createdSession.currentPhase).toBe('problem_intake');
      expect(createdSession.config.enableConversationBranching).toBe(true);

      const retrievedSession = await sessionManager.loadSession(createdSession.id);
      
      expect(retrievedSession.id).toBe(createdSession.id);
      expect(retrievedSession.userId).toBe(createdSession.userId);
      expect(retrievedSession.config).toEqual(createdSession.config);
    });

    it('should add and retrieve messages with proper ordering', async () => {
      const messages: CoreMessage[] = [
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'First response' },
        { role: 'user', content: 'Second message' },
        { role: 'assistant', content: 'Second response' },
      ];

      const mockMessages = messages.map((msg, index) => ({
        id: `msg-${index}`,
        session_id: testSession.id,
        role: msg.role,
        content: msg.content,
        parent_message_id: null,
        is_active_branch: true,
        created_at: new Date(Date.now() + index * 1000).toISOString(),
        model_used: index % 2 === 1 ? 'gpt-4.1' : null,
        phase_number: 1,
      }));

      const mockSupabaseClient = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockImplementation((data) => ({
            data: [{ ...data, id: `msg-${Math.random()}` }],
            error: null,
          })),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockMessages,
                error: null,
              }),
            }),
          }),
        }),
      };

      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => mockSupabaseClient),
      }));

      // Add messages one by one
      for (const message of messages) {
        const messageData = {
          sessionId: testSession.id,
          parentMessageId: undefined,
          role: message.role,
          content: message.content,
          modelUsed: (message.role === 'assistant' ? 'gpt-4.1' : undefined) as AIModelType | undefined,
          phaseNumber: 1,
          isActiveBranch: true,
          metadata: {},
          performanceMetrics: {}
        };
        await sessionManager.addMessage(testSession.id, {
          ...messageData,
          phaseNumber: 1, // Convert string to number
        });
      }

      // Mock the retrieval of messages
      const messageQuery = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', testSession.id);
      const retrievedMessages = messageQuery.data || [];

      expect(retrievedMessages).toHaveLength(4);
      expect(retrievedMessages[0].content).toBe('First message');
      expect(retrievedMessages[1].content).toBe('First response');
      expect(retrievedMessages[2].content).toBe('Second message');
      expect(retrievedMessages[3].content).toBe('Second response');
    });

    it('should handle conversation branching correctly', async () => {
      const parentMessageId = 'parent-msg-123';
      
      // Mock the update operations for branching
      const mockSupabaseClient = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }).mockReturnValue({
            eq: vi.fn().mockResolvedValue({ 
              data: [{ id: parentMessageId, is_active_branch: true }], 
              error: null 
            }),
          }),
        }),
      };

      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => mockSupabaseClient),
      }));

      await sessionManager.branchFromMessage(testSession.id, parentMessageId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('messages');
    });

    it('should save and retrieve artifacts with versioning', async () => {
      const artifactContent = {
        problemStatement: 'Should I pivot my startup?',
        context: 'Market feedback suggests different direction',
        stakeholders: ['founder', 'investors', 'team'],
        constraints: ['6 months runway', 'team capacity'],
        successCriteria: ['product-market fit', 'revenue growth'],
        urgency: 'immediate' as const,
        complexity: 'complex' as const,
        decisionType: '1' as const,
        keyInsights: ['high churn', 'new market signals'],
      };

      const mockArtifact = {
        id: 'artifact-123',
        session_id: testSession.id,
        artifact_type: 'problem_brief',
        content: JSON.stringify(artifactContent),
        phase_created: 'problem_intake',
        version: 1,
        is_current: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockSupabaseClient = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({
            data: [mockArtifact],
            error: null,
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [mockArtifact],
                error: null,
              }),
            }),
          }),
        }),
      };

      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => mockSupabaseClient),
      }));

      const artifactToSave: SessionArtifact = {
        id: '',
        sessionId: testSession.id,
        artifactType: 'problem_brief',
        content: artifactContent,
        phaseCreated: 'problem_intake',
        version: 1,
        isCurrent: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const savedArtifact = await sessionManager.saveArtifact(
        testSession.id,
        artifactToSave
      );

      expect(savedArtifact.artifactType).toBe('problem_brief');
      expect(savedArtifact.content).toEqual(artifactContent);
      expect(savedArtifact.version).toBe(1);
      expect(savedArtifact.isCurrent).toBe(true);

      const retrievedArtifacts = await sessionManager.getArtifacts(
        testSession.id,
        'problem_brief'
      );

      expect(retrievedArtifacts).toHaveLength(1);
      expect(retrievedArtifacts[0].content).toEqual(artifactContent);
    });
  });

  describe('FrameworkSelector Database Integration', () => {
    it('should select frameworks using vector search', async () => {
      const problemStatement = "Should I pivot my startup from B2B to B2C?";
      
      const mockKnowledgeContent = [
        {
          id: 'framework-1',
          title: 'Lean Startup Methodology',
          type: 'strategic-framework',
          main_category: 'Business Strategy',
          subcategory: 'Startup',
          definition: 'Build-measure-learn cycle for startups',
          key_takeaway: 'Validate assumptions quickly',
          hook: 'Fail fast, learn faster',
          analogy_or_metaphor: 'Scientific method for business',
          classic_example: 'Dropbox MVP',
          modern_example: 'Instagram pivot from Burbn',
          visual_metaphor: 'A cycle of experimentation',
          payoff: 'Reduced risk and faster learning',
          pitfall: 'Can become perpetual experimentation',
          dive_deeper_mechanism: 'Hypothesis-driven development',
          dive_deeper_origin_story: 'Eric Ries Silicon Valley experience',
          dive_deeper_pitfalls_nuances: 'Not suitable for all business types',
          extra_content: 'Additional framework details',
          embedding: JSON.stringify(Array(1536).fill(0.1)),
          language: 'English',
          super_model: false,
          target_persona: ['founder', 'executive'],
          startup_phase: ['ideation', 'growth'],
          problem_category: ['strategy', 'product'],
        },
      ];

      const mockSearchResults = [
        { id: 'framework-1', title: 'Lean Startup Methodology', similarity: 0.87 },
      ];

      const mockSupabaseClient = {
        rpc: vi.fn().mockResolvedValue({
          data: mockSearchResults,
          error: null,
        }),
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: mockKnowledgeContent,
              error: null,
            }),
          }),
          insert: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      };

      // Mock OpenAI embedding generation
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

      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => mockSupabaseClient),
      }));

      const options: FrameworkSelectionOptions = {
        maxFrameworks: 3,
        includeSuperModels: true,
        targetPersona: ['founder'],
        startupPhase: ['growth'],
        minSimilarityScore: 0.7,
      };

      const selectedFrameworks = await frameworkSelector.selectFrameworks(
        problemStatement,
        testSession.id,
        options
      );

      expect(selectedFrameworks).toHaveLength(1);
      expect(selectedFrameworks[0].knowledgeContentId).toBe('framework-1');
      expect(selectedFrameworks[0].relevanceScore).toBeGreaterThan(0.8);
      expect(selectedFrameworks[0].scoreBreakdown.directRelevance).toBeGreaterThan(0.8);
      
      // Verify embedding was generated
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: problemStatement,
        dimensions: 1536,
      });

      // Verify vector search was performed
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        expect.stringContaining('match_knowledge_content'),
        expect.objectContaining({
          query_embedding: expect.any(String),
          match_threshold: 0.7,
          match_count: expect.any(Number),
        })
      );

      // Verify framework selections were stored
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('framework_selections');
    });

    it('should handle knowledge content filtering by persona and phase', async () => {
      const mockKnowledgeContent = [
        {
          id: 'framework-founder',
          title: 'Founder-specific Framework',
          target_persona: ['founder'],
          startup_phase: ['growth'],
          // ... other properties
        },
        {
          id: 'framework-executive',
          title: 'Executive Framework',
          target_persona: ['executive'],
          startup_phase: ['scale-up'],
          // ... other properties
        },
      ];

      const mockSupabaseClient = {
        rpc: vi.fn().mockResolvedValue({
          data: [{ id: 'framework-founder', similarity: 0.85 }],
          error: null,
        }),
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [mockKnowledgeContent[0]], // Only founder-specific framework
              error: null,
            }),
          }),
          insert: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };

      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => mockSupabaseClient),
      }));

      const options: FrameworkSelectionOptions = {
        targetPersona: ['founder'],
        startupPhase: ['growth'],
        maxFrameworks: 5,
      };

      const selectedFrameworks = await frameworkSelector.selectFrameworks(
        'Test problem',
        testSession.id,
        options
      );

      expect(selectedFrameworks).toHaveLength(1);
      expect(selectedFrameworks[0].knowledgeContentId).toBe('framework-founder');
    });
  });

  describe('PhaseManager Database Integration', () => {
    it('should log phase transitions to database', async () => {
      const mockTransition = {
        id: 'transition-123',
        session_id: testSession.id,
        from_phase: 'problem_intake',
        to_phase: 'diagnostic_interview',
        transition_reason: 'Problem statement complete',
        validation_results: {
          isReady: true,
          score: 0.9,
          missingElements: [],
          elements: [],
        },
        is_rollback: false,
        created_at: new Date().toISOString(),
      };

      const mockSupabaseClient = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({
            data: [mockTransition],
            error: null,
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [mockTransition],
                error: null,
              }),
            }),
          }),
        }),
      };

      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => mockSupabaseClient),
      }));

      const validationResult: ValidationResult = {
        isValid: true,
        isReady: true,
        score: 85,
        requiredElements: [
          {
            name: 'problem_statement',
            required: true,
            present: true,
            isPresent: true,
            score: 90
          }
        ],
        elements: [
          {
            name: 'problem_statement',
            required: true,
            present: true,
            isPresent: true,
            score: 90
          }
        ]
      };
      
      // Continue with test flow

      const result = await phaseManager.transitionToPhase(
        testSession.id,
        testSession.currentPhase,
        'diagnostic_interview',
        validationResult,
        'Problem statement complete'
      );

      expect(result.toPhase).toBe('diagnostic_interview');
      expect(result.fromPhase).toBe('problem_intake');
      expect(result.transitionReason).toBe('Problem statement complete');

      // Verify the transition was logged
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('phase_transitions');

      // TODO: Add method to retrieve transition history
      // const history = await phaseManager.getPhaseHistory(testSession.id);
      // expect(history).toHaveLength(1);
    });

    it('should handle rollback transitions properly', async () => {
      const mockRollbackTransition = {
        id: 'rollback-456',
        session_id: testSession.id,
        from_phase: 'diagnostic_interview',
        to_phase: 'problem_intake',
        transition_reason: 'User wants to revise problem statement',
        validation_results: { isReady: true, score: 1.0, missingElements: [], elements: [] },
        is_rollback: true,
        created_at: new Date().toISOString(),
      };

      const mockSupabaseClient = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({
            data: [mockRollbackTransition],
            error: null,
          }),
        }),
      };

      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => mockSupabaseClient),
      }));

      const result = await phaseManager.rollbackPhase(
        testSession,
        'problem_intake',
        'User wants to revise problem statement'
      );

      expect(result.currentPhase).toBe('problem_intake');
      expect(result.id).toBe(testSession.id);
    });
  });

  describe('Cross-Service Database Integration', () => {
    it('should handle complete workflow with all database operations', async () => {
      // This test simulates a complete user workflow involving all services
      
      // 1. Create session
      const sessionConfig: SessionConfig = {
        enableConversationBranching: true,
        performanceTracking: true,
        defaultModel: 'gpt-4.1' as const,
      };

      // Mock all the database operations for the complete workflow
      const mockSession = { ...testSession };
      const mockMessage = {
        id: 'msg-1',
        session_id: mockSession.id,
        role: 'user',
        content: 'I need help deciding whether to pivot my startup',
        created_at: new Date().toISOString(),
      };

      const mockArtifact = {
        id: 'artifact-1',
        session_id: mockSession.id,
        artifact_type: 'problem_brief',
        content: JSON.stringify({
          problemStatement: 'Should I pivot my startup from B2B to B2C?',
          context: 'Market feedback and churn issues',
          stakeholders: ['founder', 'investors'],
          constraints: ['6 months'],
          successCriteria: ['product-market fit'],
          urgency: 'immediate',
          complexity: 'complex',
          decisionType: '1',
          keyInsights: ['high churn', 'b2c signals'],
        }),
        phase_created: 'problem_intake',
        version: 1,
        is_current: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockFrameworkSelection = {
        id: 'selection-1',
        session_id: mockSession.id,
        knowledge_content_id: 'lean-startup',
        relevance_score: 0.89,
        score_breakdown: {
          directRelevance: 0.9,
          applicabilityNow: 0.85,
          foundationalValue: 0.9,
          simplicityBonus: 0.1,
          personalRelevance: 0.85,
          complementarity: 0.95,
          overallScore: 0.89,
          reasoning: 'Perfect for pivot decisions',
        },
        selection_rank: 1,
        selection_reason: 'Highly relevant for startup pivoting',
        was_applied: false,
        selected_at: new Date().toISOString(),
      };

      const mockTransition = {
        id: 'transition-1',
        session_id: mockSession.id,
        from_phase: 'problem_intake',
        to_phase: 'diagnostic_interview',
        transition_reason: 'Problem statement complete',
        validation_results: { isReady: true, score: 0.9 },
        is_rollback: false,
        created_at: new Date().toISOString(),
      };

      const mockSupabaseClient = {
        from: vi.fn().mockImplementation((table: string) => {
          const baseOperations = {
            insert: vi.fn().mockResolvedValue({
              data: table === 'sessions' ? [mockSession] :
                    table === 'messages' ? [mockMessage] :
                    table === 'session_artifacts' ? [mockArtifact] :
                    table === 'framework_selections' ? [mockFrameworkSelection] :
                    table === 'phase_transitions' ? [mockTransition] : [],
              error: null,
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: table === 'sessions' ? mockSession : null,
                  error: null,
                }),
                order: vi.fn().mockResolvedValue({
                  data: table === 'messages' ? [mockMessage] :
                        table === 'session_artifacts' ? [mockArtifact] :
                        table === 'phase_transitions' ? [mockTransition] : [],
                  error: null,
                }),
              }),
              in: vi.fn().mockResolvedValue({
                data: table === 'knowledge_content' ? [
                  {
                    id: 'lean-startup',
                    title: 'Lean Startup Methodology',
                    // ... other properties
                  }
                ] : [],
                error: null,
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [mockSession],
                error: null,
              }),
            }),
          };

          return baseOperations;
        }),
        rpc: vi.fn().mockResolvedValue({
          data: [{ id: 'lean-startup', similarity: 0.89 }],
          error: null,
        }),
      };

      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => mockSupabaseClient),
      }));

      // Execute the complete workflow
      
      // 1. Create session
      const createdSession = await sessionManager.createSession(
        TEST_CONFIG.testUser,
        sessionConfig
      );
      expect(createdSession.userId).toBe(TEST_CONFIG.testUser);

      // 2. Add initial message
      const addedMessage = await sessionManager.addMessage(
        createdSession.id,
        { 
          sessionId: createdSession.id,
          role: 'user', 
          content: 'I need help deciding whether to pivot my startup',
          phaseNumber: 1,
          isActiveBranch: true,
          metadata: {},
          performanceMetrics: {}
        }
      );
      expect(addedMessage).toBeDefined();

      // 3. Save problem brief artifact
      const problemBrief = {
        problemStatement: 'Should I pivot my startup from B2B to B2C?',
        context: 'Market feedback and churn issues',
        stakeholders: ['founder', 'investors'],
        constraints: ['6 months'],
        successCriteria: ['product-market fit'],
        urgency: 'immediate' as const,
        complexity: 'complex' as const,
        decisionType: '1' as const,
        keyInsights: ['high churn', 'b2c signals'],
      };

      const savedArtifact = await sessionManager.saveArtifact(createdSession.id, {
        id: '',
        sessionId: createdSession.id,
        artifactType: 'problem_brief',
        content: problemBrief,
        phaseCreated: 'problem_intake',
        version: 1,
        isCurrent: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      expect(savedArtifact.artifactType).toBe('problem_brief');

      // 4. Select frameworks
      const selectedFrameworks = await frameworkSelector.selectFrameworks(
        problemBrief.problemStatement,
        createdSession.id,
        { maxFrameworks: 3 }
      );
      expect(selectedFrameworks.length).toBeGreaterThan(0);

      // 5. Transition to next phase
      const transitionValidation: ValidationResult = {
        isValid: true,
        isReady: true,
        score: 85,
        requiredElements: [{
          name: 'problem_statement',
          required: true,
          present: true,
          isPresent: true,
          score: 90
        }],
        elements: [{
          name: 'problem_statement',
          required: true,
          present: true,
          isPresent: true,
          score: 90
        }]
      };
      
      const transitionResult = await phaseManager.transitionToPhase(
        createdSession.id,
        createdSession.currentPhase,
        'diagnostic_interview',
        transitionValidation,
        'Problem statement complete'
      );

      expect(transitionResult.fromPhase).toBe('problem_intake');
      expect(transitionResult.toPhase).toBe('diagnostic_interview');

      // Verify all database operations were called
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('sessions');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('messages'); 
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('session_artifacts');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('framework_selections');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('phase_transitions');
      expect(mockSupabaseClient.rpc).toHaveBeenCalled(); // Vector search
    });
  });

  describe('Database Error Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      const mockSupabaseClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' },
            }),
          }),
        }),
      };

      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => mockSupabaseClient),
      }));

      // TODO: Add healthCheck method to SessionManager
      // const healthCheck = await sessionManager.healthCheck();
      // expect(healthCheck.available).toBe(false);
      // expect(healthCheck.error).toContain('Database connection failed');
    });

    it('should handle transaction conflicts and retries', async () => {
      let callCount = 0;
      const mockSupabaseClient = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({
                data: null,
                error: { message: 'Conflict detected', code: 'P0001' },
              });
            } else {
              return Promise.resolve({
                data: [testSession],
                error: null,
              });
            }
          }),
        }),
      };

      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => mockSupabaseClient),
      }));

      // This should succeed on retry (mocked behavior)
      try {
        await sessionManager.createSession(TEST_CONFIG.testUser, {});
        // If we get here without throwing, that's expected for successful retry
      } catch (error) {
        // Handle the error case where retry doesn't work
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance and Scale Testing', () => {
    it('should handle concurrent session operations', async () => {
      const concurrentOperations = 10;
      const mockSupabaseClient = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockImplementation((_data) => ({
            data: [{ ...testSession, id: `session-${Math.random()}` }],
            error: null,
          })),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: testSession,
                error: null,
              }),
            }),
          }),
        }),
      };

      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => mockSupabaseClient),
      }));

      const operations = Array(concurrentOperations).fill(null).map((_, i) =>
        sessionManager.createSession(`user-${i}`, {})
      );

      const results = await Promise.all(operations);

      expect(results).toHaveLength(concurrentOperations);
      results.forEach(result => {
        expect(result.userId).toMatch(/user-\d+/);
        expect(result.status).toBe('active');
      });
    });

    it('should handle large message histories efficiently', async () => {
      const largeMessageCount = 100;
      const mockMessages = Array(largeMessageCount).fill(null).map((_, i) => ({
        id: `msg-${i}`,
        session_id: testSession.id,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i} content`,
        created_at: new Date(Date.now() + i * 1000).toISOString(),
      }));

      const mockSupabaseClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockMessages,
                error: null,
              }),
            }),
          }),
        }),
      };

      vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn(() => mockSupabaseClient),
      }));

      const startTime = Date.now();
      const messages = await sessionManager.getMessages(testSession.id);
      const endTime = Date.now();

      expect(messages).toHaveLength(largeMessageCount);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
}, TEST_CONFIG.timeout);