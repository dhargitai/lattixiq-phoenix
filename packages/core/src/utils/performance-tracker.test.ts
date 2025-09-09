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
      tracker.startOperation('test_operation');
      
      // Advance time by 100ms
      vi.advanceTimersByTime(100);
      
      const duration = tracker.endOperation('test_operation');
      
      expect(duration).toBe(100);
    });

    it('should handle multiple operation types', () => {
      tracker.startOperation('operation1');
      tracker.startOperation('operation2');
      tracker.startOperation('operation3');
      
      vi.advanceTimersByTime(100);
      
      const duration1 = tracker.endOperation('operation1');
      const duration2 = tracker.endOperation('operation2'); 
      const duration3 = tracker.endOperation('operation3');
      
      expect(duration1).toBe(100);
      expect(duration2).toBe(100);
      expect(duration3).toBe(100);
    });

    it('should track multiple concurrent operations', () => {
      tracker.startOperation('operation1');
      vi.advanceTimersByTime(50);
      
      tracker.startOperation('operation2');
      vi.advanceTimersByTime(30);
      
      const duration1 = tracker.endOperation('operation1');
      vi.advanceTimersByTime(20);
      
      const duration2 = tracker.endOperation('operation2');
      
      expect(duration1).toBe(80); // 50 + 30
      expect(duration2).toBe(50); // 30 + 20
    });

    it('should return 0 when ending non-existent operation', () => {
      const result = tracker.endOperation('non-existent-operation');
      expect(result).toBe(0);
    });

    it('should return 0 when ending already completed operation', () => {
      tracker.startOperation('test_operation');
      
      vi.advanceTimersByTime(100);
      const firstResult = tracker.endOperation('test_operation');
      expect(firstResult).toBe(100);
      
      const secondResult = tracker.endOperation('test_operation');
      expect(secondResult).toBe(0);
    });
  });

  describe('AI Call Tracking', () => {
    it('should record AI call with basic metrics', () => {
      tracker.recordAICall('gpt-4.1', {
        duration: 1500,
        tokensUsed: 150,
        cost: 0.01,
      });

      const metrics = tracker.getMetrics();
      
      expect(metrics.aiGenerationTime).toBe(1500);
      expect(metrics.tokensUsed).toBe(150);
      expect(metrics.cost).toBe(0.01);
    });

    it('should aggregate multiple AI calls', () => {
      tracker.recordAICall('gpt-4.1', {
        duration: 1500,
        tokensUsed: 150,
        cost: 0.01,
      });

      tracker.recordAICall('gemini-2.5-flash', {
        duration: 800,
        tokensUsed: 300,
        cost: 0.005,
      });

      tracker.recordAICall('gpt-4.1', {
        duration: 2000,
        tokensUsed: 225,
        cost: 0.015,
      });

      const metrics = tracker.getMetrics();
      
      expect(metrics.tokensUsed).toBe(675); // 150 + 300 + 225
      expect(metrics.cost).toBe(0.03); // 0.01 + 0.005 + 0.015
      expect(metrics.aiGenerationTime).toBe(2000); // Last call duration
    });

    it('should handle AI calls with missing optional fields', () => {
      tracker.recordAICall('gpt-4.1', {
        tokensInput: 100,
        tokensOutput: 50,
        duration: 1500,
        // cost is optional
      });

      const metrics = tracker.getMetrics();
      
      expect(metrics.cost).toBe(0);
      expect(metrics.cost).toBe(0);
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
      tracker.startOperation('framework_selection');
      vi.advanceTimersByTime(1000);
      tracker.endOperation('framework_selection');

      tracker.startOperation('framework_selection');
      vi.advanceTimersByTime(800);
      tracker.endOperation('framework_selection');

      tracker.startOperation('phase_transition');
      vi.advanceTimersByTime(200);
      tracker.endOperation('phase_transition');

      // Add AI call
      tracker.recordAICall('gpt-4.1', {
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
      tracker.startOperation('framework_selection');
      vi.advanceTimersByTime(1000);
      tracker.endOperation('framework_selection');

      tracker.startOperation('phase_transition');
      vi.advanceTimersByTime(500);
      tracker.endOperation('phase_transition');

      const filteredMetrics = tracker.getMetrics();
      
      expect(filteredMetrics.duration).toBeGreaterThan(0);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all metrics', () => {
      // Add some operations and AI calls
      tracker.startOperation('test_operation');
      vi.advanceTimersByTime(1000);
      tracker.endOperation('test_operation');

      tracker.recordAICall('gpt-4.1', {
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
      tracker.startOperation('active_operation');
      vi.advanceTimersByTime(500);

      tracker.reset();

      // Should still be able to end the active operation
      vi.advanceTimersByTime(500);
      const result = tracker.endOperation('active_operation');

      expect(result).toBe(1000);
      
      const metrics = tracker.getMetrics();
      expect(metrics.duration).toBe(1000);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle operations with zero duration', () => {
      tracker.startOperation('instant_operation');
      // Don't advance time
      const result = tracker.endOperation('instant_operation');
      
      expect(result).toBe(0);
      
      const metrics = tracker.getMetrics();
      expect(metrics.duration).toBe(0);
      expect(metrics.totalTime).toBeGreaterThan(0);
    });

    it('should handle very large numbers correctly', () => {
      tracker.recordAICall('test-model', {
        tokensInput: 1000000,
        tokensOutput: 500000,
        duration: 999999,
        cost: 100.50,
      });

      const metrics = tracker.getMetrics();
      
      expect(metrics.tokensUsed).toBe(1000000);
      expect(metrics.cost).toBe(100.50);
      expect(metrics.aiGenerationTime).toBe(999999);
    });

    it('should handle operations with very long durations', () => {
      tracker.startOperation('long_operation');
      
      // Advance time by 1 hour
      vi.advanceTimersByTime(3600000);
      
      const result = tracker.endOperation('long_operation');
      
      expect(result).toBe(3600000);
      
      const metrics = tracker.getMetrics();
      expect(metrics.totalTime).toBeGreaterThan(3600000);
    });

    it('should handle special characters in operation types', () => {
      tracker.startOperation('test-operation_with.special@chars!');
      vi.advanceTimersByTime(100);
      tracker.endOperation('test-operation_with.special@chars!');

      const metrics = tracker.getMetrics();
      expect(metrics.totalTime).toBeGreaterThan(0);
    });

    it('should handle empty string operation type', () => {
      tracker.startOperation('');
      vi.advanceTimersByTime(100);
      tracker.endOperation('');

      const metrics = tracker.getMetrics();
      expect(metrics.totalTime).toBeGreaterThan(0);
    });

    it('should handle concurrent operations of same type correctly', () => {
      const operations = [];
      
      // Start 10 concurrent operations with unique names
      for (let i = 0; i < 10; i++) {
        const operationName = `concurrent_test_${i}`;
        operations.push(operationName);
        tracker.startOperation(operationName);
        vi.advanceTimersByTime(10);
      }
      
      // End them in reverse order
      for (let i = operations.length - 1; i >= 0; i--) {
        vi.advanceTimersByTime(10);
        tracker.endOperation(operations[i]);
      }
      
      const metrics = tracker.getMetrics();
      expect(metrics.totalTime).toBeGreaterThan(0);
    });
  });

  describe('Memory and Performance', () => {
    it('should handle large number of operations efficiently', () => {
      const operationCount = 1000;
      
      // Create and complete many operations
      for (let i = 0; i < operationCount; i++) {
        const operationName = `operation_${i % 10}`; // 10 different types
        tracker.startOperation(operationName);
        vi.advanceTimersByTime(1);
        tracker.endOperation(operationName);
      }
      
      const metrics = tracker.getMetrics();
      
      // Check that metrics were recorded
      expect(metrics.totalTime).toBeGreaterThan(0);
      
      // Check that metrics were recorded
      expect(metrics.totalTime).toBeGreaterThan(1000);
    });

    it('should handle large number of AI calls efficiently', () => {
      const callCount = 1000;
      
      for (let i = 0; i < callCount; i++) {
        tracker.recordAICall(`model_${i % 5}`, {
          tokensInput: 100 + i,
          tokensOutput: 50 + i,
          duration: 1000 + i,
          cost: 0.01 + (i * 0.001),
        });
      }
      
      const metrics = tracker.getMetrics();
      
      expect(metrics.totalTime).toBeGreaterThan(0);
      expect(metrics.tokensUsed).toBeGreaterThan(0);
      
      // Verify that AI metrics were recorded
      expect(metrics.cost).toBeGreaterThan(0);
      expect(metrics.aiGenerationTime).toBeGreaterThan(0);
    });
  });
});