// Phoenix Framework Core Engine
// Main entry point for the decoupled TypeScript logic

// Re-export all types for easy import by consuming packages
export * from './types/index.js';

// Export services
export { SessionManager } from './services/session-manager.js';
export { FrameworkSelector } from './services/framework-selector.js';
export { AIRouter } from './services/ai-router.js';

// Export orchestration
export { PhoenixOrchestrator } from './orchestration/phoenix-orchestrator.js';
export { PhaseManager } from './orchestration/phase-manager.js';

// Export phase handlers
export * from './phases/index.js';

// Export utilities
export { PhoenixError, ErrorCode } from './utils/errors.js';
export { PerformanceTracker } from './utils/performance-tracker.js';

// Core engine placeholder - will be implemented in future stories
export class PhoenixCore {
  constructor() {
    // Core engine implementation will be added in future stories
  }
}