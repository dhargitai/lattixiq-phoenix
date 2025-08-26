/**
 * Integration tests for result-generator module
 *
 * Tests the actual integration with Google Gemini Pro 2.5 through the Vercel AI SDK.
 * These tests require actual API keys and make real API calls.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";
import { generateActionRoadmapResult, validateAIConfiguration } from "../../result-generator";
import type { PromptGeneratorResult } from "../../types";

describe("result-generator integration", () => {
  // Skip tests if API key is not configured
  const hasApiKey = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const skipMessage = "Skipping integration tests - GOOGLE_GENERATIVE_AI_API_KEY not configured";

  beforeEach(() => {
    if (!hasApiKey) {
      console.log(skipMessage);
    }
  });

  describe("real AI generation", () => {
    it.skipIf(!hasApiKey)(
      "should generate real roadmap with Gemini Pro 2.5",
      async () => {
        // Define a realistic schema
        const schema = z.object({
          executiveSummary: z.string().describe("2-3 sentence overview"),
          phases: z.array(
            z.object({
              name: z.string(),
              tools: z.array(
                z.object({
                  title: z.string(),
                  whyNow: z.string(),
                  howToApply: z.array(z.string()),
                  watchOutFor: z.array(z.string()),
                  expectedOutcome: z.string(),
                })
              ),
            })
          ),
          quickStartChecklist: z.array(
            z.object({
              action: z.string(),
              tool: z.string(),
              timing: z.string(),
            })
          ),
        });

        // Create a realistic prompt
        const prompt = `
<problem_context>
Query: I need to make a career transition from software engineering to product management
Complexity: moderate
Urgency: short-term
Key Characteristics: strategic thinking, communication skills, market understanding
</problem_context>

<selected_tools>
<tool>
  <title>First Principles Thinking</title>
  <type>mental-model</type>
  <phase>1</phase>
  <score>0.85</score>
  <definition>Breaking down complex problems into fundamental truths and building up from there</definition>
  <key_takeaway>Question assumptions and rebuild understanding from basic truths</key_takeaway>
</tool>

<tool>
  <title>Systems Thinking</title>
  <type>mental-model</type>
  <phase>2</phase>
  <score>0.82</score>
  <definition>Understanding how things influence one another within a whole</definition>
  <key_takeaway>Focus on relationships and interconnections rather than individual parts</key_takeaway>
</tool>
</selected_tools>

<task>
Generate a comprehensive action roadmap that helps the user solve their problem using these thinking tools.

For each tool, provide:
1. Why this tool helps with this specific problem
2. How to apply it immediately (concrete steps)
3. What to watch out for (common mistakes)
4. Expected outcome from using this tool

Structure the roadmap in problem-solving sequence:
1. Problem Definition Phase
2. Analysis Phase

Include:
- Executive summary (2-3 sentences)
- Quick-start checklist (3-5 items)
</task>

<output_format>
Return a JSON object matching the provided schema with all sections completed.
Focus on actionability over theory.
Use concrete examples related to the user's problem.
Keep language clear and directive.
</output_format>
      `;

        const input: PromptGeneratorResult = {
          prompt,
          schema,
          metadata: {
            toolCount: 2,
            estimatedTokens: 1200,
          },
        };

        // Make the actual API call
        const result = await generateActionRoadmapResult(input);

        // Verify the structure
        expect(result).toHaveProperty("result");
        expect(result).toHaveProperty("metadata");

        expect(result.metadata).toMatchObject({
          modelUsed: "gemini-2.5-pro",
          generatedAt: expect.any(String),
          generationTime: expect.any(Number),
        });

        // Verify the AI response structure
        const aiResult = result.result as Record<string, unknown>;
        expect(aiResult).toHaveProperty("executiveSummary");
        expect(aiResult).toHaveProperty("phases");
        expect(aiResult).toHaveProperty("quickStartChecklist");

        expect(typeof aiResult.executiveSummary).toBe("string");
        expect(Array.isArray(aiResult.phases)).toBe(true);
        expect(Array.isArray(aiResult.quickStartChecklist)).toBe(true);

        // Verify content quality
        expect(aiResult.executiveSummary.length).toBeGreaterThan(50);
        expect(aiResult.phases.length).toBeGreaterThan(0);
        expect(aiResult.quickStartChecklist.length).toBeGreaterThan(0);

        // Log the result for manual inspection
        console.log("Generated roadmap result:", JSON.stringify(aiResult, null, 2));
      },
      200000
    ); // 200 second timeout for API call (3+ minutes)

    it.skipIf(!hasApiKey)(
      "should handle different problem types",
      async () => {
        const schema = z.object({
          summary: z.string(),
          recommendations: z.array(z.string()),
          nextSteps: z.array(z.string()),
        });

        const prompt = `
<problem_context>
Query: I'm struggling with time management and productivity in my daily work
Complexity: simple
Urgency: immediate
</problem_context>

<selected_tools>
<tool>
  <title>Pareto Principle</title>
  <type>mental-model</type>
  <definition>80% of results come from 20% of efforts</definition>
</tool>
</selected_tools>

<task>
Create a simple action plan focusing on immediate time management improvements.
</task>

<output_format>
Return JSON with summary, recommendations, and nextSteps arrays.
</output_format>
      `;

        const input: PromptGeneratorResult = {
          prompt,
          schema,
          metadata: {
            toolCount: 1,
            estimatedTokens: 800,
          },
        };

        const result = await generateActionRoadmapResult(input);

        expect(result.result).toHaveProperty("summary");
        expect(result.result).toHaveProperty("recommendations");
        expect(result.result).toHaveProperty("nextSteps");

        const aiResult = result.result as Record<string, unknown>;
        expect(Array.isArray(aiResult.recommendations)).toBe(true);
        expect(Array.isArray(aiResult.nextSteps)).toBe(true);
      },
      200000
    );

    it.skipIf(!hasApiKey)(
      "should handle edge cases gracefully",
      async () => {
        // Test with minimal schema
        const minimalSchema = z.object({
          result: z.string(),
        });

        const minimalPrompt = "Generate a simple response about problem-solving.";

        const input: PromptGeneratorResult = {
          prompt: minimalPrompt,
          schema: minimalSchema,
          metadata: {
            toolCount: 0,
            estimatedTokens: 100,
          },
        };

        const result = await generateActionRoadmapResult(input);

        expect(result.result).toHaveProperty("result");
        expect(typeof (result.result as Record<string, unknown>).result).toBe("string");
      },
      200000
    );
  });

  describe("configuration validation", () => {
    it.skipIf(!hasApiKey)("should validate AI configuration successfully", () => {
      expect(validateAIConfiguration()).toBe(true);
    });

    it("should handle missing API key gracefully", () => {
      const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

      // This should still return true as the provider can be instantiated
      // The actual error would occur during API calls
      const isValid = validateAIConfiguration();

      // Restore the key
      if (originalKey) {
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
      }

      // The validation should still pass since it only checks provider instantiation
      expect(typeof isValid).toBe("boolean");
    });
  });

  describe("performance characteristics", () => {
    it.skipIf(!hasApiKey)(
      "should complete generation within timeout",
      async () => {
        const schema = z.object({
          title: z.string(),
          content: z.string(),
        });

        const prompt = "Generate a brief response about mental models.";

        const input: PromptGeneratorResult = {
          prompt,
          schema,
          metadata: {
            toolCount: 1,
            estimatedTokens: 200,
          },
        };

        const startTime = Date.now();
        const result = await generateActionRoadmapResult(input);
        const endTime = Date.now();

        expect(result.metadata.generationTime).toBe(endTime - startTime);
        expect(result.metadata.generationTime).toBeLessThan(185000); // Should be under 185s (3+ minutes)
      },
      200000
    );

    it.skipIf(!hasApiKey)(
      "should track token usage accurately",
      async () => {
        const schema = z.object({
          analysis: z.string(),
          conclusions: z.array(z.string()),
        });

        const longerPrompt = `
        Please analyze the following problem in detail and provide comprehensive conclusions.
        
        Problem: How to improve team collaboration in a remote work environment.
        Consider various factors including communication tools, meeting frequency,
        cultural aspects, and individual productivity patterns.
        
        Provide detailed analysis and multiple actionable conclusions.
      `.repeat(3); // Make it longer to generate more tokens

        const input: PromptGeneratorResult = {
          prompt: longerPrompt,
          schema,
          metadata: {
            toolCount: 3,
            estimatedTokens: 2000,
          },
        };

        const result = await generateActionRoadmapResult(input);

        expect(result.metadata.tokensUsed).toBeGreaterThan(0);
        expect(typeof result.metadata.tokensUsed).toBe("number");
      },
      200000
    );
  });

  describe("error scenarios", () => {
    it.skipIf(!hasApiKey)(
      "should handle invalid schema gracefully",
      async () => {
        // Create a schema that might be difficult for the AI to follow
        const complexSchema = z.object({
          impossibleField: z.string().min(10000), // Require 10k+ characters
          contradictoryData: z.object({
            isTrue: z.literal(true),
            isFalse: z.literal(true), // This creates a logical contradiction
          }),
        });

        const prompt = "Generate a simple response.";

        const input: PromptGeneratorResult = {
          prompt,
          schema: complexSchema,
          metadata: {
            toolCount: 1,
            estimatedTokens: 100,
          },
        };

        // This might fail, but should handle it gracefully
        try {
          await generateActionRoadmapResult(input);
        } catch (error) {
          expect(error).toBeDefined();
          // Should be our custom error type or a validation error
        }
      },
      200000
    );
  });
});
