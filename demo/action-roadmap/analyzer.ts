/**
 * Problem Analyzer Module
 *
 * Analyzes user problems to understand complexity, urgency, nature, and suggests
 * optimal tool mix proportions for Action Roadmap generation.
 *
 * Adapted from goal-analyzer.ts but focused on problem-solving characteristics.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { getAIModel } from "../ai/ai-provider";
import type { ProblemAnalysisResult, ProblemComplexity } from "./types";

// ============================================================================
// ZOD SCHEMA FOR AI RESPONSE
// ============================================================================

const ProblemAnalysisSchema = z.object({
  language: z.enum(["English", "Hungarian"]).describe("Detected language of the problem statement"),

  complexity: z
    .enum(["simple", "moderate", "complex"])
    .describe(
      "Problem complexity: simple (straightforward), moderate (multi-faceted), complex (systemic/interconnected)"
    ),

  urgency: z
    .enum(["immediate", "short-term", "long-term"])
    .describe(
      "Time sensitivity: immediate (days/weeks), short-term (months), long-term (6+ months)"
    ),

  problemNature: z.object({
    analytical: z
      .number()
      .min(0)
      .max(1)
      .describe("How much analytical/logical thinking is required (0.0-1.0)"),
    emotional: z
      .number()
      .min(0)
      .max(1)
      .describe("How much emotional intelligence/awareness is needed (0.0-1.0)"),
    strategic: z
      .number()
      .min(0)
      .max(1)
      .describe("How much strategic/long-term thinking is required (0.0-1.0)"),
    creative: z
      .number()
      .min(0)
      .max(1)
      .describe("How much creative/innovative thinking is needed (0.0-1.0)"),
  }),

  suggestedToolMix: z.object({
    mentalModels: z
      .number()
      .min(0)
      .max(1)
      .describe("Proportion of mental models to include (0.0-1.0)"),
    biasesFallacies: z
      .number()
      .min(0)
      .max(1)
      .describe("Proportion of cognitive biases/fallacies to include (0.0-1.0)"),
    generalConcepts: z
      .number()
      .min(0)
      .max(1)
      .describe("Proportion of general concepts to include (0.0-1.0)"),
  }),

  searchQueries: z.object({
    mentalModels: z
      .string()
      .describe("Optimized search query to find relevant mental models and frameworks"),
    biasesFallacies: z
      .string()
      .describe("Optimized search query to find relevant cognitive biases and fallacies"),
    generalConcepts: z
      .string()
      .describe("General search query for thinking concepts and approaches"),
  }),
});

// ============================================================================
// CORE ANALYZER FUNCTION
// ============================================================================

/**
 * Analyze a user's problem using AI to extract comprehensive context for
 * Action Roadmap generation.
 *
 * @param query - The user's problem statement or question
 * @returns Complete problem analysis with tool mix recommendations
 * @throws AnalysisError if AI analysis fails
 */
export async function analyzeProblem(query: string): Promise<ProblemAnalysisResult> {
  console.log("[ProblemAnalyzer] Starting analysis for query length:", query.length);

  // Input validation
  if (!query || query.trim().length === 0) {
    throw new Error("Query cannot be empty");
  }

  if (query.length > 1000) {
    throw new Error("Query exceeds maximum length of 1000 characters");
  }

  const model = getAIModel("gpt-4.1-mini");

  const prompt = `You are an expert problem analysis AI specialized in understanding the nature of human problems and challenges to recommend optimal thinking tools.

PROBLEM STATEMENT: "${query.trim()}"

ANALYSIS TASK: Analyze this problem comprehensively to determine:

1. LANGUAGE DETECTION: Is this text in English or Hungarian?

2. COMPLEXITY ASSESSMENT:
   - Simple: Single-variable problems, clear cause-effect, straightforward solutions
   - Moderate: Multi-faceted problems, several variables, some interconnections
   - Complex: Systemic problems, many variables, high interconnectedness, emergent properties

3. URGENCY ASSESSMENT:
   - Immediate: Needs action in days/weeks, time-sensitive consequences
   - Short-term: Needs resolution in months, moderate time pressure
   - Long-term: Strategic/developmental, timeline of 6+ months

4. PROBLEM NATURE (0.0-1.0 scores):
   - Analytical: Logic, data analysis, systematic thinking, technical problem-solving
   - Emotional: Interpersonal skills, self-awareness, empathy, emotional regulation
   - Strategic: Long-term planning, competitive advantage, resource allocation
   - Creative: Innovation, unconventional solutions, artistic/design thinking

5. TOOL MIX RECOMMENDATIONS (proportions must sum to ~1.0):
   - Mental Models: Structured frameworks for understanding (e.g., Systems Thinking, First Principles)
   - Biases/Fallacies: Cognitive traps and logical errors to avoid
   - General Concepts: Broad thinking principles and approaches

   BASE PROPORTIONS BY COMPLEXITY:
   - Simple: 60% mental models, 30% biases, 10% general
   - Moderate: 55% mental models, 30% biases, 15% general  
   - Complex: 50% mental models, 30% biases, 20% general

   ADJUSTMENTS FOR NATURE:
   - High emotional content (>0.6): +10% biases, -10% mental models
   - High creative content (>0.6): +10% general, -10% mental models
   - High strategic content (>0.6): +5% mental models, -5% biases

6. SEARCH QUERIES: Generate specific, targeted queries that would find the most relevant tools:
   - Mental Models: Focus on frameworks, systems, and structured approaches
   - Biases/Fallacies: Focus on cognitive traps and logical errors relevant to this problem
   - General Concepts: Focus on broad thinking principles and approaches

EXAMPLES:
Problem: "I need to decide between two job offers"
- Complexity: moderate (multiple factors, trade-offs)
- Urgency: immediate (decision deadline)
- Nature: analytical(0.7), emotional(0.6), strategic(0.8), creative(0.2)
- Tool Mix: 50% mental models, 35% biases, 15% general
- Mental Models Query: "decision making frameworks opportunity cost trade-offs career choice"
- Biases Query: "decision making biases anchoring confirmation bias loss aversion"
- General Query: "decision frameworks choice evaluation criteria"

Be precise and avoid generic responses. Focus on what would actually help solve this specific problem.`;

  console.log(`[ProblemAnalyzer] Generated prompt (${prompt.length} chars)`);

  try {
    const { object } = await generateObject({
      model,
      schema: ProblemAnalysisSchema,
      prompt,
      temperature: 0.3, // Lower temperature for consistent analysis
    });

    // Validate proportions sum to approximately 1.0
    const totalProportion =
      object.suggestedToolMix.mentalModels +
      object.suggestedToolMix.biasesFallacies +
      object.suggestedToolMix.generalConcepts;

    if (Math.abs(totalProportion - 1.0) > 0.1) {
      console.warn("[ProblemAnalyzer] Tool mix proportions do not sum to 1.0:", totalProportion);
    }

    // Build final result
    const result: ProblemAnalysisResult = {
      query: query.trim(),
      language: object.language,
      complexity: object.complexity,
      urgency: object.urgency,
      problemNature: object.problemNature,
      suggestedToolMix: object.suggestedToolMix,
      searchQueries: object.searchQueries,
    };

    console.log("[ProblemAnalyzer] Analysis completed successfully:", {
      language: result.language,
      complexity: result.complexity,
      urgency: result.urgency,
      analytical: result.problemNature.analytical,
      emotional: result.problemNature.emotional,
    });

    return result;
  } catch (error) {
    console.error("[ProblemAnalyzer] Analysis failed:", error);
    throw new Error(
      `Problem analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates if a query meets basic requirements for analysis
 * @param query - The query to validate
 * @returns True if valid, throws error if invalid
 */
export function validateQuery(query: string): boolean {
  if (!query || typeof query !== "string") {
    throw new Error("Query must be a non-empty string");
  }

  const trimmed = query.trim();
  if (trimmed.length === 0) {
    throw new Error("Query cannot be empty or only whitespace");
  }

  if (trimmed.length < 10) {
    console.warn("[ProblemAnalyzer] Very short query (<10 characters), analysis may be limited");
  }

  if (trimmed.length > 1000) {
    throw new Error("Query exceeds maximum length of 1000 characters");
  }

  return true;
}

/**
 * Calculates tool mix based on problem characteristics (fallback logic)
 * @param complexity - Problem complexity level
 * @param problemNature - Quantified problem characteristics
 * @returns Suggested tool mix proportions
 */
export function calculateToolMix(
  complexity: ProblemComplexity,
  problemNature: { analytical: number; emotional: number; strategic: number; creative: number }
) {
  // Base proportions by complexity
  let mentalModels: number;
  let biasesFallacies: number;
  let generalConcepts: number;

  switch (complexity) {
    case "simple":
      mentalModels = 0.6;
      biasesFallacies = 0.3;
      generalConcepts = 0.1;
      break;
    case "moderate":
      mentalModels = 0.55;
      biasesFallacies = 0.3;
      generalConcepts = 0.15;
      break;
    case "complex":
      mentalModels = 0.5;
      biasesFallacies = 0.3;
      generalConcepts = 0.2;
      break;
  }

  // Adjust for emotional content
  if (problemNature.emotional > 0.6) {
    biasesFallacies += 0.1;
    mentalModels -= 0.1;
  }

  // Adjust for creative content
  if (problemNature.creative > 0.6) {
    generalConcepts += 0.1;
    mentalModels -= 0.1;
  }

  // Adjust for strategic content
  if (problemNature.strategic > 0.6) {
    mentalModels += 0.05;
    biasesFallacies -= 0.05;
  }

  // Ensure non-negative values
  mentalModels = Math.max(0, mentalModels);
  biasesFallacies = Math.max(0, biasesFallacies);
  generalConcepts = Math.max(0, generalConcepts);

  // Normalize to sum to 1.0
  const total = mentalModels + biasesFallacies + generalConcepts;
  if (total > 0) {
    mentalModels /= total;
    biasesFallacies /= total;
    generalConcepts /= total;
  }

  return {
    mentalModels,
    biasesFallacies,
    generalConcepts,
  };
}
