/**
 * Integration Tests for Result Prompt Generator
 *
 * Tests the prompt generator with realistic data flows and AI SDK integration
 */

import { describe, it, expect } from "vitest";
// import { generateObject } from 'ai';
// import { openai } from '@ai-sdk/openai';
import { generatePromptAndSchema } from "../../result-prompt-generator";
import type { CuratedToolList, ProblemAnalysisResult, OrderedTool } from "../../types";
import { ProblemPhase } from "../../types";

// ============================================================================
// REALISTIC TEST FIXTURES
// ============================================================================

const realisticAnalysis: ProblemAnalysisResult = {
  query:
    "I'm struggling to make a career transition from marketing to product management while maintaining financial stability and not burning bridges with my current team.",
  language: "English",
  complexity: "complex",
  urgency: "short-term",
  problemNature: {
    analytical: 0.8,
    emotional: 0.7,
    strategic: 0.9,
    creative: 0.5,
  },
  suggestedToolMix: {
    mentalModels: 0.5,
    biasesFallacies: 0.3,
    generalConcepts: 0.2,
  },
  searchQueries: {
    mentalModels: "career transition strategic planning opportunity cost",
    biasesFallacies: "sunk cost fallacy loss aversion career change",
    generalConcepts: "professional development networking",
  },
};

const realisticTools: OrderedTool[] = [
  {
    id: "opportunity-cost",
    title: "Opportunity Cost",
    type: "mental-model",
    main_category: "Economics & Markets",
    subcategory: "Economics & Markets",
    definition: "The value of the next best alternative that must be given up when making a choice",
    key_takeaway: "Every decision has hidden costs - what you give up to get what you choose",
    hook: "What are you really paying for that career change?",
    analogy_or_metaphor: "Like choosing one path in a forest - you can't walk them all",
    classic_example: "A student choosing college over immediate work income",
    modern_example: "Staying at a safe job vs. starting a risky startup",
    visual_metaphor: "A fork in the road with different destinations",
    visual_metaphor_url: null,
    payoff: "Make better decisions by seeing the full cost",
    pitfall: "Can lead to decision paralysis if overanalyzed",
    dive_deeper_mechanism: "Works by forcing explicit comparison of alternatives",
    dive_deeper_origin_story: "Formalized by economists in the 19th century",
    dive_deeper_pitfalls_nuances: "Hard to quantify intangible costs like happiness",
    extra_content: null,
    embedding: null,
    language: "English",
    super_model: false,
    similarity: 0.89,
    searchSource: "mental-models" as const,
    scores: {
      directRelevance: 0.9,
      applicabilityNow: 0.8,
      foundationalValue: 0.7,
      simplicityBonus: 0.2,
      typeBalanceBonus: 0.0,
      urgencyAdjustment: 0.1,
      emotionalAdjustment: 0.05,
    },
    finalScore: 0.83,
    isFoundational: false,
    complexityScore: 0.4,
    phase: ProblemPhase.Definition,
    order: 1,
    phaseOrder: 1,
  },
  {
    id: "sunk-cost-fallacy",
    title: "Sunk Cost Fallacy",
    type: "cognitive-bias",
    main_category: "Psychology & Human Behavior",
    subcategory: "Cognitive Biases",
    definition:
      "The tendency to continue investing in a project based on previously invested resources rather than future value",
    key_takeaway: "Past investments shouldn't determine future decisions",
    hook: "Are you staying because it's right, or because you've already invested so much?",
    analogy_or_metaphor: "Like continuing to watch a bad movie because you paid for the ticket",
    classic_example: "Continuing a failing business because of money already spent",
    modern_example: "Staying in a career because of years of education",
    visual_metaphor: "A person carrying heavy bags they no longer need",
    visual_metaphor_url: null,
    payoff: "Make cleaner decisions based on future potential",
    pitfall: "May lead to abandoning valuable long-term investments too quickly",
    dive_deeper_mechanism: "Triggers loss aversion and commitment escalation",
    dive_deeper_origin_story: "Identified in behavioral economics research",
    dive_deeper_pitfalls_nuances: "Sometimes past investment does signal future value",
    extra_content: null,
    embedding: null,
    language: "English",
    super_model: false,
    similarity: 0.82,
    searchSource: "biases" as const,
    scores: {
      directRelevance: 0.85,
      applicabilityNow: 0.9,
      foundationalValue: 0.6,
      simplicityBonus: 0.3,
      typeBalanceBonus: 0.1,
      urgencyAdjustment: 0.1,
      emotionalAdjustment: 0.1,
    },
    finalScore: 0.81,
    isFoundational: false,
    complexityScore: 0.3,
    phase: ProblemPhase.Decision,
    order: 2,
    phaseOrder: 1,
  },
  {
    id: "systems-thinking",
    title: "Systems Thinking",
    type: "mental-model",
    main_category: "Thinking & Learning Processes",
    subcategory: "Problem Solving & Decision Making",
    definition:
      "A holistic approach to analysis that focuses on the way that a system's constituent parts interrelate",
    key_takeaway: "Understanding interconnections helps solve complex problems more effectively",
    hook: "What if your career challenge is really about the whole ecosystem around you?",
    analogy_or_metaphor: "Like understanding a clock by seeing how all gears work together",
    classic_example: "Solving traffic by improving public transit, not just roads",
    modern_example: "Fixing team productivity by examining communication patterns",
    visual_metaphor: "A web where touching one strand affects the whole structure",
    visual_metaphor_url: null,
    payoff: "Solve root causes instead of symptoms",
    pitfall: "Can lead to analysis paralysis with too much complexity",
    dive_deeper_mechanism: "Maps relationships, feedback loops, and emergent properties",
    dive_deeper_origin_story: "Developed by biologist Ludwig von Bertalanffy in 1940s",
    dive_deeper_pitfalls_nuances: "Balance between detail and actionable insights",
    extra_content: null,
    embedding: null,
    language: "English",
    super_model: true,
    similarity: 0.76,
    searchSource: "mental-models" as const,
    scores: {
      directRelevance: 0.75,
      applicabilityNow: 0.7,
      foundationalValue: 0.95,
      simplicityBonus: 0.0,
      typeBalanceBonus: 0.05,
      urgencyAdjustment: 0.0,
      emotionalAdjustment: 0.0,
    },
    finalScore: 0.79,
    isFoundational: true,
    complexityScore: 0.7,
    phase: ProblemPhase.Analysis,
    order: 3,
    phaseOrder: 1,
  },
];

const realisticCuratedTools: CuratedToolList = {
  tools: realisticTools,
  metadata: {
    totalCount: 3,
    typeDistribution: {
      "mental-model": 2,
      "cognitive-bias": 1,
      fallacy: 0,
      "general-concept": 0,
    },
    sequencePhases: [ProblemPhase.Definition, ProblemPhase.Analysis, ProblemPhase.Decision],
    meetsMinimumRequirements: true,
    warnings: [],
  },
};

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("Result Prompt Generator Integration", () => {
  describe("realistic scenario generation", () => {
    it("should generate comprehensive prompt for complex career transition problem", () => {
      const result = generatePromptAndSchema(realisticCuratedTools, realisticAnalysis);

      // Verify prompt includes all key elements
      expect(result.prompt).toContain("career transition from marketing to product management");
      expect(result.prompt).toContain("maintaining financial stability");
      expect(result.prompt).toContain("not burning bridges");

      // Verify all three tools are included
      expect(result.prompt).toContain("Opportunity Cost");
      expect(result.prompt).toContain("Sunk Cost Fallacy");
      expect(result.prompt).toContain("Systems Thinking");

      // Verify proper phase assignments
      expect(result.prompt).toContain("<phase>1</phase>"); // Definition
      expect(result.prompt).toContain("<phase>2</phase>"); // Analysis
      expect(result.prompt).toContain("<phase>4</phase>"); // Decision

      // Verify metadata
      expect(result.metadata.toolCount).toBe(3);
      expect(result.metadata.complexity).toBe("complex");
      expect(result.metadata.urgency).toBe("short-term");
      expect(result.metadata.estimatedTokens).toBeGreaterThan(1000);
      expect(result.metadata.estimatedTokens).toBeLessThan(8000);
    });

    it("should include problem characteristics in context", () => {
      const result = generatePromptAndSchema(realisticCuratedTools, realisticAnalysis);

      expect(result.prompt).toContain("requires analytical thinking");
      expect(result.prompt).toContain("involves emotional factors");
      expect(result.prompt).toContain("needs strategic planning");
    });

    it("should format tools with all available metadata", () => {
      const result = generatePromptAndSchema(realisticCuratedTools, realisticAnalysis);

      // Check opportunity cost tool formatting
      expect(result.prompt).toContain("<title>Opportunity Cost</title>");
      expect(result.prompt).toContain("<type>mental-model</type>");
      expect(result.prompt).toContain("<score>0.83</score>");
      expect(result.prompt).toContain("The value of the next best alternative");
      expect(result.prompt).toContain("Every decision has hidden costs");
      expect(result.prompt).toContain("<is_foundational>false</is_foundational>");

      // Check systems thinking tool formatting
      expect(result.prompt).toContain("<title>Systems Thinking</title>");
      expect(result.prompt).toContain("<is_foundational>true</is_foundational>");
    });
  });

  describe("prompt quality validation", () => {
    it("should generate actionable, specific prompts", () => {
      const result = generatePromptAndSchema(realisticCuratedTools, realisticAnalysis);

      // Should contain action-oriented language
      expect(result.prompt).toContain("concrete steps");
      expect(result.prompt).toContain("immediate");
      expect(result.prompt).toContain("actionable");
      expect(result.prompt).toContain("specific");

      // Should reference the specific problem context
      expect(result.prompt).toContain("career transition");
      expect(result.prompt).toContain("financial stability");
    });

    it("should include comprehensive instruction sections", () => {
      const result = generatePromptAndSchema(realisticCuratedTools, realisticAnalysis);

      // All required sections should be present
      expect(result.prompt).toContain("<problem_context>");
      expect(result.prompt).toContain("<selected_tools>");
      expect(result.prompt).toContain("<task>");
      expect(result.prompt).toContain("<output_format>");

      // Task should include all phase descriptions
      expect(result.prompt).toContain("Problem Definition Phase");
      expect(result.prompt).toContain("Analysis Phase");
      expect(result.prompt).toContain("Solution Generation Phase");
      expect(result.prompt).toContain("Decision Phase");
      expect(result.prompt).toContain("Validation Phase");

      // Should specify all required outputs
      expect(result.prompt).toContain("Executive summary");
      expect(result.prompt).toContain("Quick-start checklist");
      expect(result.prompt).toContain("Decision points");
      expect(result.prompt).toContain("Red flags");
      expect(result.prompt).toContain("Success indicators");
    });
  });

  describe("schema compatibility", () => {
    it("should generate schema that validates realistic AI responses", () => {
      const result = generatePromptAndSchema(realisticCuratedTools, realisticAnalysis);

      // Mock a realistic AI response structure
      const mockAIResponse = {
        executiveSummary:
          "Use opportunity cost analysis to clarify trade-offs, check for sunk cost fallacy in your current role attachment, and apply systems thinking to map all stakeholders and dependencies in your career transition.",

        roadmapPhases: [
          {
            order: 1,
            phaseName: "Problem Definition",
            description: "Clarify and understand the career transition challenge",
            tools: [
              {
                toolId: "opportunity-cost",
                subtitle: "Evaluate trade-offs clearly",
                whyNow:
                  "Your career transition involves multiple trade-offs that need explicit evaluation to make the best decision.",
                howToApply: [
                  "List what you'd give up by staying in marketing (growth opportunities, skill development, fulfillment)",
                  "List what you'd give up by switching to product management (current expertise, established relationships, immediate income)",
                  "Quantify both tangible costs (salary differences, time to learn) and intangible ones (stress, uncertainty)",
                ],
                watchOutFor: [
                  "Ignoring emotional and relationship costs",
                  "Overanalyzing to the point of paralysis",
                  "Only considering immediate costs, not long-term implications",
                ],
                expectedOutcome:
                  "A clear, honest assessment of what this career change will really cost you",
              },
            ],
          },
          {
            order: 2,
            phaseName: "Analysis",
            description: "Investigate system connections and dependencies",
            tools: [
              {
                toolId: "systems-thinking",
                subtitle: "Map interconnected factors",
                whyNow:
                  "Your career transition affects multiple interconnected systems: your team, family finances, professional network, and personal identity.",
                howToApply: [
                  "Map all stakeholders affected by your transition (current team, family, future colleagues, clients)",
                  "Identify feedback loops (how does team reaction affect your confidence? How does financial stress affect performance?)",
                  "Look for leverage points where small changes could have big impacts",
                ],
                watchOutFor: [
                  "Getting overwhelmed by the complexity and not taking action",
                  "Missing important stakeholders or connections",
                  "Focusing only on professional systems and ignoring personal ones",
                ],
                expectedOutcome:
                  "Understanding of how your transition ripples through all areas of your life and where to focus your efforts",
              },
            ],
          },
          {
            order: 4,
            phaseName: "Decision",
            description: "Evaluate and choose the best path forward",
            tools: [
              {
                toolId: "sunk-cost-fallacy",
                subtitle: "Focus on future potential",
                whyNow:
                  "You might be staying in marketing because of your existing investment in that career path rather than future potential.",
                howToApply: [
                  "Identify what you've already invested in your marketing career (education, experience, relationships, reputation)",
                  "Ask: 'If I were starting fresh today with no prior investment, which path would I choose?'",
                  "Separate past investment from future decision-making",
                ],
                watchOutFor: [
                  "Completely ignoring the value of past experience and relationships",
                  "Swinging too far and abandoning valuable assets unnecessarily",
                  "Making the decision purely to avoid 'wasting' past investment",
                ],
                expectedOutcome:
                  "A decision based on future potential rather than past investment, while still leveraging valuable existing assets",
              },
            ],
          },
        ],

        quickStartChecklist: [
          "Write down exactly what you'd give up by staying vs. switching careers",
          "Map all people who would be affected by your career change",
          "Ask yourself: 'If I started fresh with no marketing background, what would I choose?'",
          "Create a timeline for gradual vs. immediate transition",
          "Research 3 specific product management roles to understand requirements",
        ],

        decisionPointsForBiasChecking: [
          {
            afterWhichPhase: 2,
            description: "Deciding whether to transition gradually or make a clean break",
            biasesToCheck: [
              "Loss aversion - overweighting the risk of change vs. the risk of staying. Explicitly list risks of both staying and changing, get outside perspective from someone who's made similar transitions",
            ],
          },
        ],

        redFlags: [
          "You find yourself justifying staying based only on past investment",
          "You're making decisions in isolation without consulting affected stakeholders",
          "Financial planning becomes secondary to proving you're not 'wasting' your marketing background",
        ],

        successIndicators: [
          "You can clearly articulate what you're gaining and giving up with either choice",
          "Key stakeholders understand and support your reasoning (even if they don't agree with the decision)",
          "You feel confident the decision is based on future potential, not past investment",
        ],
      };

      // Should validate without errors
      expect(() => result.schema.parse(mockAIResponse)).not.toThrow();

      const parsedResult = result.schema.parse(mockAIResponse);
      expect(parsedResult).toEqual(mockAIResponse);
    });
  });

  // Note: This test would require actual OpenAI API access and is expensive
  // Commented out but shows how integration would work
  /*
  describe('AI SDK integration', () => {
    it.skip('should work with actual AI SDK generateObject call', async () => {
      const result = generatePromptAndSchema(realisticCuratedTools, realisticAnalysis);
      
      const aiResult = await generateObject({
        model: openai('gpt-4o-mini'),
        prompt: result.prompt,
        schema: result.schema,
      });
      
      expect(aiResult.object).toHaveProperty('executiveSummary');
      expect(aiResult.object).toHaveProperty('phases');
      expect(aiResult.object).toHaveProperty('quickStartChecklist');
      expect(aiResult.object).toHaveProperty('decisionPoints');
      expect(aiResult.object).toHaveProperty('redFlags');
      expect(aiResult.object).toHaveProperty('successIndicators');
      
      // Validate the AI actually understood the context
      expect(aiResult.object.executiveSummary).toContain('career');
      expect(aiResult.object.phases.length).toBeGreaterThan(0);
    }, 30000); // 30 second timeout for AI call
  });
  */
});
