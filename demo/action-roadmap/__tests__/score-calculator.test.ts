/**
 * Unit Tests for Score Calculator Module
 *
 * Tests all scoring components, weight profiles, and dynamic adjustments
 * to ensure accurate and transparent tool ranking.
 */

/* eslint-disable prefer-destructuring */

import { describe, it, expect } from "vitest";
import {
  calculateScores,
  calculateIncrementalScore,
  weightProfiles,
  targetTypeRatios,
} from "../score-calculator";
import type {
  ToolSearchResult,
  ProblemAnalysisResult,
  ScoredTool,
  ToolType,
  ProblemUrgency,
  ProblemComplexity,
} from "../types";
import type { SupportedLanguage } from "../shared-types";

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

function createMockTool(overrides: Partial<ToolSearchResult> = {}): ToolSearchResult {
  return {
    id: "test-tool-1",
    title: "Test Mental Model",
    type: "mental-model" as ToolType,
    main_category: "Psychology & Human Behavior",
    subcategory: "General Thinking Concepts",
    definition: "A test mental model definition for testing purposes.",
    key_takeaway: "Test key takeaway",
    hook: "Test hook",
    analogy_or_metaphor: "Test analogy",
    classic_example: "Test classic example",
    modern_example: "Test modern example",
    visual_metaphor: "Test visual metaphor",
    visual_metaphor_url: null,
    payoff: "Test payoff",
    pitfall: "Test pitfall",
    dive_deeper_mechanism: "Test mechanism",
    dive_deeper_origin_story: "Test origin story",
    dive_deeper_pitfalls_nuances: "Test nuances",
    extra_content: null,
    embedding: null,
    language: "English" as SupportedLanguage,
    super_model: false,
    similarity: 0.8,
    searchSource: "mental-models" as const,
    ...overrides,
  };
}

function createMockAnalysis(overrides: Partial<ProblemAnalysisResult> = {}): ProblemAnalysisResult {
  return {
    query: "How can I make better decisions under pressure?",
    language: "English" as SupportedLanguage,
    complexity: "moderate" as ProblemComplexity,
    urgency: "short-term" as ProblemUrgency,
    problemNature: {
      analytical: 0.7,
      emotional: 0.3,
      strategic: 0.5,
      creative: 0.2,
    },
    suggestedToolMix: {
      mentalModels: 0.6,
      biasesFallacies: 0.3,
      generalConcepts: 0.1,
    },
    searchQueries: {
      mentalModels: "decision making under pressure mental models",
      biasesFallacies: "decision biases under pressure",
      generalConcepts: "pressure decision concepts",
    },
    ...overrides,
  };
}

function createSimpleTool(type: ToolType, similarity: number = 0.8): ToolSearchResult {
  return createMockTool({
    type,
    similarity,
    definition: "Short and simple definition", // Simple tool
    classic_example: "Simple example",
    modern_example: "Modern example",
    visual_metaphor: "Visual metaphor",
  });
}

function createComplexTool(type: ToolType, similarity: number = 0.8): ToolSearchResult {
  return createMockTool({
    type,
    similarity,
    definition:
      "This is a very long and complex definition that explains intricate details and nuanced aspects of the concept, making it harder to understand and apply immediately in practical situations without significant study and reflection.", // Complex tool
    dive_deeper_mechanism: "Complex mechanism explanation",
    dive_deeper_origin_story: "Detailed origin story",
    super_model: false,
  });
}

function createSuperModel(similarity: number = 0.8): ToolSearchResult {
  return createMockTool({
    type: "mental-model",
    similarity,
    super_model: true,
    dive_deeper_mechanism: "Fundamental mechanism",
    dive_deeper_origin_story: "Origin story",
  });
}

// ============================================================================
// CORE FUNCTIONALITY TESTS
// ============================================================================

describe("calculateScores", () => {
  it("should return scored tools with all required fields", () => {
    const tools = [createMockTool()];
    const analysis = createMockAnalysis();

    const results = calculateScores(tools, analysis);

    expect(results).toHaveLength(1);
    const [result] = results;
    expect(result).toHaveProperty("scores");
    expect(results[0]).toHaveProperty("finalScore");
    expect(results[0]).toHaveProperty("isFoundational");
    expect(results[0]).toHaveProperty("complexityScore");

    // Check score breakdown structure
    const { scores } = results[0];
    expect(scores).toHaveProperty("directRelevance");
    expect(scores).toHaveProperty("applicabilityNow");
    expect(scores).toHaveProperty("foundationalValue");
    expect(scores).toHaveProperty("simplicityBonus");
    expect(scores).toHaveProperty("typeBalanceBonus");
    expect(scores).toHaveProperty("urgencyAdjustment");
    expect(scores).toHaveProperty("emotionalAdjustment");
  });

  it("should calculate scores within valid ranges", () => {
    const tools = [createMockTool()];
    const analysis = createMockAnalysis();

    const results = calculateScores(tools, analysis);
    const tool = results[0];

    // Final score should be in 0-1 range
    expect(tool.finalScore).toBeGreaterThanOrEqual(0);
    expect(tool.finalScore).toBeLessThanOrEqual(1);

    // All score components should be in valid ranges
    expect(tool.scores.directRelevance).toBeGreaterThanOrEqual(0);
    expect(tool.scores.directRelevance).toBeLessThanOrEqual(1);
    expect(tool.scores.applicabilityNow).toBeGreaterThanOrEqual(0);
    expect(tool.scores.applicabilityNow).toBeLessThanOrEqual(1);
    expect(tool.scores.foundationalValue).toBeGreaterThanOrEqual(0);
    expect(tool.scores.foundationalValue).toBeLessThanOrEqual(1);
    expect(tool.scores.simplicityBonus).toBeGreaterThanOrEqual(0);
    expect(tool.scores.simplicityBonus).toBeLessThanOrEqual(1);
    expect(tool.scores.typeBalanceBonus).toBeGreaterThanOrEqual(0);
    expect(tool.scores.typeBalanceBonus).toBeLessThanOrEqual(1);

    // Adjustments should be in -0.2 to +0.2 range
    expect(tool.scores.urgencyAdjustment).toBeGreaterThanOrEqual(-0.2);
    expect(tool.scores.urgencyAdjustment).toBeLessThanOrEqual(0.2);
    expect(tool.scores.emotionalAdjustment).toBeGreaterThanOrEqual(-0.2);
    expect(tool.scores.emotionalAdjustment).toBeLessThanOrEqual(0.2);
  });

  it("should handle empty tool array", () => {
    const tools: ToolSearchResult[] = [];
    const analysis = createMockAnalysis();

    const results = calculateScores(tools, analysis);

    expect(results).toHaveLength(0);
  });
});

// ============================================================================
// URGENCY-BASED WEIGHT PROFILE TESTS
// ============================================================================

describe("urgency-based scoring", () => {
  const simpleTool = createSimpleTool("mental-model", 0.8);
  const complexTool = createComplexTool("mental-model", 0.8);

  it("should favor simple tools for immediate problems", () => {
    const immediateAnalysis = createMockAnalysis({
      urgency: "immediate",
      complexity: "simple",
    });

    const simpleResults = calculateScores([simpleTool], immediateAnalysis);
    const complexResults = calculateScores([complexTool], immediateAnalysis);

    expect(simpleResults[0].finalScore).toBeGreaterThan(complexResults[0].finalScore);
  });

  it("should favor foundational tools for long-term problems", () => {
    const superModel = createSuperModel(0.8);
    const simpleTool = createSimpleTool("mental-model", 0.8);

    const longTermAnalysis = createMockAnalysis({
      urgency: "long-term",
      complexity: "complex",
    });

    const superResults = calculateScores([superModel], longTermAnalysis);
    const simpleResults = calculateScores([simpleTool], longTermAnalysis);

    expect(superResults[0].finalScore).toBeGreaterThan(simpleResults[0].finalScore);
  });

  it("should use different weight profiles for different urgencies", () => {
    expect(weightProfiles.immediate.simplicityBonus).toBeGreaterThan(
      weightProfiles["long-term"].simplicityBonus
    );
    expect(weightProfiles["long-term"].foundationalValue).toBeGreaterThan(
      weightProfiles.immediate.foundationalValue
    );
  });
});

// ============================================================================
// COMPLEXITY AND SIMPLICITY TESTS
// ============================================================================

describe("simplicity scoring", () => {
  it("should give higher simplicity scores to tools with shorter definitions", () => {
    const shortTool = createMockTool({
      definition: "Short definition.",
    });

    const longTool = createMockTool({
      definition:
        "This is an extremely long and detailed definition that goes on and on explaining various aspects and nuances of the concept in great detail, making it much more complex to understand and apply in practice than simpler, more concise definitions.",
    });

    const analysis = createMockAnalysis();
    const shortResult = calculateScores([shortTool], analysis)[0];
    const longResult = calculateScores([longTool], analysis)[0];

    expect(shortResult.scores.simplicityBonus).toBeGreaterThan(longResult.scores.simplicityBonus);
  });

  it("should give simplicity bonus for tools with examples", () => {
    const toolWithExamples = createMockTool({
      classic_example: "Classic example",
      modern_example: "Modern example",
    });

    const toolWithoutExamples = createMockTool({
      classic_example: null,
      modern_example: null,
    });

    const analysis = createMockAnalysis();
    const withExamples = calculateScores([toolWithExamples], analysis)[0];
    const withoutExamples = calculateScores([toolWithoutExamples], analysis)[0];

    expect(withExamples.scores.simplicityBonus).toBeGreaterThan(
      withoutExamples.scores.simplicityBonus
    );
  });

  it("should give simplicity bonus for visual metaphors", () => {
    const toolWithVisual = createMockTool({
      visual_metaphor: "Clear visual metaphor",
    });

    const toolWithoutVisual = createMockTool({
      visual_metaphor: null,
    });

    const analysis = createMockAnalysis();
    const withVisual = calculateScores([toolWithVisual], analysis)[0];
    const withoutVisual = calculateScores([toolWithoutVisual], analysis)[0];

    expect(withVisual.scores.simplicityBonus).toBeGreaterThan(withoutVisual.scores.simplicityBonus);
  });
});

// ============================================================================
// FOUNDATIONAL VALUE TESTS
// ============================================================================

describe("foundational value scoring", () => {
  it("should give maximum foundational value to super models", () => {
    const superModel = createSuperModel();
    const regularModel = createMockTool({ super_model: false });

    const analysis = createMockAnalysis();
    const superResult = calculateScores([superModel], analysis)[0];
    const regularResult = calculateScores([regularModel], analysis)[0];

    expect(superResult.scores.foundationalValue).toBe(1.0);
    expect(superResult.scores.foundationalValue).toBeGreaterThan(
      regularResult.scores.foundationalValue
    );
  });

  it("should favor mental models for foundational value", () => {
    const mentalModel = createMockTool({ type: "mental-model" });
    const bias = createMockTool({ type: "cognitive-bias" });

    const analysis = createMockAnalysis();
    const mentalResult = calculateScores([mentalModel], analysis)[0];
    const biasResult = calculateScores([bias], analysis)[0];

    expect(mentalResult.scores.foundationalValue).toBeGreaterThan(
      biasResult.scores.foundationalValue
    );
  });
});

// ============================================================================
// TYPE BALANCE TESTS
// ============================================================================

describe("type balance calculation", () => {
  it("should favor tools that improve type balance", () => {
    // Create current selection heavily weighted toward mental models (100% mental models)
    const existingTools = [
      createSimpleTool("mental-model", 0.8),
      createSimpleTool("mental-model", 0.8),
      createSimpleTool("mental-model", 0.8),
    ];

    // Analytical problem should target 50% mental models, 20% biases
    const analysis = createMockAnalysis({
      problemNature: {
        analytical: 0.9, // Ensure analytical is highest
        emotional: 0.2,
        strategic: 0.3,
        creative: 0.1,
      },
    });

    const existingScored = calculateScores(existingTools, analysis);

    // Current ratio: 100% mental models (far above 50% target)
    // Adding bias improves balance: moves toward 20% bias target
    // Adding another mental model worsens balance: moves further from 50% target

    const biasTool = createSimpleTool("cognitive-bias", 0.7);
    const anotherMentalModel = createSimpleTool("mental-model", 0.7);

    const biasResult = calculateIncrementalScore(biasTool, analysis, existingScored);
    const mentalResult = calculateIncrementalScore(anotherMentalModel, analysis, existingScored);

    // Bias tool should get higher type balance bonus because it improves overall balance
    expect(biasResult.scores.typeBalanceBonus).toBeGreaterThan(
      mentalResult.scores.typeBalanceBonus
    );
  });

  it("should calculate type balance bonus in valid range", () => {
    const tool = createSimpleTool("mental-model");
    const analysis = createMockAnalysis();
    const result = calculateScores([tool], analysis)[0];

    expect(result.scores.typeBalanceBonus).toBeGreaterThanOrEqual(0);
    expect(result.scores.typeBalanceBonus).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// EMOTIONAL ADJUSTMENT TESTS
// ============================================================================

describe("emotional content adjustments", () => {
  it("should boost bias tools for emotional problems", () => {
    const emotionalAnalysis = createMockAnalysis({
      problemNature: {
        analytical: 0.2,
        emotional: 0.8, // High emotional content
        strategic: 0.3,
        creative: 0.2,
      },
    });

    const biasTool = createSimpleTool("cognitive-bias", 0.7);
    const mentalModelTool = createSimpleTool("mental-model", 0.7);

    const biasResult = calculateScores([biasTool], emotionalAnalysis)[0];
    const mentalResult = calculateScores([mentalModelTool], emotionalAnalysis)[0];

    expect(biasResult.scores.emotionalAdjustment).toBeGreaterThan(
      mentalResult.scores.emotionalAdjustment
    );
  });

  it("should boost fallacy tools for emotional problems", () => {
    const emotionalAnalysis = createMockAnalysis({
      problemNature: {
        analytical: 0.2,
        emotional: 0.8,
        strategic: 0.3,
        creative: 0.2,
      },
    });

    const fallacyTool = createSimpleTool("fallacy", 0.7);
    const mentalModelTool = createSimpleTool("mental-model", 0.7);

    const fallacyResult = calculateScores([fallacyTool], emotionalAnalysis)[0];
    const mentalResult = calculateScores([mentalModelTool], emotionalAnalysis)[0];

    expect(fallacyResult.scores.emotionalAdjustment).toBeGreaterThan(
      mentalResult.scores.emotionalAdjustment
    );
  });

  it("should apply emotional adjustments within valid range", () => {
    const emotionalAnalysis = createMockAnalysis({
      problemNature: { analytical: 0.1, emotional: 0.9, strategic: 0.2, creative: 0.1 },
    });

    const biasTool = createSimpleTool("cognitive-bias");
    const result = calculateScores([biasTool], emotionalAnalysis)[0];

    expect(result.scores.emotionalAdjustment).toBeGreaterThanOrEqual(-0.2);
    expect(result.scores.emotionalAdjustment).toBeLessThanOrEqual(0.2);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("calculateIncrementalScore", () => {
  it("should return same result as calculateScores for single tool", () => {
    const tool = createMockTool();
    const analysis = createMockAnalysis();
    const currentSelection: ScoredTool[] = [];

    const batchResult = calculateScores([tool], analysis, currentSelection)[0];
    const incrementalResult = calculateIncrementalScore(tool, analysis, currentSelection);

    expect(incrementalResult.finalScore).toBeCloseTo(batchResult.finalScore, 5);
    expect(incrementalResult.scores.directRelevance).toBe(batchResult.scores.directRelevance);
  });
});

describe("performance requirements", () => {
  it("should calculate scores for 60 tools within performance budget", () => {
    // Create 60 test tools
    const tools = Array.from({ length: 60 }, (_, i) =>
      createMockTool({ id: `test-tool-${i}`, similarity: 0.5 + i * 0.008 })
    );

    const analysis = createMockAnalysis();

    const startTime = Date.now();
    const results = calculateScores(tools, analysis);
    const endTime = Date.now();

    expect(results).toHaveLength(60);
    expect(endTime - startTime).toBeLessThan(100); // Should be under 100ms
  });
});

// ============================================================================
// EDGE CASES AND ERROR HANDLING
// ============================================================================

describe("edge cases", () => {
  it("should handle tools with missing optional fields", () => {
    const minimalTool = createMockTool({
      definition: null,
      classic_example: null,
      modern_example: null,
      visual_metaphor: null,
      payoff: null,
      dive_deeper_mechanism: null,
      key_takeaway: null,
    });

    const analysis = createMockAnalysis();

    expect(() => calculateScores([minimalTool], analysis)).not.toThrow();

    const result = calculateScores([minimalTool], analysis)[0];
    expect(result.finalScore).toBeGreaterThanOrEqual(0);
    expect(result.finalScore).toBeLessThanOrEqual(1);
  });

  it("should handle extreme similarity values", () => {
    const zeroSimilarity = createMockTool({ similarity: 0 });
    const maxSimilarity = createMockTool({ similarity: 1 });

    const analysis = createMockAnalysis();

    const zeroResult = calculateScores([zeroSimilarity], analysis)[0];
    const maxResult = calculateScores([maxSimilarity], analysis)[0];

    expect(zeroResult.finalScore).toBeGreaterThanOrEqual(0);
    expect(maxResult.finalScore).toBeLessThanOrEqual(1);
    expect(maxResult.finalScore).toBeGreaterThan(zeroResult.finalScore);
  });

  it("should handle all problem nature scores at extreme values", () => {
    const extremeAnalysis = createMockAnalysis({
      problemNature: {
        analytical: 1.0,
        emotional: 1.0,
        strategic: 1.0,
        creative: 1.0,
      },
    });

    const tool = createMockTool();

    expect(() => calculateScores([tool], extremeAnalysis)).not.toThrow();

    const result = calculateScores([tool], extremeAnalysis)[0];
    expect(result.finalScore).toBeGreaterThanOrEqual(0);
    expect(result.finalScore).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// TARGET TYPE RATIOS TESTS
// ============================================================================

describe("target type ratios", () => {
  it("should have valid type ratios that sum to approximately 1.0", () => {
    Object.values(targetTypeRatios).forEach((ratios) => {
      const sum = Object.values(ratios).reduce((acc, val) => acc + val, 0);
      expect(sum).toBeCloseTo(1.0, 1); // Allow small rounding differences
    });
  });

  it("should favor biases for emotional problems", () => {
    const emotionalRatios = targetTypeRatios.emotional;
    const analyticalRatios = targetTypeRatios.analytical;

    expect(emotionalRatios["cognitive-bias"]).toBeGreaterThan(analyticalRatios["cognitive-bias"]);
  });

  it("should favor mental models for analytical problems", () => {
    const analyticalRatios = targetTypeRatios.analytical;
    const emotionalRatios = targetTypeRatios.emotional;

    expect(analyticalRatios["mental-model"]).toBeGreaterThan(emotionalRatios["mental-model"]);
  });
});
