/**
 * Model Finder Module for Action Roadmap Preparator
 *
 * Performs three parallel vector searches based on problem analysis results,
 * then merges and deduplicates to provide a comprehensive pool of candidate
 * thinking tools for scoring and curation.
 */

import type { ProblemAnalysisResult, ToolSearchResult } from "./types";
import { generateSearchEmbeddings } from "./services/embedding-service";
import { ActionRoadmapSupabaseService, type SearchResult } from "./services/supabase-service";

/**
 * Search configuration constants
 */
const SEARCH_LIMITS = {
  MENTAL_MODELS: 20,
  BIASES: 20,
  GENERAL: 20,
} as const;

const SIMILARITY_THRESHOLDS = {
  MENTAL_MODELS: 0.3,
  BIASES: 0.25, // Lower threshold for biases as they can be more nuanced
  GENERAL: 0.3,
} as const;

/**
 * Finds relevant thinking tools through targeted vector searches
 *
 * Performs three parallel searches:
 * 1. Mental models search - focused on frameworks and thinking tools
 * 2. Biases/fallacies search - focused on cognitive biases and logical fallacies
 * 3. General concepts search - broader conceptual knowledge
 *
 * Results are merged and deduplicated, with highest similarity scores preserved.
 * No caching is used to ensure fresh, contextual results for each problem analysis.
 *
 * @param analysis - Complete problem analysis result containing search queries
 * @returns Promise resolving to array of unique tools with metadata
 * @throws Error if any search operation fails or if no tools are found
 */
export async function findRelevantTools(
  analysis: ProblemAnalysisResult
): Promise<ToolSearchResult[]> {
  console.log(`[ModelFinder] Starting search for problem: "${analysis.query.slice(0, 100)}..."`);
  console.log(`[ModelFinder] Language: ${analysis.language}, Complexity: ${analysis.complexity}`);

  try {
    // Step 1: Load super models for the detected language
    const supabaseService = new ActionRoadmapSupabaseService();
    const { superModels } = await supabaseService.getSuperModels(analysis.language);
    console.log(`[ModelFinder] Loaded ${superModels.length} super models for ${analysis.language}`);

    // Step 2: Generate embeddings for all three search queries in parallel
    const searchQueries = [
      { query: analysis.searchQueries.mentalModels, purpose: "mental-models" as const },
      { query: analysis.searchQueries.biasesFallacies, purpose: "biases" as const },
      { query: analysis.searchQueries.generalConcepts, purpose: "general" as const },
    ];

    const embeddings = await generateSearchEmbeddings(searchQueries);
    console.log(`[ModelFinder] Generated ${embeddings.length} search embeddings`);

    // Step 3: Perform three parallel vector searches
    const searchPromises = embeddings.map(async ({ embedding, purpose }) => {
      const limit =
        SEARCH_LIMITS[
          purpose === "mental-models"
            ? "MENTAL_MODELS"
            : purpose === "biases"
              ? "BIASES"
              : "GENERAL"
        ];

      const threshold =
        SIMILARITY_THRESHOLDS[
          purpose === "mental-models"
            ? "MENTAL_MODELS"
            : purpose === "biases"
              ? "BIASES"
              : "GENERAL"
        ];

      // Determine subcategories based on search type
      let subcategories: string[] | undefined;
      if (purpose === "biases") {
        subcategories = ["Cognitive Biases", "Logical Fallacies"];
      }

      return supabaseService.searchKnowledgeContentByEmbedding(
        embedding,
        limit,
        threshold,
        analysis.language,
        purpose,
        subcategories
      );
    });

    const [mentalModelsResults, biasesResults, generalResults] = await Promise.all(searchPromises);

    console.log(
      `[ModelFinder] Search results - Mental Models: ${mentalModelsResults.length}, Biases: ${biasesResults.length}, General: ${generalResults.length}`
    );

    // Step 4: Merge and deduplicate results
    const mergedResults = mergeAndDeduplicateResults([
      ...mentalModelsResults,
      ...biasesResults,
      ...generalResults,
    ]);

    // Step 5: Convert to ToolSearchResult format
    const toolSearchResults: ToolSearchResult[] = mergedResults.map((result) => ({
      ...result.content,
      similarity: result.similarity,
      searchSource: result.searchSource,
      type: mapToToolType(result.content.type, result.searchSource),
    }));

    console.log(`[ModelFinder] Final results: ${toolSearchResults.length} unique tools found`);

    if (toolSearchResults.length === 0) {
      throw new Error("No relevant tools found for the given problem analysis");
    }

    return toolSearchResults.sort((a, b) => b.similarity - a.similarity);
  } catch (error) {
    console.error("[ModelFinder] Search failed:", error);
    throw new Error(
      `Failed to find relevant tools: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Merges search results and removes duplicates, keeping the highest similarity score
 *
 * @param results - Array of search results from all searches
 * @returns Deduplicated array with highest similarity scores preserved
 */
function mergeAndDeduplicateResults(results: SearchResult[]): SearchResult[] {
  const resultMap = new Map<string, SearchResult>();

  for (const result of results) {
    const existingResult = resultMap.get(result.content.id);

    if (!existingResult) {
      // First time seeing this tool
      resultMap.set(result.content.id, result);
    } else if (result.similarity > existingResult.similarity) {
      // Found a better similarity score, replace
      console.log(
        `[ModelFinder] Replacing duplicate "${result.content.title}" - new similarity: ${result.similarity.toFixed(3)} (was: ${existingResult.similarity.toFixed(3)})`
      );
      resultMap.set(result.content.id, result);
    }
  }

  const uniqueResults = Array.from(resultMap.values());
  console.log(
    `[ModelFinder] Deduplicated ${results.length} results to ${uniqueResults.length} unique tools`
  );

  return uniqueResults;
}

/**
 * Maps knowledge content type and search source to tool type
 *
 * @param contentType - Original content type from database
 * @param searchSource - Which search found this tool
 * @returns Appropriate tool type for action roadmap
 */
function mapToToolType(
  contentType: "mental-model" | "cognitive-bias" | "fallacy",
  searchSource: "mental-models" | "biases" | "general"
): "mental-model" | "cognitive-bias" | "fallacy" | "general-concept" {
  // Use search source as primary indicator for general concepts
  if (searchSource === "general") {
    return "general-concept";
  }

  // Otherwise use the content type directly
  return contentType;
}
