/**
 * Embedding Service for Action Roadmap Preparator
 *
 * Self-contained embedding generation for search queries using OpenAI's embedding model.
 * Independent of external services.
 */

import OpenAI from "openai";

/**
 * Search query with its purpose for embedding generation
 */
interface SearchQuery {
  /** The search query text */
  query: string;
  /** Purpose identifier for logging and debugging */
  purpose: "mental-models" | "biases" | "general";
}

/**
 * Embedding result with metadata
 */
interface EmbeddingWithMeta {
  /** The generated embedding vector */
  embedding: number[];
  /** Original query text */
  query: string;
  /** Purpose identifier */
  purpose: "mental-models" | "biases" | "general";
}

// Lazy-initialized OpenAI client
let _openai: OpenAI | null = null;

/**
 * Gets or creates the OpenAI client instance
 * Lazy initialization ensures environment variables are loaded before client creation
 */
function getOpenAIClient(): OpenAI {
  // Always check for API key, even if client is cached
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }

  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      dangerouslyAllowBrowser: typeof window !== "undefined" && process.env.NODE_ENV === "test",
    });
  }
  return _openai;
}

/**
 * Generate embedding for a single text string
 *
 * @param text - Text to generate embedding for
 * @returns Promise resolving to embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const openai = getOpenAIClient();

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 1536,
    });

    return response.data[0].embedding;
  } catch (error) {
    // If it's the missing API key error, re-throw it directly
    if (error instanceof Error && error.message === "Missing OPENAI_API_KEY environment variable") {
      throw error;
    }

    console.error("[EmbeddingService] Embedding generation failed:", error);

    // Retry once for transient errors
    if (error instanceof Error && error.message.includes("rate limit")) {
      console.log("[EmbeddingService] Rate limit hit, waiting 1 second and retrying...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      try {
        const retryResponse = await getOpenAIClient().embeddings.create({
          model: "text-embedding-3-small",
          input: text,
          dimensions: 1536,
        });

        return retryResponse.data[0].embedding;
      } catch (retryError) {
        console.error("[EmbeddingService] Retry failed:", retryError);
        throw new Error(`Embedding generation failed after retry: ${retryError}`);
      }
    }

    throw new Error(`Embedding generation failed: ${error}`);
  }
}

/**
 * Generates embeddings for multiple search queries in parallel
 *
 * @param queries - Array of search queries with purpose metadata
 * @returns Promise resolving to array of embeddings with metadata
 * @throws Error if embedding generation fails for any query
 */
export async function generateSearchEmbeddings(
  queries: SearchQuery[]
): Promise<EmbeddingWithMeta[]> {
  try {
    // Generate embeddings in parallel for better performance
    const embeddingPromises = queries.map(async ({ query, purpose }) => {
      const embedding = await generateEmbedding(query);
      return {
        embedding,
        query,
        purpose,
      };
    });

    const results = await Promise.all(embeddingPromises);

    // Log successful embedding generation
    console.log(`[EmbeddingService] Generated ${results.length} embeddings for search queries`);

    return results;
  } catch (error) {
    console.error("[EmbeddingService] Failed to generate embeddings:", error);
    throw new Error("Failed to generate search embeddings");
  }
}

/**
 * Generates a single embedding for a search query
 *
 * @param query - The search query text
 * @param purpose - Purpose identifier for logging
 * @returns Promise resolving to embedding with metadata
 */
export async function generateSingleSearchEmbedding(
  query: string,
  purpose: "mental-models" | "biases" | "general"
): Promise<EmbeddingWithMeta> {
  const [result] = await generateSearchEmbeddings([{ query, purpose }]);
  return result;
}
