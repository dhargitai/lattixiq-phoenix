/**
 * Action Roadmap Preparator - Public API
 *
 * This module exports the public interface for the Action Roadmap Preparator system.
 * Import from here to access all types and functions.
 */

// Re-export all types
export type {
  // Core types
  ProblemComplexity,
  ProblemUrgency,
  ToolType,

  // Analysis types
  ProblemCharacteristics,
  ToolMixSuggestion,
  ProblemAnalysisResult,

  // Search and scoring types
  ToolSearchResult,
  ScoreBreakdown,
  ScoredTool,

  // Curation types
  OrderedTool,
  TypeDistribution,
  CuratedToolList,

  // Output types
  PromptGeneratorResult,
  PerformanceMetrics,
  ActionRoadmapOutput,

  // Configuration types
  ActionRoadmapOptions,
  ErrorContext,

  // Re-exported dependencies
  KnowledgeContent,
  SupportedLanguage,
} from "./types";

// Re-export enums and classes
export {
  ProblemPhase,
  ActionRoadmapError,
  InsufficientToolsError,
  AnalysisError,
  TimeoutError,
  SearchError,
  PromptGenerationError,
} from "./types";

// Re-export shared types and constants for external use
export { SUPPORTED_LANGUAGES } from "./shared-types";
export type { KnowledgeContentType, MainCategory, Subcategory } from "./shared-types";

// Main generator function
export { generateActionRoadmap, validateQuery, createDefaultOptions } from "./generator";
