/**
 * Integration tests for the Action Roadmap Generator
 *
 * These tests verify the complete flow with real dependencies
 * and require a running local environment.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { generateActionRoadmap, validateQuery, createDefaultOptions } from "../../generator";
import type { ActionRoadmapOptions } from "../../types";

// Skip integration tests if not explicitly enabled
const isIntegrationTest = process.env.INTEGRATION_TEST === "true";

describe.skipIf(!isIntegrationTest)("Action Roadmap Generator Integration", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    // Suppress console logs during tests unless verbose
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    consoleLogSpy?.mockRestore();
    consoleErrorSpy?.mockRestore();
  });

  describe("complete roadmap generation", () => {
    it("should generate a complete roadmap for a business problem", async () => {
      const query =
        "I need to improve decision-making in my startup. We keep making poor strategic choices that hurt our growth.";

      const result = await generateActionRoadmap(query);

      // Verify output structure
      expect(result).toMatchObject({
        prompt: expect.any(String),
        schema: expect.any(Object),
        analysis: expect.objectContaining({
          query: expect.any(String),
          language: expect.any(String),
          complexity: expect.any(String),
          urgency: expect.any(String),
          problemNature: expect.objectContaining({
            analytical: expect.any(Number),
            emotional: expect.any(Number),
            strategic: expect.any(Number),
            creative: expect.any(Number),
          }),
          suggestedToolMix: expect.objectContaining({
            mentalModels: expect.any(Number),
            biasesFallacies: expect.any(Number),
            generalConcepts: expect.any(Number),
          }),
          searchQueries: expect.objectContaining({
            mentalModels: expect.any(String),
            biasesFallacies: expect.any(String),
            generalConcepts: expect.any(String),
          }),
        }),
        curatedTools: expect.objectContaining({
          tools: expect.any(Array),
          metadata: expect.objectContaining({
            totalCount: expect.any(Number),
            typeDistribution: expect.any(Object),
            meetsMinimumRequirements: expect.any(Boolean),
          }),
        }),
        metrics: expect.objectContaining({
          totalTime: expect.any(Number),
          toolsFound: expect.any(Number),
          toolsSelected: expect.any(Number),
        }),
        metadata: expect.objectContaining({
          generatedAt: expect.any(String),
          version: expect.any(String),
          warnings: expect.any(Array),
        }),
      });

      // Verify business logic constraints
      expect(result.curatedTools.tools.length).toBeGreaterThanOrEqual(3);
      expect(result.curatedTools.tools.length).toBeLessThanOrEqual(7);
      expect(result.curatedTools.metadata.meetsMinimumRequirements).toBe(true);

      // Verify performance is reasonable
      expect(result.metrics.totalTime).toBeLessThan(60000); // Less than 1 minute
      expect(result.metrics.toolsFound).toBeGreaterThan(0);
      expect(result.metrics.toolsSelected).toBeGreaterThan(0);

      // Verify prompt generation
      expect(result.prompt.length).toBeGreaterThan(100);
      expect(typeof result.schema).toBe("object");

      // Verify tools are properly ordered
      const { tools } = result.curatedTools;
      for (let i = 0; i < tools.length - 1; i++) {
        expect(tools[i].order).toBeLessThan(tools[i + 1].order);
      }
    }, 60000); // 60 second timeout

    it("should handle a personal development problem", async () => {
      const query =
        "I struggle with procrastination and need better time management strategies for my work life.";

      const result = await generateActionRoadmap(query);

      expect(result.analysis.complexity).toMatch(/simple|moderate|complex/);
      expect(result.analysis.urgency).toMatch(/immediate|short-term|long-term/);
      expect(result.curatedTools.tools.length).toBeGreaterThanOrEqual(3);

      // Should have found relevant tools
      expect(result.metrics.toolsFound).toBeGreaterThan(0);
      expect(result.curatedTools.metadata.meetsMinimumRequirements).toBe(true);
    }, 45000);

    it("should handle a technical/analytical problem", async () => {
      const query =
        "I need to optimize our software architecture for better performance and scalability.";

      const result = await generateActionRoadmap(query);

      // For technical problems, we expect high analytical scores
      expect(result.analysis.problemNature.analytical).toBeGreaterThan(0.5);
      expect(result.curatedTools.tools.length).toBeGreaterThanOrEqual(3);
      expect(result.metrics.toolsFound).toBeGreaterThan(0);
    }, 45000);

    it("should respect custom options", async () => {
      const query = "I need to improve my leadership skills in a remote team environment.";
      const options: ActionRoadmapOptions = {
        maxTools: 5,
        minTools: 4,
        verboseLogging: false,
        includeMetrics: true,
      };

      const result = await generateActionRoadmap(query, options);

      expect(result.curatedTools.tools.length).toBeGreaterThanOrEqual(4);
      expect(result.curatedTools.tools.length).toBeLessThanOrEqual(5);
      expect(result.metrics).toBeDefined();
    }, 45000);
  });

  describe("error scenarios", () => {
    it("should handle very short queries gracefully", async () => {
      await expect(generateActionRoadmap("help")).rejects.toThrow();
    });

    it("should handle very long queries", async () => {
      const longQuery = `${"I have a complex problem with multiple facets. ".repeat(50)}I need comprehensive help to address all these interconnected issues effectively.`;

      const result = await generateActionRoadmap(longQuery);
      expect(result.curatedTools.tools.length).toBeGreaterThan(0);
    }, 60000);

    it("should handle queries with special characters", async () => {
      const query =
        "I need help with decision-making & strategic planning (especially for $$ allocation)!";

      const result = await generateActionRoadmap(query);
      expect(result.curatedTools.tools.length).toBeGreaterThan(0);
    }, 45000);

    it("should handle timeout gracefully with very short timeouts", async () => {
      const query = "I need help with complex project management and team coordination.";
      const options: ActionRoadmapOptions = {
        totalTimeout: 100, // Very short timeout
      };

      try {
        await generateActionRoadmap(query, options);
        // If it doesn't timeout, that's also okay (system was fast enough)
      } catch (error) {
        // Should be a timeout or wrapper error, not an unhandled exception
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe("output validation", () => {
    it("should generate valid output for business strategy query", async () => {
      const query =
        "Our startup needs better product-market fit and customer acquisition strategies.";

      const result = await generateActionRoadmap(query);

      // Validate analysis completeness
      expect(result.analysis.language).toMatch(/English|Hungarian/);
      expect(result.analysis.searchQueries.mentalModels).toMatch(/\w+/);
      expect(result.analysis.searchQueries.biasesFallacies).toMatch(/\w+/);
      expect(result.analysis.searchQueries.generalConcepts).toMatch(/\w+/);

      // Validate tool structure
      result.curatedTools.tools.forEach((tool) => {
        expect(tool).toMatchObject({
          id: expect.any(String),
          title: expect.any(String),
          type: expect.any(String),
          finalScore: expect.any(Number),
          order: expect.any(Number),
          phase: expect.any(Number),
        });

        expect(tool.finalScore).toBeGreaterThanOrEqual(0);
        expect(tool.finalScore).toBeLessThanOrEqual(1);
        expect(tool.order).toBeGreaterThan(0);
      });

      // Validate type distribution
      const distribution = result.curatedTools.metadata.typeDistribution;
      const totalTypes = Object.values(distribution).reduce((sum, count) => sum + count, 0);
      expect(totalTypes).toBe(result.curatedTools.tools.length);

      // Validate metrics are reasonable
      expect(result.metrics.analysisTime).toBeGreaterThan(0);
      expect(result.metrics.searchTime).toBeGreaterThan(0);
      expect(result.metrics.scoringTime).toBeGreaterThan(0);
      expect(result.metrics.curationTime).toBeGreaterThan(0);
      expect(result.metrics.promptTime).toBeGreaterThan(0);
    }, 45000);

    it("should maintain consistent tool ordering", async () => {
      const query = "I need systematic approaches to problem-solving in my consulting work.";

      const result = await generateActionRoadmap(query);

      const { tools } = result.curatedTools;

      // Check ordering consistency
      for (let i = 0; i < tools.length - 1; i++) {
        expect(tools[i].order).toBeLessThan(tools[i + 1].order);
      }

      // Check phase consistency
      const phaseOrders = new Map<number, number[]>();
      tools.forEach((tool) => {
        if (!phaseOrders.has(tool.phase)) {
          phaseOrders.set(tool.phase, []);
        }
        phaseOrders.get(tool.phase)!.push(tool.phaseOrder);
      });

      // Within each phase, phase orders should be sequential
      phaseOrders.forEach((orders) => {
        const sorted = [...orders].sort((a, b) => a - b);
        expect(orders).toEqual(sorted);
      });
    }, 45000);
  });

  describe("performance benchmarks", () => {
    it("should complete simple problems quickly", async () => {
      const query = "I need basic time management techniques for daily productivity.";
      const start = Date.now();

      const result = await generateActionRoadmap(query);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(30000); // Less than 30 seconds
      expect(result.metrics.totalTime).toBeLessThan(elapsed);
    }, 35000);

    it("should handle multiple concurrent requests", async () => {
      const queries = [
        "Help me with decision-making frameworks for business.",
        "I need creative thinking techniques for innovation.",
        "Better communication strategies for remote teams.",
      ];

      const start = Date.now();
      const results = await Promise.all(queries.map((query) => generateActionRoadmap(query)));
      const elapsed = Date.now() - start;

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.curatedTools.tools.length).toBeGreaterThan(0);
      });

      // Should complete all three in reasonable time
      expect(elapsed).toBeLessThan(90000); // Less than 90 seconds total
    }, 100000);
  });
});

describe.skipIf(!isIntegrationTest)("Utility Functions Integration", () => {
  describe("validateQuery integration", () => {
    it("should validate real-world queries correctly", () => {
      const validQueries = [
        "I need help with project management and team coordination strategies.",
        "How can I improve my decision-making process for complex business problems?",
        "I struggle with procrastination and need better productivity techniques.",
        "Our company needs frameworks for strategic planning and execution.",
      ];

      const invalidQueries = ["", "hi", "123", "   ", "help"];

      validQueries.forEach((query) => {
        expect(validateQuery(query)).toBe(true);
      });

      invalidQueries.forEach((query) => {
        expect(validateQuery(query)).toBe(false);
      });
    });
  });

  describe("createDefaultOptions integration", () => {
    it("should create options that work with real generation", async () => {
      const options = createDefaultOptions();
      const query = "I need systematic approaches to solving complex business problems.";

      const result = await generateActionRoadmap(query, options);

      expect(result.curatedTools.tools.length).toBeGreaterThanOrEqual(options.minTools!);
      expect(result.curatedTools.tools.length).toBeLessThanOrEqual(options.maxTools!);
      expect(result.metrics).toBeDefined(); // includeMetrics: true
    }, 45000);
  });
});
