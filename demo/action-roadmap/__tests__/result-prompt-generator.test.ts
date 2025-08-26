/**
 * Unit Tests for Result Prompt Generator
 *
 * Tests the prompt generation logic and Zod schema validation
 */

import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";
import {
  generatePromptAndSchema,
  ActionRoadmapSchema,
  ToolApplicationSchema,
} from "../result-prompt-generator";
import type {
  CuratedToolList,
  ProblemAnalysisResult,
  OrderedTool,
  PromptGeneratorResult,
} from "../types";
import { PromptGenerationError, ProblemPhase } from "../types";

// ============================================================================
// TEST DATA FIXTURES
// ============================================================================

const mockAnalysis: ProblemAnalysisResult = {
  query: "How can I improve team productivity while maintaining work-life balance?",
  language: "English",
  complexity: "moderate",
  urgency: "short-term",
  problemNature: {
    analytical: 0.7,
    emotional: 0.6,
    strategic: 0.8,
    creative: 0.4,
  },
  suggestedToolMix: {
    mentalModels: 0.6,
    biasesFallacies: 0.3,
    generalConcepts: 0.1,
  },
  searchQueries: {
    mentalModels: "team productivity systems thinking",
    biasesFallacies: "productivity bias overwork fallacy",
    generalConcepts: "work life balance concepts",
  },
};

const mockTool: OrderedTool = {
  id: "test-tool-1",
  title: "Systems Thinking",
  type: "mental-model",
  main_category: "Thinking & Learning Processes",
  subcategory: "Problem Solving & Decision Making",
  definition:
    "A holistic approach to analysis that focuses on the way that a system's constituent parts interrelate",
  key_takeaway: "Understanding interconnections helps solve complex problems more effectively",
  hook: "What if the problem isn't what you think it is?",
  analogy_or_metaphor: "Like looking at a forest instead of individual trees",
  classic_example: "Solving traffic jams by improving public transport",
  modern_example: "Fixing team productivity by examining communication patterns",
  visual_metaphor: "A network of interconnected nodes",
  visual_metaphor_url: null,
  payoff: "Solve root causes instead of symptoms",
  pitfall: "Can lead to analysis paralysis",
  dive_deeper_mechanism: "Systems thinking works by mapping relationships between elements",
  dive_deeper_origin_story: "Developed in the 1950s by biologist Ludwig von Bertalanffy",
  dive_deeper_pitfalls_nuances: "Requires balancing detail with big-picture thinking",
  extra_content: "Additional systems thinking concepts",
  embedding: null,
  language: "English",
  super_model: true,
  similarity: 0.85,
  searchSource: "mental-models" as const,
  scores: {
    directRelevance: 0.8,
    applicabilityNow: 0.7,
    foundationalValue: 0.9,
    simplicityBonus: 0.1,
    typeBalanceBonus: 0.05,
    urgencyAdjustment: 0.1,
    emotionalAdjustment: 0.0,
  },
  finalScore: 0.82,
  isFoundational: true,
  complexityScore: 0.6,
  phase: ProblemPhase.Analysis,
  order: 1,
  phaseOrder: 1,
};

const mockCuratedTools: CuratedToolList = {
  tools: [mockTool],
  metadata: {
    totalCount: 1,
    typeDistribution: {
      "mental-model": 1,
      "cognitive-bias": 0,
      fallacy: 0,
      "general-concept": 0,
    },
    sequencePhases: [ProblemPhase.Analysis],
    meetsMinimumRequirements: true,
    warnings: [],
  },
};

// ============================================================================
// SCHEMA VALIDATION TESTS
// ============================================================================

describe("Zod Schema Validation", () => {
  describe("ToolApplicationSchema", () => {
    it("should validate correct tool application structure", () => {
      const validTool = {
        toolId: "systems-thinking",
        subtitle: "Understand interconnections",
        whyNow: "Helps understand team dynamics",
        howToApply: ["Map current processes", "Identify bottlenecks"],
        watchOutFor: ["Analysis paralysis", "Over-complexity"],
        expectedOutcome: "Better understanding of root causes",
      };

      expect(() => ToolApplicationSchema.parse(validTool)).not.toThrow();
    });

    it("should reject invalid tool application structure", () => {
      const invalidTool = {
        title: "Systems Thinking",
        whyNow: "Helps understand team dynamics",
        howToApply: "Not an array", // Should be array
        watchOutFor: ["Analysis paralysis"],
        expectedOutcome: "Better understanding",
      };

      expect(() => ToolApplicationSchema.parse(invalidTool)).toThrow();
    });
  });

  describe("ActionRoadmapSchema", () => {
    it("should validate complete action roadmap structure", () => {
      const validRoadmap = {
        executiveSummary:
          "Use systems thinking to understand team dynamics and identify productivity bottlenecks.",
        roadmapPhases: [
          {
            order: 1,
            phaseName: "Analysis",
            description: "Investigate and break down the problem",
            tools: [
              {
                toolId: "systems-thinking",
                subtitle: "Understand interconnections",
                whyNow: "Helps understand interconnections",
                howToApply: ["Map processes", "Identify patterns"],
                watchOutFor: ["Over-analysis"],
                expectedOutcome: "Clear problem understanding",
              },
            ],
          },
        ],
        quickStartChecklist: [
          "Map current workflow using systems thinking",
          "Identify key bottlenecks in processes",
          "Document interconnections between team members",
        ],
        decisionPointsForBiasChecking: [
          {
            afterWhichPhase: 1,
            description: "Choosing intervention points",
            biasesToCheck: ["Confirmation bias - seek contradictory evidence"],
          },
        ],
        redFlags: ["Team becomes more confused"],
        successIndicators: ["Clearer understanding of problems"],
      };

      expect(() => ActionRoadmapSchema.parse(validRoadmap)).not.toThrow();
    });
  });
});

// ============================================================================
// PROMPT GENERATION TESTS
// ============================================================================

describe("generatePromptAndSchema", () => {
  let result: PromptGeneratorResult;

  beforeEach(() => {
    result = generatePromptAndSchema(mockCuratedTools, mockAnalysis);
  });

  describe("successful generation", () => {
    it("should return properly structured result", () => {
      expect(result).toHaveProperty("prompt");
      expect(result).toHaveProperty("schema");
      expect(result).toHaveProperty("metadata");

      expect(typeof result.prompt).toBe("string");
      expect(result.schema).toBeInstanceOf(z.ZodObject);
      expect(result.metadata).toHaveProperty("toolCount");
      expect(result.metadata).toHaveProperty("estimatedTokens");
      expect(result.metadata).toHaveProperty("complexity");
      expect(result.metadata).toHaveProperty("urgency");
    });

    it("should include problem context in prompt", () => {
      expect(result.prompt).toContain("<problem_context>");
      expect(result.prompt).toContain("<user_query>How can I improve team productivity");
      expect(result.prompt).toContain("<complexity>moderate</complexity>");
      expect(result.prompt).toContain("<urgency>short-term</urgency>");
      expect(result.prompt).toContain("<language>English</language>");
    });

    it("should include selected tools in proper XML format", () => {
      expect(result.prompt).toContain("<selected_tools>");
      expect(result.prompt).toContain("<tool>");
      expect(result.prompt).toContain("<title>Systems Thinking</title>");
      expect(result.prompt).toContain("<type>mental-model</type>");
      expect(result.prompt).toContain("<phase>2</phase>"); // ProblemPhase.Analysis = 2
      expect(result.prompt).toContain("<score>0.82</score>");
      expect(result.prompt).toContain("<is_foundational>true</is_foundational>");
    });

    it("should include task instructions", () => {
      expect(result.prompt).toContain("<task>");
      expect(result.prompt).toContain("Generate a comprehensive action roadmap");
      expect(result.prompt).toContain("Problem Definition Phase");
      expect(result.prompt).toContain("Analysis Phase");
      expect(result.prompt).toContain("Solution Generation Phase");
      expect(result.prompt).toContain("Decision Phase");
      expect(result.prompt).toContain("Validation Phase");
    });

    it("should include output format specification", () => {
      expect(result.prompt).toContain("<output_format>");
      expect(result.prompt).toContain('"executiveSummary"');
      expect(result.prompt).toContain('"roadmapPhases"');
      expect(result.prompt).toContain('"quickStartChecklist"');
    });

    it("should provide correct metadata", () => {
      expect(result.metadata.toolCount).toBe(1);
      expect(result.metadata.complexity).toBe("moderate");
      expect(result.metadata.urgency).toBe("short-term");
      expect(result.metadata.estimatedTokens).toBeGreaterThan(0);
    });

    it("should estimate reasonable token count", () => {
      const tokens = result.metadata.estimatedTokens;
      expect(tokens).toBeGreaterThan(100); // Should have substantial content
      expect(tokens).toBeLessThan(8000); // Should be within limits
    });
  });

  describe("error handling", () => {
    it("should throw PromptGenerationError for empty tools list", () => {
      const emptyToolsList: CuratedToolList = {
        tools: [],
        metadata: {
          totalCount: 0,
          typeDistribution: {
            "mental-model": 0,
            "cognitive-bias": 0,
            fallacy: 0,
            "general-concept": 0,
          },
          sequencePhases: [],
          meetsMinimumRequirements: false,
          warnings: ["No tools found"],
        },
      };

      expect(() => generatePromptAndSchema(emptyToolsList, mockAnalysis)).toThrow(
        PromptGenerationError
      );
    });

    it("should throw PromptGenerationError for empty query", () => {
      const emptyQueryAnalysis = {
        ...mockAnalysis,
        query: "",
      };

      expect(() => generatePromptAndSchema(mockCuratedTools, emptyQueryAnalysis)).toThrow(
        PromptGenerationError
      );
    });

    it("should handle missing tool metadata gracefully", () => {
      const toolWithMissingData: OrderedTool = {
        ...mockTool,
        definition: null,
        key_takeaway: null,
      };

      const toolsListWithMissingData: CuratedToolList = {
        ...mockCuratedTools,
        tools: [toolWithMissingData],
      };

      expect(() => generatePromptAndSchema(toolsListWithMissingData, mockAnalysis)).not.toThrow();

      const result = generatePromptAndSchema(toolsListWithMissingData, mockAnalysis);
      expect(result.prompt).toContain("Definition not available");
      expect(result.prompt).toContain("Key takeaway not available");
    });
  });

  describe("characteristics formatting", () => {
    it("should format problem characteristics correctly", () => {
      const result = generatePromptAndSchema(mockCuratedTools, mockAnalysis);
      expect(result.prompt).toContain("requires analytical thinking");
      expect(result.prompt).toContain("needs strategic planning");
      // emotional is 0.6, exactly at threshold, so may or may not be included
    });

    it("should handle low-scoring characteristics", () => {
      const lowScoreAnalysis: ProblemAnalysisResult = {
        ...mockAnalysis,
        problemNature: {
          analytical: 0.3,
          emotional: 0.2,
          strategic: 0.4,
          creative: 0.1,
        },
      };

      const result = generatePromptAndSchema(mockCuratedTools, lowScoreAnalysis);
      expect(result.prompt).toContain("multi-faceted problem");
    });
  });

  describe("multiple tools handling", () => {
    it("should handle multiple tools correctly", () => {
      const secondTool: OrderedTool = {
        ...mockTool,
        id: "test-tool-2",
        title: "Confirmation Bias",
        type: "cognitive-bias",
        phase: ProblemPhase.Decision,
        order: 2,
        phaseOrder: 1,
        isFoundational: false,
      };

      const multipleToolsList: CuratedToolList = {
        ...mockCuratedTools,
        tools: [mockTool, secondTool],
        metadata: {
          ...mockCuratedTools.metadata,
          totalCount: 2,
          typeDistribution: {
            "mental-model": 1,
            "cognitive-bias": 1,
            fallacy: 0,
            "general-concept": 0,
          },
          sequencePhases: [ProblemPhase.Analysis, ProblemPhase.Decision],
        },
      };

      const result = generatePromptAndSchema(multipleToolsList, mockAnalysis);

      expect(result.metadata.toolCount).toBe(2);
      expect(result.prompt).toContain("Systems Thinking");
      expect(result.prompt).toContain("Confirmation Bias");
      expect(result.prompt).toContain("<phase>2</phase>"); // Analysis
      expect(result.prompt).toContain("<phase>4</phase>"); // Decision
    });
  });
});

// ============================================================================
// INTEGRATION VALIDATION TESTS
// ============================================================================

describe("Schema-Prompt Integration", () => {
  it("should generate schema that matches expected AI output structure", () => {
    const result = generatePromptAndSchema(mockCuratedTools, mockAnalysis);

    // The schema should be the ActionRoadmapSchema
    expect(result.schema).toEqual(ActionRoadmapSchema);

    // Test that a valid response would pass schema validation
    const mockAIResponse = {
      executiveSummary:
        "Use systems thinking to map team interactions and identify productivity bottlenecks that don't compromise work-life balance.",
      roadmapPhases: [
        {
          order: 1,
          phaseName: "Analysis",
          description: "Investigate team dynamics and workflow patterns",
          tools: [
            {
              toolId: "systems-thinking",
              subtitle: "Map interconnections",
              whyNow:
                "Your team productivity challenge involves multiple interconnected factors that need holistic understanding",
              howToApply: [
                "Map current team workflow and communication patterns",
                "Identify bottlenecks and connection points",
                "Look for systemic causes rather than individual blame",
              ],
              watchOutFor: [
                "Getting lost in over-analysis without action",
                "Ignoring human/emotional factors in the system",
              ],
              expectedOutcome:
                "Clear understanding of how team elements interact and where real productivity blocks exist",
            },
          ],
        },
      ],
      quickStartChecklist: [
        "Sketch out current team workflow on paper",
        "Map communication patterns between team members",
        "Identify 3 key bottlenecks affecting productivity",
      ],
      decisionPointsForBiasChecking: [
        {
          afterWhichPhase: 1,
          description: "Choosing which productivity bottleneck to address first",
          biasesToCheck: [
            "Availability bias - focusing on most recent or visible problems. Review data and get input from all team members before deciding",
          ],
        },
      ],
      redFlags: ["Team feels more overwhelmed after changes"],
      successIndicators: ["Team can clearly explain how their work connects to outcomes"],
    };

    expect(() => result.schema.parse(mockAIResponse)).not.toThrow();
  });
});
