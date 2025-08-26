/**
 * Shared Types for Action Roadmap Preparator
 *
 * Self-contained type definitions copied from the main codebase to ensure
 * the action-roadmap module is completely independent.
 */

// ============================================================================
// LANGUAGE SUPPORT
// ============================================================================

/**
 * Supported languages in the knowledge base
 */
export const SUPPORTED_LANGUAGES = ["English", "Hungarian"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// ============================================================================
// DATABASE ENUMS (copied from database.types.ts)
// ============================================================================

export type KnowledgeContentType = "mental-model" | "cognitive-bias" | "fallacy";

export type MainCategory =
  | "Core Sciences & Mathematics"
  | "Biology & Evolution"
  | "Psychology & Human Behavior"
  | "Thinking & Learning Processes"
  | "Human Systems & Strategy";

export type Subcategory =
  | "Physics & Engineering"
  | "Mathematics & Statistics"
  | "Chemistry"
  | "Evolutionary Principles"
  | "Ecosystems & Systems Biology"
  | "Cognitive Biases"
  | "Social & Behavioral Psychology"
  | "Motivation & Human Drives"
  | "General Thinking Concepts"
  | "Problem Solving & Decision Making"
  | "Learning & Personal Growth"
  | "Communication & Persuasion"
  | "Logical Fallacies"
  | "Economics & Markets"
  | "Business & Management"
  | "Military & Competitive Strategy"
  | "Politics & Governance";

// ============================================================================
// KNOWLEDGE CONTENT STRUCTURE (copied from database.types.ts)
// ============================================================================

/**
 * Knowledge Content structure as stored in the database
 * This is the core data structure for mental models, biases, and concepts
 */
export interface KnowledgeContent {
  /** Unique identifier */
  id: string;

  /** Display title of the concept */
  title: string;

  /** Type classification */
  type: KnowledgeContentType;

  /** Main category classification */
  main_category: MainCategory | null;

  /** Subcategory classification */
  subcategory: Subcategory | null;

  /** Core definition */
  definition: string | null;

  /** Key takeaway message */
  key_takeaway: string | null;

  /** Attention-grabbing hook */
  hook: string | null;

  /** Analogies or metaphors */
  analogy_or_metaphor: string | null;

  /** Classic example */
  classic_example: string | null;

  /** Modern example */
  modern_example: string | null;

  /** Visual metaphor description */
  visual_metaphor: string | null;

  /** URL for visual metaphor */
  visual_metaphor_url: string | null;

  /** Benefits of understanding */
  payoff: string | null;

  /** Common pitfalls */
  pitfall: string | null;

  /** Deep dive into mechanism */
  dive_deeper_mechanism: string | null;

  /** Origin story */
  dive_deeper_origin_story: string | null;

  /** Pitfalls and nuances */
  dive_deeper_pitfalls_nuances: string | null;

  /** Additional content */
  extra_content: string | null;

  /** Vector embedding for similarity search */
  embedding: string | null;

  /** Language of the content */
  language: SupportedLanguage | null;

  /** Whether this is a foundational super model */
  super_model: boolean | null;
}
