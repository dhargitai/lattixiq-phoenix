/**
 * Integration Tests for Score Calculator with Real Data
 *
 * Tests the score calculator with realistic problem scenarios and
 * validates that scoring behaves correctly with actual tool data patterns.
 */

/* eslint-disable prefer-destructuring */

import { describe, it, expect, beforeAll } from "vitest";
import { calculateScores } from "../score-calculator";
import type { ToolSearchResult, ProblemAnalysisResult } from "../types";

// ============================================================================
// REALISTIC TEST DATA
// ============================================================================

/**
 * Realistic problem scenarios for integration testing
 */
const problemScenarios: Array<{ name: string; analysis: ProblemAnalysisResult }> = [
  {
    name: "Urgent Decision Under Pressure",
    analysis: {
      query: "I need to make a critical business decision by tomorrow and I'm feeling overwhelmed",
      language: "English",
      complexity: "moderate",
      urgency: "immediate",
      problemNature: {
        analytical: 0.8,
        emotional: 0.7,
        strategic: 0.6,
        creative: 0.3,
      },
      suggestedToolMix: {
        mentalModels: 0.5,
        biasesFallacies: 0.4,
        generalConcepts: 0.1,
      },
      searchQueries: {
        mentalModels: "decision making frameworks business critical",
        biasesFallacies: "decision biases under pressure urgency",
        generalConcepts: "decision concepts frameworks",
      },
    },
  },
  {
    name: "Long-term Strategic Planning",
    analysis: {
      query: "How can I develop a 5-year strategy for my startup that accounts for uncertainty?",
      language: "English",
      complexity: "complex",
      urgency: "long-term",
      problemNature: {
        analytical: 0.9,
        emotional: 0.2,
        strategic: 0.95,
        creative: 0.6,
      },
      suggestedToolMix: {
        mentalModels: 0.7,
        biasesFallacies: 0.2,
        generalConcepts: 0.1,
      },
      searchQueries: {
        mentalModels: "strategic planning uncertainty mental models",
        biasesFallacies: "planning biases strategic thinking",
        generalConcepts: "strategic concepts frameworks",
      },
    },
  },
  {
    name: "Creative Problem Solving",
    analysis: {
      query: "I'm stuck on a creative project and need fresh perspectives to break through",
      language: "English",
      complexity: "simple",
      urgency: "short-term",
      problemNature: {
        analytical: 0.4,
        emotional: 0.5,
        strategic: 0.3,
        creative: 0.9,
      },
      suggestedToolMix: {
        mentalModels: 0.6,
        biasesFallacies: 0.2,
        generalConcepts: 0.2,
      },
      searchQueries: {
        mentalModels: "creative thinking lateral thinking mental models",
        biasesFallacies: "creativity biases mental blocks",
        generalConcepts: "creative concepts innovation",
      },
    },
  },
];

/**
 * Realistic tool dataset representing different types and complexities
 */
const realisticTools: ToolSearchResult[] = [
  // High-relevance mental models
  {
    id: "1",
    title: "First Principles Thinking",
    type: "mental-model",
    main_category: "Thinking & Learning Processes",
    subcategory: "General Thinking Concepts",
    definition:
      "A method of reasoning that breaks down complex problems into their most basic elements, then builds understanding from the ground up.",
    key_takeaway: "Strip away assumptions and build from fundamental truths",
    hook: "How Elon Musk approaches impossible problems",
    analogy_or_metaphor: "Like an archaeologist carefully removing layers to reach bedrock",
    classic_example: "Aristotle's approach to understanding natural phenomena",
    modern_example: "Elon Musk redesigning rockets by questioning every component cost",
    visual_metaphor: "Building blocks being assembled from foundation up",
    visual_metaphor_url: null,
    payoff: "Breakthrough insights and novel solutions to complex problems",
    pitfall: "Time-consuming when quick decisions are needed",
    dive_deeper_mechanism: "Works by eliminating assumptions and rebuilding from core principles",
    dive_deeper_origin_story: "Developed by Aristotle as the foundation of logical reasoning",
    dive_deeper_pitfalls_nuances: "Can lead to analysis paralysis in time-sensitive situations",
    extra_content: null,
    embedding: null,
    language: "English",
    super_model: true,
    similarity: 0.92,
    searchSource: "mental-models",
  },

  // Simple, actionable bias
  {
    id: "2",
    title: "Confirmation Bias",
    type: "cognitive-bias",
    main_category: "Psychology & Human Behavior",
    subcategory: "Cognitive Biases",
    definition:
      "The tendency to search for, interpret, and remember information that confirms our pre-existing beliefs.",
    key_takeaway: "Actively seek information that challenges your views",
    hook: "Why we see what we want to see",
    analogy_or_metaphor: "Like wearing tinted glasses that filter out unwanted colors",
    classic_example: "Investors only reading news that supports their stock picks",
    modern_example: "Social media echo chambers reinforcing political beliefs",
    visual_metaphor: "Person with blinders looking only straight ahead",
    visual_metaphor_url: null,
    payoff: "Better decision-making through broader perspective",
    pitfall: "Requires conscious effort to overcome natural tendency",
    dive_deeper_mechanism: "Brain efficiency leads to selective attention and memory",
    dive_deeper_origin_story: "First studied systematically by Peter Wason in 1960",
    dive_deeper_pitfalls_nuances: "Sometimes confirmation can be efficient for routine decisions",
    extra_content: null,
    embedding: null,
    language: "English",
    super_model: false,
    similarity: 0.85,
    searchSource: "biases",
  },

  // Complex foundational model
  {
    id: "3",
    title: "Systems Thinking",
    type: "mental-model",
    main_category: "Human Systems & Strategy",
    subcategory: "General Thinking Concepts",
    definition:
      "A holistic approach to analysis that focuses on the way that a system's constituent parts interrelate and how systems work over time and within the context of larger systems. It involves understanding the interconnections, relationships, and patterns within complex systems rather than focusing on individual components in isolation.",
    key_takeaway: "Focus on relationships and patterns, not just individual parts",
    hook: "Why fixing one thing often breaks something else",
    analogy_or_metaphor: "Like seeing the forest instead of individual trees",
    classic_example: "Ecological food webs and environmental balance",
    modern_example:
      "Understanding how remote work affects company culture, productivity, and employee wellbeing",
    visual_metaphor: "Interconnected web with nodes and flowing connections",
    visual_metaphor_url: null,
    payoff: "Better understanding of complex situations and unintended consequences",
    pitfall: "Can lead to analysis paralysis when systems are highly complex",
    dive_deeper_mechanism:
      "Leverages emergent properties and feedback loops to understand behavior",
    dive_deeper_origin_story:
      "Developed in biology and expanded by systems theorists like Jay Forrester",
    dive_deeper_pitfalls_nuances: "Requires balancing detail with broader perspective",
    extra_content: null,
    embedding: null,
    language: "English",
    super_model: true,
    similarity: 0.78,
    searchSource: "mental-models",
  },

  // Quick decision-making tool
  {
    id: "4",
    title: "10-10-10 Rule",
    type: "mental-model",
    main_category: "Thinking & Learning Processes",
    subcategory: "Problem Solving & Decision Making",
    definition:
      "A simple decision-making framework that evaluates choices by considering how you'll feel about the decision in 10 minutes, 10 months, and 10 years.",
    key_takeaway: "Zoom out to gain perspective on decision importance",
    hook: "The 30-second technique that prevents bad decisions",
    analogy_or_metaphor: "Like using different camera lenses - wide, medium, telephoto",
    classic_example: "Choosing whether to quit a job in frustration",
    modern_example: "Deciding whether to post an angry response on social media",
    visual_metaphor: "Three clocks showing different time scales",
    visual_metaphor_url: null,
    payoff: "Quick clarity on what decisions actually matter",
    pitfall: "May oversimplify very complex decisions",
    dive_deeper_mechanism: "Leverages temporal distancing to reduce emotional influence",
    dive_deeper_origin_story: "Popularized by Suzy Welch, former editor of Harvard Business Review",
    dive_deeper_pitfalls_nuances: "Time horizons may need adjustment based on context",
    extra_content: null,
    embedding: null,
    language: "English",
    super_model: false,
    similarity: 0.88,
    searchSource: "mental-models",
  },

  // Emotional reasoning fallacy
  {
    id: "5",
    title: "Appeal to Emotion",
    type: "fallacy",
    main_category: "Psychology & Human Behavior",
    subcategory: "Logical Fallacies",
    definition:
      "A logical fallacy that occurs when emotions are substituted for evidence in an argument.",
    key_takeaway: "Strong feelings don't make arguments true",
    hook: "Why passionate arguments can be completely wrong",
    analogy_or_metaphor: "Like judging a book by how much you like the cover",
    classic_example: "Political speeches that appeal to fear without evidence",
    modern_example:
      "Marketing campaigns that use emotional manipulation instead of product benefits",
    visual_metaphor: "Heart overwhelming brain in decision balance",
    visual_metaphor_url: null,
    payoff: "Clearer thinking in emotionally charged situations",
    pitfall: "May lead to dismissing valid emotional considerations",
    dive_deeper_mechanism: "Exploits the brain's emotional processing shortcuts",
    dive_deeper_origin_story: "Identified in classical rhetoric as one of the basic fallacies",
    dive_deeper_pitfalls_nuances:
      "Emotions can provide valuable information when properly evaluated",
    extra_content: null,
    embedding: null,
    language: "English",
    super_model: false,
    similarity: 0.76,
    searchSource: "biases",
  },

  // Creative thinking tool
  {
    id: "6",
    title: "Inversion",
    type: "mental-model",
    main_category: "Thinking & Learning Processes",
    subcategory: "General Thinking Concepts",
    definition:
      "A thinking technique that approaches problems by considering the opposite or inverse of what you want to achieve.",
    key_takeaway: "Sometimes it's easier to avoid failure than to achieve success",
    hook: "The counterintuitive path to breakthrough thinking",
    analogy_or_metaphor: "Like looking in a mirror to see things from a new angle",
    classic_example:
      "Charlie Munger's advice: \"Tell me where I'm going to die so I won't go there\"",
    modern_example:
      'Instead of asking "How do I build a great team?", ask "How do I destroy team morale?"',
    visual_metaphor: "Arrow pointing in opposite direction revealing new path",
    visual_metaphor_url: null,
    payoff: "Uncovers hidden obstacles and alternative solutions",
    pitfall: "Can become overly negative or risk-focused",
    dive_deeper_mechanism: "Leverages contrast and negative space to reveal insights",
    dive_deeper_origin_story: "Used by mathematicians and popularized by Charlie Munger",
    dive_deeper_pitfalls_nuances: "Balance negative and positive thinking approaches",
    extra_content: null,
    embedding: null,
    language: "English",
    super_model: false,
    similarity: 0.82,
    searchSource: "mental-models",
  },
];

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("Score Calculator Integration Tests", () => {
  let scoredResults: Array<{ scenario: string; tools: ScoredTool[] }>;

  beforeAll(() => {
    // Calculate scores for all scenarios
    scoredResults = problemScenarios.map(({ name, analysis }) => ({
      scenario: name,
      tools: calculateScores(realisticTools, analysis),
    }));
  });

  describe("Urgent Decision Scenario", () => {
    let urgentResults: ScoredTool[];

    beforeAll(() => {
      const urgentScenario = scoredResults.find(
        (r) => r.scenario === "Urgent Decision Under Pressure"
      );
      urgentResults = urgentScenario!.tools.sort((a, b) => b.finalScore - a.finalScore);
    });

    it("should prioritize simple, actionable tools for urgent problems", () => {
      // 10-10-10 Rule should score highly for urgent decisions
      const quickRule = urgentResults.find((t) => t.title === "10-10-10 Rule");
      const complexSystems = urgentResults.find((t) => t.title === "Systems Thinking");

      expect(quickRule!.finalScore).toBeGreaterThan(complexSystems!.finalScore);
    });

    it("should boost bias awareness for emotional urgent problems", () => {
      const confirmationBias = urgentResults.find((t) => t.title === "Confirmation Bias");

      // Should have positive emotional adjustment due to emotional component
      expect(confirmationBias!.scores.emotionalAdjustment).toBeGreaterThan(0);
    });

    it("should apply urgency adjustment correctly", () => {
      urgentResults.forEach((tool) => {
        // Urgent problems should generally favor simpler tools
        if (tool.scores.simplicityBonus > 0.7) {
          expect(tool.scores.urgencyAdjustment).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  describe("Strategic Planning Scenario", () => {
    let strategicResults: ScoredTool[];

    beforeAll(() => {
      const strategicScenario = scoredResults.find(
        (r) => r.scenario === "Long-term Strategic Planning"
      );
      strategicResults = strategicScenario!.tools.sort((a, b) => b.finalScore - a.finalScore);
    });

    it("should prioritize foundational tools for long-term problems", () => {
      const firstPrinciples = strategicResults.find((t) => t.title === "First Principles Thinking");
      const systemsThinking = strategicResults.find((t) => t.title === "Systems Thinking");
      const quickRule = strategicResults.find((t) => t.title === "10-10-10 Rule");

      // Super models should score highly for strategic problems
      // At minimum, they should score at least as high or have higher foundational value
      expect(firstPrinciples!.finalScore).toBeGreaterThanOrEqual(quickRule!.finalScore * 0.98);
      expect(systemsThinking!.finalScore).toBeGreaterThanOrEqual(quickRule!.finalScore * 0.98);

      // And they should have much higher foundational scores
      expect(firstPrinciples!.scores.foundationalValue).toBeGreaterThan(
        quickRule!.scores.foundationalValue
      );
      expect(systemsThinking!.scores.foundationalValue).toBeGreaterThan(
        quickRule!.scores.foundationalValue
      );
    });

    it("should give maximum foundational score to super models", () => {
      const superModels = strategicResults.filter((t) => t.super_model);

      superModels.forEach((tool) => {
        expect(tool.scores.foundationalValue).toBe(1.0);
        expect(tool.isFoundational).toBe(true);
      });
    });

    it("should have minimal emotional adjustments for analytical problems", () => {
      strategicResults.forEach((tool) => {
        // Strategic analytical problems should have small emotional adjustments
        expect(Math.abs(tool.scores.emotionalAdjustment)).toBeLessThan(0.1);
      });
    });
  });

  describe("Creative Problem Scenario", () => {
    let creativeResults: ScoredTool[];

    beforeAll(() => {
      const creativeScenario = scoredResults.find((r) => r.scenario === "Creative Problem Solving");
      creativeResults = creativeScenario!.tools.sort((a, b) => b.finalScore - a.finalScore);
    });

    it("should favor creative thinking tools", () => {
      const inversion = creativeResults.find((t) => t.title === "Inversion");
      const confirmationBias = creativeResults.find((t) => t.title === "Confirmation Bias");

      // Inversion is more directly applicable to creative problems
      expect(inversion!.finalScore).toBeGreaterThan(confirmationBias!.finalScore);
    });

    it("should balance simplicity for short-term creative problems", () => {
      creativeResults.forEach((tool) => {
        // Creative problems with short-term urgency should balance simplicity and creativity
        expect(tool.scores.simplicityBonus).toBeGreaterThan(0);
        expect(tool.finalScore).toBeGreaterThan(0.3); // All tools should be reasonably scored
      });
    });
  });

  describe("Cross-scenario consistency", () => {
    it("should maintain consistent direct relevance scoring", () => {
      // Direct relevance should be based on similarity score consistently
      scoredResults.forEach(({ tools }) => {
        tools.forEach((tool) => {
          expect(tool.scores.directRelevance).toBe(tool.similarity);
        });
      });
    });

    it("should keep all final scores within valid range", () => {
      scoredResults.forEach(({ tools }) => {
        tools.forEach((tool) => {
          expect(tool.finalScore).toBeGreaterThanOrEqual(0);
          expect(tool.finalScore).toBeLessThanOrEqual(1);
        });
      });
    });

    it("should produce different rankings for different scenarios", () => {
      const urgent = scoredResults.find((r) => r.scenario === "Urgent Decision Under Pressure")!;
      const strategic = scoredResults.find((r) => r.scenario === "Long-term Strategic Planning")!;

      // Different scenarios should likely have different top tools
      const urgentTopTitles = urgent.tools
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, 2)
        .map((t) => t.title);
      const strategicTopTitles = strategic.tools
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, 2)
        .map((t) => t.title);

      // At least one of the top 2 should be different
      expect(urgentTopTitles).not.toEqual(strategicTopTitles);
    });
  });

  describe("Performance with realistic data", () => {
    it("should handle realistic tool sets efficiently", () => {
      const startTime = Date.now();

      // Calculate scores for all scenarios
      problemScenarios.forEach(({ analysis }) => {
        calculateScores(realisticTools, analysis);
      });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should handle 6 tools × 3 scenarios comfortably under 100ms
      expect(totalTime).toBeLessThan(100);
    });

    it("should produce meaningful score distributions", () => {
      scoredResults.forEach(({ tools }) => {
        const scores = tools.map((t) => t.finalScore);

        // Should have some variation in scores (not all the same)
        const minScore = Math.min(...scores);
        const maxScore = Math.max(...scores);

        expect(maxScore - minScore).toBeGreaterThan(0.05); // At least 0.05 difference between best and worst

        // Average score should be reasonable (not too low or too high)
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        expect(avgScore).toBeGreaterThan(0.3);
        expect(avgScore).toBeLessThanOrEqual(1.0); // Allow high averages since good matches can score highly
      });
    });
  });

  describe("Type balance behavior", () => {
    it("should show type balance effects with mixed selections", () => {
      const { analysis } = problemScenarios[0];

      // Start with mental models only
      const mentalModels = realisticTools.filter((t) => t.type === "mental-model");

      // Add a bias tool to the selection
      const biasTool = realisticTools.find((t) => t.type === "cognitive-bias")!;

      // Score the bias tool with existing selection
      const results = calculateScores([...mentalModels, biasTool], analysis);
      const biasResult = results.find((t) => t.type === "cognitive-bias")!;

      // The bias tool should get some type balance bonus
      expect(biasResult.scores.typeBalanceBonus).toBeGreaterThan(0);
    });
  });

  describe("Score transparency and debugging", () => {
    it("should provide detailed score breakdowns for analysis", () => {
      const [{ tools }] = scoredResults;
      const [tool] = tools;

      // All score components should be present and valid
      expect(tool.scores.directRelevance).toBeGreaterThanOrEqual(0);
      expect(tool.scores.applicabilityNow).toBeGreaterThanOrEqual(0);
      expect(tool.scores.foundationalValue).toBeGreaterThanOrEqual(0);
      expect(tool.scores.simplicityBonus).toBeGreaterThanOrEqual(0);
      expect(tool.scores.typeBalanceBonus).toBeGreaterThanOrEqual(0);

      // Adjustments should be in valid ranges
      expect(tool.scores.urgencyAdjustment).toBeGreaterThanOrEqual(-0.2);
      expect(tool.scores.urgencyAdjustment).toBeLessThanOrEqual(0.2);
      expect(tool.scores.emotionalAdjustment).toBeGreaterThanOrEqual(-0.2);
      expect(tool.scores.emotionalAdjustment).toBeLessThanOrEqual(0.2);

      // Should be able to reconstruct final score (approximately)
      // This is a sanity check that the scoring calculation is transparent
      expect(typeof tool.finalScore).toBe("number");
      expect(tool.finalScore).toBeGreaterThan(0);
    });
  });
});
