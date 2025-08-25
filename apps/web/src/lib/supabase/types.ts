import type { Tables, TablesInsert, TablesUpdate, Enums } from "./database.types";
import type { User as CoreUser, KnowledgeContent as CoreKnowledgeContent } from "@phoenix/core";

// Table Row Types
export type User = Tables<"users">;
export type KnowledgeContent = Tables<"knowledge_content">;

// Core type exports for consistency
export { CoreUser, CoreKnowledgeContent };

// Insert Types
export type UserInsert = TablesInsert<"users">;
export type KnowledgeContentInsert = TablesInsert<"knowledge_content">;

// Update Types
export type UserUpdate = TablesUpdate<"users">;
export type KnowledgeContentUpdate = TablesUpdate<"knowledge_content">;

// Enum Types
export type AISentiment = Enums<"ai_sentiment">;
export type KnowledgeContentType = Enums<"knowledge_content_type">;
export type SubscriptionStatus = Enums<"subscription_status">;
export type TestimonialState = Enums<"testimonial_state">;


export function isValidKnowledgeContentType(type: string): type is KnowledgeContentType {
  return type === "mental-model" || type === "cognitive-bias" || type === "fallacy";
}

// Helper to handle nullable fields
export function ensureString(value: string | null, defaultValue: string = ""): string {
  return value ?? defaultValue;
}

export function ensureArray<T>(value: T[] | null, defaultValue: T[] = []): T[] {
  return value ?? defaultValue;
}
