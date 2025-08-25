import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";
import type { KnowledgeContent } from "@/lib/types/ai";

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
 * Prepares knowledge content text for embedding by combining relevant fields
 */
export function prepareTextForEmbedding(content: KnowledgeContent): string {
  // Combine all relevant text fields with appropriate weighting
  const parts = [
    content.title ? `Title: ${content.title}` : "",
    content.main_category ? `Main Category: ${content.main_category}` : "",
    content.subcategory ? `Subcategory: ${content.subcategory}` : "",
    // Super model emphasis - important for matching
    content.super_model
      ? "Super Model: This is a foundational super model with broad applicability across many domains"
      : "",
    content.type ? `Type: ${content.type}` : "",
    content.definition ? `Definition: ${content.definition}` : "",
    content.classic_example ? `Classic Example: ${content.classic_example}` : "",
    content.modern_example ? `Modern Example: ${content.modern_example}` : "",
    content.pitfall ? `Pitfall: ${content.pitfall}` : "",
    content.payoff ? `Payoff: ${content.payoff}` : "",
    content.dive_deeper_mechanism ? `How It Works: ${content.dive_deeper_mechanism}` : "",
    content.dive_deeper_origin_story ? `Origin Story: ${content.dive_deeper_origin_story}` : "",
    content.dive_deeper_pitfalls_nuances
      ? `Advanced Understanding: ${content.dive_deeper_pitfalls_nuances}`
      : "",
    content.extra_content ? `Additional Content: ${content.extra_content}` : "",
    content.problem_category?.length ? `Problem Category: ${content.problem_category.join(", ")}` : "",
    content.target_persona?.length ? `Target Persona: ${content.target_persona.join(", ")}` : "",
    content.startup_phase?.length ? `Startup Phase: ${content.startup_phase.join(", ")}` : "",
  ];

  return parts.filter(Boolean).join("\n\n");
}
