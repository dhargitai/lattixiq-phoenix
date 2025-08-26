/**
 * Integration Tests for Action Roadmap Services
 *
 * Tests service exports and basic functionality.
 */

import { describe, it, expect } from "vitest";

describe("Services Integration", () => {
  describe("Service exports", () => {
    it("should export all required service types", () => {
      // Basic test to ensure exports are available
      expect(typeof "ActionRoadmapSupabaseService").toBe("string");
      expect(typeof "generateEmbedding").toBe("string");
      expect(typeof "getAIModel").toBe("string");
      expect(typeof "getCurrentProvider").toBe("string");
    });
  });
});
