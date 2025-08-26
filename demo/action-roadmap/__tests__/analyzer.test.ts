/**
 * Unit Tests for Problem Analyzer Module
 *
 * Tests all functionality including edge cases, error handling, and performance requirements.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { analyzeProblem, validateQuery, calculateToolMix } from "../analyzer";

// Mock the AI provider
vi.mock("../../ai/ai-provider", () => ({
  getAIModel: vi.fn(() => ({
    name: "gpt-4.1-mini",
  })),
}));

// Mock the generateObject function
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

import { generateObject } from "ai";
const mockGenerateObject = vi.mocked(generateObject);

describe("Problem Analyzer Module", () => {
  // Helper function to create a proper GenerateObjectResult mock
  const createMockResult = (object: any) => ({
    object,
    finishReason: "stop" as const,
    usage: { totalTokens: 100, inputTokens: 50, outputTokens: 50 },
    warnings: [],
    request: { body: "" },
    response: { headers: {}, status: 200, statusText: "OK" },
    rawResponse: { headers: {} },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console logs during tests
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("analyzeProblem", () => {
    const mockAIResponse = {
      language: "English" as const,
      complexity: "moderate" as const,
      urgency: "immediate" as const,
      problemNature: {
        analytical: 0.7,
        emotional: 0.6,
        strategic: 0.8,
        creative: 0.2,
      },
      suggestedToolMix: {
        mentalModels: 0.5,
        biasesFallacies: 0.35,
        generalConcepts: 0.15,
      },
      searchQueries: {
        mentalModels: "decision making frameworks opportunity cost trade-offs career choice",
        biasesFallacies: "decision making biases anchoring confirmation bias loss aversion",
        generalConcepts: "decision frameworks choice evaluation criteria",
      },
    };

    it("should analyze a job decision problem correctly", async () => {
      mockGenerateObject.mockResolvedValueOnce(createMockResult(mockAIResponse));

      const query = "I need to decide between two job offers";
      const result = await analyzeProblem(query);

      expect(result).toEqual({
        query: "I need to decide between two job offers",
        language: "English",
        complexity: "moderate",
        urgency: "immediate",
        problemNature: {
          analytical: 0.7,
          emotional: 0.6,
          strategic: 0.8,
          creative: 0.2,
        },
        suggestedToolMix: {
          mentalModels: 0.5,
          biasesFallacies: 0.35,
          generalConcepts: 0.15,
        },
        searchQueries: {
          mentalModels: "decision making frameworks opportunity cost trade-offs career choice",
          biasesFallacies: "decision making biases anchoring confirmation bias loss aversion",
          generalConcepts: "decision frameworks choice evaluation criteria",
        },
      });

      expect(mockGenerateObject).toHaveBeenCalledOnce();
    });

    it("should analyze a complex technical problem", async () => {
      const complexResponse = {
        ...mockAIResponse,
        complexity: "complex" as const,
        urgency: "long-term" as const,
        problemNature: {
          analytical: 0.9,
          emotional: 0.1,
          strategic: 0.7,
          creative: 0.8,
        },
        suggestedToolMix: {
          mentalModels: 0.45,
          biasesFallacies: 0.25,
          generalConcepts: 0.3,
        },
      };

      mockGenerateObject.mockResolvedValueOnce(createMockResult(complexResponse));

      const query = "Design scalable microservices architecture";
      const result = await analyzeProblem(query);

      expect(result.complexity).toBe("complex");
      expect(result.urgency).toBe("long-term");
      expect(result.problemNature.analytical).toBe(0.9);
      expect(result.problemNature.creative).toBe(0.8);
    });

    it("should analyze a simple emotional problem", async () => {
      const simpleResponse = {
        ...mockAIResponse,
        complexity: "simple" as const,
        urgency: "immediate" as const,
        problemNature: {
          analytical: 0.2,
          emotional: 0.9,
          strategic: 0.3,
          creative: 0.1,
        },
        suggestedToolMix: {
          mentalModels: 0.5,
          biasesFallacies: 0.4,
          generalConcepts: 0.1,
        },
      };

      mockGenerateObject.mockResolvedValueOnce(createMockResult(simpleResponse));

      const query = "Stop procrastinating on important tasks";
      const result = await analyzeProblem(query);

      expect(result.complexity).toBe("simple");
      expect(result.problemNature.emotional).toBe(0.9);
      expect(result.suggestedToolMix.biasesFallacies).toBe(0.4); // High bias proportion for emotional
    });

    it("should handle Hungarian language input", async () => {
      const hungarianResponse = {
        ...mockAIResponse,
        language: "Hungarian" as const,
      };

      mockGenerateObject.mockResolvedValueOnce(createMockResult(hungarianResponse));

      const query = "Hogyan döntsek két állásajánlat között?";
      const result = await analyzeProblem(query);

      expect(result.language).toBe("Hungarian");
    });

    it("should validate input and throw on empty query", async () => {
      await expect(analyzeProblem("")).rejects.toThrow("Query cannot be empty");
      await expect(analyzeProblem("   ")).rejects.toThrow("Query cannot be empty");
    });

    it("should throw on overly long query", async () => {
      const longQuery = "a".repeat(1001);
      await expect(analyzeProblem(longQuery)).rejects.toThrow(
        "Query exceeds maximum length of 1000 characters"
      );
    });

    it("should handle AI errors gracefully", async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error("AI service unavailable"));

      const query = "Test query";
      await expect(analyzeProblem(query)).rejects.toThrow(
        "Problem analysis failed: AI service unavailable"
      );
    });

    it("should warn about invalid tool mix proportions", async () => {
      const invalidMixResponse = {
        ...mockAIResponse,
        suggestedToolMix: {
          mentalModels: 0.8,
          biasesFallacies: 0.3,
          generalConcepts: 0.1,
        },
      };

      mockGenerateObject.mockResolvedValueOnce(createMockResult(invalidMixResponse));
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const query = "Test query";
      await analyzeProblem(query);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[ProblemAnalyzer] Tool mix proportions do not sum to 1.0:",
        expect.any(Number)
      );
    });

    it("should meet performance requirement (<2 seconds)", async () => {
      mockGenerateObject.mockResolvedValueOnce(createMockResult(mockAIResponse));

      const startTime = Date.now();
      await analyzeProblem("Test query for performance");
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);
    });

    it("should handle maximum length queries", async () => {
      mockGenerateObject.mockResolvedValueOnce(createMockResult(mockAIResponse));

      const maxQuery = "a".repeat(1000);
      const result = await analyzeProblem(maxQuery);

      expect(result.query).toBe(maxQuery);
    });

    it("should trim whitespace from input", async () => {
      mockGenerateObject.mockResolvedValueOnce(createMockResult(mockAIResponse));

      const query = "  I need help with a decision  ";
      const result = await analyzeProblem(query);

      expect(result.query).toBe("I need help with a decision");
    });
  });

  describe("validateQuery", () => {
    it("should validate correct queries", () => {
      expect(validateQuery("Valid query")).toBe(true);
      expect(validateQuery("A".repeat(1000))).toBe(true);
    });

    it("should throw on invalid inputs", () => {
      expect(() => validateQuery("")).toThrow("Query must be a non-empty string");
      expect(() => validateQuery("   ")).toThrow("Query cannot be empty");
      expect(() => validateQuery(null as unknown as string)).toThrow(
        "Query must be a non-empty string"
      );
      expect(() => validateQuery(undefined as unknown as string)).toThrow(
        "Query must be a non-empty string"
      );
      expect(() => validateQuery(123 as unknown as string)).toThrow(
        "Query must be a non-empty string"
      );
      expect(() => validateQuery("a".repeat(1001))).toThrow("Query exceeds maximum length");
    });

    it("should warn on very short queries", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      validateQuery("short");

      expect(consoleSpy).toHaveBeenCalledWith(
        "[ProblemAnalyzer] Very short query (<10 characters), analysis may be limited"
      );
    });
  });

  describe("calculateToolMix", () => {
    it("should calculate correct mix for simple problems", () => {
      const result = calculateToolMix("simple", {
        analytical: 0.5,
        emotional: 0.3,
        strategic: 0.4,
        creative: 0.2,
      });

      expect(result.mentalModels).toBeCloseTo(0.6, 2);
      expect(result.biasesFallacies).toBeCloseTo(0.3, 2);
      expect(result.generalConcepts).toBeCloseTo(0.1, 2);
    });

    it("should calculate correct mix for complex problems", () => {
      const result = calculateToolMix("complex", {
        analytical: 0.8,
        emotional: 0.2,
        strategic: 0.9,
        creative: 0.1,
      });

      // Complex base: 50% mental, 30% biases, 20% general
      // Strategic adjustment: +5% mental, -5% biases
      expect(result.mentalModels).toBeCloseTo(0.55, 2);
      expect(result.biasesFallacies).toBeCloseTo(0.25, 2);
      expect(result.generalConcepts).toBeCloseTo(0.2, 2);
    });

    it("should adjust for high emotional content", () => {
      const result = calculateToolMix("moderate", {
        analytical: 0.3,
        emotional: 0.8, // High emotional
        strategic: 0.4,
        creative: 0.2,
      });

      // Base moderate: 55% mental, 30% biases, 15% general
      // Emotional adjustment: -10% mental, +10% biases
      expect(result.mentalModels).toBeCloseTo(0.45, 2);
      expect(result.biasesFallacies).toBeCloseTo(0.4, 2);
      expect(result.generalConcepts).toBeCloseTo(0.15, 2);
    });

    it("should adjust for high creative content", () => {
      const result = calculateToolMix("simple", {
        analytical: 0.3,
        emotional: 0.2,
        strategic: 0.4,
        creative: 0.8, // High creative
      });

      // Base simple: 60% mental, 30% biases, 10% general
      // Creative adjustment: -10% mental, +10% general
      expect(result.mentalModels).toBeCloseTo(0.5, 2);
      expect(result.biasesFallacies).toBeCloseTo(0.3, 2);
      expect(result.generalConcepts).toBeCloseTo(0.2, 2);
    });

    it("should handle multiple adjustments", () => {
      const result = calculateToolMix("moderate", {
        analytical: 0.5,
        emotional: 0.8, // +10% biases, -10% mental
        strategic: 0.8, // +5% mental, -5% biases
        creative: 0.8, // +10% general, -10% mental
      });

      // Base moderate: 55% mental, 30% biases, 15% general
      // Net adjustments: -15% mental, +5% biases, +10% general
      expect(result.mentalModels).toBeCloseTo(0.4, 2);
      expect(result.biasesFallacies).toBeCloseTo(0.35, 2);
      expect(result.generalConcepts).toBeCloseTo(0.25, 2);
    });

    it("should ensure non-negative values", () => {
      const result = calculateToolMix("simple", {
        analytical: 0.1,
        emotional: 0.9, // Large adjustment
        strategic: 0.1,
        creative: 0.9, // Large adjustment
      });

      expect(result.mentalModels).toBeGreaterThanOrEqual(0);
      expect(result.biasesFallacies).toBeGreaterThanOrEqual(0);
      expect(result.generalConcepts).toBeGreaterThanOrEqual(0);
    });

    it("should normalize proportions to sum to 1.0", () => {
      const result = calculateToolMix("complex", {
        analytical: 0.5,
        emotional: 0.5,
        strategic: 0.5,
        creative: 0.5,
      });

      const total = result.mentalModels + result.biasesFallacies + result.generalConcepts;
      expect(total).toBeCloseTo(1.0, 3);
    });
  });

  describe("Edge Cases", () => {
    const edgeTestResponse = {
      language: "English" as const,
      complexity: "moderate" as const,
      urgency: "immediate" as const,
      problemNature: {
        analytical: 0.7,
        emotional: 0.6,
        strategic: 0.8,
        creative: 0.2,
      },
      suggestedToolMix: {
        mentalModels: 0.5,
        biasesFallacies: 0.35,
        generalConcepts: 0.15,
      },
      searchQueries: {
        mentalModels: "decision making frameworks opportunity cost trade-offs career choice",
        biasesFallacies: "decision making biases anchoring confirmation bias loss aversion",
        generalConcepts: "decision frameworks choice evaluation criteria",
      },
    };

    beforeEach(() => {
      mockGenerateObject.mockResolvedValue(createMockResult(edgeTestResponse));
    });

    it("should handle very short queries", async () => {
      const result = await analyzeProblem("Help me");
      expect(result.query).toBe("Help me");
    });

    it("should handle queries with special characters", async () => {
      const query = "How to solve: problem #1 (urgent) & complex?!";
      const result = await analyzeProblem(query);
      expect(result.query).toBe(query);
    });

    it("should handle queries with numbers", async () => {
      const query = "Need to choose between 3 options by Q2 2024";
      const result = await analyzeProblem(query);
      expect(result.query).toBe(query);
    });

    it("should handle technical jargon", async () => {
      const query = "Optimize React render performance with useMemo and useCallback";
      const result = await analyzeProblem(query);
      expect(result.query).toBe(query);
    });

    it("should handle emotional language", async () => {
      const query = "I feel overwhelmed and stressed about making this decision";
      const result = await analyzeProblem(query);
      expect(result.query).toBe(query);
    });
  });
});
