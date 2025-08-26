/**
 * Unit tests for the Curator module
 * Tests all paths including edge cases and validation scenarios
 */

import { describe, it, expect } from "vitest";
import { curateAndOrder } from "../curator";
import { ProblemPhase, type ScoredTool, type ProblemAnalysisResult } from "../types";

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

function createMockScoredTool(overrides: Partial<ScoredTool> = {}): ScoredTool {
  return {
    id: Math.random().toString(36),
    title: "Test Tool",
    definition: "Test content",
    key_takeaway: null,
    hook: null,
    analogy_or_metaphor: null,
    classic_example: null,
    modern_example: null,
    visual_metaphor: null,
    visual_metaphor_url: null,
    payoff: null,
    pitfall: null,
    dive_deeper_mechanism: null,
    dive_deeper_origin_story: null,
    dive_deeper_pitfalls_nuances: null,
    extra_content: null,
    embedding: null,
    main_category: null,
    subcategory: "mental-models",
    language: "English",
    super_model: null,
    similarity: 0.8,
    searchSource: "mental-models",
    type: "mental-model",
    scores: {
      directRelevance: 0.7,
      applicabilityNow: 0.6,
      foundationalValue: 0.5,
      simplicityBonus: 0.4,
      typeBalanceBonus: 0.3,
      urgencyAdjustment: 0.0,
      emotionalAdjustment: 0.0,
    },
    finalScore: 0.65,
    isFoundational: false,
    complexityScore: 0.5,
    ...overrides,
  };
}

function createMockAnalysis(overrides: Partial<ProblemAnalysisResult> = {}): ProblemAnalysisResult {
  return {
    query: "Test problem",
    language: "en",
    complexity: "moderate",
    urgency: "short-term",
    problemNature: {
      analytical: 0.7,
      emotional: 0.3,
      strategic: 0.5,
      creative: 0.4,
    },
    suggestedToolMix: {
      mentalModels: 0.6,
      biasesFallacies: 0.3,
      generalConcepts: 0.1,
    },
    searchQueries: {
      mentalModels: "test mental models",
      biasesFallacies: "test biases",
      generalConcepts: "test concepts",
    },
    ...overrides,
  };
}

// ============================================================================
// CORE FUNCTIONALITY TESTS
// ============================================================================

describe("Curator Module", () => {
  describe("curateAndOrder", () => {
    it("should select correct number of tools for simple problems", () => {
      const tools = Array.from({ length: 60 }, (_, i) =>
        createMockScoredTool({
          id: `tool-${i}`,
          finalScore: 0.9 - i * 0.01,
        })
      );

      const analysis = createMockAnalysis({ complexity: "simple" });
      const result = curateAndOrder(tools, analysis);

      expect(result.tools.length).toBe(4); // Simple problems: 4 tools
      expect(result.metadata.totalCount).toBe(4);
    });

    it("should select correct number of tools for moderate problems", () => {
      const tools = Array.from({ length: 60 }, (_, i) =>
        createMockScoredTool({
          id: `tool-${i}`,
          finalScore: 0.9 - i * 0.01,
        })
      );

      const analysis = createMockAnalysis({ complexity: "moderate" });
      const result = curateAndOrder(tools, analysis);

      expect(result.tools.length).toBe(5); // Moderate problems: 5 tools
      expect(result.metadata.totalCount).toBe(5);
    });

    it("should select correct number of tools for complex problems", () => {
      const tools = Array.from({ length: 60 }, (_, i) =>
        createMockScoredTool({
          id: `tool-${i}`,
          finalScore: 0.9 - i * 0.01,
        })
      );

      const analysis = createMockAnalysis({ complexity: "complex" });
      const result = curateAndOrder(tools, analysis);

      expect(result.tools.length).toBe(6); // Complex problems: 6 tools
      expect(result.metadata.totalCount).toBe(6);
    });

    it("should include at least one foundational tool when available", () => {
      const tools = [
        createMockScoredTool({
          id: "foundational-1",
          isFoundational: true,
          finalScore: 0.9,
        }),
        createMockScoredTool({
          id: "foundational-2",
          isFoundational: true,
          finalScore: 0.85,
        }),
        ...Array.from({ length: 10 }, (_, i) =>
          createMockScoredTool({
            id: `regular-${i}`,
            finalScore: 0.8 - i * 0.05,
          })
        ),
      ];

      const analysis = createMockAnalysis();
      const result = curateAndOrder(tools, analysis);

      const foundationalCount = result.tools.filter((tool) => tool.isFoundational).length;
      expect(foundationalCount).toBeGreaterThanOrEqual(1);
      expect(foundationalCount).toBeLessThanOrEqual(2); // Max 2 foundational
    });

    it("should respect type mix proportions", () => {
      const tools = [
        // Mental models (should get 60% = 3 of 5 tools)
        ...Array.from({ length: 10 }, (_, i) =>
          createMockScoredTool({
            id: `mental-${i}`,
            type: "mental-model",
            finalScore: 0.8 + i * 0.01,
          })
        ),
        // Biases (should get 30% = 1-2 of 5 tools)
        ...Array.from({ length: 5 }, (_, i) =>
          createMockScoredTool({
            id: `bias-${i}`,
            type: "cognitive-bias",
            finalScore: 0.7 + i * 0.01,
          })
        ),
        // General concepts (should get 10% = 0-1 of 5 tools)
        ...Array.from({ length: 3 }, (_, i) =>
          createMockScoredTool({
            id: `general-${i}`,
            type: "general-concept",
            finalScore: 0.6 + i * 0.01,
          })
        ),
      ];

      const analysis = createMockAnalysis({
        complexity: "moderate", // 5 tools
        suggestedToolMix: {
          mentalModels: 0.6,
          biasesFallacies: 0.3,
          generalConcepts: 0.1,
        },
      });

      const result = curateAndOrder(tools, analysis);

      // Check type distribution makes sense
      expect(result.metadata.typeDistribution["mental-model"]).toBeGreaterThan(0);
      expect(result.metadata.typeDistribution["mental-model"]).toBeLessThanOrEqual(5);
    });

    it("should order tools by problem-solving phases", () => {
      const tools = [
        createMockScoredTool({
          id: "bias-check",
          type: "cognitive-bias",
          title: "Confirmation Bias",
          finalScore: 0.9,
        }),
        createMockScoredTool({
          id: "systems-thinking",
          type: "mental-model",
          title: "Systems Thinking",
          finalScore: 0.8,
        }),
        createMockScoredTool({
          id: "first-principles",
          type: "mental-model",
          title: "First Principles",
          finalScore: 0.85,
        }),
        createMockScoredTool({
          id: "inversion",
          type: "mental-model",
          title: "Inversion Thinking",
          finalScore: 0.75,
        }),
      ];

      const analysis = createMockAnalysis();
      const result = curateAndOrder(tools, analysis);

      // Check that tools have phases assigned
      result.tools.forEach((tool) => {
        expect(tool.phase).toBeDefined();
        expect(Object.values(ProblemPhase)).toContain(tool.phase);
      });

      // Check that order numbers are sequential
      const orders = result.tools.map((tool) => tool.order);
      expect(orders).toEqual([1, 2, 3, 4, 5].slice(0, orders.length));
    });
  });

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle insufficient tools gracefully", () => {
      const tools = [
        createMockScoredTool({ finalScore: 0.8 }),
        createMockScoredTool({ finalScore: 0.7 }),
      ];

      const analysis = createMockAnalysis({ complexity: "complex" }); // Wants 6 tools
      const result = curateAndOrder(tools, analysis);

      expect(result.tools.length).toBe(2); // Can only select what's available
      expect(result.metadata.warnings).toContain("Selected 2 tools but target was 6");
    });

    it("should handle zero foundational tools", () => {
      const tools = Array.from({ length: 10 }, (_, i) =>
        createMockScoredTool({
          id: `tool-${i}`,
          isFoundational: false,
          finalScore: 0.8 - i * 0.05,
        })
      );

      const analysis = createMockAnalysis();
      const result = curateAndOrder(tools, analysis);

      expect(result.metadata.warnings).toContain(
        "No foundational tools selected - may impact effectiveness"
      );
      expect(result.metadata.meetsMinimumRequirements).toBe(false);
    });

    it("should warn about missing bias tools for emotional problems", () => {
      const tools = Array.from({ length: 10 }, (_, i) =>
        createMockScoredTool({
          id: `tool-${i}`,
          type: "mental-model", // Only mental models, no bias tools
          finalScore: 0.8 - i * 0.05,
        })
      );

      const analysis = createMockAnalysis({
        problemNature: {
          analytical: 0.3,
          emotional: 0.8, // High emotional content
          strategic: 0.4,
          creative: 0.3,
        },
      });

      const result = curateAndOrder(tools, analysis);

      expect(result.metadata.warnings).toContain(
        "High emotional content but no bias tools included"
      );
    });

    it("should handle all tools having similar scores", () => {
      const tools = Array.from({ length: 20 }, (_, i) =>
        createMockScoredTool({
          id: `tool-${i}`,
          finalScore: 0.75, // All same score
          type: i % 2 === 0 ? "mental-model" : "cognitive-bias",
        })
      );

      const analysis = createMockAnalysis();
      const result = curateAndOrder(tools, analysis);

      // Should still select appropriate number
      expect(result.tools.length).toBe(5);
      expect(result.tools.every((tool) => tool.finalScore === 0.75)).toBe(true);
    });
  });

  // ============================================================================
  // VALIDATION TESTS
  // ============================================================================

  describe("Output Validation", () => {
    it("should return tools with all required OrderedTool properties", () => {
      const tools = Array.from({ length: 10 }, (_, i) =>
        createMockScoredTool({
          id: `tool-${i}`,
          finalScore: 0.9 - i * 0.05,
        })
      );

      const analysis = createMockAnalysis();
      const result = curateAndOrder(tools, analysis);

      result.tools.forEach((tool) => {
        expect(tool).toHaveProperty("phase");
        expect(tool).toHaveProperty("order");
        expect(tool).toHaveProperty("phaseOrder");
        expect(typeof tool.order).toBe("number");
        expect(typeof tool.phaseOrder).toBe("number");
        expect(tool.order).toBeGreaterThan(0);
        expect(tool.phaseOrder).toBeGreaterThan(0);
      });
    });

    it("should return valid metadata structure", () => {
      const tools = Array.from({ length: 10 }, (_, i) =>
        createMockScoredTool({
          id: `tool-${i}`,
          finalScore: 0.9 - i * 0.05,
        })
      );

      const analysis = createMockAnalysis();
      const result = curateAndOrder(tools, analysis);

      expect(result.metadata).toHaveProperty("totalCount");
      expect(result.metadata).toHaveProperty("typeDistribution");
      expect(result.metadata).toHaveProperty("sequencePhases");
      expect(result.metadata).toHaveProperty("meetsMinimumRequirements");
      expect(result.metadata).toHaveProperty("warnings");

      expect(typeof result.metadata.totalCount).toBe("number");
      expect(Array.isArray(result.metadata.sequencePhases)).toBe(true);
      expect(typeof result.metadata.meetsMinimumRequirements).toBe("boolean");
      expect(Array.isArray(result.metadata.warnings)).toBe(true);
    });

    it("should maintain score order within phases", () => {
      const tools = [
        createMockScoredTool({
          id: "high-score-bias",
          type: "cognitive-bias",
          title: "High Score Bias",
          finalScore: 0.9,
        }),
        createMockScoredTool({
          id: "low-score-bias",
          type: "cognitive-bias",
          title: "Low Score Bias",
          finalScore: 0.7,
        }),
        createMockScoredTool({
          id: "high-score-model",
          type: "mental-model",
          title: "High Score Model",
          finalScore: 0.95,
        }),
        createMockScoredTool({
          id: "low-score-model",
          type: "mental-model",
          title: "Low Score Model",
          finalScore: 0.6,
        }),
      ];

      const analysis = createMockAnalysis();
      const result = curateAndOrder(tools, analysis);

      // Group tools by phase and check score ordering within each phase
      const toolsByPhase: Record<ProblemPhase, typeof result.tools> = {} as Record<
        ProblemPhase,
        typeof result.tools
      >;

      result.tools.forEach((tool) => {
        if (!toolsByPhase[tool.phase]) {
          toolsByPhase[tool.phase] = [];
        }
        toolsByPhase[tool.phase].push(tool);
      });

      // Within each phase, scores should be in descending order
      Object.values(toolsByPhase).forEach((phaseTools) => {
        for (let i = 1; i < phaseTools.length; i++) {
          expect(phaseTools[i - 1].finalScore).toBeGreaterThanOrEqual(phaseTools[i].finalScore);
        }
      });
    });
  });

  // ============================================================================
  // INTEGRATION-STYLE TESTS
  // ============================================================================

  describe("Realistic Scenarios", () => {
    it("should handle a realistic business problem scenario", () => {
      const tools = [
        // Foundational tools
        createMockScoredTool({
          id: "systems-thinking",
          title: "Systems Thinking",
          type: "mental-model",
          isFoundational: true,
          finalScore: 0.92,
        }),
        createMockScoredTool({
          id: "first-principles",
          title: "First Principles",
          type: "mental-model",
          isFoundational: true,
          finalScore: 0.89,
        }),
        // Regular mental models
        ...Array.from({ length: 20 }, (_, i) =>
          createMockScoredTool({
            id: `mental-model-${i}`,
            type: "mental-model",
            finalScore: 0.85 - i * 0.02,
          })
        ),
        // Bias tools
        ...Array.from({ length: 10 }, (_, i) =>
          createMockScoredTool({
            id: `bias-${i}`,
            type: "cognitive-bias",
            finalScore: 0.75 - i * 0.03,
          })
        ),
        // General concepts
        ...Array.from({ length: 5 }, (_, i) =>
          createMockScoredTool({
            id: `concept-${i}`,
            type: "general-concept",
            finalScore: 0.65 - i * 0.05,
          })
        ),
      ];

      const analysis = createMockAnalysis({
        complexity: "complex",
        problemNature: {
          analytical: 0.8,
          emotional: 0.4,
          strategic: 0.9,
          creative: 0.3,
        },
        suggestedToolMix: {
          mentalModels: 0.7,
          biasesFallacies: 0.2,
          generalConcepts: 0.1,
        },
      });

      const result = curateAndOrder(tools, analysis);

      // Should select 6 tools for complex problem
      expect(result.tools.length).toBe(6);

      // Should include foundational tools
      const foundationalCount = result.tools.filter((tool) => tool.isFoundational).length;
      expect(foundationalCount).toBeGreaterThanOrEqual(1);

      // Should have reasonable type distribution
      expect(result.metadata.typeDistribution["mental-model"]).toBeGreaterThan(0);

      // Should meet minimum requirements
      expect(result.metadata.meetsMinimumRequirements).toBe(true);

      // Should have phases assigned
      expect(result.metadata.sequencePhases.length).toBeGreaterThan(0);
    });
  });
});
