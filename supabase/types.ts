import type { Tables, TablesInsert, TablesUpdate, Enums } from "./database.types";

// Table Row Types
export type User = Tables<"users">;
export type KnowledgeContent = Tables<"knowledge_content">;
export type Session = Tables<"sessions">;
export type Message = Tables<"messages">;
export type FrameworkSelection = Tables<"framework_selections">;
export type SessionArtifact = Tables<"session_artifacts">;
export type PhaseTransition = Tables<"phase_transitions">;
export type MessageEmbedding = Tables<"message_embeddings">;
export type ContentBlock = Tables<"content_blocks">;
export type UserSubscription = Tables<"user_subscriptions">;

// Insert Types
export type UserInsert = TablesInsert<"users">;
export type KnowledgeContentInsert = TablesInsert<"knowledge_content">;
export type SessionInsert = TablesInsert<"sessions">;
export type MessageInsert = TablesInsert<"messages">;
export type FrameworkSelectionInsert = TablesInsert<"framework_selections">;
export type SessionArtifactInsert = TablesInsert<"session_artifacts">;
export type PhaseTransitionInsert = TablesInsert<"phase_transitions">;
export type MessageEmbeddingInsert = TablesInsert<"message_embeddings">;
export type ContentBlockInsert = TablesInsert<"content_blocks">;
export type UserSubscriptionInsert = TablesInsert<"user_subscriptions">;

// Update Types
export type UserUpdate = TablesUpdate<"users">;
export type KnowledgeContentUpdate = TablesUpdate<"knowledge_content">;
export type SessionUpdate = TablesUpdate<"sessions">;
export type MessageUpdate = TablesUpdate<"messages">;
export type FrameworkSelectionUpdate = TablesUpdate<"framework_selections">;
export type SessionArtifactUpdate = TablesUpdate<"session_artifacts">;
export type PhaseTransitionUpdate = TablesUpdate<"phase_transitions">;
export type MessageEmbeddingUpdate = TablesUpdate<"message_embeddings">;
export type ContentBlockUpdate = TablesUpdate<"content_blocks">;
export type UserSubscriptionUpdate = TablesUpdate<"user_subscriptions">;

// Enum Types
export type AIModelType = Enums<"ai_model_type">;
export type ArtifactType = Enums<"artifact_type">;
export type KnowledgeContentType = Enums<"knowledge_content_type">;
export type MainCategory = Enums<"main_category">;
export type MessageRole = Enums<"message_role">;
export type PhoenixPhase = Enums<"phoenix_phase">;
export type ProblemCategory = Enums<"problem_category">;
export type SessionStatus = Enums<"session_status">;
export type StartupPhase = Enums<"startup_phase">;
export type Subcategory = Enums<"subcategory">;
export type TargetPersona = Enums<"target_persona">;

export function isValidKnowledgeContentType(type: string): type is KnowledgeContentType {
  return KNOWLEDGE_CONTENT_TYPES.includes(type as KnowledgeContentType);
}

// Helper to handle nullable fields
export function ensureString(value: string | null, defaultValue: string = ""): string {
  return value ?? defaultValue;
}

export function ensureArray<T>(value: T[] | null, defaultValue: T[] = []): T[] {
  return value ?? defaultValue;
}

// Constants for easy reference
export const KNOWLEDGE_CONTENT_TYPES = [
  "mental-model",
  "cognitive-bias", 
  "fallacy", 
  "strategic-framework", 
  "tactical-tool"
] as const;

export const TARGET_PERSONAS = [
  "founder", 
  "executive", 
  "investor", 
  "product_manager"
] as const;

export const STARTUP_PHASES = [
  "ideation", 
  "seed", 
  "growth", 
  "scale-up", 
  "crisis"
] as const;

export const PROBLEM_CATEGORIES = [
  "pivot", "hiring", "fundraising", "co-founder_conflict", "product-market_fit",
  "go-to-market", "team_and_culture", "operations", "competitive_strategy",
  "pricing", "risk_management"
] as const;

// Validation helpers
export function isValidMainCategory(category: string): category is MainCategory {
  return [
    "Core Sciences & Mathematics",
    "Biology & Evolution",
    "Psychology & Human Behavior",
    "Thinking & Learning Processes",
    "Human Systems & Strategy"
  ].includes(category);
}

export function isValidTargetPersona(persona: string): persona is TargetPersona {
  return TARGET_PERSONAS.includes(persona as TargetPersona);
}

export function isValidStartupPhase(phase: string): phase is StartupPhase {
  return STARTUP_PHASES.includes(phase as StartupPhase);
}

export function isValidProblemCategory(category: string): category is ProblemCategory {
  return PROBLEM_CATEGORIES.includes(category as ProblemCategory);
}
