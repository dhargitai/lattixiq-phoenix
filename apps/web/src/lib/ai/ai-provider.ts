/**
 * AI Provider Service
 */

import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

/**
 * AI model usage purposes
 */
export type ModelPurpose = "analysis" | "generation";

/**
 * Available AI providers
 */
export type AIProvider = "openai" | "google";

/**
 * Model configuration for different purposes
 */
export interface ModelConfig {
  temperature: number;
  maxTokens: number;
}

/**
 * Default model configurations for different purposes
 */
export const modelConfig: Record<ModelPurpose, ModelConfig> = {
  analysis: {
    temperature: 0.3,
    maxTokens: 1000,
  },
  generation: {
    temperature: 0.7,
    maxTokens: 2000,
  },
};

/**
 * Get the appropriate AI model for the specified purpose
 *
 * @param purpose - The intended use case for the model
 * @returns Configured AI model instance
 */
export function getAIModel(purpose: ModelPurpose = "analysis") {
  const provider = process.env.AI_PROVIDER || "openai";

  if (purpose === "analysis") {
    switch (provider) {
      case "google":
        return google("gemini-2.5-flash");
      default:
        return openai("gpt-4.1-mini");
    }
  }

  // Generation purpose - use more powerful models
  switch (provider) {
    case "google":
      return google("gemini-2.5-pro");
    default:
      return openai("gpt-4.1");
  }
}

/**
 * Get the current AI provider
 *
 * @returns Current AI provider name
 */
export function getCurrentProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER;
  if (provider === "google") return "google";
  return "openai";
}

/**
 * Get model configuration for a specific purpose
 *
 * @param purpose - The model purpose
 * @returns Model configuration object
 */
export function getModelConfig(purpose: ModelPurpose): ModelConfig {
  return { ...modelConfig[purpose] };
}

/**
 * Create a model with custom configuration
 *
 * @param purpose - Model purpose for base selection
 * @param customConfig - Custom configuration overrides
 * @returns Configured AI model with custom settings
 */
export function createCustomModel(purpose: ModelPurpose, customConfig: Partial<ModelConfig>) {
  const model = getAIModel(purpose);
  const config = { ...getModelConfig(purpose), ...customConfig };

  console.log(
    `[AIProvider] Created ${getCurrentProvider()} model for ${purpose} with config:`,
    config
  );

  return { model, config };
}

/**
 * Health check for AI provider services
 *
 * @returns Promise resolving to provider status
 */
export async function healthCheck(): Promise<{
  provider: AIProvider;
  available: boolean;
  error?: string;
}> {
  const provider = getCurrentProvider();

  try {
    // Basic availability check by verifying environment variables
    if (provider === "openai" && !process.env.OPENAI_API_KEY) {
      return {
        provider,
        available: false,
        error: "Missing OPENAI_API_KEY environment variable",
      };
    }

    if (provider === "google" && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return {
        provider,
        available: false,
        error: "Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable",
      };
    }

    if (provider === "google" && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return {
        provider,
        available: false,
        error: "Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable",
      };
    }

    return {
      provider,
      available: true,
    };
  } catch (error) {
    return {
      provider,
      available: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Model selection utility for quick analysis tasks
 */
export const quickAnalysisModel = () => getAIModel("analysis");

/**
 * Model selection utility for content generation tasks
 */
export const contentGenerationModel = () => getAIModel("generation");

/**
 * Get the specific model for roadmap generation
 * Defaults to Google Gemini Pro 2.5 for optimal performance
 */
export function getRoadmapGenerationModel() {
  const provider = process.env.AI_PROVIDER;

  // For roadmap generation, prefer Google Gemini Pro 2.5 if available
  if (provider === "google" || !provider) {
    return google("gemini-2.5-pro");
  }

  // Fallback to the configured generation model
  return getAIModel("generation");
}

/**
 * Get configuration specific to roadmap generation
 */
export function getRoadmapGenerationConfig() {
  return {
    temperature: 0.7,
    timeoutMs: 180000, // 180 seconds (3 minutes) for Gemini Pro 2.5 thinking time
    maxRetries: 2,
    retryDelayMs: 1000,
  };
}
