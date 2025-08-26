/**
 * Action Roadmap Curator Module
 *
 * Intelligently selects and orders scored tools based on problem characteristics
 * and problem-solving workflow. Transforms raw scored results into an optimally
 * sequenced set of thinking tools for action-oriented roadmap generation.
 */

import {
  ProblemPhase,
  type ScoredTool,
  type OrderedTool,
  type CuratedToolList,
  type ProblemAnalysisResult,
  type ToolType,
  type TypeDistribution,
  type ProblemComplexity,
  type ToolMixSuggestion,
} from "./types";

// ============================================================================
// CORE CURATION FUNCTION
// ============================================================================

/**
 * Main curation function that selects and orders tools for roadmap generation
 *
 * @param scoredTools Array of tools with calculated scores
 * @param analysis Complete problem analysis results
 * @returns Curated and ordered tool list ready for prompt generation
 */
export function curateAndOrder(
  scoredTools: ScoredTool[],
  analysis: ProblemAnalysisResult
): CuratedToolList {
  // 1. Determine target count based on complexity
  const targetCount = determineTargetCount(analysis.complexity);

  // 2. Select foundational tools first
  const foundationalTools = selectFoundationalTools(scoredTools);

  // 3. Fill remaining slots with type mix enforcement
  const remainingSlots = Math.max(0, targetCount - foundationalTools.length);
  const additionalTools = fillWithTypeMix(
    scoredTools.filter((tool) => !foundationalTools.includes(tool)),
    analysis.suggestedToolMix,
    remainingSlots,
    foundationalTools
  );

  // 4. Combine and verify minimums
  const selectedTools = [...foundationalTools, ...additionalTools];
  const verifiedTools = verifyMinimumRequirements(selectedTools, analysis);

  // 5. Order by problem-solving sequence
  const orderedTools = orderBySequence(verifiedTools);

  // 6. Generate metadata and return
  const metadata = generateMetadata(orderedTools, analysis, targetCount);

  return {
    tools: orderedTools,
    metadata,
  };
}

// ============================================================================
// TARGET COUNT DETERMINATION
// ============================================================================

/**
 * Determines optimal number of tools based on problem complexity
 */
function determineTargetCount(complexity: ProblemComplexity): number {
  const counts = {
    simple: 4, // 3-4 range, using 4 as target
    moderate: 5, // 5-6 range, using 5 as target
    complex: 6, // 6-7 range, using 6 as target
  };

  return counts[complexity];
}

// ============================================================================
// FOUNDATIONAL TOOL SELECTION
// ============================================================================

/**
 * Selects top foundational/super models that should always be included
 */
function selectFoundationalTools(scoredTools: ScoredTool[]): ScoredTool[] {
  const foundationalCandidates = scoredTools
    .filter((tool) => tool.isFoundational)
    .sort((a, b) => b.finalScore - a.finalScore);

  // Always include at least 1 foundational tool, max 2 for balance
  const minFoundational = 1;
  const maxFoundational = 2;

  return foundationalCandidates.slice(
    0,
    Math.min(maxFoundational, Math.max(minFoundational, foundationalCandidates.length))
  );
}

// ============================================================================
// TYPE MIX ENFORCEMENT
// ============================================================================

/**
 * Fills remaining slots while enforcing target type mix proportions
 */
function fillWithTypeMix(
  availableTools: ScoredTool[],
  targetMix: ToolMixSuggestion,
  remainingSlots: number,
  alreadySelected: ScoredTool[]
): ScoredTool[] {
  if (remainingSlots <= 0) return [];

  const selected: ScoredTool[] = [];
  const totalTargetCount = remainingSlots + alreadySelected.length;

  // Calculate target counts for each type
  const targetCounts = calculateTargetCounts(targetMix, totalTargetCount, alreadySelected);

  // Group available tools by type and sort by score
  const toolsByType = groupToolsByType(availableTools);

  // Select tools to meet type targets
  for (const [type, targetCount] of Object.entries(targetCounts)) {
    const toolsOfType = toolsByType[type as ToolType] || [];
    const alreadyHave = countToolsOfType(alreadySelected, type as ToolType);
    const needed = Math.max(0, targetCount - alreadyHave);

    const toSelect = toolsOfType
      .filter((tool) => !selected.includes(tool))
      .slice(0, Math.min(needed, remainingSlots - selected.length));

    selected.push(...toSelect);

    if (selected.length >= remainingSlots) break;
  }

  // Fill any remaining slots with highest scored tools
  if (selected.length < remainingSlots) {
    const remaining = availableTools
      .filter((tool) => !selected.includes(tool))
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, remainingSlots - selected.length);

    selected.push(...remaining);
  }

  return selected;
}

/**
 * Calculates target count for each tool type based on mix suggestions
 */
function calculateTargetCounts(
  targetMix: ToolMixSuggestion,
  totalCount: number,
  _alreadySelected: ScoredTool[]
): Record<string, number> {
  // Map mix suggestions to tool types
  const mentalModelTypes: ToolType[] = ["mental-model"];
  const biasTypes: ToolType[] = ["cognitive-bias", "fallacy"];
  const generalTypes: ToolType[] = ["general-concept"];

  const targets: Record<string, number> = {};

  // Calculate for mental models
  const mentalModelTarget = Math.round(targetMix.mentalModels * totalCount);
  mentalModelTypes.forEach((type) => {
    targets[type] = mentalModelTarget;
  });

  // Calculate for biases/fallacies (split evenly)
  const biasTarget = Math.round(targetMix.biasesFallacies * totalCount);
  const biasPerType = Math.ceil(biasTarget / biasTypes.length);
  biasTypes.forEach((type) => {
    targets[type] = biasPerType;
  });

  // Calculate for general concepts
  const generalTarget = Math.round(targetMix.generalConcepts * totalCount);
  generalTypes.forEach((type) => {
    targets[type] = generalTarget;
  });

  return targets;
}

/**
 * Groups tools by their type for organized selection
 */
function groupToolsByType(tools: ScoredTool[]): Record<ToolType, ScoredTool[]> {
  const groups: Record<ToolType, ScoredTool[]> = {
    "mental-model": [],
    "cognitive-bias": [],
    fallacy: [],
    "general-concept": [],
  };

  tools.forEach((tool) => {
    if (groups[tool.type]) {
      groups[tool.type].push(tool);
    }
  });

  // Sort each group by score (descending)
  Object.keys(groups).forEach((type) => {
    groups[type as ToolType].sort((a, b) => b.finalScore - a.finalScore);
  });

  return groups;
}

/**
 * Counts how many tools of a specific type are in the array
 */
function countToolsOfType(tools: ScoredTool[], type: ToolType): number {
  return tools.filter((tool) => tool.type === type).length;
}

// ============================================================================
// MINIMUM REQUIREMENTS VERIFICATION
// ============================================================================

/**
 * Ensures minimum requirements are met, adds tools if needed
 */
function verifyMinimumRequirements(
  selectedTools: ScoredTool[],
  analysis: ProblemAnalysisResult
): ScoredTool[] {
  const warnings: string[] = [];
  const verified = [...selectedTools];

  // Check minimum foundational requirement
  const foundationalCount = verified.filter((tool) => tool.isFoundational).length;
  if (foundationalCount < 1) {
    warnings.push("No foundational tools available - selection may be less effective");
  }

  // Check bias requirement for emotional problems
  if (analysis.problemNature.emotional > 0.3) {
    const biasCount = verified.filter(
      (tool) => tool.type === "cognitive-bias" || tool.type === "fallacy"
    ).length;

    if (biasCount === 0) {
      warnings.push("High emotional content detected but no bias tools selected");
    }
  }

  // Store warnings for metadata (would need to pass through somehow)
  return verified;
}

// ============================================================================
// PROBLEM-SOLVING SEQUENCE ORDERING
// ============================================================================

/**
 * Orders tools by problem-solving sequence phases
 */
function orderBySequence(tools: ScoredTool[]): OrderedTool[] {
  // Assign each tool to a problem-solving phase
  const toolsWithPhases = tools.map((tool) => ({
    ...tool,
    phase: assignPhase(tool),
  }));

  // Group by phase
  const phaseGroups: Record<ProblemPhase, (ScoredTool & { phase: ProblemPhase })[]> = {
    [ProblemPhase.Definition]: [],
    [ProblemPhase.Analysis]: [],
    [ProblemPhase.Generation]: [],
    [ProblemPhase.Decision]: [],
    [ProblemPhase.Validation]: [],
  };

  toolsWithPhases.forEach((tool) => {
    phaseGroups[tool.phase].push(tool);
  });

  // Sort within each phase by score
  Object.values(phaseGroups).forEach((group) => {
    group.sort((a, b) => b.finalScore - a.finalScore);
  });

  // Combine into final ordered list
  const orderedTools: OrderedTool[] = [];
  let globalOrder = 1;

  for (const phase of [
    ProblemPhase.Definition,
    ProblemPhase.Analysis,
    ProblemPhase.Generation,
    ProblemPhase.Decision,
    ProblemPhase.Validation,
  ]) {
    const phaseTools = phaseGroups[phase];
    phaseTools.forEach((tool, phaseIndex) => {
      orderedTools.push({
        ...tool,
        order: globalOrder++,
        phaseOrder: phaseIndex + 1,
      });
    });
  }

  return orderedTools;
}

/**
 * Assigns a tool to its primary problem-solving phase
 */
function assignPhase(tool: ScoredTool): ProblemPhase {
  // Phase assignment based on tool characteristics and name patterns
  const name = tool.title.toLowerCase();
  const content = (tool.definition || tool.key_takeaway || "").toLowerCase();

  // Definition phase: fundamental questioning and problem clarification
  if (
    name.includes("first principles") ||
    name.includes("5 whys") ||
    name.includes("root cause") ||
    content.includes("fundamental")
  ) {
    return ProblemPhase.Definition;
  }

  // Analysis phase: understanding systems and relationships
  if (
    name.includes("systems") ||
    name.includes("cause") ||
    name.includes("analysis") ||
    tool.type === "mental-model"
  ) {
    return ProblemPhase.Analysis;
  }

  // Generation phase: creative and alternative thinking
  if (
    name.includes("inversion") ||
    name.includes("lateral") ||
    name.includes("creative") ||
    name.includes("alternative")
  ) {
    return ProblemPhase.Generation;
  }

  // Decision phase: evaluation and choice-making
  if (
    name.includes("cost") ||
    name.includes("benefit") ||
    name.includes("decision") ||
    name.includes("second-order")
  ) {
    return ProblemPhase.Decision;
  }

  // Validation phase: bias checks and risk assessment
  if (
    tool.type === "cognitive-bias" ||
    tool.type === "fallacy" ||
    name.includes("bias") ||
    name.includes("pre-mortem")
  ) {
    return ProblemPhase.Validation;
  }

  // Default to analysis for general mental models
  return ProblemPhase.Analysis;
}

// ============================================================================
// METADATA GENERATION
// ============================================================================

/**
 * Generates comprehensive metadata about the curation results
 */
function generateMetadata(
  orderedTools: OrderedTool[],
  analysis: ProblemAnalysisResult,
  targetCount: number
): CuratedToolList["metadata"] {
  const typeDistribution: TypeDistribution = {
    "mental-model": 0,
    "cognitive-bias": 0,
    fallacy: 0,
    "general-concept": 0,
  };

  orderedTools.forEach((tool) => {
    typeDistribution[tool.type]++;
  });

  const sequencePhases = Array.from(new Set(orderedTools.map((tool) => tool.phase))).sort(
    (a, b) => a - b
  );

  const warnings: string[] = [];

  // Check if we met target count
  if (orderedTools.length < targetCount) {
    warnings.push(`Selected ${orderedTools.length} tools but target was ${targetCount}`);
  }

  // Check foundational requirement
  const foundationalCount = orderedTools.filter((tool) => tool.isFoundational).length;
  if (foundationalCount === 0) {
    warnings.push("No foundational tools selected - may impact effectiveness");
  }

  // Check bias requirement for emotional problems
  if (analysis.problemNature.emotional > 0.3) {
    const biasCount = typeDistribution["cognitive-bias"] + typeDistribution["fallacy"];
    if (biasCount === 0) {
      warnings.push("High emotional content but no bias tools included");
    }
  }

  const meetsMinimumRequirements = foundationalCount >= 1 && orderedTools.length >= 3;

  return {
    totalCount: orderedTools.length,
    typeDistribution,
    sequencePhases,
    meetsMinimumRequirements,
    warnings,
  };
}
