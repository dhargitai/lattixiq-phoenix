/**
 * Unit tests for the Action Roadmap Generator
 */

/* eslint-disable prefer-destructuring */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateActionRoadmap,
  validateQuery,
  createDefaultOptions,
  InsufficientToolsError,
  AnalysisError,
  TimeoutError,
  SearchError,
  PromptGenerationError,
} from "../generator";
import type {
  ProblemAnalysisResult,
  ToolSearchResult,
  ScoredTool,
  CuratedToolList,
  ActionRoadmapOptions,
} from "../types";
import type { MainCategory, Subcategory } from "../shared-types";

// Mock all external dependencies
vi.mock("../analyzer", () => ({
  analyzeProblem: vi.fn(),
}));

vi.mock("../model-finder", () => ({
  findRelevantTools: vi.fn(),
}));

vi.mock("../score-calculator", () => ({
  calculateScores: vi.fn(),
}));

vi.mock("../curator", () => ({
  curateAndOrder: vi.fn(),
}));

vi.mock("../result-prompt-generator", () => ({
  generatePromptAndSchema: vi.fn(),
}));

vi.mock("../result-generator", () => ({
  generateActionRoadmapResult: vi.fn(),
}));

import { analyzeProblem } from "../analyzer";
import { findRelevantTools } from "../model-finder";
import { calculateScores } from "../score-calculator";
import { curateAndOrder } from "../curator";
import { generatePromptAndSchema } from "../result-prompt-generator";
import { generateActionRoadmapResult } from "../result-generator";

// Test data factories
const createMockAnalysis = (overrides = {}): ProblemAnalysisResult => ({
  query: "test query",
  language: "English",
  complexity: "moderate",
  urgency: "short-term",
  problemNature: {
    analytical: 0.7,
    emotional: 0.3,
    strategic: 0.6,
    creative: 0.4,
  },
  suggestedToolMix: {
    mentalModels: 0.6,
    biasesFallacies: 0.2,
    generalConcepts: 0.2,
  },
  searchQueries: {
    mentalModels: "systems thinking frameworks",
    biasesFallacies: "decision making biases",
    generalConcepts: "problem solving approaches",
  },
  ...overrides,
});

const createMockTools = (count = 5): ToolSearchResult[] =>
  Array.from({ length: count }, (_, i) => ({
    // KnowledgeContent fields (all required except 'type' which is replaced)
    id: `tool-${i}`,
    title: `Tool ${i}`,
    main_category: "Core Sciences & Mathematics" as MainCategory,
    subcategory: "Mathematics & Statistics" as Subcategory,
    definition: `Definition for Tool ${i}`,
    key_takeaway: `Key takeaway for Tool ${i}`,
    hook: `Hook for Tool ${i}`,
    analogy_or_metaphor: `Analogy for Tool ${i}`,
    classic_example: `Classic example for Tool ${i}`,
    modern_example: `Modern example for Tool ${i}`,
    visual_metaphor: `Visual metaphor for Tool ${i}`,
    visual_metaphor_url: null,
    payoff: `Payoff for Tool ${i}`,
    pitfall: `Pitfall for Tool ${i}`,
    dive_deeper_mechanism: `Mechanism for Tool ${i}`,
    dive_deeper_origin_story: `Origin story for Tool ${i}`,
    dive_deeper_pitfalls_nuances: `Nuances for Tool ${i}`,
    extra_content: `Extra content for Tool ${i}`,
    embedding: null,
    language: "English",
    super_model: i === 0, // First tool is a super model

    // ToolSearchResult specific fields
    similarity: 0.8 - i * 0.1,
    searchSource: "mental-models" as const,
    type: "mental-model" as const,
  }));

const createMockScoredTools = (count = 5): ScoredTool[] => {
  const tools = createMockTools(count);
  return tools.map((tool, i) => ({
    ...tool,
    scores: {
      directRelevance: 0.8 - i * 0.1,
      applicabilityNow: 0.7,
      foundationalValue: 0.6,
      simplicityBonus: 0.1,
      typeBalanceBonus: 0.05,
      urgencyAdjustment: 0.0,
      emotionalAdjustment: 0.0,
    },
    finalScore: 0.8 - i * 0.1,
    isFoundational: i === 0,
    complexityScore: 0.5,
  }));
};

const createMockCuratedList = (toolCount = 5): CuratedToolList => ({
  tools: createMockScoredTools(toolCount).map((tool, i) => ({
    ...tool,
    phase: 1,
    order: i + 1,
    phaseOrder: i + 1,
  })),
  metadata: {
    totalCount: toolCount,
    typeDistribution: {
      "mental-model": toolCount,
      "cognitive-bias": 0,
      fallacy: 0,
      "general-concept": 0,
    },
    sequencePhases: [1],
    meetsMinimumRequirements: true,
    warnings: [],
  },
});

const createMockPromptResult = () => ({
  prompt: "Generated prompt content",
  schema: {} as never,
  metadata: {
    toolCount: 5,
    estimatedTokens: 1500,
    complexity: "moderate" as const,
    urgency: "short-term" as const,
  },
});

describe("generateActionRoadmap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.log and console.error for cleaner test output
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("successful generation", () => {
    beforeEach(() => {
      // Setup successful mocks
      vi.mocked(analyzeProblem).mockResolvedValue(createMockAnalysis());
      vi.mocked(findRelevantTools).mockResolvedValue(createMockTools(5));
      vi.mocked(calculateScores).mockReturnValue(createMockScoredTools(5));
      vi.mocked(curateAndOrder).mockReturnValue(createMockCuratedList(5));
      vi.mocked(generatePromptAndSchema).mockReturnValue(createMockPromptResult());
      vi.mocked(generateActionRoadmapResult).mockResolvedValue({
        result: {
          executiveSummary: "Test roadmap summary",
          phases: [],
          quickStartChecklist: [],
        },
        metadata: {
          tokensUsed: 500,
          generationTime: 1000,
          modelUsed: "gemini-2.5-pro",
          generatedAt: new Date().toISOString(),
        },
      });
    });

    it("should generate complete roadmap successfully", async () => {
      const result = await generateActionRoadmap(
        "I need to improve my decision making skills when facing complex business problems and high-stakes situations"
      );

      expect(result).toMatchObject({
        prompt: "Generated prompt content",
        schema: expect.any(Object),
        analysis: expect.objectContaining({
          query: "test query",
          language: "English",
          complexity: "moderate",
        }),
        curatedTools: expect.objectContaining({
          tools: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              title: expect.any(String),
            }),
          ]),
          metadata: expect.objectContaining({
            totalCount: 5,
            meetsMinimumRequirements: true,
          }),
        }),
        metrics: expect.objectContaining({
          totalTime: expect.any(Number),
          toolsFound: 5,
          toolsSelected: 5,
        }),
        metadata: expect.objectContaining({
          generatedAt: expect.any(String),
          version: "1.0.0",
          warnings: expect.any(Array),
        }),
      });
    });

    it("should call all modules in correct sequence", async () => {
      await generateActionRoadmap(
        "I need to improve my decision making skills when facing complex business problems and high-stakes situations"
      );

      expect(analyzeProblem).toHaveBeenCalledWith(
        "I need to improve my decision making skills when facing complex business problems and high-stakes situations"
      );
      expect(findRelevantTools).toHaveBeenCalledWith(createMockAnalysis());
      expect(calculateScores).toHaveBeenCalledWith(createMockTools(5), createMockAnalysis());
      expect(curateAndOrder).toHaveBeenCalledWith(createMockScoredTools(5), createMockAnalysis());
      expect(generatePromptAndSchema).toHaveBeenCalledWith(
        createMockCuratedList(5),
        createMockAnalysis()
      );
    });

    it("should respect custom options", async () => {
      const options: ActionRoadmapOptions = {
        maxTools: 10,
        minTools: 5,
        verboseLogging: true,
        forceComplexity: "complex",
        forceUrgency: "immediate",
      };

      await generateActionRoadmap(
        "I need to improve my decision making skills when facing complex business problems and high-stakes situations",
        options
      );

      expect(calculateScores).toHaveBeenCalledWith(expect.any(Array), expect.any(Object));
    });

    it("should track performance metrics correctly", async () => {
      // Add small delays to mock functions to simulate real processing time
      vi.mocked(analyzeProblem).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return createMockAnalysis();
      });
      vi.mocked(findRelevantTools).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return createMockTools(5);
      });

      const result = await generateActionRoadmap(
        "I need to improve my decision making skills when facing complex business problems and high-stakes situations"
      );

      expect(result.metrics).toMatchObject({
        totalTime: expect.any(Number),
        analysisTime: expect.any(Number),
        searchTime: expect.any(Number),
        scoringTime: expect.any(Number),
        curationTime: expect.any(Number),
        promptTime: expect.any(Number),
        toolsFound: 5,
        toolsSelected: 5,
      });

      expect(result.metrics.totalTime).toBeGreaterThan(0);
      expect(result.metrics.analysisTime).toBeGreaterThan(0);
      expect(result.metrics.searchTime).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    it("should throw AnalysisError for invalid query", async () => {
      await expect(generateActionRoadmap("")).rejects.toThrow(AnalysisError);
      await expect(generateActionRoadmap("abc")).rejects.toThrow(AnalysisError);
    });

    it("should throw AnalysisError when analysis fails", async () => {
      vi.mocked(analyzeProblem).mockRejectedValue(new Error("Analysis failed"));

      await expect(
        generateActionRoadmap(
          "I need to improve my decision making skills when facing complex business problems and high-stakes situations"
        )
      ).rejects.toThrow(AnalysisError);
    });

    it("should throw InsufficientToolsError when too few tools found", async () => {
      vi.mocked(analyzeProblem).mockResolvedValue(createMockAnalysis());
      vi.mocked(findRelevantTools).mockResolvedValue(createMockTools(2)); // Less than minTools (3)

      await expect(
        generateActionRoadmap(
          "I need to improve my decision making skills when facing complex business problems and high-stakes situations"
        )
      ).rejects.toThrow(InsufficientToolsError);
    });

    it("should throw SearchError for search failures", async () => {
      vi.mocked(analyzeProblem).mockResolvedValue(createMockAnalysis());
      vi.mocked(findRelevantTools).mockRejectedValue(new Error("Search failed"));

      await expect(
        generateActionRoadmap(
          "I need to improve my decision making skills when facing complex business problems and high-stakes situations"
        )
      ).rejects.toThrow(SearchError);
    });

    it("should throw AnalysisError for scoring failures", async () => {
      vi.mocked(analyzeProblem).mockResolvedValue(createMockAnalysis());
      vi.mocked(findRelevantTools).mockResolvedValue(createMockTools(5));
      vi.mocked(calculateScores).mockImplementation(() => {
        throw new Error("Scoring failed");
      });

      await expect(
        generateActionRoadmap(
          "I need to improve my decision making skills when facing complex business problems and high-stakes situations"
        )
      ).rejects.toThrow(AnalysisError);
    });

    it("should throw AnalysisError for curation failures", async () => {
      vi.mocked(analyzeProblem).mockResolvedValue(createMockAnalysis());
      vi.mocked(findRelevantTools).mockResolvedValue(createMockTools(5));
      vi.mocked(calculateScores).mockReturnValue(createMockScoredTools(5));
      vi.mocked(curateAndOrder).mockImplementation(() => {
        throw new Error("Curation failed");
      });

      await expect(
        generateActionRoadmap(
          "I need to improve my decision making skills when facing complex business problems and high-stakes situations"
        )
      ).rejects.toThrow(AnalysisError);
    });

    it("should throw PromptGenerationError for prompt generation failures", async () => {
      vi.mocked(analyzeProblem).mockResolvedValue(createMockAnalysis());
      vi.mocked(findRelevantTools).mockResolvedValue(createMockTools(5));
      vi.mocked(calculateScores).mockReturnValue(createMockScoredTools(5));
      vi.mocked(curateAndOrder).mockReturnValue(createMockCuratedList(5));
      vi.mocked(generatePromptAndSchema).mockImplementation(() => {
        throw new Error("Prompt generation failed");
      });

      await expect(
        generateActionRoadmap(
          "I need to improve my decision making skills when facing complex business problems and high-stakes situations"
        )
      ).rejects.toThrow(PromptGenerationError);
    });

    it("should handle timeouts correctly", async () => {
      // Mock a slow analysis that exceeds timeout
      vi.mocked(analyzeProblem).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const options: ActionRoadmapOptions = {
        analysisTimeout: 50, // Very short timeout
      };

      await expect(
        generateActionRoadmap(
          "I need to improve my decision making skills when facing complex business problems and high-stakes situations",
          options
        )
      ).rejects.toThrow(TimeoutError);
    });
  });

  describe("edge cases", () => {
    it("should handle warnings from curation", async () => {
      const mockCuratedList = createMockCuratedList(3);
      mockCuratedList.metadata.warnings = ["Not enough biases found"];

      vi.mocked(analyzeProblem).mockResolvedValue(createMockAnalysis());
      vi.mocked(findRelevantTools).mockResolvedValue(createMockTools(5));
      vi.mocked(calculateScores).mockReturnValue(createMockScoredTools(5));
      vi.mocked(curateAndOrder).mockReturnValue(mockCuratedList);
      vi.mocked(generatePromptAndSchema).mockReturnValue(createMockPromptResult());

      const result = await generateActionRoadmap(
        "I need to improve my decision making skills when facing complex business problems and high-stakes situations"
      );

      expect(result.metadata.warnings).toContain("Not enough biases found");
    });

    it("should apply forced analysis overrides", async () => {
      const mockAnalysis = createMockAnalysis({
        complexity: "simple",
        urgency: "long-term",
      });

      vi.mocked(analyzeProblem).mockResolvedValue(mockAnalysis);
      vi.mocked(findRelevantTools).mockResolvedValue(createMockTools(5));
      vi.mocked(calculateScores).mockReturnValue(createMockScoredTools(5));
      vi.mocked(curateAndOrder).mockReturnValue(createMockCuratedList(5));
      vi.mocked(generatePromptAndSchema).mockReturnValue(createMockPromptResult());

      const options: ActionRoadmapOptions = {
        forceComplexity: "complex",
        forceUrgency: "immediate",
      };

      await generateActionRoadmap(
        "I need to improve my decision making skills when facing complex business problems and high-stakes situations",
        options
      );

      // Check that the forced values were passed to subsequent modules
      const [, /* tools */ analysisUsed] = vi.mocked(calculateScores).mock.calls[0];

      expect(analysisUsed.complexity).toBe("complex");
      expect(analysisUsed.urgency).toBe("immediate");
    });
  });
});

describe("validateQuery", () => {
  it("should validate query strings correctly", () => {
    expect(validateQuery("Valid query string")).toBe(true);
    expect(validateQuery("12345")).toBe(true);
    expect(validateQuery("")).toBe(false);
    expect(validateQuery("abc")).toBe(false);
    expect(validateQuery("    ")).toBe(false);
  });

  it("should handle non-string inputs", () => {
    expect(validateQuery(null as never)).toBe(false);
    expect(validateQuery(undefined as never)).toBe(false);
    expect(validateQuery(123 as never)).toBe(false);
  });
});

describe("createDefaultOptions", () => {
  it("should return default options with expected values", () => {
    const options = createDefaultOptions();

    expect(options).toEqual({
      maxTools: 7,
      minTools: 3,
      includeMetrics: true,
      verboseLogging: false,
      generateAIResult: true,
      analysisTimeout: 30000,
      searchTimeout: 45000,
      aiGenerationTimeout: 90000,
      totalTimeout: 180000,
    });
  });
});
