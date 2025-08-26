/**
 * Unit Tests for Embedding Service
 *
 * Tests self-contained embedding generation for search queries with proper error handling
 * and parallel processing capabilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// Mock OpenAI - using vi.hoisted to solve hoisting issues
const mockEmbeddingsCreate = vi.hoisted(() => vi.fn());
vi.mock("openai", () => ({
  default: vi.fn(() => ({
    embeddings: {
      create: mockEmbeddingsCreate,
    },
  })),
}));

import {
  generateEmbedding,
  generateSearchEmbeddings,
  generateSingleSearchEmbedding,
} from "../../services/embedding-service";

// Mock console methods
const consoleSpy = {
  log: vi.spyOn(console, "log").mockImplementation(() => {}),
  error: vi.spyOn(console, "error").mockImplementation(() => {}),
};

describe("Embedding Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();

    // Set up environment variables
    process.env.OPENAI_API_KEY = "test-api-key";
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    vi.restoreAllMocks();
  });

  describe("generateEmbedding", () => {
    it("should generate embedding successfully", async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockEmbeddingsCreate.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }],
      });

      const result = await generateEmbedding("test text");

      expect(result).toEqual(mockEmbedding);
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: "text-embedding-3-small",
        input: "test text",
        dimensions: 1536,
      });
    });

    it("should throw error when API key is missing", async () => {
      delete process.env.OPENAI_API_KEY;

      await expect(generateEmbedding("test")).rejects.toThrow(
        "Missing OPENAI_API_KEY environment variable"
      );
    });

    it("should retry on rate limit error", async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const rateLimitError = new Error("rate limit");

      mockEmbeddingsCreate.mockRejectedValueOnce(rateLimitError).mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }],
      });

      const result = await generateEmbedding("test text");

      expect(result).toEqual(mockEmbedding);
      expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(2);
    });
  });

  describe("generateSearchEmbeddings", () => {
    it("should generate embeddings for multiple queries", async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
      });

      const queries = [
        { query: "test query 1", purpose: "mental-models" as const },
        { query: "test query 2", purpose: "biases" as const },
      ];

      const results = await generateSearchEmbeddings(queries);

      expect(results).toHaveLength(2);
      expect(results[0].query).toBe("test query 1");
      expect(results[0].purpose).toBe("mental-models");
      expect(results[0].embedding).toEqual(mockEmbedding);
    });

    it("should handle embedding failures", async () => {
      mockEmbeddingsCreate.mockRejectedValue(new Error("API error"));

      const queries = [{ query: "test", purpose: "mental-models" as const }];

      await expect(generateSearchEmbeddings(queries)).rejects.toThrow(
        "Failed to generate search embeddings"
      );
    });
  });

  describe("generateSingleSearchEmbedding", () => {
    it("should generate single embedding", async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
      });

      const result = await generateSingleSearchEmbedding("test query", "mental-models");

      expect(result).toEqual({
        embedding: mockEmbedding,
        query: "test query",
        purpose: "mental-models",
      });
    });
  });
});
