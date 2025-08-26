/**
 * Action Roadmap Result Generator
 *
 * This module takes the output from result-prompt-generator.ts and uses the
 * Vercel AI SDK to call Google's Gemini Pro 2.5 model, generating the final
 * structured JSON response that follows the defined schema.
 */

import { generateObject } from "ai";
import { getRoadmapGenerationModel, getRoadmapGenerationConfig } from "./services/ai-provider";
import type { PromptGeneratorResult } from "./types";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Result of AI generation with metadata
 */
export interface AIGenerationResult<T = unknown> {
  /** The generated object matching the provided schema */
  result: T;

  /** Metadata about the generation process */
  metadata: {
    /** Number of tokens used in the generation */
    tokensUsed?: number;

    /** Time taken to generate the result in milliseconds */
    generationTime: number;

    /** The model used for generation */
    modelUsed: string;

    /** Timestamp when generation started */
    generatedAt: string;
  };
}

/**
 * Custom error for AI generation failures
 */
export class AIGenerationError extends Error {
  constructor(
    message: string,
    public readonly details: {
      phase: string;
      originalError?: string;
      promptLength?: number;
      timeoutMs?: number;
      modelUsed?: string;
    }
  ) {
    super(message);
    this.name = "AIGenerationError";
  }
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get configuration for AI generation using the service layer
 */
function getAIConfig() {
  const config = getRoadmapGenerationConfig();
  return {
    /** Model name for error reporting */
    modelName: "gemini-2.5-pro",

    /** Temperature for balanced creativity and consistency */
    temperature: config.temperature,

    /** Maximum time to wait for generation (90 seconds) */
    timeoutMs: config.timeoutMs,

    /** Maximum number of retry attempts */
    maxRetries: config.maxRetries,

    /** Base delay for exponential backoff (ms) */
    retryDelayMs: config.retryDelayMs,
  } as const;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates a timeout promise that rejects after the specified time
 */
function createTimeout(ms: number): Promise<never> {
  const aiConfig = getAIConfig();
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(
        new AIGenerationError("AI generation timed out", {
          phase: "roadmap-generation",
          timeoutMs: ms,
          modelUsed: aiConfig.modelName,
        })
      );
    }, ms);
  });
}

/**
 * Wraps a promise with a timeout
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([promise, createTimeout(timeoutMs)]);
}

/**
 * Implements exponential backoff delay
 */
function calculateRetryDelay(attempt: number, baseDelay: number): number {
  return baseDelay * Math.pow(2, attempt);
}

/**
 * Checks if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("rate limit") ||
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("connection") ||
      message.includes("temporary")
    );
  }
  return false;
}

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

/**
 * Generates an action roadmap result using Google Gemini Pro 2.5
 *
 * @param promptAndSchema - The prompt and schema from result-prompt-generator
 * @returns The generated result with metadata
 * @throws AIGenerationError for various failure conditions
 */
export async function generateActionRoadmapResult(
  promptAndSchema: PromptGeneratorResult
): Promise<AIGenerationResult> {
  const startTime = Date.now();
  const aiConfig = getAIConfig();
  let lastError: unknown;

  console.log("[ResultGenerator] Starting AI generation with Gemini Pro 2.5...");
  console.log(`[ResultGenerator] Prompt length: ${promptAndSchema.prompt.length} characters`);
  console.log(`[ResultGenerator] Estimated tokens: ${promptAndSchema.metadata.estimatedTokens}`);

  // Validate input
  if (!promptAndSchema.prompt || promptAndSchema.prompt.trim().length === 0) {
    throw new AIGenerationError("Empty or invalid prompt provided", {
      phase: "validation",
      promptLength: promptAndSchema.prompt?.length || 0,
    });
  }

  if (!promptAndSchema.schema) {
    throw new AIGenerationError("No schema provided for validation", {
      phase: "validation",
    });
  }

  // Configure the AI model using the service
  const model = getRoadmapGenerationModel();

  // Attempt generation with retries
  for (let attempt = 0; attempt <= aiConfig.maxRetries; attempt++) {
    try {
      console.log(`[ResultGenerator] Attempt ${attempt + 1}/${aiConfig.maxRetries + 1}`);

      // Call the AI with timeout
      // @ts-ignore - Suppressing deep type instantiation error from AI SDK
      const aiCall = generateObject({
        model,
        schema: promptAndSchema.schema,
        prompt: promptAndSchema.prompt,
        temperature: aiConfig.temperature,
        providerOptions: {
          google: {
            thinkingConfig: {
              thinkingBudget: -1,
              includeThoughts: true,
            },
          },
        },
      });

      const result = await withTimeout(aiCall, aiConfig.timeoutMs);

      const generationTime = Date.now() - startTime;

      console.log("[ResultGenerator] AI generation completed successfully");
      console.log(`[ResultGenerator] Generation time: ${generationTime}ms`);
      console.log(`[ResultGenerator] Tokens used: ${result.usage?.totalTokens || "unknown"}`);

      // Console log the result as requested
      // console.log("[ResultGenerator] Generated roadmap:");
      // console.log(JSON.stringify(result.object, null, 2));

      // Build response
      const response: AIGenerationResult = {
        result: result.object,
        metadata: {
          tokensUsed: result.usage?.totalTokens,
          generationTime,
          modelUsed: aiConfig.modelName,
          generatedAt: new Date().toISOString(),
        },
      };

      return response;
    } catch (error) {
      lastError = error;
      const isLast = attempt === aiConfig.maxRetries;

      console.error(`[ResultGenerator] Attempt ${attempt + 1} failed:`, error);

      // If this is the last attempt or error is not retryable, throw
      if (isLast || !isRetryableError(error)) {
        break;
      }

      // Wait before retrying
      const delay = calculateRetryDelay(attempt, aiConfig.retryDelayMs);
      console.log(`[ResultGenerator] Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All attempts failed, throw the last error
  const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);

  throw new AIGenerationError(
    `Failed to generate AI result after ${aiConfig.maxRetries + 1} attempts: ${errorMessage}`,
    {
      phase: "roadmap-generation",
      originalError: errorMessage,
      promptLength: promptAndSchema.prompt.length,
      timeoutMs: aiConfig.timeoutMs,
      modelUsed: aiConfig.modelName,
    }
  );
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Validates that the AI provider is properly configured
 */
export function validateAIConfiguration(): boolean {
  try {
    // Check if the roadmap generation model can be instantiated
    getRoadmapGenerationModel();
    return true;
  } catch (error) {
    console.error("[ResultGenerator] AI configuration validation failed:", error);
    return false;
  }
}

/**
 * Gets the current AI configuration for debugging
 */
export function getAIConfiguration() {
  const aiConfig = getAIConfig();
  return {
    ...aiConfig,
    apiKeyConfigured: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

// Note: AIGenerationResult and AIGenerationError are already exported above
