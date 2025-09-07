import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSprintStore } from './useSprintStore';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('useSprintStore', () => {
  beforeEach(() => {
    // Clear all mocks and reset store state
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Reset store to initial state
    act(() => {
      useSprintStore.getState().resetSession();
    });
  });

  describe('Basic State Management', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useSprintStore());
      
      expect(result.current.sessionId).toBeNull();
      expect(result.current.currentStage).toBe('problem-intake');
      expect(result.current.problemInput).toBe('');
      expect(result.current.isCompleted).toBe(false);
      expect(result.current.completedStages).toEqual([]);
    });

    it('should initialize a session with correct properties', () => {
      const { result } = renderHook(() => useSprintStore());
      
      act(() => {
        result.current.initializeSession();
      });

      const state = result.current;
      expect(state.sessionId).toMatch(/^sprint_\d+_[a-z0-9]+$/);
      expect(state.createdAt).toBeInstanceOf(Date);
      expect(state.currentStage).toBe('problem-intake');
      expect(state.completedStages).toEqual([]);
      expect(state.isCompleted).toBe(false);
    });

    it('should update problem input', () => {
      const { result } = renderHook(() => useSprintStore());
      
      act(() => {
        result.current.setProblemInput('Test problem description');
      });

      expect(result.current.problemInput).toBe('Test problem description');
    });

    it('should reset session to initial state', () => {
      const { result } = renderHook(() => useSprintStore());

      // Set some state first
      act(() => {
        result.current.initializeSession();
        result.current.setProblemInput('Test problem');
        result.current.setCurrentStage('diagnostic-interview');
      });

      // Reset session
      act(() => {
        result.current.resetSession();
      });

      const state = result.current;
      expect(state.sessionId).toBeNull();
      expect(state.currentStage).toBe('problem-intake');
      expect(state.problemInput).toBe('');
      expect(state.completedStages).toEqual([]);
    });
  });

  describe('Stage Navigation', () => {
    it('should advance to next stage when stage is completed', () => {
      const { result } = renderHook(() => useSprintStore());
      
      act(() => {
        result.current.markStageCompleted('problem-intake');
        result.current.setCurrentStage('diagnostic-interview');
      });

      expect(result.current.completedStages).toContain('problem-intake');
      expect(result.current.currentStage).toBe('diagnostic-interview');
    });

    it('should mark stages as completed without duplicates', () => {
      const { result } = renderHook(() => useSprintStore());

      act(() => {
        result.current.markStageCompleted('problem-intake');
        result.current.markStageCompleted('diagnostic-interview');
        result.current.markStageCompleted('problem-intake'); // Duplicate
      });

      expect(result.current.completedStages).toEqual([
        'problem-intake',
        'diagnostic-interview'
      ]);
    });

    it('should correctly determine if can advance to stage', () => {
      const { result } = renderHook(() => useSprintStore());

      // Can always advance to first stage
      expect(result.current.canAdvanceToStage('problem-intake')).toBe(true);

      // Cannot advance to later stages without completing previous
      expect(result.current.canAdvanceToStage('diagnostic-interview')).toBe(false);

      // Complete first stage
      act(() => {
        result.current.markStageCompleted('problem-intake');
      });

      // Now can advance to second stage
      expect(result.current.canAdvanceToStage('diagnostic-interview')).toBe(true);
      expect(result.current.canAdvanceToStage('decision-classification')).toBe(false);
    });
  });

  describe('Data Management', () => {
    it('should handle diagnostic responses', () => {
      const { result } = renderHook(() => useSprintStore());
      
      act(() => {
        result.current.addDiagnosticResponse('question1', 'answer1');
        result.current.addDiagnosticResponse('question2', true);
        result.current.addDiagnosticResponse('question3', 42);
        result.current.addDiagnosticResponse('stakeholders', ['team', 'investors']);
      });

      expect(result.current.getDiagnosticResponse('question1')).toBe('answer1');
      expect(result.current.getDiagnosticResponse('question2')).toBe(true);
      expect(result.current.getDiagnosticResponse('question3')).toBe(42);
      expect(result.current.getDiagnosticResponse('stakeholders')).toEqual(['team', 'investors']);
      expect(result.current.getDiagnosticResponse('nonexistent')).toBeUndefined();
    });

    it('should set decision type', () => {
      const { result } = renderHook(() => useSprintStore());
      
      act(() => {
        result.current.setDecisionType('type-1');
      });

      expect(result.current.decisionType).toBe('type-1');

      act(() => {
        result.current.setDecisionType('type-2');
      });

      expect(result.current.decisionType).toBe('type-2');
    });

    it('should set and confirm problem brief', () => {
      const { result } = renderHook(() => useSprintStore());
      const testBrief = {
        summary: 'Test summary',
        context: 'Test context', 
        stakes: 'High stakes',
        constraints: 'Time constraints',
        decisionType: 'type-2' as const,
        urgency: 'high' as const,
        complexity: 'medium' as const,
      };

      act(() => {
        result.current.setProblemBrief(testBrief);
        result.current.confirmProblemBrief();
      });

      expect(result.current.problemBrief).toEqual(testBrief);
      expect(result.current.isProblemBriefConfirmed).toBe(true);
    });
  });

  describe('Session Persistence', () => {
    it('should save session to localStorage', async () => {
      const { result } = renderHook(() => useSprintStore());

      act(() => {
        result.current.initializeSession();
      });

      await act(async () => {
        await result.current.saveSession();
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const [key, value] = localStorageMock.setItem.mock.calls[0];
      expect(key).toMatch(/^phoenix-sprint-sprint_\d+_[a-z0-9]+$/);
      expect(() => JSON.parse(value)).not.toThrow();
    });

    it('should load session from localStorage', async () => {
      const { result } = renderHook(() => useSprintStore());
      const mockSessionData = {
        sessionId: 'sprint_123_abc',
        currentStage: 'framework-selection',
        problemInput: 'Test problem',
        createdAt: '2024-01-01T00:00:00.000Z',
        completedStages: ['problem-intake', 'diagnostic-interview'],
        isCompleted: false,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSessionData));

      await act(async () => {
        await result.current.loadSession('sprint_123_abc');
      });

      const state = result.current;
      expect(state.sessionId).toBe('sprint_123_abc');
      expect(state.currentStage).toBe('framework-selection');
      expect(state.problemInput).toBe('Test problem');
      expect(state.completedStages).toEqual(['problem-intake', 'diagnostic-interview']);
    });

    it('should handle session load failure gracefully', async () => {
      const { result } = renderHook(() => useSprintStore());

      localStorageMock.getItem.mockReturnValue(null);

      await act(async () => {
        await result.current.loadSession('nonexistent');
      });

      expect(result.current.error).toBe('Session not found');
      expect(result.current.isLoading).toBe(false);
    });
  });
});