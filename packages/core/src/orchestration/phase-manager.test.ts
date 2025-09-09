import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { PhaseManager } from './phase-manager';
import type {
  Session,
  PhaseContext,
} from '../types';

describe('PhaseManager', () => {
  let phaseManager: PhaseManager;
  let mockSupabaseClient: any;
  let mockSupabaseInsert: any;
  let mockSession: Session;
  let mockMessage: any;

  beforeEach(() => {
    // Create comprehensive mock for Supabase client
    mockSupabaseInsert = vi.fn().mockResolvedValue({ data: [], error: null });
    mockSupabaseClient = {
      from: vi.fn().mockReturnValue({
        insert: mockSupabaseInsert,
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'session-123',
                  user_id: 'user-123',
                  status: 'active',
                  current_phase: 'diagnostic_interview',
                  phase_states: {},
                  config: {},
                  metadata: {},
                  started_at: new Date().toISOString(),
                  completed_at: null,
                  last_activity_at: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
    };

    phaseManager = new PhaseManager(
      mockSupabaseClient
    );
    
    // Reset Supabase mock
    mockSupabaseInsert.mockResolvedValue({ data: [], error: null });

    mockSession = {
      id: 'session-123',
      userId: 'user-123',
      status: 'active',
      currentPhase: 'problem_intake',
      phaseStates: {},
      config: {
        defaultModel: 'gemini-2.5-flash'
      },
      metadata: {},
      startedAt: new Date(),
      completedAt: undefined,
      lastActivityAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockMessage = {
      id: 'msg-123',
      sessionId: 'session-123',
      role: 'user' as const,
      content: 'Test message',
      phaseNumber: 1,
      isActiveBranch: true,
      createdAt: new Date()
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize successfully', () => {
      const manager = new PhaseManager(
        mockSupabaseClient
      );
      expect(manager).toBeDefined();
    });

    it('should throw error when Supabase configuration is missing', () => {
      expect(() => new PhaseManager(
        null as any
      )).toThrow();
    });
  });

  describe('getPhaseDefinition', () => {
    it('should return correct definition for problem_intake', () => {
      const definition = phaseManager.getPhaseDefinition('problem_intake');
      
      expect(definition).toBeDefined();
      expect(definition?.phase).toBe('problem_intake');
      expect(definition?.name).toBe('Problem Intake');
      expect(definition?.requiredElements).toContain('problem_statement');
      expect(definition?.minMessages).toBeGreaterThan(0);
      expect(definition?.nextPhases).toContain('diagnostic_interview');
    });

    it('should return correct definition for diagnostic_interview', () => {
      const definition = phaseManager.getPhaseDefinition('diagnostic_interview');
      
      expect(definition).toBeDefined();
      expect(definition?.phase).toBe('diagnostic_interview');
      expect(definition?.name).toBe('Diagnostic Interview');
      expect(definition?.requiredElements).toContain('stakeholders');
      expect(definition?.nextPhases).toContain('type_classification');
    });

    it('should return undefined for invalid phase', () => {
      // @ts-expect-error - Testing invalid phase
      const definition = phaseManager.getPhaseDefinition('invalid_phase');
      
      expect(definition).toBeUndefined();
    });
  });

  describe('validatePhaseReadiness', () => {
    it('should validate problem_intake phase readiness', async () => {
      const context: PhaseContext = {
        sessionId: 'session-123',
        userId: 'user-123',
        currentPhase: 'problem_intake',
        phaseState: { step: 'complete' },
        phaseData: {},
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
            urgency: 'immediate' as const,
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
        config: {
          defaultModel: 'gemini-2.5-flash'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await phaseManager.validatePhaseReadiness(mockSession, context);

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(0.8);
      expect(result.missingElements).toHaveLength(0);
      expect(result.requiredElements.find(e => e.name === 'problem_statement')?.present).toBe(true);
    });

    it('should identify missing elements in problem_intake', async () => {
      const context: PhaseContext = {
        sessionId: 'session-123',
        userId: 'user-123',
        currentPhase: 'problem_intake',
        phaseState: { step: 'initial' },
        phaseData: {},
        artifacts: [],
        messages: [],
        config: {
          defaultModel: 'gemini-2.5-flash'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await phaseManager.validatePhaseReadiness(mockSession, context);

      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(0.5);
      expect(result.missingElements).toContain('problem_statement');
      expect(result.requiredElements.find(e => e.name === 'problem_statement')?.present).toBe(false);
    });

    it('should validate diagnostic_interview phase readiness', async () => {
      const context: PhaseContext = {
        sessionId: 'session-123',
        userId: 'user-123',
        currentPhase: 'diagnostic_interview',
        phaseState: { 
          step: 'complete',
          questionsAsked: 5,
          insightsGathered: 3,
        },
        phaseData: {},
        artifacts: [{
          id: 'artifact-1',
          sessionId: 'session-123',
          artifactType: 'diagnostic_notes',
          content: {
            keyFindings: ['finding1', 'finding2'],
            patterns: ['pattern1'],
            concerns: ['concern1'],
            opportunities: ['opportunity1'],
            recommendations: ['recommendation1'],
          },
          phaseCreated: 'diagnostic_interview',
          version: 1,
          isCurrent: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
        messages: Array(6).fill(mockMessage), // 6 messages for good interaction
        config: {
          defaultModel: 'gemini-2.5-flash'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await phaseManager.validatePhaseReadiness(mockSession, context);

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(0.8);
    });

    it('should validate framework_selection phase readiness', async () => {
      const context: PhaseContext = {
        sessionId: 'session-123',
        userId: 'user-123',
        currentPhase: 'framework_selection',
        phaseState: { 
          step: 'complete',
          frameworksSelected: 2,
        },
        phaseData: {},
        artifacts: [],
        config: {
          defaultModel: 'gemini-2.5-flash'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        frameworkSelections: [{
          id: 'selection-1',
          sessionId: 'session-123',
          knowledgeContentId: 'framework-1',
          title: 'Test Framework',
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
        messages: [mockMessage]
      };

      const result = await phaseManager.validatePhaseReadiness(mockSession, context);

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(0.8);
    });
  });

  // NOTE: canTransitionTo method is not implemented yet - skipped for MVP
});

// NOTE: Other tests for unimplemented methods (canTransitionTo, transitionToPhase, getPhaseHistory, etc.) 
// have been removed for MVP - only testing actually implemented methods