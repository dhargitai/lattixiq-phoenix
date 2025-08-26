/**
 * Action Roadmap Generator - Main Orchestrator
 *
 * This is the main entry point that orchestrates all modules to generate
 * a complete action roadmap from a user query. It manages the data flow
 * from analysis through to prompt generation with comprehensive error handling.
 */

import { analyzeProblem } from "./analyzer";
import { findRelevantTools } from "./model-finder";
import { calculateScores } from "./score-calculator";
import { curateAndOrder } from "./curator";
import { generatePromptAndSchema } from "./result-prompt-generator";
import { generateActionRoadmapResult, type AIGenerationResult } from "./result-generator";
import type {
  ActionRoadmapOutput,
  ActionRoadmapOptions,
  PerformanceMetrics,
  ProblemAnalysisResult,
  ToolSearchResult,
  ScoredTool,
  CuratedToolList,
  PromptGeneratorResult,
} from "./types";
import {
  InsufficientToolsError,
  AnalysisError,
  TimeoutError,
  SearchError,
  PromptGenerationError,
  AIGenerationError,
} from "./types";

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

/**
 * Performance tracker for monitoring system performance
 */
class PerformanceTracker {
  private timers: Map<string, number> = new Map();
  private metrics: Partial<PerformanceMetrics> = {};

  start(phase: string): void {
    this.timers.set(phase, Date.now());
  }

  end(phase: string): number {
    const start = this.timers.get(phase);
    if (!start) return 0;

    const duration = Date.now() - start;
    this.timers.delete(phase);

    // Store in metrics using the appropriate field name
    switch (phase) {
      case "analysis":
        this.metrics.analysisTime = duration;
        break;
      case "search":
        this.metrics.searchTime = duration;
        break;
      case "scoring":
        this.metrics.scoringTime = duration;
        break;
      case "curation":
        this.metrics.curationTime = duration;
        break;
      case "prompt":
        this.metrics.promptTime = duration;
        break;
      case "ai-generation":
        this.metrics.aiGenerationTime = duration;
        break;
    }

    return duration;
  }

  getTotalTime(): number {
    return this.metrics.totalTime || 0;
  }

  setTotalTime(time: number): void {
    this.metrics.totalTime = time;
  }

  getMetrics(): PerformanceMetrics {
    return {
      totalTime: this.getTotalTime(),
      analysisTime: this.metrics.analysisTime || 0,
      searchTime: this.metrics.searchTime || 0,
      scoringTime: this.metrics.scoringTime || 0,
      curationTime: this.metrics.curationTime || 0,
      promptTime: this.metrics.promptTime || 0,
      aiGenerationTime: this.metrics.aiGenerationTime || 0,
      toolsFound: this.metrics.toolsFound || 0,
      toolsSelected: this.metrics.toolsSelected || 0,
    };
  }

  setToolCounts(found: number, selected: number): void {
    this.metrics.toolsFound = found;
    this.metrics.toolsSelected = selected;
  }
}

// ============================================================================
// TIMEOUT UTILITIES
// ============================================================================

/**
 * Creates a timeout promise that rejects after the specified time
 */
function createTimeout(ms: number, operation: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(`Operation '${operation}' timed out after ${ms}ms`));
    }, ms);
  });
}

/**
 * Wraps a promise with a timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  return Promise.race([promise, createTimeout(timeoutMs, operation)]);
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

/**
 * Main entry point for generating an action roadmap from a user query.
 * Orchestrates all modules in sequence with comprehensive error handling.
 *
 * @param query - The user's problem or goal description
 * @param options - Optional configuration parameters
 * @returns Complete ActionRoadmapOutput with all generated data
 * @throws ActionRoadmapError for various failure conditions
 */
export async function generateActionRoadmap(
  query: string,
  options: ActionRoadmapOptions = {}
): Promise<ActionRoadmapOutput> {
  const tracker = new PerformanceTracker();
  const startTime = Date.now();
  const warnings: string[] = [];

  // Set default options
  const config = {
    maxTools: options.maxTools || 7,
    minTools: options.minTools || 3,
    includeMetrics: options.includeMetrics ?? true,
    verboseLogging: options.verboseLogging ?? false,
    generateAIResult: options.generateAIResult ?? true, // Generate AI result by default
    analysisTimeout: options.analysisTimeout || 30000, // 30 seconds
    searchTimeout: options.searchTimeout || 45000, // 45 seconds
    aiGenerationTimeout: options.aiGenerationTimeout || 90000, // 90 seconds for AI
    totalTimeout: options.totalTimeout || 180000, // 3 minutes (increased for AI)
    ...options,
  };

  if (config.verboseLogging) {
    console.log("[ActionRoadmap] Starting generation with config:", config);
  }

  try {
    // Validate input
    if (!query || query.trim().length < 30) {
      throw new AnalysisError("Query must be at least 30 characters long", { query });
    }

    let analysis: ProblemAnalysisResult;
    let tools: ToolSearchResult[];
    let scoredTools: ScoredTool[];
    let curatedList: CuratedToolList;
    let output: PromptGeneratorResult;
    let aiResult: AIGenerationResult | undefined;

    // ========================================================================
    // PHASE 1: ANALYZE PROBLEM
    // ========================================================================
    try {
      tracker.start("analysis");
      console.log("[ActionRoadmap] Phase 1: Analyzing problem...");

      analysis = await withTimeout(
        analyzeProblem(query),
        config.analysisTimeout,
        "problem analysis"
      );

      // Override analysis results if forced (for testing)
      if (config.forceComplexity) {
        analysis.complexity = config.forceComplexity;
      }
      if (config.forceUrgency) {
        analysis.urgency = config.forceUrgency;
      }

      const analysisTime = tracker.end("analysis");
      if (config.verboseLogging) {
        console.log(`[ActionRoadmap] Analysis completed in ${analysisTime}ms`);
        console.log("[ActionRoadmap] Analysis result:", {
          complexity: analysis.complexity,
          urgency: analysis.urgency,
          language: analysis.language,
        });
      }
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw error;
      }
      throw new AnalysisError(
        `Failed to analyze problem: ${error instanceof Error ? error.message : "Unknown error"}`,
        { phase: "analysis", query }
      );
    }

    // ========================================================================
    // PHASE 2: FIND RELEVANT TOOLS
    // ========================================================================
    try {
      tracker.start("search");
      console.log("[ActionRoadmap] Phase 2: Finding relevant tools...");

      tools = await withTimeout(findRelevantTools(analysis), config.searchTimeout, "tool search");

      const searchTime = tracker.end("search");

      if (tools.length < config.minTools) {
        throw new InsufficientToolsError(
          `Only found ${tools.length} relevant tools, minimum required: ${config.minTools}`,
          { phase: "search", toolsFound: tools.length, minRequired: config.minTools }
        );
      }

      if (config.verboseLogging) {
        console.log(`[ActionRoadmap] Found ${tools.length} tools in ${searchTime}ms`);
      }
    } catch (error) {
      if (error instanceof InsufficientToolsError || error instanceof TimeoutError) {
        throw error;
      }
      throw new SearchError(
        `Failed to find relevant tools: ${error instanceof Error ? error.message : "Unknown error"}`,
        { phase: "search", query }
      );
    }

    // ========================================================================
    // PHASE 3: CALCULATE SCORES
    // ========================================================================
    try {
      tracker.start("scoring");
      console.log("[ActionRoadmap] Phase 3: Calculating scores...");

      // Calculate scores for all tools
      scoredTools = calculateScores(tools, analysis);

      const scoringTime = tracker.end("scoring");
      if (config.verboseLogging) {
        console.log(`[ActionRoadmap] Scored ${scoredTools.length} tools in ${scoringTime}ms`);
      }
    } catch (error) {
      throw new AnalysisError(
        `Failed to calculate scores: ${error instanceof Error ? error.message : "Unknown error"}`,
        { phase: "scoring", query }
      );
    }

    // ========================================================================
    // PHASE 4-5: CURATE AND ORDER
    // ========================================================================
    try {
      tracker.start("curation");
      console.log("[ActionRoadmap] Phase 4-5: Curating and ordering...");

      curatedList = curateAndOrder(scoredTools, analysis);

      const curationTime = tracker.end("curation");

      // Collect any warnings from curation
      if (curatedList.metadata?.warnings?.length > 0) {
        warnings.push(...curatedList.metadata.warnings);
      }

      if (config.verboseLogging) {
        console.log(
          `[ActionRoadmap] Curated ${curatedList.tools.length} tools in ${curationTime}ms`
        );
        console.log("[ActionRoadmap] Type distribution:", curatedList.metadata.typeDistribution);
      }
    } catch (error) {
      throw new AnalysisError(
        `Failed to curate and order tools: ${error instanceof Error ? error.message : "Unknown error"}`,
        { phase: "curation", query }
      );
    }

    // ========================================================================
    // PHASE 6: GENERATE PROMPT
    // ========================================================================
    try {
      tracker.start("prompt");
      console.log("[ActionRoadmap] Phase 6: Generating output...");

      output = generatePromptAndSchema(curatedList, analysis);

      const promptTime = tracker.end("prompt");
      if (config.verboseLogging) {
        console.log(`[ActionRoadmap] Generated prompt in ${promptTime}ms`);
        console.log(`[ActionRoadmap] Estimated prompt tokens: ${output.metadata.estimatedTokens}`);
      }
    } catch (error) {
      throw new PromptGenerationError(
        `Failed to generate prompt: ${error instanceof Error ? error.message : "Unknown error"}`,
        { phase: "roadmap-prompt-generation", query }
      );
    }

    // ========================================================================
    // PHASE 7: GENERATE AI RESULT (OPTIONAL)
    // ========================================================================
    if (config.generateAIResult) {
      try {
        tracker.start("ai-generation");
        console.log("[ActionRoadmap] Phase 7: Generating AI result...");

        aiResult = await withTimeout(
          generateActionRoadmapResult(output),
          config.aiGenerationTimeout,
          "AI generation"
        );

        const aiTime = tracker.end("ai-generation");
        if (config.verboseLogging) {
          console.log(`[ActionRoadmap] AI generation completed in ${aiTime}ms`);
          console.log(`[ActionRoadmap] Tokens used: ${aiResult.metadata.tokensUsed || "unknown"}`);
        }
      } catch (error) {
        if (error instanceof TimeoutError) {
          throw error;
        }
        throw new AIGenerationError(
          `Failed to generate AI result: ${error instanceof Error ? error.message : "Unknown error"}`,
          { phase: "roadmap-generation", query }
        );
      }
    } else {
      console.log("[ActionRoadmap] Skipping AI generation (disabled in config)");
    }

    // ========================================================================
    // FINALIZE RESULTS
    // ========================================================================

    // Update performance metrics
    tracker.setToolCounts(tools.length, curatedList.tools.length);
    const totalTime = Date.now() - startTime;
    tracker.setTotalTime(totalTime);
    const metrics = tracker.getMetrics();

    console.log(`[ActionRoadmap] Completed in ${totalTime}ms`);

    if (config.verboseLogging) {
      console.log("[ActionRoadmap] Performance breakdown:", metrics);
    }

    // Check for total timeout
    if (totalTime > config.totalTimeout) {
      warnings.push(
        `Total processing time (${totalTime}ms) exceeded timeout (${config.totalTimeout}ms)`
      );
    }

    // Build final output
    const result: ActionRoadmapOutput = {
      prompt: output.prompt,
      schema: output.schema,
      ...(aiResult && {
        aiResult: {
          result: aiResult.result,
          metadata: aiResult.metadata,
        },
      }),
      analysis,
      curatedTools: curatedList,
      metrics,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: "1.0.0",
        warnings,
      },
    };

    return result;
  } catch (error) {
    // Log error for debugging
    console.error("[ActionRoadmap] Generation failed:", error);

    // Re-throw known errors as-is
    if (
      error instanceof AnalysisError ||
      error instanceof InsufficientToolsError ||
      error instanceof TimeoutError ||
      error instanceof SearchError ||
      error instanceof PromptGenerationError ||
      error instanceof AIGenerationError
    ) {
      throw error;
    }

    // Wrap unknown errors
    throw new AnalysisError("Failed to generate action roadmap", {
      originalError: error instanceof Error ? error.message : String(error),
      query,
      totalTime: Date.now() - startTime,
    });
  }
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Validates a query string for basic requirements
 */
export function validateQuery(query: string): boolean {
  return typeof query === "string" && query.trim().length >= 5;
}

/**
 * Creates default options with recommended settings
 */
export function createDefaultOptions(): ActionRoadmapOptions {
  return {
    maxTools: 7,
    minTools: 3,
    includeMetrics: true,
    verboseLogging: false,
    generateAIResult: true,
    analysisTimeout: 30000,
    searchTimeout: 45000,
    aiGenerationTimeout: 90000,
    totalTimeout: 180000, // Increased for AI generation
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Re-export types for convenience
  type ActionRoadmapOutput,
  type ActionRoadmapOptions,
  type PerformanceMetrics,

  // Re-export errors for error handling
  InsufficientToolsError,
  AnalysisError,
  TimeoutError,
  SearchError,
  PromptGenerationError,
  AIGenerationError,
} from "./types";
