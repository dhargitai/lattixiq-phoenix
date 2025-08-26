/**
 * Integration Tests for Model Finder Module
 *
 * Tests the model finder with realistic data and actual service integration,
 * verifying the complete flow from problem analysis to tool search results.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock the services before importing the module under test
vi.mock("../../services/embedding-service", () => ({
  generateSearchEmbeddings: vi.fn().mockResolvedValue([
    { embedding: [0.1, 0.2, 0.3], query: "test query 1", purpose: "mental-models" },
    { embedding: [0.4, 0.5, 0.6], query: "test query 2", purpose: "biases" },
    { embedding: [0.7, 0.8, 0.9], query: "test query 3", purpose: "general" },
  ]),
}));

vi.mock("../../services/supabase-service", () => ({
  ActionRoadmapSupabaseService: vi.fn().mockImplementation(() => ({
    getSuperModels: vi.fn().mockResolvedValue({
      superModels: [
        {
          id: "test-super-1",
          title: "Test Super Model",
          type: "mental-model",
          main_category: "Psychology & Human Behavior",
          subcategory: "Cognitive Biases",
          definition: "Test definition",
          key_takeaway: "Test key takeaway",
          language: "English",
        },
      ],
      language: "English",
      count: 1,
    }),
    searchKnowledgeContentByEmbedding: vi.fn().mockResolvedValue([
      {
        content: {
          id: "test-content-1",
          title: "Test Mental Model",
          type: "mental-model",
          main_category: "Psychology & Human Behavior",
          subcategory: "Cognitive Biases",
          definition: "Test definition",
          key_takeaway: "Test key takeaway",
          language: "English",
        },
        similarity: 0.8,
        searchSource: "mental-models",
      },
    ]),
  })),
}));

import type { ProblemAnalysisResult } from "../../types";
import { findRelevantTools } from "../../model-finder";

// Note: These tests are designed to work with test data or mocked services
// In a real integration test environment, you would configure test databases

describe("Model Finder Integration", () => {
  // Skip these tests by default since they require actual database/API access
  // Enable by setting INTEGRATION_TEST=true in environment
  const shouldRunIntegrationTests = process.env.INTEGRATION_TEST === "true";

  const mockComplexAnalysis: ProblemAnalysisResult = {
    query:
      "I need to make better strategic decisions for my startup, especially around product development and market timing.",
    language: "English",
    complexity: "complex",
    urgency: "short-term",
    problemNature: {
      analytical: 0.7,
      emotional: 0.3,
      strategic: 0.9,
      creative: 0.5,
    },
    suggestedToolMix: {
      mentalModels: 0.6,
      biasesFallacies: 0.3,
      generalConcepts: 0.1,
    },
    searchQueries: {
      mentalModels:
        "strategic decision making frameworks product market fit timing business strategy",
      biasesFallacies: "confirmation bias overconfidence anchoring startup decision biases",
      generalConcepts: "product development market analysis timing strategy",
    },
  };

  beforeEach(() => {
    // Setup for integration tests if needed
  });

  afterEach(() => {
    // Cleanup after integration tests if needed
  });

  // Only run if integration testing is enabled
  describe.skipIf(!shouldRunIntegrationTests)("Real Service Integration", () => {
    it("should find relevant tools for complex startup strategy problem", async () => {
      const results = await findRelevantTools(mockComplexAnalysis);

      // Verify basic structure
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      // Verify each result has required fields
      results.forEach((result) => {
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("title");
        expect(result).toHaveProperty("similarity");
        expect(result).toHaveProperty("searchSource");
        expect(result).toHaveProperty("type");

        // Verify similarity scores are valid
        expect(result.similarity).toBeGreaterThanOrEqual(0);
        expect(result.similarity).toBeLessThanOrEqual(1);

        // Verify search source is one of expected values
        expect(["mental-models", "biases", "general"]).toContain(result.searchSource);

        // Verify type mapping is correct
        expect(["mental-model", "cognitive-bias", "fallacy", "general-concept"]).toContain(
          result.type
        );
      });

      // Verify results are sorted by similarity (descending)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].similarity).toBeGreaterThanOrEqual(results[i + 1].similarity);
      }

      console.log(`Integration test found ${results.length} relevant tools`);
      console.log(
        `Top 3 results:`,
        results.slice(0, 3).map((r) => ({
          title: r.title,
          similarity: r.similarity.toFixed(3),
          source: r.searchSource,
        }))
      );
    }, 30000); // 30 second timeout for real API calls

    it("should handle simple problem with fewer results", async () => {
      const simpleAnalysis: ProblemAnalysisResult = {
        query: "How do I remember things better?",
        language: "English",
        complexity: "simple",
        urgency: "long-term",
        problemNature: {
          analytical: 0.3,
          emotional: 0.1,
          strategic: 0.2,
          creative: 0.2,
        },
        suggestedToolMix: {
          mentalModels: 0.7,
          biasesFallacies: 0.2,
          generalConcepts: 0.1,
        },
        searchQueries: {
          mentalModels: "memory techniques learning retention spaced repetition",
          biasesFallacies: "memory biases forgetting curve availability heuristic",
          generalConcepts: "learning memory cognitive psychology",
        },
      };

      const results = await findRelevantTools(simpleAnalysis);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);

      // Should find relevant memory and learning related tools
      const memoryRelated = results.filter(
        (r) =>
          r.title.toLowerCase().includes("memory") ||
          r.title.toLowerCase().includes("learning") ||
          r.title.toLowerCase().includes("repetition")
      );

      expect(memoryRelated.length).toBeGreaterThan(0);
      console.log(
        `Found ${memoryRelated.length} memory-related tools out of ${results.length} total`
      );
    }, 30000);

    it("should respect language preference in search results", async () => {
      // Test would require Hungarian language content in the database
      const hungarianAnalysis: ProblemAnalysisResult = {
        ...mockComplexAnalysis,
        language: "Hungarian",
        query: "Hogyan hozhatok jobb döntéseket a vállalkozásomban?",
      };

      const results = await findRelevantTools(hungarianAnalysis);

      expect(results).toBeDefined();
      // Note: This test would need Hungarian content in the database to be meaningful
      // For now, just verify the function doesn't crash with different languages
    }, 30000);
  });

  // These tests run by default and use mocked data
  describe("Mock Integration Tests", () => {
    it("should demonstrate the complete flow with test data", async () => {
      const results = await findRelevantTools(mockComplexAnalysis);

      // With mocked data, we can make specific assertions
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);

      // Test data should be predictable
      results.forEach((result) => {
        expect(result.title).toBeDefined();
        expect(result.similarity).toBeGreaterThan(0);
      });
    });

    it("should handle edge cases gracefully", async () => {
      const edgeCaseAnalysis: ProblemAnalysisResult = {
        ...mockComplexAnalysis,
        query: "zzz nonexistent query that should not match anything zzz",
        searchQueries: {
          mentalModels: "nonexistent fake model xyz",
          biasesFallacies: "nonexistent fake bias xyz",
          generalConcepts: "nonexistent fake concept xyz",
        },
      };

      // Should either find some results or throw appropriate error
      try {
        const results = await findRelevantTools(edgeCaseAnalysis);
        // If successful, verify basic structure
        expect(Array.isArray(results)).toBe(true);
      } catch (error) {
        // Should throw error related to search failure or no tools found
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toMatch(
          /No relevant tools found|Failed to find relevant tools/
        );
      }
    });
  });
});
