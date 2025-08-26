/**
 * Unit Tests for Supabase Service
 *
 * Tests self-contained database operations for knowledge content search and super model retrieval
 * with proper error handling and data transformation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClient } from "@supabase/supabase-js";

// Mock Supabase client methods
const mockFrom = vi.fn();
const mockRpc = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();

// Mock createClient
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

import { ActionRoadmapSupabaseService } from "../../services/supabase-service";

// Mock console methods
const consoleSpy = {
  log: vi.spyOn(console, "log").mockImplementation(() => {}),
  error: vi.spyOn(console, "error").mockImplementation(() => {}),
};

describe("ActionRoadmapSupabaseService", () => {
  let service: ActionRoadmapSupabaseService;
  let mockChainableObject: {
    select: typeof mockSelect;
    eq: typeof mockEq;
    in: typeof mockIn;
    limit: typeof mockLimit;
    single: typeof mockSingle;
    data: unknown;
    error: unknown;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();

    // Set up environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    // Set up mock client
    vi.mocked(createClient).mockReturnValue({
      from: mockFrom,
      rpc: mockRpc,
    } as ReturnType<typeof createClient>);

    // Set up default mock chain - each method returns an object with all chainable methods
    mockChainableObject = {
      select: mockSelect,
      eq: mockEq,
      in: mockIn,
      limit: mockLimit,
      single: mockSingle,
      data: null,
      error: null,
    };

    mockFrom.mockReturnValue(mockChainableObject);
    mockSelect.mockReturnValue(mockChainableObject);
    mockEq.mockReturnValue(mockChainableObject);
    mockIn.mockReturnValue({
      data: null,
      error: null,
    });
    mockLimit.mockReturnValue({
      data: null,
      error: null,
    });

    service = new ActionRoadmapSupabaseService();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should throw error if SUPABASE_URL is missing", () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      expect(() => new ActionRoadmapSupabaseService()).toThrow(
        "Missing required Supabase environment variable: NEXT_PUBLIC_SUPABASE_URL"
      );
    });

    it("should throw error if both SUPABASE keys are missing", () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => new ActionRoadmapSupabaseService()).toThrow(
        "Missing required Supabase keys. Need either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY"
      );
    });

    it("should initialize with service role key when available", () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

      new ActionRoadmapSupabaseService();

      expect(vi.mocked(createClient)).toHaveBeenCalledWith(
        "https://test.supabase.co",
        "test-service-key",
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );
    });

    it("should fall back to anon key when service role key is not available", () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

      new ActionRoadmapSupabaseService();

      expect(vi.mocked(createClient)).toHaveBeenCalledWith(
        "https://test.supabase.co",
        "test-anon-key"
      );
    });

    it("should work with only anon key available", () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

      expect(() => new ActionRoadmapSupabaseService()).not.toThrow();
    });
  });

  describe("getSuperModels", () => {
    it("should successfully load super models for specified language", async () => {
      const mockSuperModels = [
        {
          id: "test-id-1",
          title: "Test Mental Model",
          main_category: "Psychology & Human Behavior",
          subcategory: "Cognitive Biases",
          definition: "A test mental model",
          key_takeaway: "Key learning point",
          super_model: true,
          language: "English",
        },
      ];

      // Create a second chainable object for the second .eq() call
      const finalAwaitableQuery = {
        ...mockChainableObject,
        then: vi.fn((resolve) => resolve({ data: mockSuperModels, error: null })),
      };

      // Mock the first eq() to return chainable object, second eq() to return awaitable
      mockEq
        .mockReturnValueOnce(mockChainableObject) // First .eq("super_model", true)
        .mockReturnValueOnce(finalAwaitableQuery); // Second .eq("language", language)

      const result = await service.getSuperModels("English");

      expect(mockFrom).toHaveBeenCalledWith("knowledge_content");
      expect(mockEq).toHaveBeenCalledWith("super_model", true);
      expect(mockEq).toHaveBeenCalledWith("language", "English");
      expect(result.superModels).toHaveLength(1);
      expect(result.language).toBe("English");
      expect(result.count).toBe(1);
    });

    it("should handle empty super models result", async () => {
      // Create a second chainable object for the second .eq() call
      const finalAwaitableQuery = {
        ...mockChainableObject,
        then: vi.fn((resolve) => resolve({ data: [], error: null })),
      };

      // Mock the first eq() to return chainable object, second eq() to return awaitable
      mockEq
        .mockReturnValueOnce(mockChainableObject) // First .eq("super_model", true)
        .mockReturnValueOnce(finalAwaitableQuery); // Second .eq("language", language)

      const result = await service.getSuperModels("Hungarian");

      expect(result.superModels).toHaveLength(0);
      expect(result.language).toBe("Hungarian");
      expect(result.count).toBe(0);
    });

    it("should handle super models loading failure", async () => {
      // Create a second chainable object for the second .eq() call
      const finalAwaitableQuery = {
        ...mockChainableObject,
        then: vi.fn((resolve) =>
          resolve({ data: null, error: { message: "Database connection failed" } })
        ),
      };

      // Mock the first eq() to return chainable object, second eq() to return awaitable
      mockEq
        .mockReturnValueOnce(mockChainableObject) // First .eq("super_model", true)
        .mockReturnValueOnce(finalAwaitableQuery); // Second .eq("language", language)

      await expect(service.getSuperModels("English")).rejects.toThrow(
        "Failed to load super models"
      );
    });
  });

  describe("healthCheck", () => {
    it("should handle health check success", async () => {
      mockLimit.mockResolvedValueOnce({
        data: [{ id: "1" }],
        error: null,
      });

      const result = await service.healthCheck();

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith("knowledge_content");
      expect(mockLimit).toHaveBeenCalledWith(1);
    });

    it("should handle health check failure", async () => {
      mockLimit.mockResolvedValueOnce({
        data: null,
        error: { message: "Connection error" },
      });

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });

    it("should handle health check exception", async () => {
      mockLimit.mockRejectedValueOnce(new Error("Network error"));

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe("searchKnowledgeContentByEmbedding", () => {
    it("should perform vector search successfully", async () => {
      const mockSearchResults = [{ id: "1", title: "Test Result", similarity: 0.8 }];
      const mockFullContent = [
        {
          id: "1",
          title: "Test Result",
          main_category: "Psychology & Human Behavior",
          subcategory: "Cognitive Biases",
          definition: "Test definition",
        },
      ];

      mockRpc.mockResolvedValueOnce({
        data: mockSearchResults,
        error: null,
      });

      mockIn.mockResolvedValueOnce({
        data: mockFullContent,
        error: null,
      });

      const result = await service.searchKnowledgeContentByEmbedding(
        [0.1, 0.2, 0.3],
        5,
        0.5,
        "English",
        "mental-models"
      );

      expect(mockRpc).toHaveBeenCalledWith(
        "match_knowledge_content",
        expect.objectContaining({
          query_embedding: JSON.stringify([0.1, 0.2, 0.3]),
          match_threshold: 0.5,
          match_count: 5,
          target_language: "English",
        })
      );

      expect(result).toHaveLength(1);
      expect(result[0].similarity).toBe(0.8);
      expect(result[0].searchSource).toBe("mental-models");
    });

    it("should handle search errors", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: "Search error" },
      });

      await expect(
        service.searchKnowledgeContentByEmbedding(
          [0.1, 0.2, 0.3],
          5,
          0.5,
          "English",
          "mental-models"
        )
      ).rejects.toThrow("Failed to search knowledge content");
    });

    it("should perform search with subcategories", async () => {
      const mockSearchResults = [
        { id: "1", title: "Test Result", similarity: 0.9 },
        { id: "2", title: "Another Result", similarity: 0.7 },
      ];
      const mockFullContent = [
        {
          id: "1",
          title: "Test Result",
          main_category: "Psychology & Human Behavior",
          subcategory: "Cognitive Biases",
          definition: "Test definition",
        },
        {
          id: "2",
          title: "Another Result",
          main_category: "Core Sciences & Mathematics",
          subcategory: "Mathematics & Statistics",
          definition: "Another definition",
        },
      ];

      mockRpc.mockResolvedValueOnce({
        data: mockSearchResults,
        error: null,
      });

      mockIn.mockResolvedValueOnce({
        data: mockFullContent,
        error: null,
      });

      const result = await service.searchKnowledgeContentByEmbedding(
        [0.1, 0.2, 0.3],
        10,
        0.3,
        "English",
        "biases",
        ["Cognitive Biases", "Mathematics & Statistics"]
      );

      expect(mockRpc).toHaveBeenCalledWith(
        "match_knowledge_content_by_subcategory",
        expect.objectContaining({
          query_embedding: JSON.stringify([0.1, 0.2, 0.3]),
          match_threshold: 0.3,
          match_count: 10,
          target_language: "English",
          subcategories: ["Cognitive Biases", "Mathematics & Statistics"],
        })
      );

      expect(result).toHaveLength(2);
      expect(result[0].similarity).toBe(0.9); // Should be sorted by similarity desc
      expect(result[1].similarity).toBe(0.7);
      expect(result[0].searchSource).toBe("biases");
    });

    it("should handle empty search results", async () => {
      mockRpc.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await service.searchKnowledgeContentByEmbedding(
        [0.1, 0.2, 0.3],
        5,
        0.5,
        "Hungarian",
        "general"
      );

      expect(result).toHaveLength(0);
    });

    it("should handle content fetch errors", async () => {
      const mockSearchResults = [{ id: "1", title: "Test Result", similarity: 0.8 }];

      mockRpc.mockResolvedValueOnce({
        data: mockSearchResults,
        error: null,
      });

      mockIn.mockResolvedValueOnce({
        data: null,
        error: { message: "Content fetch error" },
      });

      await expect(
        service.searchKnowledgeContentByEmbedding(
          [0.1, 0.2, 0.3],
          5,
          0.5,
          "English",
          "mental-models"
        )
      ).rejects.toThrow("Failed to search knowledge content for mental-models");
    });

    it("should search with language filter when provided", async () => {
      const mockSearchResults = [{ id: "1", title: "Test Result", similarity: 0.8 }];
      const mockFullContent = [
        {
          id: "1",
          title: "Test Result",
          main_category: "Psychology & Human Behavior",
          subcategory: "Cognitive Biases",
          definition: "Test definition",
          language: "English",
        },
      ];

      mockRpc.mockResolvedValueOnce({
        data: mockSearchResults,
        error: null,
      });

      mockIn.mockResolvedValueOnce({
        data: mockFullContent,
        error: null,
      });

      await service.searchKnowledgeContentByEmbedding(
        [0.1, 0.2, 0.3],
        5,
        0.5,
        "English",
        "general"
      );

      expect(mockRpc).toHaveBeenCalledWith(
        "match_knowledge_content",
        expect.objectContaining({
          target_language: "English",
        })
      );
    });
  });

  describe("mapToKnowledgeContentType", () => {
    it("should map cognitive-bias variations correctly", () => {
      // Access private method through bracket notation for testing
      const mapMethod = (
        service as ActionRoadmapSupabaseService & {
          mapToKnowledgeContentType: (type: unknown) => string;
        }
      ).mapToKnowledgeContentType;

      expect(mapMethod("cognitive-bias")).toBe("cognitive-bias");
      expect(mapMethod("bias")).toBe("cognitive-bias");
    });

    it("should map fallacy variations correctly", () => {
      const mapMethod = (
        service as ActionRoadmapSupabaseService & {
          mapToKnowledgeContentType: (type: unknown) => string;
        }
      ).mapToKnowledgeContentType;

      expect(mapMethod("fallacy")).toBe("fallacy");
      expect(mapMethod("logical-fallacy")).toBe("fallacy");
    });

    it("should map mental-model variations correctly", () => {
      const mapMethod = (
        service as ActionRoadmapSupabaseService & {
          mapToKnowledgeContentType: (type: unknown) => string;
        }
      ).mapToKnowledgeContentType;

      expect(mapMethod("mental-model")).toBe("mental-model");
      expect(mapMethod("model")).toBe("mental-model");
    });

    it("should default to mental-model for unknown types", () => {
      const mapMethod = (
        service as ActionRoadmapSupabaseService & {
          mapToKnowledgeContentType: (type: unknown) => string;
        }
      ).mapToKnowledgeContentType;

      expect(mapMethod("unknown-type")).toBe("mental-model");
      expect(mapMethod(null)).toBe("mental-model");
      expect(mapMethod(undefined)).toBe("mental-model");
      expect(mapMethod(123)).toBe("mental-model");
    });
  });

  describe("singleton pattern", () => {
    it("should return the same instance on multiple calls", async () => {
      // We'll test by importing the module multiple times to simulate the behavior
      const { supabaseService: service1 } = await import("../../services/supabase-service");
      const { supabaseService: service2 } = await import("../../services/supabase-service");

      // Both should reference the same proxy
      expect(service1).toBe(service2);
    });

    it("should properly bind methods through proxy", async () => {
      const { supabaseService } = await import("../../services/supabase-service");

      // Setup mock to return successful health check
      mockLimit.mockResolvedValueOnce({
        data: [{ id: "1" }],
        error: null,
      });

      const result = await supabaseService.healthCheck();

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith("knowledge_content");
    });

    it("should access properties through proxy", async () => {
      const { supabaseService } = await import("../../services/supabase-service");

      // The service should be accessible through the proxy
      expect(typeof supabaseService.healthCheck).toBe("function");
      expect(typeof supabaseService.getSuperModels).toBe("function");
      expect(typeof supabaseService.searchKnowledgeContentByEmbedding).toBe("function");
    });
  });
});
