/**
 * Action Roadmap Result Prompt Generator
 *
 * Transforms curated tool lists into AI-ready prompts with matching Zod schemas
 * for generating comprehensive action roadmap reports.
 */

import { z } from "zod";
import type {
  CuratedToolList,
  ProblemAnalysisResult,
  PromptGeneratorResult,
  OrderedTool,
} from "./types";
import { PromptGenerationError } from "./types";

// ============================================================================
// ZOD SCHEMA DEFINITIONS
// ============================================================================

/**
 * Schema for individual tool application within a phase
 */
const ToolApplicationSchema = z.object({
  toolId: z.string().describe("Tool ID"),
  subtitle: z.string().describe("Subtitle for using the tool, not necessarily mentioning its name"),
  whyNow: z.string().describe("Why this tool helps with this specific problem"),
  howToApply: z.array(z.string()).describe("Concrete steps for immediate application"),
  watchOutFor: z.array(z.string()).describe("Common mistakes and pitfalls to avoid"),
  expectedOutcome: z.string().describe("What result to expect from using this tool"),
});

/**
 * Schema for problem-solving phases
 */
const PhaseSchema = z.object({
  order: z.number().describe("Order of the problem-solving phase"),
  phaseName: z.string().describe("Name of the problem-solving phase"),
  description: z.string().describe("Description of the problem-solving phase"),
  tools: z.array(ToolApplicationSchema).describe("Tools to apply in this phase"),
});

/**
 * Schema for decision points with bias risks
 */
const DecisionPointSchema = z.object({
  afterWhichPhase: z.number().describe("After which phase we should include this decision point"),
  description: z.string().describe("Description of the decision point"),
  biasesToCheck: z
    .array(z.string())
    .describe("What cognitive biases might interfere here and how to mitigate them"),
});

/**
 * Main schema for the complete action roadmap output
 */
const ActionRoadmapSchema = z.object({
  executiveSummary: z.string().describe("2-3 sentence overview of the recommended approach"),

  roadmapPhases: z.array(PhaseSchema).describe("Problem-solving phases with tool applications"),

  quickStartChecklist: z.array(z.string()).describe("5-7 immediate actions to get started"),

  decisionPointsForBiasChecking: z
    .array(DecisionPointSchema)
    .describe("Critical decision points where bias checking is important"),

  redFlags: z.array(z.string()).describe("Warning signs that indicate the approach isn't working"),

  successIndicators: z
    .array(z.string())
    .describe("Positive signs that indicate progress and success"),
});

// ============================================================================
// PROMPT GENERATION FUNCTIONS
// ============================================================================

/**
 * Formats problem characteristics for inclusion in the prompt
 */
function formatCharacteristics(analysis: ProblemAnalysisResult): string {
  const { problemNature } = analysis;
  const traits = [];

  if (problemNature.analytical > 0.6) traits.push("requires analytical thinking");
  if (problemNature.emotional > 0.6) traits.push("involves emotional factors");
  if (problemNature.strategic > 0.6) traits.push("needs strategic planning");
  if (problemNature.creative > 0.6) traits.push("benefits from creative approaches");

  return traits.join(", ") || "multi-faceted problem";
}

/**
 * Formats a single tool for inclusion in the XML prompt structure
 */
function formatTool(tool: OrderedTool): string {
  // Use available fields, avoiding deprecated ones
  const definition = tool.definition || "Definition not available";
  const keyTakeaway = tool.key_takeaway || "Key takeaway not available";

  return `
<tool>
  <title>${tool.title}</title>
  <type>${tool.type}</type>
  <tool_id>${tool.id}</tool_id>
  <phase>${tool.phase}</phase>
  <score>${tool.finalScore.toFixed(2)}</score>
  <definition>${definition}</definition>
  <key_takeaway>${keyTakeaway}</key_takeaway>
  <analogy_or_metaphor>${tool.analogy_or_metaphor}</analogy_or_metaphor>
  <classic_example>${tool.classic_example}</classic_example>
  <modern_example>${tool.modern_example}</modern_example>
  <payoff>${tool.payoff}</payoff>
  <pitfall>${tool.pitfall}</pitfall>
  <is_foundational>${tool.isFoundational}</is_foundational>
</tool>`.trim();
}

/**
 * Builds the main AI prompt with XML structure
 */
function buildPrompt(curatedTools: CuratedToolList, analysis: ProblemAnalysisResult): string {
  const formattedTools = curatedTools.tools.map(formatTool).join("\n\n");

  return `
<problem_context>
  <user_query>${analysis.query}</user_query>
  <complexity>${analysis.complexity}</complexity>
  <urgency>${analysis.urgency}</urgency>
  <key_characteristics>${formatCharacteristics(analysis)}</key_characteristics>
  <language>${analysis.language}</language>
</problem_context>

<selected_tools>
${formattedTools}
</selected_tools>

<task>
Generate a comprehensive action roadmap that helps the user solve their problem using these thinking tools.

For each tool, provide:
1. Why this tool helps with this specific problem (whyNow)
2. How to apply it immediately with concrete steps (howToApply)
3. What to watch out for - common mistakes and pitfalls (watchOutFor)  
4. Expected outcome from using this tool (expectedOutcome)

Structure the roadmap in problem-solving sequence:
1. Problem Definition Phase - clarify and understand the problem
2. Analysis Phase - investigate and break down the problem
3. Solution Generation Phase - create and explore options
4. Decision Phase - evaluate and choose the best path
5. Validation Phase - test and verify the solution

Include:
- Executive summary (2-3 sentences explaining the overall approach)
- Quick-start checklist (5-7 immediate actionable items)
- Decision points where cognitive bias checking is critical
- Red flags to watch for that indicate problems with the approach
- Success indicators that show the approach is working

Focus on immediate applicability. Use concrete, specific language.
Make it actionable, not theoretical.
Address the user's specific problem context throughout.
Use concrete examples related to the user's problem when possible.
</task>

<output_format>
{
  "executiveSummary": "string, 2-3 sentences explaining the overall approach",
  "quickStartChecklist": [
    "string values, 5-7 immediate actionable items, format with Markdown",
  ],
  "decisionPointsForBiasChecking": [
    {
      "afterWhichPhase": number, // 1, 2, 3, 4, or 5
      "description": "string, 1-2 sentences",
      "biasesToCheck": [
        "string values, cognitive bias that might interfere here and how to mitigate it, format with Markdown",
      ]
    }
  ],
  "redFlags": [
    "string values, format with Markdown",
  ],
  "successIndicators": [
    "string values, format with Markdown",
  ],
  "roadmapPhases": [ // list of the 5 phases
    {
      "order": number, // 1, 2, 3, 4, or 5
      "phaseName": "string, name of the phase, without mentioning the 'phase' word or the order number",
      "description": "string, 1-3 sentences",
      "tools": [ // optional list of the used tools in the phase
        {
          "toolId": "string, the tool_id value",
          "subtitle": "string, the subtitle for using the tool, not necessarily mentioning its name",
          "whyNow": "string, why this tool helps with this specific problem, phrased as a short intro paragraph",
          "howToApply": [
            "string values, how to apply it immediately with concrete steps, format with Markdown"
          ],
          "watchOutFor": [
            "string values, what to watch out for - common mistakes and pitfalls, format with Markdown"
          ],
          "expectedOutcome": "string, expected outcome from using this tool, format with Markdown if necessary"
        }
      ]
    }
  ]
}
</output_format>

${analysis.language !== "English" && "Please provide the output in naturally sound, grammarly perfect Hungarian."}
Phrase the output like you would speak to a close good friend.
`.trim();
}

/**
 * Builds the Zod validation schema
 */
function buildSchema(): z.ZodSchema<unknown> {
  return ActionRoadmapSchema;
}

/**
 * Estimates token count for the prompt (rough approximation)
 */
function estimateTokens(prompt: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  // Add some overhead for JSON structure and AI processing
  const baseTokens = Math.ceil(prompt.length / 4);
  const overheadMultiplier = 1.3; // 30% overhead for structure and processing

  return Math.ceil(baseTokens * overheadMultiplier);
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Generates a complete AI-ready prompt and validation schema for action roadmap creation
 *
 * @param curatedTools - The final curated and ordered list of tools
 * @param analysis - The original problem analysis results
 * @returns Complete prompt generation result with metadata
 * @throws PromptGenerationError if generation fails
 */
export function generatePromptAndSchema(
  curatedTools: CuratedToolList,
  analysis: ProblemAnalysisResult
): PromptGeneratorResult {
  try {
    // Validate inputs
    if (!curatedTools.tools || curatedTools.tools.length === 0) {
      throw new PromptGenerationError("Cannot generate prompt: no tools provided", {
        phase: "roadmap-prompt-generation",
        toolCount: 0,
      });
    }

    if (!analysis.query || !analysis.query.trim()) {
      throw new PromptGenerationError("Cannot generate prompt: no query provided", {
        phase: "roadmap-prompt-generation",
        query: analysis.query,
      });
    }

    // Generate prompt and schema
    const prompt = buildPrompt(curatedTools, analysis);
    const schema = buildSchema();
    const estimatedTokens = estimateTokens(prompt);

    // Validate prompt length (reasonable limits)
    const MAX_TOKENS = 8000; // Conservative limit for most AI models
    if (estimatedTokens > MAX_TOKENS) {
      throw new PromptGenerationError(
        `Generated prompt too long: ${estimatedTokens} tokens (max: ${MAX_TOKENS})`,
        {
          phase: "roadmap-prompt-generation",
          estimatedTokens,
          toolCount: curatedTools.tools.length,
        }
      );
    }

    return {
      prompt,
      schema,
      metadata: {
        toolCount: curatedTools.tools.length,
        estimatedTokens,
        complexity: analysis.complexity,
        urgency: analysis.urgency,
      },
    };
  } catch (error) {
    if (error instanceof PromptGenerationError) {
      throw error;
    }

    throw new PromptGenerationError(
      `Prompt generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      {
        phase: "roadmap-prompt-generation",
        originalError: error,
        toolCount: curatedTools?.tools?.length || 0,
      }
    );
  }
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export { ActionRoadmapSchema, ToolApplicationSchema, PhaseSchema, DecisionPointSchema };

export type { PromptGeneratorResult } from "./types";
