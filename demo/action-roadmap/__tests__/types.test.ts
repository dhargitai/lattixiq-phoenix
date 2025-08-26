/**
 * @fileoverview Unit tests for Action Roadmap type definitions
 *
 * These tests validate that our types work correctly and catch any
 * breaking changes to the type system.
 */

import { describe, it, expect } from "vitest";
import type {
  ProblemAnalysisResult,
  ProblemCharacteristics,
  ToolMixSuggestion,
  ScoredTool,
  CuratedToolList,
  ActionRoadmapOutput,
  PromptGeneratorResult,
  ProblemComplexity,
  ProblemUrgency,
  ToolType,
  TypeDistribution,
  ActionRoadmapOptions,
  PerformanceMetrics,
} from "../types";
import {
  ProblemPhase,
  ActionRoadmapError,
  InsufficientToolsError,
  AnalysisError,
  TimeoutError,
} from "../types";
import { z } from "zod";

describe("Action Roadmap Types", () => {
  describe("Enum Values", () => {
    it("should have correct ProblemPhase enum values", () => {
      expect(ProblemPhase.Definition).toBe(1);
      expect(ProblemPhase.Analysis).toBe(2);
      expect(ProblemPhase.Generation).toBe(3);
      expect(ProblemPhase.Decision).toBe(4);
      expect(ProblemPhase.Validation).toBe(5);
    });
  });

  describe("Type Compatibility", () => {
    it("should allow valid ProblemComplexity values", () => {
      const complexities: ProblemComplexity[] = ["simple", "moderate", "complex"];
      expect(complexities).toHaveLength(3);
    });

    it("should allow valid ProblemUrgency values", () => {
      const urgencies: ProblemUrgency[] = ["immediate", "short-term", "long-term"];
      expect(urgencies).toHaveLength(3);
    });

    it("should allow valid ToolType values", () => {
      const types: ToolType[] = ["mental-model", "cognitive-bias", "fallacy", "general-concept"];
      expect(types).toHaveLength(4);
    });
  });

  describe("ProblemCharacteristics", () => {
    it("should accept valid problem characteristics", () => {
      const characteristics: ProblemCharacteristics = {
        analytical: 0.8,
        emotional: 0.3,
        strategic: 0.6,
        creative: 0.2,
      };

      expect(characteristics.analytical).toBe(0.8);
      expect(characteristics.emotional).toBe(0.3);
      expect(characteristics.strategic).toBe(0.6);
      expect(characteristics.creative).toBe(0.2);
    });

    it("should accept boundary values", () => {
      const characteristics: ProblemCharacteristics = {
        analytical: 0.0,
        emotional: 1.0,
        strategic: 0.5,
        creative: 0.0,
      };

      expect(characteristics.analytical).toBe(0.0);
      expect(characteristics.emotional).toBe(1.0);
    });
  });

  describe("ToolMixSuggestion", () => {
    it("should accept valid tool mix proportions", () => {
      const toolMix: ToolMixSuggestion = {
        mentalModels: 0.6,
        biasesFallacies: 0.3,
        generalConcepts: 0.1,
      };

      expect(toolMix.mentalModels).toBe(0.6);
      expect(toolMix.biasesFallacies).toBe(0.3);
      expect(toolMix.generalConcepts).toBe(0.1);

      // Should sum to approximately 1.0
      const sum = toolMix.mentalModels + toolMix.biasesFallacies + toolMix.generalConcepts;
      expect(sum).toBeCloseTo(1.0, 2);
    });
  });

  describe("ProblemAnalysisResult", () => {
    it("should accept complete analysis result", () => {
      const analysis: ProblemAnalysisResult = {
        query: "How to improve team productivity",
        language: "English",
        complexity: "moderate",
        urgency: "short-term",
        problemNature: {
          analytical: 0.7,
          emotional: 0.4,
          strategic: 0.8,
          creative: 0.3,
        },
        suggestedToolMix: {
          mentalModels: 0.5,
          biasesFallacies: 0.3,
          generalConcepts: 0.2,
        },
        searchQueries: {
          mentalModels: "productivity frameworks and mental models",
          biasesFallacies: "cognitive biases affecting team productivity",
          generalConcepts: "general productivity improvement concepts",
        },
      };

      expect(analysis.query).toBe("How to improve team productivity");
      expect(analysis.language).toBe("English");
      expect(analysis.complexity).toBe("moderate");
      expect(analysis.urgency).toBe("short-term");
      expect(analysis.problemNature.analytical).toBe(0.7);
      expect(analysis.searchQueries.mentalModels).toContain("productivity");
    });
  });

  describe("ScoredTool Interface", () => {
    it("should extend ToolSearchResult with scoring information", () => {
      const scoredTool: Partial<ScoredTool> = {
        id: "test-tool",
        title: "First Principles Thinking",
        type: "mental-model",
        similarity: 0.85,
        searchSource: "mental-models",
        scores: {
          directRelevance: 0.85,
          applicabilityNow: 0.9,
          foundationalValue: 0.8,
          simplicityBonus: 0.7,
          typeBalanceBonus: 0.6,
          urgencyAdjustment: 0.1,
          emotionalAdjustment: 0.0,
        },
        finalScore: 0.82,
        isFoundational: true,
        complexityScore: 0.6,
      };

      expect(scoredTool.type).toBe("mental-model");
      expect(scoredTool.finalScore).toBe(0.82);
      expect(scoredTool.isFoundational).toBe(true);
      expect(scoredTool.scores?.directRelevance).toBe(0.85);
    });
  });

  describe("CuratedToolList", () => {
    it("should include tools and metadata", () => {
      const typeDistribution: TypeDistribution = {
        "mental-model": 3,
        "cognitive-bias": 2,
        fallacy: 1,
        "general-concept": 1,
      };

      const curatedList: Partial<CuratedToolList> = {
        tools: [], // Would contain OrderedTool objects
        metadata: {
          totalCount: 7,
          typeDistribution,
          sequencePhases: [ProblemPhase.Definition, ProblemPhase.Analysis, ProblemPhase.Decision],
          meetsMinimumRequirements: true,
          warnings: [],
        },
      };

      expect(curatedList.metadata?.totalCount).toBe(7);
      expect(curatedList.metadata?.typeDistribution["mental-model"]).toBe(3);
      expect(curatedList.metadata?.meetsMinimumRequirements).toBe(true);
    });
  });

  describe("ActionRoadmapOutput", () => {
    it("should include all required output sections", () => {
      const mockSchema = z.object({ test: z.string() });
      const mockMetrics: PerformanceMetrics = {
        totalTime: 3500,
        analysisTime: 800,
        searchTime: 1200,
        scoringTime: 600,
        curationTime: 500,
        promptTime: 400,
        toolsFound: 45,
        toolsSelected: 6,
      };

      const output: Partial<ActionRoadmapOutput> = {
        prompt: "Generated prompt text",
        schema: mockSchema,
        metrics: mockMetrics,
        metadata: {
          generatedAt: "2025-01-21T10:00:00Z",
          version: "1.0.0",
          warnings: [],
        },
      };

      expect(output.prompt).toBe("Generated prompt text");
      expect(output.schema).toBe(mockSchema);
      expect(output.metrics?.totalTime).toBe(3500);
      expect(output.metadata?.version).toBe("1.0.0");
    });
  });

  describe("ActionRoadmapOptions", () => {
    it("should accept partial configuration", () => {
      const options: ActionRoadmapOptions = {
        maxTools: 5,
        verboseLogging: true,
        analysisTimeout: 5000,
      };

      expect(options.maxTools).toBe(5);
      expect(options.verboseLogging).toBe(true);
      expect(options.analysisTimeout).toBe(5000);
      expect(options.minTools).toBeUndefined();
    });

    it("should accept custom scoring weights", () => {
      const options: ActionRoadmapOptions = {
        scoringWeights: {
          directRelevance: 0.5,
          applicabilityNow: 0.3,
          foundationalValue: 0.2,
        },
      };

      expect(options.scoringWeights?.directRelevance).toBe(0.5);
      expect(options.scoringWeights?.applicabilityNow).toBe(0.3);
    });
  });

  describe("Error Classes", () => {
    it("should create ActionRoadmapError with context", () => {
      const error = new ActionRoadmapError("Test error", {
        phase: "analysis",
        query: "test query",
      });

      expect(error.message).toBe("Test error");
      expect(error.context.phase).toBe("analysis");
      expect(error.context.query).toBe("test query");
      expect(error.name).toBe("ActionRoadmapError");
    });

    it("should create specific error types", () => {
      const insufficientError = new InsufficientToolsError("Not enough tools", { toolCount: 2 });
      const analysisError = new AnalysisError("Analysis failed", { query: "bad query" });
      const timeoutError = new TimeoutError("Operation timed out", { timeout: 5000 });

      expect(insufficientError instanceof ActionRoadmapError).toBe(true);
      expect(analysisError instanceof ActionRoadmapError).toBe(true);
      expect(timeoutError instanceof ActionRoadmapError).toBe(true);

      expect(insufficientError.name).toBe("InsufficientToolsError");
      expect(analysisError.name).toBe("AnalysisError");
      expect(timeoutError.name).toBe("TimeoutError");
    });
  });

  describe("Type Guards and Validation", () => {
    it("should validate numeric ranges in ProblemCharacteristics", () => {
      // This tests that TypeScript allows valid ranges
      const validCharacteristics: ProblemCharacteristics = {
        analytical: 0.0, // minimum
        emotional: 1.0, // maximum
        strategic: 0.5, // middle
        creative: 0.75, // valid fraction
      };

      expect(validCharacteristics.analytical).toBeGreaterThanOrEqual(0.0);
      expect(validCharacteristics.analytical).toBeLessThanOrEqual(1.0);
      expect(validCharacteristics.emotional).toBeGreaterThanOrEqual(0.0);
      expect(validCharacteristics.emotional).toBeLessThanOrEqual(1.0);
    });

    it("should validate PromptGeneratorResult structure", () => {
      const mockSchema = z.object({
        executiveSummary: z.string(),
        phases: z.array(
          z.object({
            name: z.string(),
            tools: z.array(z.unknown()),
          })
        ),
      });

      const result: PromptGeneratorResult = {
        prompt: "Complete XML prompt",
        schema: mockSchema,
        metadata: {
          toolCount: 5,
          estimatedTokens: 1500,
          complexity: "moderate",
          urgency: "short-term",
        },
      };

      expect(result.prompt).toBeTruthy();
      expect(result.schema).toBe(mockSchema);
      expect(result.metadata.toolCount).toBe(5);
      expect(result.metadata.complexity).toBe("moderate");
    });
  });

  describe("Performance Metrics", () => {
    it("should track all timing phases", () => {
      const metrics: PerformanceMetrics = {
        totalTime: 4000,
        analysisTime: 800,
        searchTime: 1500,
        scoringTime: 700,
        curationTime: 600,
        promptTime: 400,
        toolsFound: 35,
        toolsSelected: 5,
      };

      // Verify phase times sum to approximately total
      const phaseSum =
        metrics.analysisTime +
        metrics.searchTime +
        metrics.scoringTime +
        metrics.curationTime +
        metrics.promptTime;

      expect(phaseSum).toBe(4000);
      expect(metrics.toolsFound).toBeGreaterThan(metrics.toolsSelected);
    });
  });
});
