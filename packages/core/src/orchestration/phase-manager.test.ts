/**
 * Tests for PhaseManager - State machine for Phoenix Framework phases
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PhaseManager } from './phase-manager';
import type { 
  PhoenixPhase, 
  PhaseContext, 
  ValidationResult, 
  PhaseTransition, 
  Session,
  CoreMessage 
} from '../types';

// Mock Supabase for phase transitions storage
const mockSupabaseInsert = vi.fn();
const mockSupabaseClient = {
  from: vi.fn().mockReturnValue({
    insert: mockSupabaseInsert.mockResolvedValue({ data: [], error: null }),
  }),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// Mock environment variables
Object.assign(process.env, {
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
});

describe('PhaseManager', () => {
  let phaseManager: PhaseManager;

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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessage: CoreMessage = {
    role: 'user',
    content: 'I need help with a decision',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    phaseManager = new PhaseManager();
    
    // Reset Supabase mock
    mockSupabaseInsert.mockResolvedValue({ data: [], error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize successfully', () => {
      expect(() => new PhaseManager()).not.toThrow();
    });

    it('should throw error when Supabase configuration is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      
      expect(() => new PhaseManager()).toThrow('Missing Supabase configuration');
      
      // Restore for other tests
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    });
  });

  describe('getPhaseDefinition', () => {
    it('should return correct definition for problem_intake', () => {
      const definition = phaseManager.getPhaseDefinition('problem_intake');
      
      expect(definition.phase).toBe('problem_intake');
      expect(definition.name).toBe('Problem Intake');
      expect(definition.description).toContain('problem statement');
      expect(definition.requiredElements).toContain('problem_statement');
      expect(definition.validationRules).toBeDefined();
      expect(definition.preferredModel).toBe('gpt-4.1');
    });

    it('should return correct definition for diagnostic_interview', () => {
      const definition = phaseManager.getPhaseDefinition('diagnostic_interview');
      
      expect(definition.phase).toBe('diagnostic_interview');
      expect(definition.name).toBe('Diagnostic Interview');
      expect(definition.preferredModel).toBe('gpt-4.1');
      expect(definition.timeoutMs).toBe(45000);
    });

    it('should return correct definition for framework_selection', () => {
      const definition = phaseManager.getPhaseDefinition('framework_selection');
      
      expect(definition.phase).toBe('framework_selection');
      expect(definition.name).toBe('Framework Selection');
      expect(definition.preferredModel).toBe('gemini-2.5-pro');
      expect(definition.timeoutMs).toBe(60000);
    });

    it('should throw error for invalid phase', () => {
      expect(() => {
        // @ts-expect-error - Testing invalid phase
        phaseManager.getPhaseDefinition('invalid_phase');
      }).toThrow('Unknown phase: invalid_phase');
    });
  });

  describe('validatePhaseReadiness', () => {
    it('should validate problem_intake phase readiness', async () => {
      const context: PhaseContext = {
        currentPhase: 'problem_intake',
        phaseState: { step: 'complete' },
        artifacts: [{
          id: 'artifact-1',
          sessionId: 'session-123',
          artifactType: 'problem_brief',
          content: {
            problemStatement: 'Should I pivot?',
            context: 'Market changes',
            stakeholders: ['founder'],
            constraints: ['time'],
            successCriteria: ['clarity'],
            urgency: 'high' as const,
            complexity: 'moderate' as const,
            decisionType: '2' as const,
            keyInsights: ['feedback'],
          },
          phaseCreated: 'problem_intake',
          version: 1,
          isCurrent: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
        messages: [mockMessage],
      };

      const result = await phaseManager.validatePhaseReadiness('problem_intake', context);

      expect(result.isReady).toBe(true);
      expect(result.score).toBeGreaterThan(0.8);
      expect(result.missingElements).toHaveLength(0);
      expect(result.elements.find(e => e.name === 'problem_statement')?.isPresent).toBe(true);
    });

    it('should identify missing elements in problem_intake', async () => {
      const context: PhaseContext = {
        currentPhase: 'problem_intake',
        phaseState: { step: 'initial' },
        artifacts: [],
        messages: [],
      };

      const result = await phaseManager.validatePhaseReadiness('problem_intake', context);

      expect(result.isReady).toBe(false);
      expect(result.score).toBeLessThan(0.5);
      expect(result.missingElements).toContain('problem_statement');
      expect(result.elements.find(e => e.name === 'problem_statement')?.isPresent).toBe(false);
    });

    it('should validate diagnostic_interview phase readiness', async () => {
      const context: PhaseContext = {
        currentPhase: 'diagnostic_interview',
        phaseState: { 
          step: 'complete',
          questionsAsked: 5,
          insightsGathered: 3,
        },
        artifacts: [{
          id: 'artifact-1',
          sessionId: 'session-123',
          artifactType: 'diagnostic_notes',
          content: {
            keyFindings: ['finding1', 'finding2'],
            stakeholderInsights: ['insight1'],
            constraintAnalysis: ['constraint1'],
            riskFactors: ['risk1'],
            opportunityAreas: ['opportunity1'],
          },
          phaseCreated: 'diagnostic_interview',
          version: 1,
          isCurrent: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
        messages: Array(6).fill(mockMessage), // 6 messages for good interaction
      };

      const result = await phaseManager.validatePhaseReadiness('diagnostic_interview', context);

      expect(result.isReady).toBe(true);
      expect(result.score).toBeGreaterThan(0.8);
    });

    it('should validate framework_selection phase readiness', async () => {
      const context: PhaseContext = {
        currentPhase: 'framework_selection',
        phaseState: { 
          step: 'complete',
          frameworksSelected: 2,
        },
        frameworkSelections: [{
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
            reasoning: 'High relevance',
          },
          selectionRank: 1,
          selectionReason: 'Primary framework',
          wasApplied: false,
          selectedAt: new Date(),
        }],
        messages: [mockMessage],
      };

      const result = await phaseManager.validatePhaseReadiness('framework_selection', context);

      expect(result.isReady).toBe(true);
      expect(result.score).toBeGreaterThan(0.8);
    });
  });

  describe('canTransitionTo', () => {
    it('should allow transition from problem_intake to diagnostic_interview', async () => {
      const context: PhaseContext = {
        currentPhase: 'problem_intake',
        phaseState: { step: 'complete' },
        artifacts: [{
          id: 'artifact-1',
          sessionId: 'session-123',
          artifactType: 'problem_brief',
          content: {
            problemStatement: 'Should I pivot?',
            context: 'Market changes',
            stakeholders: ['founder'],
            constraints: ['time'],
            successCriteria: ['clarity'],
            urgency: 'high' as const,
            complexity: 'moderate' as const,
            decisionType: '2' as const,
            keyInsights: ['feedback'],
          },
          phaseCreated: 'problem_intake',
          version: 1,
          isCurrent: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
        messages: [mockMessage],
      };

      const result = await phaseManager.canTransitionTo('diagnostic_interview', context);

      expect(result.canTransition).toBe(true);
      expect(result.reason).toContain('ready');
    });

    it('should prevent transition when current phase is not ready', async () => {
      const context: PhaseContext = {
        currentPhase: 'problem_intake',
        phaseState: { step: 'initial' },
        artifacts: [],
        messages: [],
      };

      const result = await phaseManager.canTransitionTo('diagnostic_interview', context);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('not ready');
      expect(result.missingElements).toBeDefined();
    });

    it('should prevent invalid phase transitions', async () => {
      const context: PhaseContext = {
        currentPhase: 'problem_intake',
        phaseState: { step: 'complete' },
        artifacts: [],
        messages: [],
      };

      const result = await phaseManager.canTransitionTo('commitment_memo', context);

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Invalid transition');
    });

    it('should allow rollback transitions', async () => {
      const context: PhaseContext = {
        currentPhase: 'framework_selection',
        phaseState: { step: 'initial' },
        artifacts: [],
        messages: [],
      };

      const result = await phaseManager.canTransitionTo('problem_intake', context);

      expect(result.canTransition).toBe(true);
      expect(result.reason).toContain('Rollback');
    });
  });

  describe('transitionToPhase', () => {
    const context: PhaseContext = {
      currentPhase: 'problem_intake',
      phaseState: { step: 'complete' },
      artifacts: [{
        id: 'artifact-1',
        sessionId: 'session-123',
        artifactType: 'problem_brief',
        content: {
          problemStatement: 'Should I pivot?',
          context: 'Market changes',
          stakeholders: ['founder'],
          constraints: ['time'],
          successCriteria: ['clarity'],
          urgency: 'high' as const,
          complexity: 'moderate' as const,
          decisionType: '2' as const,
          keyInsights: ['feedback'],
        },
        phaseCreated: 'problem_intake',
        version: 1,
        isCurrent: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
      messages: [mockMessage],
    };

    it('should successfully transition to next phase', async () => {
      const result = await phaseManager.transitionToPhase(
        mockSession,
        'diagnostic_interview',
        context,
        'User requested detailed analysis'
      );

      expect(result.success).toBe(true);
      expect(result.transition?.fromPhase).toBe('problem_intake');
      expect(result.transition?.toPhase).toBe('diagnostic_interview');
      expect(result.transition?.transitionReason).toBe('User requested detailed analysis');
      expect(result.transition?.validationResults.isReady).toBe(true);
      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: 'session-123',
          from_phase: 'problem_intake',
          to_phase: 'diagnostic_interview',
        })
      );
    });

    it('should fail transition when not allowed', async () => {
      const invalidContext: PhaseContext = {
        currentPhase: 'problem_intake',
        phaseState: { step: 'initial' },
        artifacts: [],
        messages: [],
      };

      const result = await phaseManager.transitionToPhase(
        mockSession,
        'diagnostic_interview',
        invalidContext,
        'Invalid transition attempt'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not ready');
      expect(result.transition).toBeUndefined();
    });

    it('should handle database errors during transition', async () => {
      mockSupabaseInsert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await phaseManager.transitionToPhase(
        mockSession,
        'diagnostic_interview',
        context,
        'Test transition'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to log phase transition');
    });
  });

  describe('getValidTransitions', () => {
    it('should return valid transitions for problem_intake', () => {
      const transitions = phaseManager.getValidTransitions('problem_intake');
      
      expect(transitions).toContain('diagnostic_interview');
      expect(transitions).toContain('type_classification');
      expect(transitions.length).toBeGreaterThan(0);
    });

    it('should return valid transitions for diagnostic_interview', () => {
      const transitions = phaseManager.getValidTransitions('diagnostic_interview');
      
      expect(transitions).toContain('type_classification');
      expect(transitions).toContain('framework_selection');
      expect(transitions).toContain('problem_intake'); // rollback
    });

    it('should return valid transitions for commitment_memo', () => {
      const transitions = phaseManager.getValidTransitions('commitment_memo');
      
      // Commitment memo can rollback to any previous phase
      expect(transitions).toContain('problem_intake');
      expect(transitions).toContain('diagnostic_interview');
      expect(transitions).toContain('framework_application');
    });

    it('should throw error for invalid phase', () => {
      expect(() => {
        // @ts-expect-error - Testing invalid phase
        phaseManager.getValidTransitions('invalid_phase');
      }).toThrow('Unknown phase: invalid_phase');
    });
  });

  describe('rollbackToPhase', () => {
    it('should successfully rollback to previous phase', async () => {
      const currentContext: PhaseContext = {
        currentPhase: 'framework_selection',
        phaseState: { step: 'initial' },
        artifacts: [],
        messages: [],
      };

      const result = await phaseManager.rollbackToPhase(
        mockSession,
        'problem_intake',
        currentContext,
        'User wants to revise problem statement'
      );

      expect(result.success).toBe(true);
      expect(result.transition?.fromPhase).toBe('framework_selection');
      expect(result.transition?.toPhase).toBe('problem_intake');
      expect(result.transition?.isRollback).toBe(true);
    });

    it('should prevent rollback to invalid phase', async () => {
      const currentContext: PhaseContext = {
        currentPhase: 'problem_intake',
        phaseState: { step: 'initial' },
        artifacts: [],
        messages: [],
      };

      const result = await phaseManager.rollbackToPhase(
        mockSession,
        'commitment_memo',
        currentContext,
        'Invalid rollback'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot rollback');
    });
  });

  describe('getPhaseHistory', () => {
    it('should return empty array when no history exists', async () => {
      // Mock empty database response
      const mockFrom = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockFrom);

      const history = await phaseManager.getPhaseHistory('session-123');

      expect(history).toEqual([]);
    });

    it('should return phase transitions history', async () => {
      const mockTransitions = [
        {
          id: 'transition-1',
          session_id: 'session-123',
          from_phase: 'problem_intake',
          to_phase: 'diagnostic_interview',
          transition_reason: 'Progress to next phase',
          is_rollback: false,
          created_at: new Date().toISOString(),
          validation_results: { isReady: true, score: 0.9 },
        },
      ];

      const mockFrom = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockTransitions,
              error: null,
            }),
          }),
        }),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockFrom);

      const history = await phaseManager.getPhaseHistory('session-123');

      expect(history).toHaveLength(1);
      expect(history[0].fromPhase).toBe('problem_intake');
      expect(history[0].toPhase).toBe('diagnostic_interview');
      expect(history[0].isRollback).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed phase state', async () => {
      const malformedContext: PhaseContext = {
        currentPhase: 'problem_intake',
        // @ts-expect-error - Testing malformed state
        phaseState: null,
        artifacts: [],
        messages: [],
      };

      const result = await phaseManager.validatePhaseReadiness('problem_intake', malformedContext);

      expect(result.isReady).toBe(false);
      expect(result.score).toBe(0);
    });

    it('should handle missing artifacts gracefully', async () => {
      const context: PhaseContext = {
        currentPhase: 'diagnostic_interview',
        phaseState: { step: 'complete' },
        // @ts-expect-error - Testing missing artifacts
        artifacts: null,
        messages: [mockMessage],
      };

      const result = await phaseManager.validatePhaseReadiness('diagnostic_interview', context);

      expect(result.isReady).toBe(false);
      expect(result.elements.find(e => e.name === 'diagnostic_notes')?.isPresent).toBe(false);
    });

    it('should handle very long session with many transitions', async () => {
      const manyTransitions = Array(100).fill(null).map((_, i) => ({
        id: `transition-${i}`,
        session_id: 'session-123',
        from_phase: i % 2 === 0 ? 'problem_intake' : 'diagnostic_interview',
        to_phase: i % 2 === 0 ? 'diagnostic_interview' : 'problem_intake',
        transition_reason: `Transition ${i}`,
        is_rollback: i > 50,
        created_at: new Date(Date.now() - i * 60000).toISOString(),
        validation_results: { isReady: true, score: 0.8 },
      }));

      const mockFrom = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: manyTransitions,
              error: null,
            }),
          }),
        }),
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockFrom);

      const history = await phaseManager.getPhaseHistory('session-123');

      expect(history).toHaveLength(100);
      expect(history.filter(t => t.isRollback)).toHaveLength(49); // transitions 51-99
    });
  });
});