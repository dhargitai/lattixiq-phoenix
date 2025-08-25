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
    content.mainCategory ? `Main Category: ${content.mainCategory}` : "",
    content.subcategory ? `Subcategory: ${content.subcategory}` : "",
    // Super model emphasis - important for matching
    content.superModel
      ? "Super Model: This is a foundational super model with broad applicability across many domains"
      : "",
    content.type ? `Type: ${content.type}` : "",
    content.definition ? `Definition: ${content.definition}` : "",
    content.classicExample ? `Classic Example: ${content.classicExample}` : "",
    content.modernExample ? `Modern Example: ${content.modernExample}` : "",
    content.pitfall ? `Pitfall: ${content.pitfall}` : "",
    content.payoff ? `Payoff: ${content.payoff}` : "",
    content.diveDeeperMechanism ? `How It Works: ${content.diveDeeperMechanism}` : "",
    content.diveDeeperOriginStory ? `Origin Story: ${content.diveDeeperOriginStory}` : "",
    content.diveDeeperPitfallsNuances
      ? `Advanced Understanding: ${content.diveDeeperPitfallsNuances}`
      : "",
    content.extraContent ? `Additional Content: ${content.extraContent}` : "",
    content.problemCategory?.length ? `Problem Category: ${content.problemCategory.join(", ")}` : "",
    content.targetPersona?.length ? `Target Persona: ${content.targetPersona.join(", ")}` : "",
    content.startupPhase?.length ? `Startup Phase: ${content.startupPhase.join(", ")}` : "",
  ];

  return parts.filter(Boolean).join("\n\n");
}
