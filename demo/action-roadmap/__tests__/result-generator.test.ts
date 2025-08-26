/**
 * Unit tests for result-generator module
 *
 * Tests the AI generation functionality that calls Google Gemini Pro 2.5
 * through the Vercel AI SDK to generate structured roadmap results.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { z } from "zod";
import {
  generateActionRoadmapResult,
  AIGenerationError,
  validateAIConfiguration,
  getAIConfiguration,
} from "../result-generator";
import type { PromptGeneratorResult } from "../types";

// Mock the AI SDK
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

// Mock the AI provider service
vi.mock("../services/ai-provider", () => ({
  getRoadmapGenerationModel: vi.fn(),
  getRoadmapGenerationConfig: vi.fn(),
}));

// Import mocked modules
import { generateObject } from "ai";
import { getRoadmapGenerationModel, getRoadmapGenerationConfig } from "../services/ai-provider";

const mockGenerateObject = generateObject as Mock;
const mockGetRoadmapGenerationModel = getRoadmapGenerationModel as Mock;
const mockGetRoadmapGenerationConfig = getRoadmapGenerationConfig as Mock;

describe("result-generator", () => {
  // Test data
  const testSchema = z.object({
    summary: z.string(),
    steps: z.array(z.string()),
  });

  const testPrompt = "Generate a test roadmap for problem solving";

  const mockPromptAndSchema: PromptGeneratorResult = {
    prompt: testPrompt,
    schema: testSchema,
    metadata: {
      toolCount: 5,
      estimatedTokens: 1500,
      complexity: "moderate" as const,
      urgency: "short-term" as const,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    mockGetRoadmapGenerationModel.mockReturnValue("mocked-model");
    mockGetRoadmapGenerationConfig.mockReturnValue({
      temperature: 0.7,
      timeoutMs: 180000,
      maxRetries: 2,
      retryDelayMs: 1000,
    });

    // Mock successful AI response by default
    mockGenerateObject.mockResolvedValue({
      object: {
        summary: "Test roadmap summary",
        steps: ["Step 1", "Step 2", "Step 3"],
      },
      usage: {
        totalTokens: 500,
      },
    });

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("generateActionRoadmapResult", () => {
    it("should successfully generate a roadmap result", async () => {
      const result = await generateActionRoadmapResult(mockPromptAndSchema);

      expect(result).toHaveProperty("result");
      expect(result).toHaveProperty("metadata");

      expect(result.result).toEqual({
        summary: "Test roadmap summary",
        steps: ["Step 1", "Step 2", "Step 3"],
      });

      expect(result.metadata).toMatchObject({
        tokensUsed: 500,
        modelUsed: "gemini-2.5-pro",
        generatedAt: expect.any(String),
        generationTime: expect.any(Number),
      });

      // Verify AI provider service was called correctly
      expect(mockGetRoadmapGenerationModel).toHaveBeenCalled();
      expect(mockGetRoadmapGenerationConfig).toHaveBeenCalled();
      expect(mockGenerateObject).toHaveBeenCalledWith({
        model: "mocked-model",
        schema: testSchema,
        prompt: testPrompt,
        temperature: 0.7,
        providerOptions: {
          google: {
            thinkingConfig: {
              thinkingBudget: -1,
              includeThoughts: true,
            },
          },
        },
      });
    });

    it("should handle missing usage information gracefully", async () => {
      mockGenerateObject.mockResolvedValue({
        object: { summary: "Test", steps: [] },
        // No usage property
      });

      const result = await generateActionRoadmapResult(mockPromptAndSchema);

      expect(result.metadata.tokensUsed).toBeUndefined();
      expect(result.metadata.generationTime).toBeGreaterThanOrEqual(0);
    });

    it("should throw AIGenerationError for empty prompt", async () => {
      const invalidInput = {
        ...mockPromptAndSchema,
        prompt: "",
      };

      await expect(generateActionRoadmapResult(invalidInput)).rejects.toThrow(AIGenerationError);
    });

    it("should throw AIGenerationError for missing schema", async () => {
      const invalidInput: PromptGeneratorResult = {
        ...mockPromptAndSchema,
        schema: null as any, // Testing invalid input - requires any to bypass validation
      };

      await expect(generateActionRoadmapResult(invalidInput)).rejects.toThrow(AIGenerationError);
    });

    it("should handle AI generation failures", async () => {
      const aiError = new Error("AI service unavailable");
      mockGenerateObject.mockRejectedValue(aiError);

      await expect(generateActionRoadmapResult(mockPromptAndSchema)).rejects.toThrow(
        AIGenerationError
      );
    });

    it("should retry on retryable errors", async () => {
      // First call fails with retryable error
      mockGenerateObject.mockRejectedValueOnce(new Error("rate limit exceeded")).mockResolvedValue({
        object: { summary: "Success after retry", steps: [] },
        usage: { totalTokens: 300 },
      });

      const result = await generateActionRoadmapResult(mockPromptAndSchema);

      // Type assertion for test mock data structure
      const mockResult = result.result as { summary: string; steps: string[] };
      expect(mockResult.summary).toBe("Success after retry");
      expect(mockGenerateObject).toHaveBeenCalledTimes(2);
    });

    it("should fail after max retries", async () => {
      const retryableError = new Error("network timeout");
      mockGenerateObject.mockRejectedValue(retryableError);

      await expect(generateActionRoadmapResult(mockPromptAndSchema)).rejects.toThrow(
        AIGenerationError
      );

      // Should attempt initial call + 2 retries = 3 total
      expect(mockGenerateObject).toHaveBeenCalledTimes(3);
    });

    it("should not retry on non-retryable errors", async () => {
      const nonRetryableError = new Error("invalid schema");
      mockGenerateObject.mockRejectedValue(nonRetryableError);

      await expect(generateActionRoadmapResult(mockPromptAndSchema)).rejects.toThrow(
        AIGenerationError
      );

      // Should only attempt once (no retries)
      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    });

    it("should handle timeout errors with mock timing", async () => {
      // Mock a timeout error directly instead of waiting for real timeout
      const timeoutError = new Error("AI generation timed out");
      mockGenerateObject.mockRejectedValue(timeoutError);

      await expect(generateActionRoadmapResult(mockPromptAndSchema)).rejects.toThrow(
        AIGenerationError
      );
    });

    it("should include error details in AIGenerationError", async () => {
      const originalError = new Error("Specific AI failure");
      mockGenerateObject.mockRejectedValue(originalError);

      await expect(generateActionRoadmapResult(mockPromptAndSchema)).rejects.toThrow(
        AIGenerationError
      );

      // Test the error details in a separate assertion
      try {
        await generateActionRoadmapResult(mockPromptAndSchema);
      } catch (error) {
        expect(error).toBeInstanceOf(AIGenerationError);
        expect((error as AIGenerationError).details).toMatchObject({
          phase: "roadmap-generation",
          originalError: "Specific AI failure",
          promptLength: testPrompt.length,
          modelUsed: "gemini-2.5-pro",
        });
      }
    });
  });

  describe("validateAIConfiguration", () => {
    it("should return true for valid configuration", () => {
      expect(validateAIConfiguration()).toBe(true);
    });

    it("should return false if roadmap generation model fails", () => {
      mockGetRoadmapGenerationModel.mockImplementation(() => {
        throw new Error("Invalid configuration");
      });

      expect(validateAIConfiguration()).toBe(false);
    });
  });

  describe("getAIConfiguration", () => {
    it("should return current AI configuration", () => {
      const config = getAIConfiguration();

      expect(config).toMatchObject({
        modelName: "gemini-2.5-pro",
        temperature: 0.7,
        timeoutMs: 180000,
        maxRetries: 2,
        retryDelayMs: 1000,
        apiKeyConfigured: expect.any(Boolean),
      });
    });

    it("should indicate API key configuration status", () => {
      // Test with API key present
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
      let config = getAIConfiguration();
      expect(config.apiKeyConfigured).toBe(true);

      // Test with API key missing
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      config = getAIConfiguration();
      expect(config.apiKeyConfigured).toBe(false);
    });
  });

  describe("AIGenerationError", () => {
    it("should create error with message and details", () => {
      const details = {
        phase: "validation",
        promptLength: 100,
      };

      const error = new AIGenerationError("Test error", details);

      expect(error.message).toBe("Test error");
      expect(error.name).toBe("AIGenerationError");
      expect(error.details).toEqual(details);
    });

    it("should be instance of Error", () => {
      const error = new AIGenerationError("Test", { phase: "test" });
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("integration scenarios", () => {
    it("should handle complex schema validation", async () => {
      const complexSchema = z.object({
        phases: z.array(
          z.object({
            name: z.string(),
            tools: z.array(z.string()),
            duration: z.number(),
          })
        ),
        metadata: z.object({
          complexity: z.enum(["simple", "moderate", "complex"]),
          urgency: z.enum(["immediate", "short-term", "long-term"]),
        }),
      });

      const complexResult = {
        phases: [
          {
            name: "Analysis Phase",
            tools: ["First Principles", "Root Cause Analysis"],
            duration: 60,
          },
        ],
        metadata: {
          complexity: "moderate" as const,
          urgency: "short-term" as const,
        },
      };

      mockGenerateObject.mockResolvedValue({
        object: complexResult,
        usage: { totalTokens: 800 },
      });

      const input = {
        ...mockPromptAndSchema,
        schema: complexSchema,
      };

      const result = await generateActionRoadmapResult(input);

      expect(result.result).toEqual(complexResult);
      expect(result.metadata.tokensUsed).toBe(800);
    });

    it("should handle large prompts efficiently", async () => {
      const largePrompt = "x".repeat(10000);
      const input = {
        ...mockPromptAndSchema,
        prompt: largePrompt,
      };

      const result = await generateActionRoadmapResult(input);

      expect(result).toHaveProperty("result");
      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: largePrompt,
        })
      );
    });
  });
});
