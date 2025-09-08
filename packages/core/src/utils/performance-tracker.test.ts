/**
 * Tests for PerformanceTracker utility
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PerformanceTracker } from './performance-tracker';

describe('PerformanceTracker', () => {
  let tracker: PerformanceTracker;
  
  beforeEach(() => {
    tracker = new PerformanceTracker();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Basic Operation Tracking', () => {
    it('should start and end operations correctly', () => {
      const operationId = tracker.startOperation('test_operation');
      
      expect(operationId).toBeTruthy();
      expect(typeof operationId).toBe('string');
      
      // Advance time by 100ms
      vi.advanceTimersByTime(100);
      
      const result = tracker.endOperation(operationId, 'test_operation');
      
      expect(result.operationId).toBe(operationId);
      expect(result.operation).toBe('test_operation');
      expect(result.duration).toBe(100);
    });

    it('should generate unique operation IDs', () => {
      const id1 = tracker.startOperation('operation1');
      const id2 = tracker.startOperation('operation2');
      const id3 = tracker.startOperation('operation1'); // Same type, different ID
      
      expect(id1).not.toBe(id2);
      expect(id1).not.toBe(id3);
      expect(id2).not.toBe(id3);
    });

    it('should track multiple concurrent operations', () => {
      const id1 = tracker.startOperation('operation1');
      vi.advanceTimersByTime(50);
      
      const id2 = tracker.startOperation('operation2');
      vi.advanceTimersByTime(30);
      
      const result1 = tracker.endOperation(id1, 'operation1');
      vi.advanceTimersByTime(20);
      
      const result2 = tracker.endOperation(id2, 'operation2');
      
      expect(result1.duration).toBe(80); // 50 + 30
      expect(result2.duration).toBe(50); // 30 + 20
      expect(result1.operation).toBe('operation1');
      expect(result2.operation).toBe('operation2');
    });

    it('should throw error when ending non-existent operation', () => {
      expect(() => {
        tracker.endOperation('non-existent-id');
      }).toThrow('Operation not found: non-existent-id');
    });

    it('should throw error when ending already completed operation', () => {
      const operationId = tracker.startOperation('test_operation');
      
      vi.advanceTimersByTime(100);
      tracker.endOperation(operationId);
      
      expect(() => {
        tracker.endOperation(operationId);
      }).toThrow('Operation not found: ' + operationId);
    });
  });

  describe('AI Call Tracking', () => {
    it('should record AI call with basic metrics', () => {
      tracker.recordAICall({
        model: 'gpt-4.1',
        tokensInput: 100,
        tokensOutput: 50,
        duration: 1500,
        cost: 0.01,
      });

      const metrics = tracker.getMetrics();
      
      expect(metrics.duration).toBeGreaterThan(0);
      expect(metrics.tokensUsed).toBe(150);
      expect(metrics.cost).toBe(0.01);
      expect(aiMetrics!.metadata).toEqual({
        models: { 'gpt-4.1': 1 },
        totalTokensInput: 100,
        totalTokensOutput: 50,
        totalCost: 0.01,
        averageTokensPerCall: 150,
        averageCostPerCall: 0.01,
      });
    });

    it('should aggregate multiple AI calls', () => {
      tracker.recordAICall({
        model: 'gpt-4.1',
        tokensInput: 100,
        tokensOutput: 50,
        duration: 1500,
        cost: 0.01,
      });

      tracker.recordAICall({
        model: 'gemini-2.5-flash',
        tokensInput: 200,
        tokensOutput: 100,
        duration: 800,
        cost: 0.005,
      });

      tracker.recordAICall({
        model: 'gpt-4.1',
        tokensInput: 150,
        tokensOutput: 75,
        duration: 2000,
        cost: 0.015,
      });

      const metrics = tracker.getMetrics();
      
      expect(metrics.tokensUsed).toBe(675);
      expect(aiMetrics!.totalDuration).toBe(4300);
      expect(aiMetrics!.metadata.models).toEqual({
        'gpt-4.1': 2,
        'gemini-2.5-flash': 1,
      });
      expect(aiMetrics!.metadata.totalTokensInput).toBe(450);
      expect(aiMetrics!.metadata.totalTokensOutput).toBe(225);
      expect(aiMetrics!.metadata.totalCost).toBe(0.03);
      expect(aiMetrics!.metadata.averageTokensPerCall).toBe(225); // (150+300+225)/3
      expect(aiMetrics!.metadata.averageCostPerCall).toBe(0.01);
    });

    it('should handle AI calls with missing optional fields', () => {
      tracker.recordAICall({
        model: 'gpt-4.1',
        tokensInput: 100,
        tokensOutput: 50,
        duration: 1500,
        // cost is optional
      });

      const metrics = tracker.getMetrics();
      
      expect(metrics.cost).toBe(0);
      expect(aiMetrics!.metadata.averageCostPerCall).toBe(0);
    });
  });

  describe('Metrics Retrieval', () => {
    it('should return empty metrics for new tracker', () => {
      const metrics = tracker.getMetrics();
      
      expect(typeof metrics).toBe('object');
      expect(metrics.duration).toBeUndefined();
    });

    it('should return aggregated metrics', () => {
      // Start and end some operations
      const id1 = tracker.startOperation('framework_selection');
      vi.advanceTimersByTime(1000);
      tracker.endOperation(id1, 'framework_selection');

      const id2 = tracker.startOperation('framework_selection');
      vi.advanceTimersByTime(800);
      tracker.endOperation(id2, 'framework_selection');

      const id3 = tracker.startOperation('phase_transition');
      vi.advanceTimersByTime(200);
      tracker.endOperation(id3, 'phase_transition');

      // Add AI call
      tracker.recordAICall({
        model: 'gpt-4.1',
        tokensInput: 100,
        tokensOutput: 50,
        duration: 1500,
        cost: 0.01,
      });

      const metrics = tracker.getMetrics();
      
      expect(metrics.duration).toBeGreaterThan(0);
      expect(metrics.tokensUsed).toBe(150);
      expect(metrics.cost).toBe(0.01);
    });

    it('should return metrics filtered by type', () => {
      // Create operations of different types
      const id1 = tracker.startOperation('framework_selection');
      vi.advanceTimersByTime(1000);
      tracker.endOperation(id1, 'framework_selection');

      const id2 = tracker.startOperation('phase_transition');
      vi.advanceTimersByTime(500);
      tracker.endOperation(id2, 'phase_transition');

      const filteredMetrics = tracker.getMetrics();
      
      expect(filteredMetrics.duration).toBeGreaterThan(0);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all metrics', () => {
      // Add some operations and AI calls
      const id1 = tracker.startOperation('test_operation');
      vi.advanceTimersByTime(1000);
      tracker.endOperation(id1, 'test_operation');

      tracker.recordAICall({
        model: 'gpt-4.1',
        tokensInput: 100,
        tokensOutput: 50,
        duration: 1500,
        cost: 0.01,
      });

      const metrics = tracker.getMetrics();
      expect(metrics.duration).toBeGreaterThan(0);

      tracker.reset();

      const resetMetrics = tracker.getMetrics();
      expect(resetMetrics.duration).toBeUndefined();
    });

    it('should not affect active operations during reset', () => {
      const id1 = tracker.startOperation('active_operation');
      vi.advanceTimersByTime(500);

      tracker.reset();

      // Should still be able to end the active operation
      vi.advanceTimersByTime(500);
      const result = tracker.endOperation(id1, 'active_operation');

      expect(result.duration).toBe(1000);
      
      const metrics = tracker.getMetrics();
      expect(metrics.duration).toBe(1000);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle operations with zero duration', () => {
      const operationId = tracker.startOperation('instant_operation');
      // Don't advance time
      const result = tracker.endOperation(operationId);
      
      expect(result.duration).toBe(0);
      
      const metrics = tracker.getMetrics();
      expect(metrics[0].minDuration).toBe(0);
      expect(metrics[0].maxDuration).toBe(0);
      expect(metrics[0].averageDuration).toBe(0);
    });

    it('should handle very large numbers correctly', () => {
      tracker.recordAICall({
        model: 'test-model',
        tokensInput: 1000000,
        tokensOutput: 500000,
        duration: 999999,
        cost: 100.50,
      });

      const metrics = tracker.getMetrics();
      const aiMetrics = metrics.find(m => m.type === 'ai_call');
      
      expect(aiMetrics!.metadata.totalTokensInput).toBe(1000000);
      expect(aiMetrics!.metadata.totalTokensOutput).toBe(500000);
      expect(aiMetrics!.metadata.totalCost).toBe(100.50);
      expect(aiMetrics!.totalDuration).toBe(999999);
    });

    it('should handle operations with very long durations', () => {
      const operationId = tracker.startOperation('long_operation');
      
      // Advance time by 1 hour
      vi.advanceTimersByTime(3600000);
      
      const result = tracker.endOperation(operationId);
      
      expect(result.duration).toBe(3600000);
      
      const metrics = tracker.getMetrics();
      expect(metrics[0].maxDuration).toBe(3600000);
    });

    it('should handle special characters in operation types', () => {
      const operationId = tracker.startOperation('test-operation_with.special@chars!');
      vi.advanceTimersByTime(100);
      tracker.endOperation(operationId);

      const metrics = tracker.getMetrics();
      expect(metrics[0].type).toBe('test-operation_with.special@chars!');
    });

    it('should handle empty string operation type', () => {
      const operationId = tracker.startOperation('');
      vi.advanceTimersByTime(100);
      tracker.endOperation(operationId);

      const metrics = tracker.getMetrics();
      expect(metrics[0].type).toBe('');
      expect(metrics[0].count).toBe(1);
    });

    it('should handle concurrent operations of same type correctly', () => {
      const operations = [];
      
      // Start 10 concurrent operations of same type
      for (let i = 0; i < 10; i++) {
        operations.push(tracker.startOperation('concurrent_test'));
        vi.advanceTimersByTime(10);
      }
      
      // End them in reverse order
      for (let i = operations.length - 1; i >= 0; i--) {
        vi.advanceTimersByTime(10);
        tracker.endOperation(operations[i]);
      }
      
      const metrics = tracker.getMetrics();
      expect(metrics[0].count).toBe(10);
      expect(metrics[0].totalDuration).toBe(1000); // Each took 100ms + 10ms overlap
    });
  });

  describe('Memory and Performance', () => {
    it('should handle large number of operations efficiently', () => {
      const operationCount = 1000;
      
      // Create and complete many operations
      for (let i = 0; i < operationCount; i++) {
        const id = tracker.startOperation(`operation_${i % 10}`); // 10 different types
        vi.advanceTimersByTime(1);
        tracker.endOperation(id);
      }
      
      const metrics = tracker.getMetrics();
      
      // Should have 10 different operation types
      expect(metrics).toHaveLength(10);
      
      // Each type should have 100 operations
      metrics.forEach(metric => {
        expect(metric.count).toBe(100);
      });
    });

    it('should handle large number of AI calls efficiently', () => {
      const callCount = 1000;
      
      for (let i = 0; i < callCount; i++) {
        tracker.recordAICall({
          model: `model_${i % 5}`, // 5 different models
          tokensInput: 100 + i,
          tokensOutput: 50 + i,
          duration: 1000 + i,
          cost: 0.01 + (i * 0.001),
        });
      }
      
      const metrics = tracker.getMetrics();
      const aiMetrics = metrics.find(m => m.type === 'ai_call');
      
      expect(aiMetrics!.count).toBe(callCount);
      expect(Object.keys(aiMetrics!.metadata.models)).toHaveLength(5);
      
      // Each model should have been called 200 times
      Object.values(aiMetrics!.metadata.models).forEach(count => {
        expect(count).toBe(200);
      });
    });
  });
});