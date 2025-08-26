/**
 * Unit Tests for Model Finder Module
 *
 * Tests the core functionality of finding relevant tools through vector searches,
 * including parallel search execution, deduplication logic, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ProblemAnalysisResult } from "../types";
import { findRelevantTools } from "../model-finder";
import * as embeddingService from "../services/embedding-service";
import { ActionRoadmapSupabaseService } from "../services/supabase-service";
import type { KnowledgeContent } from "../shared-types";

// Mock the services
vi.mock("../services/embedding-service");
vi.mock("../services/supabase-service");

// Mock console methods to avoid noise in test output
const consoleSpy = {
  log: vi.spyOn(console, "log").mockImplementation(() => {}),
  error: vi.spyOn(console, "error").mockImplementation(() => {}),
};

describe("Model Finder", () => {
  const mockAnalysis: ProblemAnalysisResult = {
    query: "How do I make better decisions under uncertainty?",
    language: "English",
    complexity: "moderate",
    urgency: "short-term",
    problemNature: {
      analytical: 0.8,
      emotional: 0.2,
      strategic: 0.6,
      creative: 0.3,
    },
    suggestedToolMix: {
      mentalModels: 0.6,
      biasesFallacies: 0.3,
      generalConcepts: 0.1,
    },
    searchQueries: {
      mentalModels: "decision making frameworks uncertainty probabilistic thinking",
      biasesFallacies: "cognitive biases decision making overconfidence anchoring",
      generalConcepts: "uncertainty management risk assessment",
    },
  };

  const mockKnowledgeContent: KnowledgeContent = {
    id: "test-id-1",
    title: "Probabilistic Thinking",
    type: "mental-model",
    main_category: "Thinking & Learning Processes",
    subcategory: "Problem Solving & Decision Making",
    definition: "A framework for dealing with uncertainty",
    key_takeaway: "Think in probabilities, not certainties",
    hook: null,
    analogy_or_metaphor: null,
    classic_example: null,
    modern_example: null,
    visual_metaphor: null,
    visual_metaphor_url: null,
    payoff: null,
    pitfall: null,
    dive_deeper_mechanism: null,
    dive_deeper_origin_story: null,
    dive_deeper_pitfalls_nuances: null,
    extra_content: null,
    embedding: null,
    language: "English",
    super_model: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("findRelevantTools", () => {
    it("should successfully find and return relevant tools", async () => {
      // Mock service responses
      const mockEmbeddings = [
        {
          embedding: [0.1, 0.2, 0.3],
          query: "mental models query",
          purpose: "mental-models" as const,
        },
        { embedding: [0.2, 0.3, 0.4], query: "biases query", purpose: "biases" as const },
        { embedding: [0.3, 0.4, 0.5], query: "general query", purpose: "general" as const },
      ];

      const mockSearchResults = [
        {
          content: mockKnowledgeContent,
          similarity: 0.85,
          searchSource: "mental-models" as const,
        },
      ];

      vi.mocked(embeddingService.generateSearchEmbeddings).mockResolvedValue(mockEmbeddings);

      const mockSupabaseService = {
        getSuperModels: vi
          .fn()
          .mockResolvedValue({
            superModels: [mockKnowledgeContent],
            language: "English",
            count: 1,
          }),
        searchKnowledgeContentByEmbedding: vi.fn().mockResolvedValue(mockSearchResults),
      };

      vi.mocked(ActionRoadmapSupabaseService).mockImplementation(
        () => mockSupabaseService as unknown as ActionRoadmapSupabaseService
      );

      // Execute
      const results = await findRelevantTools(mockAnalysis);

      // Verify
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: "test-id-1",
        title: "Probabilistic Thinking",
        similarity: 0.85,
        searchSource: "mental-models",
        type: "mental-model",
      });

      // Verify service calls
      expect(embeddingService.generateSearchEmbeddings).toHaveBeenCalledWith([
        { query: mockAnalysis.searchQueries.mentalModels, purpose: "mental-models" },
        { query: mockAnalysis.searchQueries.biasesFallacies, purpose: "biases" },
        { query: mockAnalysis.searchQueries.generalConcepts, purpose: "general" },
      ]);

      expect(mockSupabaseService.getSuperModels).toHaveBeenCalledWith("English");
      expect(mockSupabaseService.searchKnowledgeContentByEmbedding).toHaveBeenCalledTimes(3);
    });

    it("should handle duplicate tools and keep highest similarity score", async () => {
      const duplicateContent = { ...mockKnowledgeContent, id: "duplicate-id" };

      const mockEmbeddings = [
        { embedding: [0.1, 0.2], query: "test1", purpose: "mental-models" as const },
        { embedding: [0.2, 0.3], query: "test2", purpose: "biases" as const },
        { embedding: [0.3, 0.4], query: "test3", purpose: "general" as const },
      ];

      // Same tool found in multiple searches with different similarities
      const mockSearchResults1 = [
        {
          content: duplicateContent,
          similarity: 0.75,
          searchSource: "mental-models" as const,
        },
      ];

      const mockSearchResults2 = [
        {
          content: duplicateContent,
          similarity: 0.85, // Higher similarity
          searchSource: "biases" as const,
        },
      ];

      const mockSearchResults3: unknown[] = []; // Empty results for third search

      vi.mocked(embeddingService.generateSearchEmbeddings).mockResolvedValue(mockEmbeddings);

      const mockSupabaseService = {
        getSuperModels: vi
          .fn()
          .mockResolvedValue({ superModels: [], language: "English", count: 0 }),
        searchKnowledgeContentByEmbedding: vi
          .fn()
          .mockResolvedValueOnce(mockSearchResults1)
          .mockResolvedValueOnce(mockSearchResults2)
          .mockResolvedValueOnce(mockSearchResults3),
      };

      vi.mocked(ActionRoadmapSupabaseService).mockImplementation(
        () => mockSupabaseService as unknown as ActionRoadmapSupabaseService
      );

      // Execute
      const results = await findRelevantTools(mockAnalysis);

      // Verify - should have only one result with the higher similarity
      expect(results).toHaveLength(1);
      expect(results[0].similarity).toBe(0.85);
      expect(results[0].searchSource).toBe("biases");
    });

    it("should throw error when no tools are found", async () => {
      const mockEmbeddings = [
        { embedding: [0.1], query: "test1", purpose: "mental-models" as const },
        { embedding: [0.2], query: "test2", purpose: "biases" as const },
        { embedding: [0.3], query: "test3", purpose: "general" as const },
      ];

      vi.mocked(embeddingService.generateSearchEmbeddings).mockResolvedValue(mockEmbeddings);

      const mockSupabaseService = {
        getSuperModels: vi
          .fn()
          .mockResolvedValue({ superModels: [], language: "English", count: 0 }),
        searchKnowledgeContentByEmbedding: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(ActionRoadmapSupabaseService).mockImplementation(
        () => mockSupabaseService as unknown as ActionRoadmapSupabaseService
      );

      // Execute & Verify
      await expect(findRelevantTools(mockAnalysis)).rejects.toThrow("No relevant tools found");
    });

    it("should handle embedding generation failure", async () => {
      // Mock super models loading first since it's called before embedding generation fails
      const mockSupabaseService = {
        getSuperModels: vi
          .fn()
          .mockResolvedValue({ superModels: [], language: "English", count: 0 }),
        searchKnowledgeContentByEmbedding: vi.fn(),
      };

      vi.mocked(ActionRoadmapSupabaseService).mockImplementation(
        () => mockSupabaseService as unknown as ActionRoadmapSupabaseService
      );
      vi.mocked(embeddingService.generateSearchEmbeddings).mockRejectedValue(
        new Error("Embedding failed")
      );

      // Execute & Verify
      await expect(findRelevantTools(mockAnalysis)).rejects.toThrow(
        "Failed to find relevant tools"
      );
    });

    it("should handle search failure gracefully", async () => {
      const mockEmbeddings = [
        { embedding: [0.1], query: "test", purpose: "mental-models" as const },
      ];

      vi.mocked(embeddingService.generateSearchEmbeddings).mockResolvedValue(mockEmbeddings);

      const mockSupabaseService = {
        getSuperModels: vi
          .fn()
          .mockResolvedValue({ superModels: [], language: "English", count: 0 }),
        searchKnowledgeContentByEmbedding: vi.fn().mockRejectedValue(new Error("Search failed")),
      };

      vi.mocked(ActionRoadmapSupabaseService).mockImplementation(
        () => mockSupabaseService as unknown as ActionRoadmapSupabaseService
      );

      // Execute & Verify
      await expect(findRelevantTools(mockAnalysis)).rejects.toThrow(
        "Failed to find relevant tools"
      );
    });

    it("should correctly map tool types based on search source", async () => {
      const mockEmbeddings = [
        { embedding: [0.1], query: "test1", purpose: "mental-models" as const },
        { embedding: [0.2], query: "test2", purpose: "biases" as const },
        { embedding: [0.3], query: "test3", purpose: "general" as const },
      ];

      const mockSearchResults = [
        {
          content: { ...mockKnowledgeContent, type: "mental-model" as const },
          similarity: 0.75,
          searchSource: "general" as const,
        },
      ];

      vi.mocked(embeddingService.generateSearchEmbeddings).mockResolvedValue(mockEmbeddings);

      const mockSupabaseService = {
        getSuperModels: vi
          .fn()
          .mockResolvedValue({ superModels: [], language: "English", count: 0 }),
        searchKnowledgeContentByEmbedding: vi
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce(mockSearchResults),
      };

      vi.mocked(ActionRoadmapSupabaseService).mockImplementation(
        () => mockSupabaseService as unknown as ActionRoadmapSupabaseService
      );

      // Execute
      const results = await findRelevantTools(mockAnalysis);

      // Verify - should map to general-concept because it came from general search
      expect(results[0].type).toBe("general-concept");
    });

    it("should sort results by similarity score in descending order", async () => {
      const mockEmbeddings = [
        { embedding: [0.1], query: "test1", purpose: "mental-models" as const },
        { embedding: [0.2], query: "test2", purpose: "biases" as const },
        { embedding: [0.3], query: "test3", purpose: "general" as const },
      ];

      const mockSearchResults = [
        {
          content: { ...mockKnowledgeContent, id: "low-sim", title: "Low Similarity" },
          similarity: 0.3,
          searchSource: "mental-models" as const,
        },
        {
          content: { ...mockKnowledgeContent, id: "high-sim", title: "High Similarity" },
          similarity: 0.9,
          searchSource: "mental-models" as const,
        },
        {
          content: { ...mockKnowledgeContent, id: "med-sim", title: "Medium Similarity" },
          similarity: 0.6,
          searchSource: "mental-models" as const,
        },
      ];

      vi.mocked(embeddingService.generateSearchEmbeddings).mockResolvedValue(mockEmbeddings);

      const mockSupabaseService = {
        getSuperModels: vi
          .fn()
          .mockResolvedValue({ superModels: [], language: "English", count: 0 }),
        searchKnowledgeContentByEmbedding: vi
          .fn()
          .mockResolvedValueOnce(mockSearchResults)
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]),
      };

      vi.mocked(ActionRoadmapSupabaseService).mockImplementation(
        () => mockSupabaseService as unknown as ActionRoadmapSupabaseService
      );

      // Execute
      const results = await findRelevantTools(mockAnalysis);

      // Verify sorting
      expect(results).toHaveLength(3);
      expect(results[0].similarity).toBe(0.9);
      expect(results[1].similarity).toBe(0.6);
      expect(results[2].similarity).toBe(0.3);
      expect(results[0].title).toBe("High Similarity");
    });
  });
});
