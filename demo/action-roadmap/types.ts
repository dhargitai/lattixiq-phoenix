/**
 * Action Roadmap Preparator - Core Type Definitions
 *
 * This module defines all the TypeScript interfaces and types used throughout
 * the Action Roadmap Preparator system. These types model the data flow from
 * problem analysis through to AI-ready prompt generation.
 */

import type { z } from "zod";
import type { KnowledgeContent, SupportedLanguage } from "./shared-types";

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

/**
 * Problem complexity levels based on analysis
 */
export type ProblemComplexity = "simple" | "moderate" | "complex";

/**
 * Problem urgency levels for prioritization
 */
export type ProblemUrgency = "immediate" | "short-term" | "long-term";

/**
 * Tool types derived from subcategory analysis
 */
export type ToolType = "mental-model" | "cognitive-bias" | "fallacy" | "general-concept";

/**
 * Problem-solving phases for tool ordering
 */
export enum ProblemPhase {
  Definition = 1, // First Principles, 5 Whys
  Analysis = 2, // Systems Thinking, Root Cause
  Generation = 3, // Inversion, Lateral Thinking
  Decision = 4, // Second-Order, Cost-Benefit
  Validation = 5, // Pre-mortem, Bias Checks
}

// ============================================================================
// PROBLEM ANALYSIS TYPES
// ============================================================================

/**
 * Quantified characteristics of the user's problem
 * All scores are normalized to 0.0-1.0 range
 */
interface ProblemCharacteristics {
  /** How much analytical/logical thinking is required (0.0-1.0) */
  analytical: number;

  /** How much emotional intelligence/awareness is needed (0.0-1.0) */
  emotional: number;

  /** How much strategic/long-term thinking is required (0.0-1.0) */
  strategic: number;

  /** How much creative/innovative thinking is needed (0.0-1.0) */
  creative: number;
}

/**
 * Suggested proportions for tool mix based on problem analysis
 * All percentages should sum to approximately 1.0
 */
interface ToolMixSuggestion {
  /** Proportion of mental models to include (0.0-1.0) */
  mentalModels: number;

  /** Proportion of cognitive biases/fallacies to include (0.0-1.0) */
  biasesFallacies: number;

  /** Proportion of general concepts to include (0.0-1.0) */
  generalConcepts: number;
}

/**
 * Complete analysis result from the problem analyzer module
 * Contains all information needed for subsequent processing phases
 */
interface ProblemAnalysisResult {
  /** Original user query/problem statement */
  query: string;

  /** Detected language of the query */
  language: SupportedLanguage;

  /** Assessed complexity level */
  complexity: ProblemComplexity;

  /** Assessed urgency level */
  urgency: ProblemUrgency;

  /** Quantified problem characteristics */
  problemNature: ProblemCharacteristics;

  /** Recommended tool mix proportions */
  suggestedToolMix: ToolMixSuggestion;

  /** Generated search queries for vector search */
  searchQueries: {
    /** Query optimized for mental model search */
    mentalModels: string;

    /** Query optimized for bias/fallacy search */
    biasesFallacies: string;

    /** Query optimized for general concept search */
    generalConcepts: string;
  };
}

// ============================================================================
// SEARCH AND SCORING TYPES
// ============================================================================

/**
 * Tool found through vector search with metadata
 * Extends KnowledgeContent with search-specific information
 */
interface ToolSearchResult extends Omit<KnowledgeContent, "type"> {
  /** Semantic similarity score from vector search (0.0-1.0) */
  similarity: number;

  /** Which search pool found this tool */
  searchSource: "mental-models" | "biases" | "general";

  /** Extended tool type that includes general-concept */
  type: ToolType;
}

/**
 * Detailed breakdown of scoring components for transparency
 * All scores are normalized to 0.0-1.0 range
 */
interface ScoreBreakdown {
  /** Direct semantic relevance to problem (0.0-1.0) */
  directRelevance: number;

  /** How immediately applicable the tool is (0.0-1.0) */
  applicabilityNow: number;

  /** Value as foundational thinking tool (0.0-1.0) */
  foundationalValue: number;

  /** Bonus for simplicity in urgent problems (0.0-1.0) */
  simplicityBonus: number;

  /** Bonus for improving type balance (0.0-1.0) */
  typeBalanceBonus: number;

  /** Adjustment based on urgency characteristics (-0.2 to 0.2) */
  urgencyAdjustment: number;

  /** Adjustment based on emotional content (-0.2 to 0.2) */
  emotionalAdjustment: number;
}

/**
 * Tool with calculated scores and derived information
 * Contains all data needed for curation decisions
 */
interface ScoredTool extends ToolSearchResult {
  /** Detailed scoring breakdown for transparency */
  scores: ScoreBreakdown;

  /** Final weighted score used for ranking (0.0-1.0) */
  finalScore: number;

  /** Whether this is a foundational/super model */
  isFoundational: boolean;

  /** Estimated complexity of understanding/applying this tool (0.0-1.0) */
  complexityScore: number;
}

// ============================================================================
// CURATION AND ORDERING TYPES
// ============================================================================

/**
 * Tool with assigned problem-solving phase and ordering
 * Ready for final roadmap generation
 */
interface OrderedTool extends ScoredTool {
  /** Assigned problem-solving phase */
  phase: ProblemPhase;

  /** Order within the overall sequence (1-based) */
  order: number;

  /** Order within the assigned phase (1-based) */
  phaseOrder: number;
}

/**
 * Type distribution summary for validation
 */
interface TypeDistribution {
  /** Count of mental models */
  "mental-model": number;

  /** Count of cognitive biases */
  "cognitive-bias": number;

  /** Count of logical fallacies */
  fallacy: number;

  /** Count of general concepts */
  "general-concept": number;
}

/**
 * Final curated and ordered list of tools
 * Ready for prompt generation
 */
interface CuratedToolList {
  /** Ordered list of tools for the roadmap */
  tools: OrderedTool[];

  /** Metadata about the curation results */
  metadata: {
    /** Total number of tools selected */
    totalCount: number;

    /** Distribution by tool type */
    typeDistribution: TypeDistribution;

    /** Problem-solving phases represented */
    sequencePhases: ProblemPhase[];

    /** Whether minimum requirements were met */
    meetsMinimumRequirements: boolean;

    /** Any warnings about the selection */
    warnings: string[];
  };
}

// ============================================================================
// OUTPUT GENERATION TYPES
// ============================================================================

/**
 * AI-ready prompt and validation schema
 * Contains everything needed for report generation
 */
interface PromptGeneratorResult {
  /** Complete prompt string with XML structure */
  prompt: string;

  /** Zod schema for validating AI response */
  schema: z.ZodSchema<unknown>;

  /** Metadata about the generated prompt */
  metadata: {
    /** Total number of tools included */
    toolCount: number;

    /** Estimated token count for the prompt */
    estimatedTokens: number;

    /** Problem complexity level */
    complexity: ProblemComplexity;

    /** Problem urgency level */
    urgency: ProblemUrgency;
  };
}

/**
 * Performance metrics for monitoring and optimization
 */
interface PerformanceMetrics {
  /** Total processing time in milliseconds */
  totalTime: number;

  /** Time spent in analysis phase (ms) */
  analysisTime: number;

  /** Time spent in search phase (ms) */
  searchTime: number;

  /** Time spent in scoring phase (ms) */
  scoringTime: number;

  /** Time spent in curation phase (ms) */
  curationTime: number;

  /** Time spent in prompt generation (ms) */
  promptTime: number;

  /** Time spent in AI generation (ms) */
  aiGenerationTime: number;

  /** Number of tools found in search */
  toolsFound: number;

  /** Number of tools selected in final roadmap */
  toolsSelected: number;
}

/**
 * Complete output from the Action Roadmap Preparator system
 * Contains all results and metadata for consumption by other systems
 */
interface ActionRoadmapOutput {
  /** AI-ready prompt and schema for report generation */
  prompt: string;
  schema: z.ZodSchema<unknown>;

  /** Generated AI result (if generation was requested) */
  aiResult?: {
    /** The generated roadmap object */
    result: unknown;

    /** Metadata about the AI generation */
    metadata: {
      tokensUsed?: number;
      generationTime: number;
      modelUsed: string;
      generatedAt: string;
    };
  };

  /** Original problem analysis results */
  analysis: ProblemAnalysisResult;

  /** Final curated and ordered tool list */
  curatedTools: CuratedToolList;

  /** Performance metrics for monitoring */
  metrics: PerformanceMetrics;

  /** System metadata */
  metadata: {
    /** Timestamp of generation */
    generatedAt: string;

    /** Version of the system used */
    version: string;

    /** Any system warnings or notes */
    warnings: string[];
  };
}

// ============================================================================
// CONFIGURATION AND OPTIONS
// ============================================================================

/**
 * Configuration options for customizing roadmap generation
 */
interface ActionRoadmapOptions {
  /** Override default tool count limits */
  maxTools?: number;
  minTools?: number;

  /** Force specific analysis results (for testing) */
  forceComplexity?: ProblemComplexity;
  forceUrgency?: ProblemUrgency;

  /** Feature flags */
  includeMetrics?: boolean;
  verboseLogging?: boolean;
  generateAIResult?: boolean;

  /** Timeout configuration (milliseconds) */
  analysisTimeout?: number;
  searchTimeout?: number;
  aiGenerationTimeout?: number;
  totalTimeout?: number;

  /** Custom scoring weights (advanced usage) */
  scoringWeights?: {
    directRelevance?: number;
    applicabilityNow?: number;
    foundationalValue?: number;
    simplicityBonus?: number;
    typeBalance?: number;
  };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Context information for error reporting
 */
interface ErrorContext {
  /** Phase where error occurred */
  phase?:
    | "analysis"
    | "search"
    | "scoring"
    | "curation"
    | "roadmap-prompt-generation"
    | "roadmap-generation";

  /** Original query that caused the error */
  query?: string;

  /** Additional context data */
  [key: string]: unknown;
}

/**
 * Base error class for Action Roadmap system
 */
export abstract class ActionRoadmapError extends Error {
  constructor(
    message: string,
    public readonly context: ErrorContext = {}
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Thrown when insufficient relevant tools are found
 */
export class InsufficientToolsError extends ActionRoadmapError {}

/**
 * Thrown when problem analysis fails
 */
export class AnalysisError extends ActionRoadmapError {}

/**
 * Thrown when operations exceed timeout limits
 */
export class TimeoutError extends ActionRoadmapError {}

/**
 * Thrown when search operations fail
 */
export class SearchError extends ActionRoadmapError {}

/**
 * Thrown when prompt generation fails
 */
export class PromptGenerationError extends ActionRoadmapError {}

/**
 * Thrown when AI generation fails
 */
export class AIGenerationError extends ActionRoadmapError {}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  // Core types
  KnowledgeContent,
  SupportedLanguage,

  // All defined interfaces
  ProblemCharacteristics,
  ToolMixSuggestion,
  ProblemAnalysisResult,
  ToolSearchResult,
  ScoreBreakdown,
  ScoredTool,
  OrderedTool,
  TypeDistribution,
  CuratedToolList,
  PromptGeneratorResult,
  PerformanceMetrics,
  ActionRoadmapOutput,
  ActionRoadmapOptions,
  ErrorContext,
};
