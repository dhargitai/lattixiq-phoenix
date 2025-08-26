/**
 * Supabase Service for Action Roadmap Preparator
 *
 * Self-contained database operations for knowledge content search and super model retrieval.
 * Independent of external services and caching layers.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { KnowledgeContent, SupportedLanguage } from "../shared-types";

/**
 * Search result with similarity score
 */
export interface SearchResult {
  /** Knowledge content data */
  content: KnowledgeContent;
  /** Semantic similarity score from vector search (0.0-1.0) */
  similarity: number;
  /** Which search type found this result */
  searchSource: "mental-models" | "biases" | "general";
}

/**
 * Super model loading result
 */
export interface SuperModelsResult {
  /** Array of super model content */
  superModels: KnowledgeContent[];
  /** Language they were loaded for */
  language: SupportedLanguage;
  /** Total count loaded */
  count: number;
}

// Database query result interfaces
interface KnowledgeContentResult {
  id: string;
  title: string;
  main_category: string | null;
  subcategory: string | null;
  definition: string | null;
  key_takeaway: string | null;
  hook: string | null;
  embedding: string | null;
  language: string | null;
  super_model: boolean | null;
  analogy_or_metaphor: string | null;
  classic_example: string | null;
  dive_deeper_mechanism: string | null;
  dive_deeper_origin_story: string | null;
  dive_deeper_pitfalls_nuances: string | null;
  extra_content: string | null;
  modern_example: string | null;
  payoff: string | null;
  pitfall: string | null;
  visual_metaphor: string | null;
  visual_metaphor_url: string | null;
}

interface MatchKnowledgeContentResult {
  id: string;
  title: string;
  similarity: number;
}

/**
 * Service class for action roadmap database operations
 */
export class ActionRoadmapSupabaseService {
  private supabase;

  constructor() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error("Missing required Supabase environment variable: NEXT_PUBLIC_SUPABASE_URL");
    }

    // For CLI and server-side usage, prefer service role key to bypass RLS
    // For browser usage, fallback to anon key
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (serviceRoleKey) {
      // Use service role key (bypasses RLS) - ideal for CLI and server operations
      this.supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      console.log("[ActionRoadmapSupabase] Using service role key (bypasses RLS)");
    } else if (anonKey) {
      // Fallback to anon key for browser environments
      this.supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL, anonKey);
      console.log("[ActionRoadmapSupabase] Using anon key (requires authentication)");
    } else {
      throw new Error(
        "Missing required Supabase keys. Need either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY"
      );
    }
  }

  /**
   * Loads super models for the specified language
   *
   * @param language - Target language for super models
   * @returns Promise resolving to super models result
   */
  async getSuperModels(language?: SupportedLanguage): Promise<SuperModelsResult> {
    try {
      let query = this.supabase
        .from("knowledge_content")
        .select(
          `
          id,
          title,
          main_category,
          subcategory,
          definition,
          key_takeaway,
          hook,
          embedding,
          language,
          super_model,
          analogy_or_metaphor,
          classic_example,
          dive_deeper_mechanism,
          dive_deeper_origin_story,
          dive_deeper_pitfalls_nuances,
          extra_content,
          modern_example,
          payoff,
          pitfall,
          visual_metaphor,
          visual_metaphor_url
        `
        )
        .eq("super_model", true);

      if (language) {
        query = query.eq("language", language);
      }

      const { data: superModels, error } = await query;

      if (error) {
        console.error("[ActionRoadmapSupabase] Error fetching super models:", error);
        throw new Error("Failed to load super models");
      }

      const transformedSuperModels: KnowledgeContent[] = (superModels || []).map(
        (content: KnowledgeContentResult) => ({
          id: content.id,
          title: content.title,
          type: this.mapToKnowledgeContentType(content.subcategory),
          main_category: content.main_category as KnowledgeContent["main_category"],
          subcategory: content.subcategory as KnowledgeContent["subcategory"],
          definition: content.definition,
          key_takeaway: content.key_takeaway,
          hook: content.hook,
          analogy_or_metaphor: content.analogy_or_metaphor,
          classic_example: content.classic_example,
          modern_example: content.modern_example,
          visual_metaphor: content.visual_metaphor,
          visual_metaphor_url: content.visual_metaphor_url,
          payoff: content.payoff,
          pitfall: content.pitfall,
          dive_deeper_mechanism: content.dive_deeper_mechanism,
          dive_deeper_origin_story: content.dive_deeper_origin_story,
          dive_deeper_pitfalls_nuances: content.dive_deeper_pitfalls_nuances,
          extra_content: content.extra_content,
          embedding: content.embedding,
          language: content.language as SupportedLanguage,
          super_model: content.super_model,
        })
      );

      console.log(
        `[ActionRoadmapSupabase] Loaded ${transformedSuperModels.length} super models for ${language || "all languages"}`
      );

      return {
        superModels: transformedSuperModels,
        language: language || ("English" as SupportedLanguage),
        count: transformedSuperModels.length,
      };
    } catch (error) {
      console.error("[ActionRoadmapSupabase] Failed to load super models:", error);
      throw new Error(`Failed to load super models for ${language || "all languages"}`);
    }
  }

  /**
   * Performs vector search for knowledge content
   *
   * @param embedding - Query embedding vector
   * @param limit - Maximum number of results to return
   * @param threshold - Minimum similarity threshold (0.0-1.0)
   * @param language - Target language for search
   * @param searchSource - Which type of search this is for
   * @param subcategories - Optional subcategory filters
   * @returns Promise resolving to search results
   */
  async searchKnowledgeContentByEmbedding(
    embedding: number[],
    limit: number,
    threshold: number,
    language: SupportedLanguage,
    searchSource: "mental-models" | "biases" | "general",
    subcategories?: string[]
  ): Promise<SearchResult[]> {
    try {
      // Prepare RPC parameters
      const rpcParams: Record<string, unknown> = {
        query_embedding: JSON.stringify(embedding),
        match_threshold: threshold,
        match_count: limit,
      };

      if (language) {
        rpcParams.target_language = language;
      }

      // Choose appropriate search function
      let functionName = "match_knowledge_content";
      if (subcategories && subcategories.length > 0) {
        functionName = "match_knowledge_content_by_subcategory";
        rpcParams.subcategories = subcategories;
      }

      const { data: searchResults, error } = (await this.supabase.rpc(
        functionName as "match_knowledge_content" | "match_knowledge_content_by_subcategory",
        rpcParams
      )) as {
        data: MatchKnowledgeContentResult[] | null;
        error: unknown;
      };

      if (error) {
        console.error("[ActionRoadmapSupabase] Error searching knowledge content:", error);
        throw new Error("Failed to search knowledge content");
      }

      // Get full content details for matched items
      const ids = searchResults?.map((r) => r.id) || [];

      if (ids.length === 0) {
        return [];
      }

      const { data: fullContent, error: contentError } = await this.supabase
        .from("knowledge_content")
        .select(
          `
          id,
          title,
          main_category,
          subcategory,
          definition,
          key_takeaway,
          hook,
          embedding,
          language,
          super_model,
          analogy_or_metaphor,
          classic_example,
          dive_deeper_mechanism,
          dive_deeper_origin_story,
          dive_deeper_pitfalls_nuances,
          extra_content,
          modern_example,
          payoff,
          pitfall,
          visual_metaphor,
          visual_metaphor_url
        `
        )
        .in("id", ids);

      if (contentError) {
        console.error(
          "[ActionRoadmapSupabase] Error fetching full knowledge content:",
          contentError
        );
        throw new Error("Failed to fetch full knowledge content");
      }

      // Create similarity score map
      const similarityMap = new Map(searchResults?.map((r) => [r.id, r.similarity]) || []);

      // Transform results to action roadmap format
      const results: SearchResult[] = (fullContent || []).map((content: KnowledgeContentResult) => {
        const similarity = similarityMap.get(content.id) || 0;

        return {
          content: {
            id: content.id,
            title: content.title,
            type: this.mapToKnowledgeContentType(content.subcategory),
            main_category: content.main_category as KnowledgeContent["main_category"],
            subcategory: content.subcategory as KnowledgeContent["subcategory"],
            definition: content.definition,
            key_takeaway: content.key_takeaway,
            hook: content.hook,
            analogy_or_metaphor: content.analogy_or_metaphor,
            classic_example: content.classic_example,
            modern_example: content.modern_example,
            visual_metaphor: content.visual_metaphor,
            visual_metaphor_url: content.visual_metaphor_url,
            payoff: content.payoff,
            pitfall: content.pitfall,
            dive_deeper_mechanism: content.dive_deeper_mechanism,
            dive_deeper_origin_story: content.dive_deeper_origin_story,
            dive_deeper_pitfalls_nuances: content.dive_deeper_pitfalls_nuances,
            extra_content: content.extra_content,
            embedding: content.embedding,
            language: content.language as SupportedLanguage,
            super_model: content.super_model,
          },
          similarity: similarity as number,
          searchSource,
        };
      });

      const sortedResults = results.sort((a, b) => b.similarity - a.similarity);

      console.log(
        `[ActionRoadmapSupabase] ${searchSource} search returned ${sortedResults.length} results`
      );

      return sortedResults;
    } catch (error) {
      console.error(`[ActionRoadmapSupabase] ${searchSource} search failed:`, error);
      throw new Error(`Failed to search knowledge content for ${searchSource}`);
    }
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.supabase.from("knowledge_content").select("id").limit(1);

      if (error) {
        console.error("[ActionRoadmapSupabase] Health check failed:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("[ActionRoadmapSupabase] Health check error:", error);
      return false;
    }
  }

  /**
   * Maps database type to knowledge content type
   * Handles the transition from old field names mentioned by user
   */
  private mapToKnowledgeContentType(type: unknown): "mental-model" | "cognitive-bias" | "fallacy" {
    // Handle potential legacy type values or map from subcategories
    if (typeof type === "string") {
      if (type === "cognitive-bias" || type === "bias") return "cognitive-bias";
      if (type === "fallacy" || type === "logical-fallacy") return "fallacy";
      if (type === "mental-model" || type === "model") return "mental-model";
    }

    // Default fallback - this should be improved based on actual data
    return "mental-model";
  }
}

// Lazy-initialized singleton instance
let _supabaseService: ActionRoadmapSupabaseService | null = null;

/**
 * Gets or creates the Supabase service singleton instance
 * Lazy initialization ensures environment variables are loaded before service creation
 */
function getSupabaseService(): ActionRoadmapSupabaseService {
  if (!_supabaseService) {
    _supabaseService = new ActionRoadmapSupabaseService();
  }
  return _supabaseService;
}

// Export singleton instance as a getter
export const supabaseService = new Proxy({} as ActionRoadmapSupabaseService, {
  get(target, prop) {
    const service = getSupabaseService();
    const value = service[prop as keyof ActionRoadmapSupabaseService];
    return typeof value === "function" ? value.bind(service) : value;
  },
});
