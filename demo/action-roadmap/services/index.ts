/**
 * Action Roadmap Services Index
 *
 * Central export point for all action roadmap services.
 * Provides convenient access to database, embedding, and AI provider services.
 */

// Supabase service exports
export {
  ActionRoadmapSupabaseService,
  supabaseService,
  type KnowledgeContent,
  type KnowledgeSearchResult,
  type SearchResult,
  type SuperModelsResult,
} from "./supabase-service";

// Embedding service exports
export {
  generateEmbedding,
  generateSearchEmbeddings,
  generateSingleSearchEmbedding,
} from "./embedding-service";

// AI provider exports
export {
  getAIModel,
  getCurrentProvider,
  getModelConfig,
  createCustomModel,
  healthCheck as aiHealthCheck,
  quickAnalysisModel,
  contentGenerationModel,
  modelConfig,
  type ModelPurpose,
  type AIProvider,
  type ModelConfig,
} from "./ai-provider";

// Service health check utility
export async function checkAllServices(): Promise<{
  supabase: boolean;
  ai: { provider: string; available: boolean; error?: string };
  overall: boolean;
}> {
  const [supabaseHealth, aiHealth] = await Promise.all([
    supabaseService.healthCheck(),
    (await import("./ai-provider")).healthCheck(),
  ]);

  const overall = supabaseHealth && aiHealth.available;

  return {
    supabase: supabaseHealth,
    ai: aiHealth,
    overall,
  };
}
