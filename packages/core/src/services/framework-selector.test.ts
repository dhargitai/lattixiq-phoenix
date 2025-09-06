/**
 * Tests for FrameworkSelector Service
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FrameworkSelector } from './framework-selector';
import type { FrameworkSelectionOptions, TargetPersona, StartupPhase } from '../types';

// Mock OpenAI
const mockEmbeddingsCreate = vi.fn().mockResolvedValue({
  data: [{ embedding: new Array(1536).fill(0.1) }],
});

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      embeddings = {
        create: mockEmbeddingsCreate,
      };
    },
  };
});

// Mock Supabase
const mockSupabaseInsert = vi.fn();
const mockSupabaseRpc = vi.fn();

// Create a chainable mock structure
const createChainableMock = (finalResult: any) => {
  const insertMock = vi.fn().mockResolvedValue(finalResult);
  mockSupabaseInsert.mockImplementation(insertMock);
  
  return {
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(finalResult),
      }),
      eq: vi.fn().mockResolvedValue(finalResult),
      limit: vi.fn().mockResolvedValue(finalResult),
    }),
    insert: insertMock,
  };
};

const mockSupabaseClient = {
  rpc: mockSupabaseRpc,
  from: vi.fn().mockImplementation((table: string) => {
    if (table === 'framework_selections') {
      return {
        insert: mockSupabaseInsert.mockResolvedValue({ data: [], error: null }),
      };
    }
    return createChainableMock({
      data: table === 'knowledge_content' ? mockKnowledgeContent : [],
      error: null,
    });
  }),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// Mock environment variables
const mockEnv = {
  OPENAI_API_KEY: 'test-openai-key',
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
};

Object.assign(process.env, mockEnv);

// Mock data
const mockKnowledgeContent = [
  {
    id: 'content-1',
    title: 'First Principles Thinking',
    type: 'mental-model',
    main_category: 'Decision Making',
    subcategory: 'Analysis',
    definition: 'Breaking down complex problems into fundamental truths',
    key_takeaway: 'Question assumptions and build from basics',
    hook: 'What if everything you think you know is wrong?',
    analogy_or_metaphor: 'Like peeling an onion layer by layer',
    classic_example: 'Elon Musk\'s approach to rocket design',
    modern_example: 'Tesla challenging auto industry assumptions',
    visual_metaphor: 'A foundation being built from bedrock',
    payoff: 'Breakthrough insights and innovative solutions',
    pitfall: 'Can be time-consuming and mentally taxing',
    dive_deeper_mechanism: 'Systematic questioning of beliefs',
    dive_deeper_origin_story: 'Originated with Aristotle',
    dive_deeper_pitfalls_nuances: 'May paralyze decision-making',
    extra_content: 'Additional framework details',
    target_persona: ['founder', 'executive'],
    startup_phase: ['ideation', 'growth'],
    problem_category: ['strategy', 'innovation'],
    super_model: true,
    language: 'English',
  },
  {
    id: 'content-2',
    title: 'OODA Loop',
    type: 'strategic-framework',
    main_category: 'Decision Making',
    subcategory: 'Process',
    definition: 'Observe-Orient-Decide-Act cycle for rapid decisions',
    key_takeaway: 'Speed of decision-making beats perfection',
    hook: 'In business, speed kills... the competition',
    analogy_or_metaphor: 'Like a fighter pilot in combat',
    classic_example: 'Military tactical decisions',
    modern_example: 'Agile software development',
    visual_metaphor: 'A spinning wheel of continuous action',
    payoff: 'Faster adaptation to changing conditions',
    pitfall: 'May sacrifice thoroughness for speed',
    dive_deeper_mechanism: 'Iterative decision loops',
    dive_deeper_origin_story: 'Developed by John Boyd',
    dive_deeper_pitfalls_nuances: 'Requires discipline to execute',
    extra_content: 'Framework implementation guide',
    target_persona: ['founder', 'product_manager'],
    startup_phase: ['growth', 'scale-up'],
    problem_category: ['operations', 'competition'],
    super_model: false,
    language: 'English',
  },
];

const mockSearchResults = [
  { id: 'content-1', title: 'First Principles Thinking', similarity: 0.89 },
  { id: 'content-2', title: 'OODA Loop', similarity: 0.76 },
];

describe('FrameworkSelector', () => {
  let frameworkSelector: FrameworkSelector;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset OpenAI mock
    mockEmbeddingsCreate.mockResolvedValue({
      data: [{ embedding: new Array(1536).fill(0.1) }],
    });
    
    // Setup default mock responses
    mockSupabaseRpc.mockResolvedValue({
      data: mockSearchResults,
      error: null,
    });
    
    // Reset the from mock to return fresh chainable mocks
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'framework_selections') {
        return {
          insert: mockSupabaseInsert.mockResolvedValue({ data: [], error: null }),
        };
      }
      return createChainableMock({
        data: table === 'knowledge_content' ? mockKnowledgeContent : [],
        error: null,
      });
    });

    frameworkSelector = new FrameworkSelector();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize successfully with required environment variables', () => {
      expect(() => new FrameworkSelector()).not.toThrow();
    });

    it('should throw error when OpenAI API key is missing', () => {
      delete process.env.OPENAI_API_KEY;
      
      expect(() => new FrameworkSelector()).toThrow('Missing OPENAI_API_KEY');
      
      // Restore for other tests
      process.env.OPENAI_API_KEY = mockEnv.OPENAI_API_KEY;
    });

    it('should throw error when Supabase configuration is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      
      expect(() => new FrameworkSelector()).toThrow('Missing Supabase configuration');
      
      // Restore for other tests  
      process.env.NEXT_PUBLIC_SUPABASE_URL = mockEnv.NEXT_PUBLIC_SUPABASE_URL;
    });
  });

  describe('selectFrameworks', () => {
    const problemStatement = 'I need to decide whether to pivot my startup';
    const sessionId = 'test-session-123';

    it('should select frameworks successfully with default options', async () => {
      const result = await frameworkSelector.selectFrameworks(problemStatement, sessionId);

      expect(result).toHaveLength(2);
      expect(result[0].knowledgeContentId).toBe('content-1'); // Super model should be first
      expect(result[0].selectionRank).toBe(1);
      expect(result[0].scoreBreakdown).toBeDefined();
      expect(result[0].scoreBreakdown.directRelevance).toBeGreaterThan(0.8);
    });

    it('should limit results based on maxFrameworks option', async () => {
      const options: FrameworkSelectionOptions = { maxFrameworks: 1 };
      
      const result = await frameworkSelector.selectFrameworks(
        problemStatement,
        sessionId,
        options
      );

      expect(result).toHaveLength(1);
      expect(result[0].knowledgeContentId).toBe('content-1'); // Super model first
    });

    it('should filter by target persona', async () => {
      const options: FrameworkSelectionOptions = {
        targetPersona: ['product_manager' as TargetPersona],
      };
      
      const result = await frameworkSelector.selectFrameworks(
        problemStatement,
        sessionId,
        options
      );

      // Should only return OODA Loop which has product_manager persona
      expect(result).toHaveLength(1);
      expect(result[0].knowledgeContentId).toBe('content-2');
    });

    it('should filter by startup phase', async () => {
      const options: FrameworkSelectionOptions = {
        startupPhase: ['scale-up' as StartupPhase],
      };
      
      const result = await frameworkSelector.selectFrameworks(
        problemStatement,
        sessionId,
        options
      );

      // Should only return OODA Loop which has scale-up phase
      expect(result).toHaveLength(1);
      expect(result[0].knowledgeContentId).toBe('content-2');
    });

    it('should apply minimum similarity threshold', async () => {
      // Mock search results with high threshold - should only return high similarity result
      mockSupabaseRpc.mockResolvedValueOnce({
        data: [{ id: 'content-1', title: 'First Principles Thinking', similarity: 0.89 }],
        error: null,
      });

      // Mock the full content query to only return the filtered content
      const filteredContent = mockKnowledgeContent.filter(c => c.id === 'content-1');
      mockSupabaseClient.from.mockImplementationOnce(() => createChainableMock({
        data: filteredContent,
        error: null,
      }));

      const options: FrameworkSelectionOptions = {
        minSimilarityScore: 0.8,
      };
      
      const result = await frameworkSelector.selectFrameworks(
        problemStatement,
        sessionId,
        options
      );

      // Should only return First Principles (0.89) not OODA Loop (0.76)
      expect(result).toHaveLength(1);
      expect(result[0].knowledgeContentId).toBe('content-1');
    });

    it('should include super models when enabled', async () => {
      const options: FrameworkSelectionOptions = {
        includeSuperModels: true,
      };
      
      const result = await frameworkSelector.selectFrameworks(
        problemStatement,
        sessionId,
        options
      );

      // Super model should be ranked first
      expect(result[0].knowledgeContentId).toBe('content-1');
      expect(result[0].scoreBreakdown.foundationalValue).toBeGreaterThan(0.85);
    });

    it('should exclude super models when disabled', async () => {
      const options: FrameworkSelectionOptions = {
        includeSuperModels: false,
      };
      
      const result = await frameworkSelector.selectFrameworks(
        problemStatement,
        sessionId,
        options
      );

      // Should not include any super models
      const hasSuperModel = result.some(selection => {
        const content = mockKnowledgeContent.find(c => c.id === selection.knowledgeContentId);
        return content?.super_model;
      });
      expect(hasSuperModel).toBe(false);
      
      // Non-super model should be first when super models excluded
      expect(result[0].knowledgeContentId).toBe('content-2');
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      });

      await expect(
        frameworkSelector.selectFrameworks(problemStatement, sessionId)
      ).rejects.toThrow('Framework selection failed');
    });

    it('should handle empty search results', async () => {
      mockSupabaseRpc.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await frameworkSelector.selectFrameworks(problemStatement, sessionId);
      
      expect(result).toHaveLength(0);
    });

    it('should store framework selections in database', async () => {
      await frameworkSelector.selectFrameworks(problemStatement, sessionId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('framework_selections');
      expect(mockSupabaseInsert).toHaveBeenCalled();

      const insertCall = mockSupabaseInsert.mock.calls[0][0];
      expect(insertCall).toHaveLength(2);
      expect(insertCall[0]).toMatchObject({
        session_id: sessionId,
        knowledge_content_id: 'content-1',
        selection_rank: 1,
      });
    });
  });

  describe('Score Calculation', () => {
    it('should calculate higher scores for super models', async () => {
      const result = await frameworkSelector.selectFrameworks(
        'Test problem',
        'test-session'
      );

      const superModelSelection = result.find(s => s.knowledgeContentId === 'content-1');
      const regularModelSelection = result.find(s => s.knowledgeContentId === 'content-2');

      expect(superModelSelection?.scoreBreakdown.foundationalValue).toBeGreaterThan(
        regularModelSelection?.scoreBreakdown.foundationalValue || 0
      );
    });

    it('should include reasoning in score breakdown', async () => {
      const result = await frameworkSelector.selectFrameworks(
        'Test problem',
        'test-session'
      );

      expect(result[0].scoreBreakdown.reasoning).toBeTruthy();
      expect(typeof result[0].scoreBreakdown.reasoning).toBe('string');
      expect(result[0].scoreBreakdown.reasoning.length).toBeGreaterThan(0);
    });

    it('should calculate personal relevance based on filters', async () => {
      const options: FrameworkSelectionOptions = {
        targetPersona: ['founder' as TargetPersona],
        startupPhase: ['growth' as StartupPhase],
      };

      const result = await frameworkSelector.selectFrameworks(
        'Test problem',
        'test-session',
        options
      );

      // First Principles has both founder persona and growth phase
      const firstPrinciplesSelection = result.find(s => s.knowledgeContentId === 'content-1');
      expect(firstPrinciplesSelection?.scoreBreakdown.personalRelevance).toBeGreaterThan(0.7);
    });
  });

  describe('healthCheck', () => {
    it('should return available true when services are working', async () => {
      const result = await frameworkSelector.healthCheck();
      
      expect(result.available).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return available false when database fails', async () => {
      // Mock the from().select().limit() chain to return an error
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Connection failed' },
          }),
        }),
      }));

      const result = await frameworkSelector.healthCheck();
      
      expect(result.available).toBe(false);
      expect(result.error).toContain('Connection failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle OpenAI embedding failures', async () => {
      mockEmbeddingsCreate.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      await expect(
        frameworkSelector.selectFrameworks('Test problem', 'test-session')
      ).rejects.toThrow('Framework selection failed');
    });

    it('should handle storage failures gracefully', async () => {
      // Mock successful search but failed storage
      let callCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'framework_selections') {
          return {
            insert: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Storage failed' } 
            }),
          };
        }
        // For knowledge_content queries, return normal mock
        return createChainableMock({
          data: mockKnowledgeContent,
          error: null,
        });
      });

      await expect(
        frameworkSelector.selectFrameworks('Test problem', 'test-session')
      ).rejects.toThrow('Framework selection failed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short problem statements', async () => {
      const result = await frameworkSelector.selectFrameworks('Help', 'test-session');
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle problem statements with special characters', async () => {
      const problemWithSpecialChars = 'Should I pivot? 🤔 My startup is failing... 50% revenue drop!';
      
      const result = await frameworkSelector.selectFrameworks(
        problemWithSpecialChars,
        'test-session'
      );
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle concurrent requests', async () => {
      const promises = [
        frameworkSelector.selectFrameworks('Problem 1', 'session-1'),
        frameworkSelector.selectFrameworks('Problem 2', 'session-2'),
        frameworkSelector.selectFrameworks('Problem 3', 'session-3'),
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });
});