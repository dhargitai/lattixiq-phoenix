import type { PerformanceMetrics } from '../types';

export interface PerformanceEntry {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  totalDuration: number;
  operations: PerformanceEntry[];
  metrics: PerformanceMetrics;
  bottlenecks: string[];
}

export class PerformanceTracker {
  private entries: Map<string, PerformanceEntry>;
  private completedEntries: PerformanceEntry[];
  private globalStartTime: number;
  private metrics: PerformanceMetrics;

  constructor() {
    this.entries = new Map();
    this.completedEntries = [];
    this.globalStartTime = Date.now();
    this.metrics = {};
  }

  startOperation(operation: string, metadata?: Record<string, any>): void {
    const entry: PerformanceEntry = {
      operation,
      startTime: Date.now(),
      metadata,
    };
    
    this.entries.set(operation, entry);
  }

  endOperation(operation: string, additionalMetadata?: Record<string, any>): number {
    const entry = this.entries.get(operation);
    
    if (!entry) {
      console.warn(`Performance entry not found for operation: ${operation}`);
      return 0;
    }
    
    entry.endTime = Date.now();
    entry.duration = entry.endTime - entry.startTime;
    
    if (additionalMetadata) {
      entry.metadata = { ...entry.metadata, ...additionalMetadata };
    }
    
    this.completedEntries.push(entry);
    this.entries.delete(operation);
    
    this.updateMetrics(operation, entry.duration, entry.metadata);
    
    return entry.duration;
  }

  async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startOperation(operation, metadata);
    
    try {
      const result = await fn();
      this.endOperation(operation, { success: true });
      return result;
    } catch (error) {
      this.endOperation(operation, { success: false, error: (error as Error).message });
      throw error;
    }
  }

  measure<T>(
    operation: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    this.startOperation(operation, metadata);
    
    try {
      const result = fn();
      this.endOperation(operation, { success: true });
      return result;
    } catch (error) {
      this.endOperation(operation, { success: false, error: (error as Error).message });
      throw error;
    }
  }

  setMetric(key: keyof PerformanceMetrics, value: number): void {
    this.metrics[key] = value;
  }

  incrementMetric(key: keyof PerformanceMetrics, value: number = 1): void {
    const current = this.metrics[key] || 0;
    this.metrics[key] = current + value;
  }

  getMetrics(): PerformanceMetrics {
    const totalDuration = Date.now() - this.globalStartTime;
    
    return {
      ...this.metrics,
      totalTime: totalDuration,
    };
  }

  getReport(): PerformanceReport {
    const totalDuration = Date.now() - this.globalStartTime;
    const bottlenecks = this.identifyBottlenecks();
    
    return {
      totalDuration,
      operations: [...this.completedEntries],
      metrics: this.getMetrics(),
      bottlenecks,
    };
  }

  reset(): void {
    this.entries.clear();
    this.completedEntries = [];
    this.globalStartTime = Date.now();
    this.metrics = {};
  }

  private updateMetrics(operation: string, duration: number, metadata?: Record<string, any>): void {
    if (operation.includes('analysis')) {
      this.metrics.analysisTime = (this.metrics.analysisTime || 0) + duration;
    }
    
    if (operation.includes('search')) {
      this.metrics.searchTime = (this.metrics.searchTime || 0) + duration;
    }
    
    if (operation.includes('scoring')) {
      this.metrics.scoringTime = (this.metrics.scoringTime || 0) + duration;
    }
    
    if (operation.includes('curation')) {
      this.metrics.curationTime = (this.metrics.curationTime || 0) + duration;
    }
    
    if (operation.includes('prompt') || operation.includes('context')) {
      this.metrics.promptTime = (this.metrics.promptTime || 0) + duration;
    }
    
    if (operation.includes('ai') || operation.includes('generation')) {
      this.metrics.aiGenerationTime = (this.metrics.aiGenerationTime || 0) + duration;
    }
    
    if (metadata?.tokensUsed) {
      this.metrics.tokensUsed = (this.metrics.tokensUsed || 0) + metadata.tokensUsed;
    }
    
    if (metadata?.cost) {
      this.metrics.cost = (this.metrics.cost || 0) + metadata.cost;
    }
    
    if (metadata?.toolsFound) {
      this.metrics.toolsFound = metadata.toolsFound;
    }
    
    if (metadata?.toolsSelected) {
      this.metrics.toolsSelected = metadata.toolsSelected;
    }
  }

  private identifyBottlenecks(): string[] {
    const bottlenecks: string[] = [];
    const threshold = 0.2;
    
    if (this.completedEntries.length === 0) {
      return bottlenecks;
    }
    
    const totalDuration = this.completedEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    
    const sortedEntries = [...this.completedEntries]
      .filter(entry => entry.duration !== undefined)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0));
    
    for (const entry of sortedEntries) {
      const durationRatio = (entry.duration || 0) / totalDuration;
      
      if (durationRatio > threshold) {
        bottlenecks.push(`${entry.operation} (${Math.round(durationRatio * 100)}% of total time)`);
      } else {
        break;
      }
    }
    
    if (this.metrics.aiGenerationTime && this.metrics.totalTime) {
      const aiRatio = this.metrics.aiGenerationTime / this.metrics.totalTime;
      if (aiRatio > 0.5) {
        bottlenecks.push(`AI generation is taking ${Math.round(aiRatio * 100)}% of total time`);
      }
    }
    
    if (this.metrics.searchTime && this.metrics.totalTime) {
      const searchRatio = this.metrics.searchTime / this.metrics.totalTime;
      if (searchRatio > 0.3) {
        bottlenecks.push(`Search operations are taking ${Math.round(searchRatio * 100)}% of total time`);
      }
    }
    
    return bottlenecks;
  }
}

export class MetricsAggregator {
  private sessionMetrics: Map<string, PerformanceMetrics>;
  
  constructor() {
    this.sessionMetrics = new Map();
  }
  
  addSessionMetrics(sessionId: string, metrics: PerformanceMetrics): void {
    this.sessionMetrics.set(sessionId, metrics);
  }
  
  getAverageMetrics(): PerformanceMetrics {
    const allMetrics = Array.from(this.sessionMetrics.values());
    
    if (allMetrics.length === 0) {
      return {};
    }
    
    const avgMetrics: PerformanceMetrics = {};
    const metricKeys = new Set<keyof PerformanceMetrics>();
    
    allMetrics.forEach(metrics => {
      Object.keys(metrics).forEach(key => {
        metricKeys.add(key as keyof PerformanceMetrics);
      });
    });
    
    metricKeys.forEach(key => {
      const values = allMetrics
        .map(m => m[key])
        .filter(v => v !== undefined) as number[];
      
      if (values.length > 0) {
        avgMetrics[key] = values.reduce((sum, v) => sum + v, 0) / values.length;
      }
    });
    
    return avgMetrics;
  }
  
  getPercentiles(percentiles: number[] = [50, 90, 95, 99]): Map<number, PerformanceMetrics> {
    const result = new Map<number, PerformanceMetrics>();
    const allMetrics = Array.from(this.sessionMetrics.values());
    
    if (allMetrics.length === 0) {
      return result;
    }
    
    const metricKeys = new Set<keyof PerformanceMetrics>();
    allMetrics.forEach(metrics => {
      Object.keys(metrics).forEach(key => {
        metricKeys.add(key as keyof PerformanceMetrics);
      });
    });
    
    percentiles.forEach(percentile => {
      const percentileMetrics: PerformanceMetrics = {};
      
      metricKeys.forEach(key => {
        const values = allMetrics
          .map(m => m[key])
          .filter(v => v !== undefined)
          .sort((a, b) => (a as number) - (b as number)) as number[];
        
        if (values.length > 0) {
          const index = Math.floor((percentile / 100) * values.length);
          percentileMetrics[key] = values[Math.min(index, values.length - 1)];
        }
      });
      
      result.set(percentile, percentileMetrics);
    });
    
    return result;
  }
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    return `${(ms / 60000).toFixed(1)}m`;
  }
}

export function estimateCost(tokensUsed: number, modelType: string): number {
  const costPerThousand: Record<string, number> = {
    'gpt-4.1': 0.03,
    'gpt-4.1-mini': 0.01,
    'gemini-2.5-flash': 0.0001,
    'gemini-2.5-pro': 0.0025,
    'claude-3.5-sonnet': 0.003,
    'text-embedding-3-small': 0.00002,
  };
  
  const rate = costPerThousand[modelType] || 0.001;
  return (tokensUsed / 1000) * rate;
}