/**
 * Unit Tests for AI Provider Service
 *
 * Tests AI model selection and configuration for different purposes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getAIModel,
  getCurrentProvider,
  getModelConfig,
  createCustomModel,
  healthCheck,
  modelConfig,
} from "../../services/ai-provider";

// Mock AI SDK modules
vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn((model) => `openai:${model}`),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn((model) => `anthropic:${model}`),
}));

describe("AI Provider Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.AI_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    delete process.env.AI_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe("getAIModel", () => {
    it("should return OpenAI model by default", () => {
      const model = getAIModel("analysis");
      expect(model).toBe("openai:gpt-4.1-mini");
    });

    it("should return OpenAI generation model for generation purpose", () => {
      const model = getAIModel("generation");
      expect(model).toBe("openai:gpt-4.1");
    });

    it("should return Anthropic models when AI_PROVIDER is anthropic", () => {
      process.env.AI_PROVIDER = "anthropic";

      const analysisModel = getAIModel("analysis");
      const generationModel = getAIModel("generation");

      expect(analysisModel).toBe("anthropic:claude-3-7-sonnet-latest");
      expect(generationModel).toBe("anthropic:claude-3-7-sonnet-latest");
    });

    it("should default to analysis model when no purpose specified", () => {
      const model = getAIModel();
      expect(model).toBe("openai:gpt-4.1-mini");
    });
  });

  describe("getCurrentProvider", () => {
    it("should return openai by default", () => {
      const provider = getCurrentProvider();
      expect(provider).toBe("openai");
    });

    it("should return anthropic when set in environment", () => {
      process.env.AI_PROVIDER = "anthropic";
      const provider = getCurrentProvider();
      expect(provider).toBe("anthropic");
    });
  });

  describe("getModelConfig", () => {
    it("should return correct config for analysis", () => {
      const config = getModelConfig("analysis");
      expect(config).toEqual({
        temperature: 0.3,
        maxTokens: 1000,
      });
    });

    it("should return correct config for generation", () => {
      const config = getModelConfig("generation");
      expect(config).toEqual({
        temperature: 0.7,
        maxTokens: 2000,
      });
    });

    it("should return a copy of the config object", () => {
      const config1 = getModelConfig("analysis");
      const config2 = getModelConfig("analysis");

      expect(config1).not.toBe(config2); // Different objects
      expect(config1).toEqual(config2); // Same content
    });
  });

  describe("createCustomModel", () => {
    it("should create model with custom configuration", () => {
      const { model, config } = createCustomModel("analysis", {
        temperature: 0.5,
      });

      expect(model).toBe("openai:gpt-4.1-mini");
      expect(config).toEqual({
        temperature: 0.5,
        maxTokens: 1000,
      });
    });

    it("should merge custom config with defaults", () => {
      const { config } = createCustomModel("generation", {
        maxTokens: 3000,
      });

      expect(config).toEqual({
        temperature: 0.7,
        maxTokens: 3000,
      });
    });
  });

  describe("healthCheck", () => {
    it("should return healthy for OpenAI when API key is present", async () => {
      process.env.OPENAI_API_KEY = "test-key";

      const result = await healthCheck();

      expect(result).toEqual({
        provider: "openai",
        available: true,
      });
    });

    it("should return unhealthy for OpenAI when API key is missing", async () => {
      const result = await healthCheck();

      expect(result).toEqual({
        provider: "openai",
        available: false,
        error: "Missing OPENAI_API_KEY environment variable",
      });
    });

    it("should return healthy for Anthropic when API key is present", async () => {
      process.env.AI_PROVIDER = "anthropic";
      process.env.ANTHROPIC_API_KEY = "test-key";

      const result = await healthCheck();

      expect(result).toEqual({
        provider: "anthropic",
        available: true,
      });
    });

    it("should return unhealthy for Anthropic when API key is missing", async () => {
      process.env.AI_PROVIDER = "anthropic";

      const result = await healthCheck();

      expect(result).toEqual({
        provider: "anthropic",
        available: false,
        error: "Missing ANTHROPIC_API_KEY environment variable",
      });
    });
  });

  describe("modelConfig", () => {
    it("should have correct default configurations", () => {
      expect(modelConfig.analysis).toEqual({
        temperature: 0.3,
        maxTokens: 1000,
      });

      expect(modelConfig.generation).toEqual({
        temperature: 0.7,
        maxTokens: 2000,
      });
    });
  });
});
