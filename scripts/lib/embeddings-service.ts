import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";
// I want to import knowledge content type from ./supabase/types.ts
import type { KnowledgeContent } from "../../supabase/types";

export interface EmbeddingInput {
  id: string;
  text: string;
}

export interface EmbeddingResult {
  id: string;
  embedding: number[];
}

/**
 * Generates embeddings for a single text input using OpenAI's text-embedding-3-small model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: text,
  });

  return embedding;
}

/**
 * Generates embeddings for multiple texts in a batch (more efficient)
 */
export async function generateEmbeddings(inputs: EmbeddingInput[]): Promise<EmbeddingResult[]> {
  const texts = inputs.map((input) => input.text);

  const { embeddings } = await embedMany({
    model: openai.embedding("text-embedding-3-small"),
    values: texts,
  });

  return inputs.map((input, index) => ({
    id: input.id,
    embedding: embeddings[index],
  }));
}

/**
 * Interface for the new "Crystallize & Apply" knowledge content structure
 */
export interface CrystallizeApplyContent {
  knowledge_piece_name: string;
  main_category: string;
  subcategory: string;
  hook?: string;
  definition?: string;
  analogy_or_metaphor?: string;
  key_takeaway?: string;
  classic_example?: string;
  modern_example?: string;
  pitfall?: string;
  payoff?: string;
  visual_metaphor?: string;
  dive_deeper_mechanism?: string;
  dive_deeper_origin_story?: string;
  dive_deeper_pitfalls_nuances?: string;
  super_model?: boolean;
  extra_content?: string;
}

/**
 * Prepares knowledge content text for embedding by combining relevant fields
 * Focuses on core fields critical for decision-making semantic search
 */
export function prepareTextForEmbedding(content: KnowledgeContent): string {
  // Prioritize fields that are most important for semantic matching in decision contexts
  const parts = [
    // Core identity - highest priority
    content.title ? `Title: ${content.title}` : "",
    content.main_category ? `Main Category: ${content.main_category}` : "",
    content.subcategory ? `Subcategory: ${content.subcategory}` : "",
    content.type ? `Type: ${content.type}` : "",
    
    // Core understanding - high priority
    content.definition ? `Definition: ${content.definition}` : "",
    content.hook ? `Hook: ${content.hook}` : "",
    content.key_takeaway ? `Key Takeaway: ${content.key_takeaway}` : "",
    
    // Critical decision fields - high priority
    content.pitfall ? `Pitfall: ${content.pitfall}` : "",
    content.payoff ? `Payoff: ${content.payoff}` : "",
    
    // Targeting metadata - medium priority
    content.target_persona?.length ? `Target Persona: ${content.target_persona.join(", ")}` : "",
    content.startup_phase?.length ? `Startup Phase: ${content.startup_phase.join(", ")}` : "",
    content.problem_category?.length ? `Problem Categories: ${content.problem_category.join(", ")}` : "",
    
    // Additional context - lower priority
    content.extra_content ? `Extra Content: ${content.extra_content}` : "",
    content.super_model ? "Super Model: This is a foundational super model" : "",
  ];

  return parts.filter(Boolean).join("\n\n");
}

/**
 * Prepares "Crystallize & Apply" knowledge content text for embedding
 * This function combines the new structured fields with appropriate weighting
 * for optimal semantic search and matching
 */
export function prepareTextForCrystallizeApply(content: CrystallizeApplyContent): string {
  const parts = [
    // Core identity - highest priority
    content.knowledge_piece_name ? `Mental Model: ${content.knowledge_piece_name}` : "",
    content.main_category ? `Main Category: ${content.main_category}` : "",
    content.subcategory ? `Subcategory: ${content.subcategory}` : "",

    // Super model emphasis - important for matching
    content.super_model
      ? "Super Model: This is a foundational super model with broad applicability across many domains"
      : "",

    // Core learning content - high priority for semantic matching
    content.hook ? `Hook: ${content.hook}` : "",
    content.definition ? `Definition: ${content.definition}` : "",
    content.key_takeaway ? `Key Takeaway: ${content.key_takeaway}` : "",

    // Conceptual understanding - medium-high priority
    content.analogy_or_metaphor ? `Analogy: ${content.analogy_or_metaphor}` : "",
    content.visual_metaphor ? `Visual Concept: ${content.visual_metaphor}` : "",

    // Practical application - medium priority
    content.classic_example ? `Classic Example: ${content.classic_example}` : "",
    content.modern_example ? `Modern Example: ${content.modern_example}` : "",
    content.pitfall ? `Pitfall: ${content.pitfall}` : "",
    content.payoff ? `Payoff: ${content.payoff}` : "",

    // Deep understanding - lower priority but valuable for comprehensive matching
    content.dive_deeper_mechanism ? `How It Works: ${content.dive_deeper_mechanism}` : "",
    content.dive_deeper_origin_story ? `Origin Story: ${content.dive_deeper_origin_story}` : "",
    content.dive_deeper_pitfalls_nuances
      ? `Advanced Understanding: ${content.dive_deeper_pitfalls_nuances}`
      : "",

    // Additional content
    content.extra_content ? `Additional Content: ${content.extra_content}` : "",
  ];

  return parts.filter(Boolean).join("\n\n");
}
