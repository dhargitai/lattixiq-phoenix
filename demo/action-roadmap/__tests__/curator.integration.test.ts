/**
 * Integration Tests for Curator Module
 *
 * Tests the curator with realistic scored tools and problem analysis data,
 * validating the complete curation and ordering flow with different scenarios.
 */

/* eslint-disable prefer-destructuring */

import { describe, it, expect, beforeEach } from "vitest";
import { curateAndOrder } from "../curator";
import { ProblemPhase, type ScoredTool, type ProblemAnalysisResult, type ToolType } from "../types";

// ============================================================================
// REALISTIC TEST DATA
// ============================================================================

/**
 * Helper to create a realistic scored tool with proper KnowledgeContent fields
 */
function createRealisticScoredTool(overrides: Partial<ScoredTool>): ScoredTool {
  return {
    id: "test-tool",
    title: "Test Tool",
    definition: "Test definition",
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

/**
 * Creates realistic scored tools for integration testing
 * Based on common mental models, biases, and concepts
 */
function createRealisticScoredTools(): ScoredTool[] {
  return [
    // Foundational Mental Models
    createRealisticScoredTool({
      id: "systems-thinking-001",
      title: "Systems Thinking",
      definition:
        "A framework for understanding complex interconnected relationships and feedback loops in systems.",
      similarity: 0.89,
      finalScore: 0.91,
      isFoundational: true,
      complexityScore: 0.7,
    }),
    createRealisticScoredTool({
      id: "first-principles-002",
      title: "First Principles Thinking",
      definition:
        "Breaking down complex problems into fundamental truths and building up from there.",
      similarity: 0.87,
      finalScore: 0.89,
      isFoundational: true,
      complexityScore: 0.6,
    }),

    // Regular Mental Models
    createRealisticScoredTool({
      id: "inversion-003",
      title: "Inversion",
      definition:
        "Thinking about problems backwards - what could cause failure instead of what leads to success.",
      similarity: 0.78,
      finalScore: 0.78,
      complexityScore: 0.4,
    }),
    createRealisticScoredTool({
      id: "second-order-004",
      title: "Second-Order Thinking",
      definition:
        "Considering the consequences of consequences - thinking about what happens after the immediate effects.",
      similarity: 0.82,
      finalScore: 0.76,
      complexityScore: 0.65,
    }),

    // Cognitive Biases
    createRealisticScoredTool({
      id: "confirmation-bias-005",
      title: "Confirmation Bias",
      definition:
        "The tendency to search for, interpret, and recall information in ways that confirm pre-existing beliefs.",
      searchSource: "biases",
      type: "cognitive-bias",
      similarity: 0.73,
      finalScore: 0.74,
      complexityScore: 0.3,
    }),
    createRealisticScoredTool({
      id: "anchoring-bias-006",
      title: "Anchoring Bias",
      definition:
        "Over-reliance on the first piece of information encountered when making decisions.",
      searchSource: "biases",
      type: "cognitive-bias",
      similarity: 0.69,
      finalScore: 0.71,
      complexityScore: 0.25,
    }),

    // Logical Fallacies
    createRealisticScoredTool({
      id: "sunk-cost-007",
      title: "Sunk Cost Fallacy",
      definition:
        "Continuing to invest in something based on previously invested time, money, or effort rather than future value.",
      searchSource: "biases",
      type: "fallacy",
      similarity: 0.71,
      finalScore: 0.69,
      complexityScore: 0.3,
    }),

    // General Concepts
    createRealisticScoredTool({
      id: "opportunity-cost-008",
      title: "Opportunity Cost",
      definition:
        "The value of the next best alternative that must be given up when making a choice.",
      searchSource: "general",
      type: "general-concept",
      similarity: 0.66,
      finalScore: 0.65,
      complexityScore: 0.4,
    }),

    // Additional tools to test selection logic
    createRealisticScoredTool({
      id: "pareto-principle-009",
      title: "80/20 Rule (Pareto Principle)",
      definition: "The principle that roughly 80% of effects come from 20% of causes.",
      similarity: 0.64,
      finalScore: 0.64,
      complexityScore: 0.2,
    }),
    createRealisticScoredTool({
      id: "availability-heuristic-010",
      title: "Availability Heuristic",
      definition:
        "Judging probability by how easily examples come to mind, often overweighting recent or memorable events.",
      searchSource: "biases",
      type: "cognitive-bias",
      similarity: 0.62,
      finalScore: 0.61,
      complexityScore: 0.35,
    }),
  ];
}

/**
 * Realistic problem analysis scenarios
 */
const problemScenarios: Array<{ name: string; analysis: ProblemAnalysisResult }> = [
  {
    name: "Strategic Business Decision",
    analysis: {
      query:
        "I need to decide whether to pivot our startup's business model based on recent market feedback",
      language: "en",
      complexity: "complex",
      urgency: "short-term",
      problemNature: {
        analytical: 0.8,
        emotional: 0.4,
        strategic: 0.9,
        creative: 0.6,
      },
      suggestedToolMix: {
        mentalModels: 0.6,
        biasesFallacies: 0.3,
        generalConcepts: 0.1,
      },
      searchQueries: {
        mentalModels: "strategic decision making business pivot frameworks",
        biasesFallacies: "decision biases business confirmation anchoring",
        generalConcepts: "business strategy decision concepts",
      },
    },
  },
  {
    name: "Personal Development Decision",
    analysis: {
      query: "Should I quit my job to pursue freelancing full-time?",
      language: "en",
      complexity: "moderate",
      urgency: "long-term",
      problemNature: {
        analytical: 0.6,
        emotional: 0.8,
        strategic: 0.7,
        creative: 0.5,
      },
      suggestedToolMix: {
        mentalModels: 0.5,
        biasesFallacies: 0.4,
        generalConcepts: 0.1,
      },
      searchQueries: {
        mentalModels: "career decision making risk assessment",
        biasesFallacies: "career biases overconfidence emotional decisions",
        generalConcepts: "career change risk opportunity",
      },
    },
  },
  {
    name: "Simple Time Management",
    analysis: {
      query: "How can I be more productive with my daily routine?",
      language: "en",
      complexity: "simple",
      urgency: "long-term",
      problemNature: {
        analytical: 0.4,
        emotional: 0.2,
        strategic: 0.3,
        creative: 0.3,
      },
      suggestedToolMix: {
        mentalModels: 0.7,
        biasesFallacies: 0.2,
        generalConcepts: 0.1,
      },
      searchQueries: {
        mentalModels: "productivity time management prioritization",
        biasesFallacies: "productivity biases planning fallacy",
        generalConcepts: "productivity concepts efficiency",
      },
    },
  },
];

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("Curator Integration", () => {
  let realisticTools: ScoredTool[];

  beforeEach(() => {
    realisticTools = createRealisticScoredTools();
  });

  describe("End-to-End Curation Scenarios", () => {
    it("should handle strategic business decision with complex requirements", () => {
      const scenario = problemScenarios[0]; // Strategic Business Decision
      const result = curateAndOrder(realisticTools, scenario.analysis);

      // Verify correct tool count for complex problem
      expect(result.tools.length).toBe(6);
      expect(result.metadata.totalCount).toBe(6);

      // Should include foundational tools
      const foundationalCount = result.tools.filter((tool) => tool.isFoundational).length;
      expect(foundationalCount).toBeGreaterThanOrEqual(1);
      expect(foundationalCount).toBeLessThanOrEqual(2);

      // Should have appropriate type distribution for business strategy
      expect(result.metadata.typeDistribution["mental-model"]).toBeGreaterThan(0);
      expect(result.metadata.typeDistribution["cognitive-bias"]).toBeGreaterThan(0);

      // Should meet minimum requirements
      expect(result.metadata.meetsMinimumRequirements).toBe(true);

      // Verify proper ordering and phases
      result.tools.forEach((tool, index) => {
        expect(tool.order).toBe(index + 1);
        expect(tool.phase).toBeDefined();
        expect(Object.values(ProblemPhase)).toContain(tool.phase);
      });

      console.log("Strategic Decision - Selected Tools:");
      result.tools.forEach((tool) => {
        console.log(`  ${tool.order}. ${tool.title} (${tool.type}, Phase: ${tool.phase})`);
      });
    });

    it("should handle emotional personal decision with bias emphasis", () => {
      const scenario = problemScenarios[1]; // Personal Development Decision
      const result = curateAndOrder(realisticTools, scenario.analysis);

      // Verify correct tool count for moderate complexity
      expect(result.tools.length).toBe(5);

      // Should include bias tools for emotional decision (emotional = 0.8 > 0.3 threshold)
      const biasCount =
        result.metadata.typeDistribution["cognitive-bias"] +
        result.metadata.typeDistribution["fallacy"];
      expect(biasCount).toBeGreaterThan(0);

      // Should still include foundational tools
      const foundationalCount = result.tools.filter((tool) => tool.isFoundational).length;
      expect(foundationalCount).toBeGreaterThan(0);

      console.log("Personal Decision - Selected Tools:");
      result.tools.forEach((tool) => {
        console.log(
          `  ${tool.order}. ${tool.title} (${tool.type}, Score: ${tool.finalScore.toFixed(2)})`
        );
      });
    });

    it("should handle simple problem with minimal tool count", () => {
      const scenario = problemScenarios[2]; // Simple Time Management
      const result = curateAndOrder(realisticTools, scenario.analysis);

      // Verify correct tool count for simple problem
      expect(result.tools.length).toBe(4);

      // Should prefer simpler tools (higher simplicityBonus scores)
      const averageComplexity =
        result.tools.reduce((sum, tool) => sum + tool.complexityScore, 0) / result.tools.length;
      expect(averageComplexity).toBeLessThan(0.6); // Should favor simpler tools

      // Should still include at least one foundational tool if available
      const foundationalCount = result.tools.filter((tool) => tool.isFoundational).length;
      expect(foundationalCount).toBeGreaterThan(0);

      console.log("Simple Problem - Selected Tools:");
      result.tools.forEach((tool) => {
        console.log(
          `  ${tool.order}. ${tool.title} (Complexity: ${tool.complexityScore.toFixed(2)})`
        );
      });
    });
  });

  describe("Phase Ordering Integration", () => {
    it("should demonstrate realistic problem-solving sequence", () => {
      const scenario = problemScenarios[0]; // Use strategic decision scenario
      const result = curateAndOrder(realisticTools, scenario.analysis);

      // Group tools by phase to analyze the sequence
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

      console.log("Problem-Solving Sequence:");
      [
        ProblemPhase.Definition,
        ProblemPhase.Analysis,
        ProblemPhase.Generation,
        ProblemPhase.Decision,
        ProblemPhase.Validation,
      ].forEach((phase) => {
        if (toolsByPhase[phase] && toolsByPhase[phase].length > 0) {
          const phaseName = ProblemPhase[phase];
          console.log(`  Phase ${phase} (${phaseName}):`);
          toolsByPhase[phase].forEach((tool) => {
            console.log(`    - ${tool.title} (Score: ${tool.finalScore.toFixed(2)})`);
          });
        }
      });

      // Verify phases are represented
      expect(result.metadata.sequencePhases.length).toBeGreaterThan(0);
      expect(result.metadata.sequencePhases.length).toBeLessThanOrEqual(5);
    });

    it("should maintain score order within phases", () => {
      const scenario = problemScenarios[0];
      const result = curateAndOrder(realisticTools, scenario.analysis);

      // Group by phase and verify score ordering within each phase
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

      // Within each phase, tools should be ordered by descending score
      Object.values(toolsByPhase).forEach((phaseTools) => {
        for (let i = 1; i < phaseTools.length; i++) {
          expect(phaseTools[i - 1].finalScore).toBeGreaterThanOrEqual(phaseTools[i].finalScore);
        }
      });
    });
  });

  describe("Edge Cases and Resilience", () => {
    it("should handle insufficient foundational tools gracefully", () => {
      // Remove all foundational tools
      const toolsWithoutFoundational = realisticTools.map((tool) => ({
        ...tool,
        isFoundational: false,
      }));

      const scenario = problemScenarios[0];
      const result = curateAndOrder(toolsWithoutFoundational, scenario.analysis);

      // Should still select tools but warn about missing foundational tools
      expect(result.tools.length).toBeGreaterThan(0);
      expect(result.metadata.meetsMinimumRequirements).toBe(false);
      expect(result.metadata.warnings).toContain(
        "No foundational tools selected - may impact effectiveness"
      );
    });

    it("should handle tool shortage gracefully", () => {
      // Use only 3 tools for a complex problem that wants 6
      const limitedTools = realisticTools.slice(0, 3);

      const scenario = problemScenarios[0]; // Complex problem wanting 6 tools
      const result = curateAndOrder(limitedTools, scenario.analysis);

      expect(result.tools.length).toBe(3); // Should select all available
      expect(result.metadata.warnings).toContain("Selected 3 tools but target was 6");
    });

    it("should validate output structure completely", () => {
      const scenario = problemScenarios[1];
      const result = curateAndOrder(realisticTools, scenario.analysis);

      // Verify every tool has all OrderedTool properties
      result.tools.forEach((tool, index) => {
        // Original ScoredTool properties
        expect(tool).toHaveProperty("id");
        expect(tool).toHaveProperty("title");
        expect(tool).toHaveProperty("finalScore");
        expect(tool).toHaveProperty("isFoundational");
        expect(tool).toHaveProperty("type");

        // Additional OrderedTool properties
        expect(tool).toHaveProperty("phase");
        expect(tool).toHaveProperty("order");
        expect(tool).toHaveProperty("phaseOrder");

        // Verify types and ranges
        expect(typeof tool.order).toBe("number");
        expect(typeof tool.phaseOrder).toBe("number");
        expect(tool.order).toBe(index + 1); // Sequential ordering
        expect(tool.phaseOrder).toBeGreaterThan(0);
        expect(Object.values(ProblemPhase)).toContain(tool.phase);
      });

      // Verify metadata structure
      expect(result.metadata).toHaveProperty("totalCount");
      expect(result.metadata).toHaveProperty("typeDistribution");
      expect(result.metadata).toHaveProperty("sequencePhases");
      expect(result.metadata).toHaveProperty("meetsMinimumRequirements");
      expect(result.metadata).toHaveProperty("warnings");

      expect(typeof result.metadata.totalCount).toBe("number");
      expect(typeof result.metadata.meetsMinimumRequirements).toBe("boolean");
      expect(Array.isArray(result.metadata.warnings)).toBe(true);
      expect(Array.isArray(result.metadata.sequencePhases)).toBe(true);
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle large tool sets efficiently", () => {
      // Create a larger dataset
      const largeToolset = [
        ...realisticTools,
        ...Array.from({ length: 90 }, (_, i) =>
          createMockScoredTool({
            id: `extra-tool-${i}`,
            finalScore: 0.5 - i * 0.005, // Decreasing scores
            type: ["mental-model", "cognitive-bias", "fallacy", "general-concept"][
              i % 4
            ] as ToolType,
          })
        ),
      ];

      function createMockScoredTool(overrides: Partial<ScoredTool>): ScoredTool {
        return createRealisticScoredTool({
          id: "mock-tool",
          title: "Mock Tool",
          definition: "Mock content",
          similarity: 0.5,
          finalScore: 0.5,
          ...overrides,
        });
      }

      const scenario = problemScenarios[0];
      const startTime = Date.now();

      const result = curateAndOrder(largeToolset, scenario.analysis);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should complete in reasonable time (less than 100ms for 100 tools)
      expect(processingTime).toBeLessThan(100);

      // Should still select correct number
      expect(result.tools.length).toBe(6);

      // Should prefer higher-scored tools
      const averageScore =
        result.tools.reduce((sum, tool) => sum + tool.finalScore, 0) / result.tools.length;
      expect(averageScore).toBeGreaterThan(0.6);

      console.log(`Large dataset (${largeToolset.length} tools) processed in ${processingTime}ms`);
    });
  });
});
