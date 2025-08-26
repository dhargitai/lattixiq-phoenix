/**
 * Score Calculator Module for Action Roadmap Preparator
 *
 * This module implements the core innovation of dynamic scoring that adjusts
 * weights based on problem urgency, complexity, and emotional content.
 * Tools are ranked by immediate applicability rather than learning value.
 */

import type {
  ToolSearchResult,
  ProblemAnalysisResult,
  ScoredTool,
  ScoreBreakdown,
  ToolType,
  ProblemUrgency,
} from "./types";

// ============================================================================
// SCORING WEIGHT PROFILES
// ============================================================================

/**
 * Weight profiles that adjust scoring based on problem urgency
 */
const WEIGHT_PROFILES = {
  immediate: {
    directRelevance: 0.45,
    applicabilityNow: 0.25,
    foundationalValue: 0.1,
    simplicityBonus: 0.15,
    typeBalance: 0.05,
  },
  "short-term": {
    directRelevance: 0.45,
    applicabilityNow: 0.2,
    foundationalValue: 0.15,
    simplicityBonus: 0.1,
    typeBalance: 0.1,
  },
  "long-term": {
    directRelevance: 0.4,
    applicabilityNow: 0.15,
    foundationalValue: 0.25,
    simplicityBonus: 0.05,
    typeBalance: 0.15,
  },
} as const;

/**
 * Type distribution ratios for balanced tool selection
 */
interface TypeRatios {
  "mental-model": number;
  "cognitive-bias": number;
  fallacy: number;
  "general-concept": number;
}

/**
 * Target type ratios based on problem characteristics
 */
const TARGET_TYPE_RATIOS: Record<string, TypeRatios> = {
  analytical: {
    "mental-model": 0.5,
    "cognitive-bias": 0.2,
    fallacy: 0.15,
    "general-concept": 0.15,
  },
  emotional: {
    "mental-model": 0.3,
    "cognitive-bias": 0.4,
    fallacy: 0.2,
    "general-concept": 0.1,
  },
  strategic: {
    "mental-model": 0.6,
    "cognitive-bias": 0.15,
    fallacy: 0.1,
    "general-concept": 0.15,
  },
  creative: {
    "mental-model": 0.45,
    "cognitive-bias": 0.25,
    fallacy: 0.1,
    "general-concept": 0.2,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate current type counts from a selection of tools
 */
function getCurrentTypeCounts(tools: ScoredTool[]): TypeRatios {
  const counts: TypeRatios = {
    "mental-model": 0,
    "cognitive-bias": 0,
    fallacy: 0,
    "general-concept": 0,
  };

  tools.forEach((tool) => {
    counts[tool.type]++;
  });

  return counts;
}

/**
 * Determine target type ratios based on problem characteristics
 */
function getTargetTypeRatios(analysis: ProblemAnalysisResult): TypeRatios {
  const { problemNature } = analysis;

  // Find the dominant characteristic
  const maxCharacteristic = Object.entries(problemNature).reduce(
    (max, [key, value]) => (value > max.value ? { key, value } : max),
    { key: "", value: 0 }
  );

  return TARGET_TYPE_RATIOS[maxCharacteristic.key] || TARGET_TYPE_RATIOS.analytical;
}

/**
 * Calculate type balance bonus for a tool (improved version)
 */
function calculateTypeBalanceImproved(
  tool: ToolSearchResult,
  currentSelection: ScoredTool[],
  targetRatios: TypeRatios
): number {
  // For first tool, give base score based on target alignment
  if (currentSelection.length === 0) {
    const maxTargetType = Object.entries(targetRatios).reduce(
      (max, [key, value]) => (value > max.value ? { key: key as ToolType, value } : max),
      { key: "mental-model" as ToolType, value: 0 }
    );

    return tool.type === maxTargetType.key ? 0.8 : 0.3;
  }

  // Calculate current actual counts
  const currentCounts = getCurrentTypeCounts(currentSelection);
  const totalCurrent = currentSelection.length;

  // Calculate current ratios
  const currentRatios: TypeRatios = {
    "mental-model": currentCounts["mental-model"] / totalCurrent,
    "cognitive-bias": currentCounts["cognitive-bias"] / totalCurrent,
    fallacy: currentCounts["fallacy"] / totalCurrent,
    "general-concept": currentCounts["general-concept"] / totalCurrent,
  };

  // Calculate hypothetical ratios after adding this tool
  const newTotal = totalCurrent + 1;
  const hypotheticalRatios: TypeRatios = {
    "mental-model": currentCounts["mental-model"] / newTotal,
    "cognitive-bias": currentCounts["cognitive-bias"] / newTotal,
    fallacy: currentCounts["fallacy"] / newTotal,
    "general-concept": currentCounts["general-concept"] / newTotal,
  };

  // Add the new tool
  hypotheticalRatios[tool.type] += 1 / newTotal;

  // Calculate overall deviation from target before and after
  const currentDeviation = Object.keys(targetRatios).reduce((sum, key) => {
    const typeKey = key as ToolType;
    return sum + Math.abs(currentRatios[typeKey] - targetRatios[typeKey]);
  }, 0);

  const newDeviation = Object.keys(targetRatios).reduce((sum, key) => {
    const typeKey = key as ToolType;
    return sum + Math.abs(hypotheticalRatios[typeKey] - targetRatios[typeKey]);
  }, 0);

  // Return improvement in balance (higher is better)
  const improvement = currentDeviation - newDeviation;
  return Math.max(0.1, Math.min(1, improvement * 2 + 0.5)); // Scale and add base bonus
}

/**
 * Calculate simplicity score based on content characteristics
 */
function calculateSimplicityScore(tool: ToolSearchResult): number {
  let score = 0.3; // Base simplicity score

  // Shorter definitions are simpler
  if (tool.definition) {
    const { length } = tool.definition;
    const lengthBonus = Math.max(0, (500 - length) / 1500); // Max 0.33 bonus for very short definitions
    score += lengthBonus;
  }

  // Tools with clear examples are simpler (scaled down)
  if (tool.classic_example || tool.modern_example) {
    score += 0.15;
  }

  // Visual metaphors make concepts simpler (scaled down)
  if (tool.visual_metaphor) {
    score += 0.1;
  }

  // Key takeaway indicates clarity (scaled down)
  if (tool.key_takeaway) {
    score += 0.08;
  }

  return Math.min(0.95, score); // Cap at 0.95 to allow for differences
}

/**
 * Calculate foundational value score
 */
function calculateFoundationalValue(tool: ToolSearchResult): number {
  let score = 0.3; // Base foundational value

  // Super models get maximum foundational value
  if (tool.super_model) {
    score = 1.0;
  } else {
    // Mental models are generally more foundational
    if (tool.type === "mental-model") {
      score += 0.3;
    }

    // Tools with deep mechanisms are foundational
    if (tool.dive_deeper_mechanism) {
      score += 0.2;
    }

    // Tools with origin stories indicate fundamental concepts
    if (tool.dive_deeper_origin_story) {
      score += 0.1;
    }
  }

  return Math.min(1.0, score);
}

/**
 * Calculate applicability now score
 */
function calculateApplicabilityNow(
  tool: ToolSearchResult,
  analysis: ProblemAnalysisResult
): number {
  let score = tool.similarity; // Start with semantic similarity

  // Adjust based on problem urgency
  if (analysis.urgency === "immediate") {
    // Favor tools with clear, modern examples
    if (tool.modern_example) score += 0.2;
    if (tool.classic_example) score += 0.1;

    // Favor tools with clear payoffs
    if (tool.payoff) score += 0.15;
  }

  // Adjust based on tool type and problem nature
  const { problemNature } = analysis;

  if (problemNature.emotional > 0.7 && tool.type === "cognitive-bias") {
    score += 0.3; // Bias tools are immediately applicable for emotional problems
  }

  if (problemNature.analytical > 0.7 && tool.type === "mental-model") {
    score += 0.2; // Mental models for analytical problems
  }

  return Math.min(1.0, score);
}

/**
 * Calculate urgency-based adjustment
 */
function calculateUrgencyAdjustment(
  tool: ToolSearchResult,
  analysis: ProblemAnalysisResult
): number {
  const { urgency, complexity } = analysis;
  let adjustment = 0;

  if (urgency === "immediate") {
    // Boost simple, actionable tools
    const simplicityScore = calculateSimplicityScore(tool);
    adjustment += (simplicityScore - 0.5) * 0.4; // Range: -0.2 to +0.2

    // Reduce complex foundational tools
    if (tool.super_model && complexity === "simple") {
      adjustment -= 0.1;
    }
  } else if (urgency === "long-term") {
    // Boost foundational tools for strategic problems
    const foundationalValue = calculateFoundationalValue(tool);
    adjustment += (foundationalValue - 0.5) * 0.3; // Range: -0.15 to +0.15
  }

  return Math.max(-0.2, Math.min(0.2, adjustment));
}

/**
 * Calculate emotional content adjustment
 */
function calculateEmotionalAdjustment(
  tool: ToolSearchResult,
  analysis: ProblemAnalysisResult
): number {
  const { problemNature } = analysis;
  let adjustment = 0;

  if (problemNature.emotional > 0.6) {
    // Boost bias-detection tools for emotional problems
    if (tool.type === "cognitive-bias") {
      adjustment += 0.3;
    }

    // Boost fallacy detection for emotional reasoning
    if (tool.type === "fallacy") {
      adjustment += 0.2;
    }

    // Slightly reduce pure analytical tools
    if (tool.type === "mental-model" && tool.main_category === "Core Sciences & Mathematics") {
      adjustment -= 0.1;
    }
  }

  return Math.max(-0.2, Math.min(0.2, adjustment));
}

// ============================================================================
// CORE SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate detailed score breakdown for a single tool
 */
function calculateToolScore(
  tool: ToolSearchResult,
  analysis: ProblemAnalysisResult,
  currentSelection: ScoredTool[] = []
): ScoreBreakdown {
  const targetRatios = getTargetTypeRatios(analysis);

  return {
    directRelevance: tool.similarity,
    applicabilityNow: calculateApplicabilityNow(tool, analysis),
    foundationalValue: calculateFoundationalValue(tool),
    simplicityBonus: calculateSimplicityScore(tool),
    typeBalanceBonus: calculateTypeBalanceImproved(tool, currentSelection, targetRatios),
    urgencyAdjustment: calculateUrgencyAdjustment(tool, analysis),
    emotionalAdjustment: calculateEmotionalAdjustment(tool, analysis),
  };
}

/**
 * Compute final weighted score from score breakdown
 */
function computeFinalScore(scores: ScoreBreakdown, urgency: ProblemUrgency): number {
  const weights = WEIGHT_PROFILES[urgency];

  const baseScore =
    scores.directRelevance * weights.directRelevance +
    scores.applicabilityNow * weights.applicabilityNow +
    scores.foundationalValue * weights.foundationalValue +
    scores.simplicityBonus * weights.simplicityBonus +
    scores.typeBalanceBonus * weights.typeBalance;

  // Apply adjustments
  const adjustedScore = baseScore + scores.urgencyAdjustment + scores.emotionalAdjustment;

  // Ensure score is in valid range
  return Math.max(0, Math.min(1.0, adjustedScore));
}

// ============================================================================
// MAIN EXPORT FUNCTIONS
// ============================================================================

/**
 * Calculate scores for all tools based on problem analysis
 *
 * @param tools - Array of tools found through search
 * @param analysis - Complete problem analysis result
 * @param currentSelection - Currently selected tools for type balance
 * @returns Array of tools with calculated scores
 */
export function calculateScores(
  tools: ToolSearchResult[],
  analysis: ProblemAnalysisResult,
  currentSelection: ScoredTool[] = []
): ScoredTool[] {
  return tools.map((tool) => {
    const scores = calculateToolScore(tool, analysis, currentSelection);
    const finalScore = computeFinalScore(scores, analysis.urgency);

    return {
      ...tool,
      scores,
      finalScore,
      isFoundational: tool.super_model || false,
      complexityScore: 1 - calculateSimplicityScore(tool), // Inverse of simplicity
    };
  });
}

/**
 * Calculate incremental score for a single tool (for dynamic selection)
 *
 * @param tool - Tool to score
 * @param analysis - Problem analysis
 * @param currentSelection - Current selection for context
 * @returns Single scored tool
 */
export function calculateIncrementalScore(
  tool: ToolSearchResult,
  analysis: ProblemAnalysisResult,
  currentSelection: ScoredTool[]
): ScoredTool {
  const scores = calculateToolScore(tool, analysis, currentSelection);
  const finalScore = computeFinalScore(scores, analysis.urgency);

  return {
    ...tool,
    scores,
    finalScore,
    isFoundational: tool.super_model || false,
    complexityScore: 1 - calculateSimplicityScore(tool),
  };
}

/**
 * Export weight profiles for testing and configuration
 */
export const weightProfiles = WEIGHT_PROFILES;

/**
 * Export target type ratios for testing
 */
export const targetTypeRatios = TARGET_TYPE_RATIOS;
