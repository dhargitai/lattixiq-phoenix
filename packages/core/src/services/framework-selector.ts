/**
 * Framework Selection Service for Phoenix Core
 * 
 * Orchestrates the selection of relevant mental models and frameworks for decision sprints.
 * Uses semantic search against knowledge content to find, score, and curate frameworks
 * that best match the user's problem context.
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import type {
  FrameworkSelection,
  KnowledgeContentType,
  TargetPersona,
  StartupPhase,
  IFrameworkSelector,
  ScoreBreakdown,
} from '../types';
import { PhoenixError, ErrorCode } from '../utils/errors';
import { PerformanceTracker } from '../utils/performance-tracker';

/**
 * Framework selection configuration options
 */
export interface FrameworkSelectionOptions {
  /** Maximum number of frameworks to select */
  maxFrameworks?: number;
  /** Minimum similarity score threshold (0.0-1.0) */
  minSimilarityScore?: number;
  /** Target persona for filtering */
  targetPersona?: TargetPersona[];
  /** Startup phase for filtering */
  startupPhase?: StartupPhase[];
  /** Problem categories for filtering */
  problemCategories?: string[];
  /** Content types to include */
  contentTypes?: KnowledgeContentType[];
  /** Language for content */
  language?: string;
  /** Include super models in selection */
  includeSuperModels?: boolean;
  /** Diversity weight in scoring (0.0-1.0) */
  diversityWeight?: number;
}

/**
 * Knowledge content database record
 */
interface KnowledgeContentRecord {
  id: string;
  title: string;
  type: string;
  main_category: string;
  subcategory: string;
  definition: string;
  key_takeaway: string;
  hook: string;
  analogy_or_metaphor: string;
  classic_example: string;
  modern_example: string;
  visual_metaphor: string;
  payoff: string;
  pitfall: string;
  dive_deeper_mechanism: string;
  dive_deeper_origin_story: string;
  dive_deeper_pitfalls_nuances: string;
  extra_content: string;
  target_persona: string[];
  startup_phase: string[];
  problem_category: string[];
  super_model: boolean;
  language: string;
}

/**
 * Search result from semantic search
 */
interface SearchResult {
  id: string;
  title: string;
  similarity: number;
  content: KnowledgeContentRecord;
}

/**
 * Framework candidate for scoring
 */
interface FrameworkCandidate {
  content: KnowledgeContentRecord;
  similarity: number;
  baseScore: number;
  scoreBreakdown: ScoreBreakdown;
}

/**
 * Default configuration for framework selection
 */
const DEFAULT_OPTIONS: Required<FrameworkSelectionOptions> = {
  maxFrameworks: 5,
  minSimilarityScore: 0.6,
  targetPersona: [],
  startupPhase: [],
  problemCategories: [],
  contentTypes: [],
  language: 'English',
  includeSuperModels: true,
  diversityWeight: 0.3,
};

/**
 * Framework Selection Service Implementation
 */
export class FrameworkSelector implements IFrameworkSelector {
  private openai: OpenAI;
  private supabase: any;
  private performanceTracker: PerformanceTracker;

  constructor() {
    // Initialize OpenAI client
    if (!process.env.OPENAI_API_KEY) {
      throw new PhoenixError(
        ErrorCode.VALIDATION_ERROR,
        'Missing OPENAI_API_KEY environment variable'
      );
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new PhoenixError(
        ErrorCode.VALIDATION_ERROR,
        'Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)'
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.performanceTracker = new PerformanceTracker();
  }

  /**
   * Select relevant frameworks for a problem statement
   */
  async selectFrameworks(
    problemStatement: string,
    sessionId: string,
    options: FrameworkSelectionOptions = {}
  ): Promise<FrameworkSelection[]> {
    const config = { ...DEFAULT_OPTIONS, ...options };
    this.performanceTracker.startOperation('framework_selection');

    try {
      // Step 1: Generate embedding for problem statement
      this.performanceTracker.startOperation('embedding_generation');
      const embedding = await this.generateEmbedding(problemStatement);
      this.performanceTracker.endOperation('embedding_generation');

      // Step 2: Search for relevant frameworks
      this.performanceTracker.startOperation('semantic_search');
      const searchResults = await this.searchKnowledgeContent(embedding, config);
      this.performanceTracker.endOperation('semantic_search');

      // Step 3: Score and rank candidates
      this.performanceTracker.startOperation('scoring');
      const candidates = await this.scoreFrameworks(searchResults, problemStatement, config);
      this.performanceTracker.endOperation('scoring');

      // Step 4: Curate final selection with diversity
      this.performanceTracker.startOperation('curation');
      const selectedFrameworks = this.curateFrameworks(candidates, config);
      this.performanceTracker.endOperation('curation');

      // Step 5: Store framework selections
      this.performanceTracker.startOperation('storage');
      const frameworkSelections = await this.storeFrameworkSelections(
        sessionId,
        selectedFrameworks,
        config
      );
      this.performanceTracker.endOperation('storage');

      this.performanceTracker.endOperation('framework_selection');
      return frameworkSelections;
    } catch (error) {
      this.performanceTracker.endOperation('framework_selection', { success: false, error: (error as Error).message });
      throw new PhoenixError(
        ErrorCode.FRAMEWORK_SELECTION_FAILED,
        `Framework selection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { details: { problemStatement, sessionId, options } }
      );
    }
  }

  /**
   * Generate OpenAI embedding for text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: 1536,
      });

      return response.data[0].embedding;
    } catch (error) {
      throw new PhoenixError(
        ErrorCode.EMBEDDING_GENERATION_FAILED,
        `Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { details: { textLength: text.length } }
      );
    }
  }

  /**
   * Search knowledge content using semantic similarity
   */
  private async searchKnowledgeContent(
    embedding: number[],
    config: Required<FrameworkSelectionOptions>
  ): Promise<SearchResult[]> {
    try {
      // Use existing database function for semantic search
      const { data: searchResults, error } = await this.supabase.rpc(
        'match_knowledge_content_by_language',
        {
          query_embedding: JSON.stringify(embedding),
          match_threshold: config.minSimilarityScore,
          match_count: Math.min(config.maxFrameworks * 3, 50), // Get more candidates for scoring
          target_language: config.language,
        }
      );

      if (error) {
        throw new Error(`Database search error: ${error.message}`);
      }

      if (!searchResults || searchResults.length === 0) {
        return [];
      }

      // Get full content details
      const ids = searchResults.map((r: any) => r.id);
      const { data: fullContent, error: contentError } = await this.supabase
        .from('knowledge_content')
        .select('*')
        .in('id', ids)
        .eq('language', config.language);

      if (contentError) {
        throw new Error(`Content fetch error: ${contentError.message}`);
      }

      // Combine search results with full content
      const similarityMap = new Map(searchResults.map((r: any) => [r.id, r.similarity]));
      
      return (fullContent || [])
        .filter((content: any) => this.matchesFilters(content, config))
        .map((content: any) => ({
          id: content.id,
          title: content.title,
          similarity: similarityMap.get(content.id) || 0,
          content: content as KnowledgeContentRecord,
        }))
        .sort((a: SearchResult, b: SearchResult) => b.similarity - a.similarity);
    } catch (error) {
      throw new PhoenixError(
        ErrorCode.DATABASE_ERROR,
        `Knowledge content search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if content matches filtering criteria
   */
  private matchesFilters(
    content: KnowledgeContentRecord,
    config: Required<FrameworkSelectionOptions>
  ): boolean {
    // Filter by target persona
    if (config.targetPersona.length > 0) {
      const hasMatchingPersona = content.target_persona?.some(persona => 
        config.targetPersona.includes(persona as TargetPersona)
      );
      if (!hasMatchingPersona) return false;
    }

    // Filter by startup phase
    if (config.startupPhase.length > 0) {
      const hasMatchingPhase = content.startup_phase?.some(phase => 
        config.startupPhase.includes(phase as StartupPhase)
      );
      if (!hasMatchingPhase) return false;
    }

    // Filter by problem categories
    if (config.problemCategories.length > 0) {
      const hasMatchingCategory = content.problem_category?.some(category =>
        config.problemCategories.includes(category)
      );
      if (!hasMatchingCategory) return false;
    }

    // Filter by content types
    if (config.contentTypes.length > 0) {
      const contentType = this.mapToContentType(content.type);
      if (!config.contentTypes.includes(contentType)) return false;
    }

    return true;
  }

  /**
   * Score framework candidates using multiple criteria
   */
  private async scoreFrameworks(
    searchResults: SearchResult[],
    _problemStatement: string,
    config: Required<FrameworkSelectionOptions>
  ): Promise<FrameworkCandidate[]> {
    return searchResults.map(result => {
      const scoreBreakdown = this.calculateScoreBreakdown(result, _problemStatement, config);
      const baseScore = this.calculateOverallScore(scoreBreakdown);

      return {
        content: result.content,
        similarity: result.similarity,
        baseScore,
        scoreBreakdown,
      };
    }).sort((a, b) => b.baseScore - a.baseScore);
  }

  /**
   * Calculate detailed score breakdown for a framework
   */
  private calculateScoreBreakdown(
    result: SearchResult,
    _problemStatement: string,
    config: Required<FrameworkSelectionOptions>
  ): ScoreBreakdown {
    const content = result.content;

    // Direct relevance from semantic similarity
    const directRelevance = result.similarity;

    // Applicability now - higher for practical frameworks
    const applicabilityNow = this.calculateApplicabilityScore(content);

    // Foundational value - higher for super models and well-established frameworks
    const foundationalValue = content.super_model ? 0.9 : 0.7;

    // Simplicity bonus - shorter definitions and clearer explanations
    const simplicityBonus = this.calculateSimplicityScore(content);

    // Personal relevance - based on persona and phase matching
    const personalRelevance = this.calculatePersonalRelevance(content, config);

    // Complementarity - will be calculated during curation
    const complementarity = 0.8; // Default value, adjusted during curation

    const overallScore = this.calculateOverallScore({
      directRelevance,
      applicabilityNow,
      foundationalValue,
      simplicityBonus,
      personalRelevance,
      complementarity,
    });

    return {
      directRelevance,
      applicabilityNow,
      foundationalValue,
      simplicityBonus,
      personalRelevance,
      complementarity,
      overallScore,
      reasoning: this.generateScoreReasoning(content, {
        directRelevance,
        applicabilityNow,
        foundationalValue,
        simplicityBonus,
        personalRelevance,
        complementarity,
        overallScore,
        reasoning: '',
      }),
    };
  }

  /**
   * Calculate applicability score based on content characteristics
   */
  private calculateApplicabilityScore(content: KnowledgeContentRecord): number {
    let score = 0.7; // Base score

    // Higher score for frameworks with practical examples
    if (content.modern_example && content.modern_example.length > 50) {
      score += 0.1;
    }

    // Higher score for frameworks with clear payoffs
    if (content.payoff && content.payoff.length > 30) {
      score += 0.1;
    }

    // Lower score if too theoretical (lots of mechanism, less practical content)
    if (content.dive_deeper_mechanism && 
        content.dive_deeper_mechanism.length > 200 && 
        (!content.modern_example || content.modern_example.length < 50)) {
      score -= 0.1;
    }

    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Calculate simplicity score
   */
  private calculateSimplicityScore(content: KnowledgeContentRecord): number {
    const definitionLength = content.definition?.length || 0;
    const keyTakeawayLength = content.key_takeaway?.length || 0;
    
    // Shorter, clearer content gets higher scores
    let score = 0.1;
    
    if (definitionLength > 0 && definitionLength < 200) score += 0.05;
    if (keyTakeawayLength > 0 && keyTakeawayLength < 150) score += 0.05;
    if (content.analogy_or_metaphor && content.analogy_or_metaphor.length > 20) score += 0.05;
    
    return Math.min(0.2, score); // Cap at 0.2 bonus
  }

  /**
   * Calculate personal relevance based on user context
   */
  private calculatePersonalRelevance(
    content: KnowledgeContentRecord,
    config: Required<FrameworkSelectionOptions>
  ): number {
    let score = 0.5; // Base score

    // Boost score for matching personas
    if (config.targetPersona.length > 0) {
      const personaMatch = content.target_persona?.some(persona => 
        config.targetPersona.includes(persona as TargetPersona)
      );
      if (personaMatch) score += 0.2;
    }

    // Boost score for matching startup phases
    if (config.startupPhase.length > 0) {
      const phaseMatch = content.startup_phase?.some(phase => 
        config.startupPhase.includes(phase as StartupPhase)
      );
      if (phaseMatch) score += 0.2;
    }

    // Boost score for matching problem categories
    if (config.problemCategories.length > 0) {
      const categoryMatch = content.problem_category?.some(category =>
        config.problemCategories.includes(category)
      );
      if (categoryMatch) score += 0.1;
    }

    return Math.min(1.0, score);
  }

  /**
   * Calculate overall weighted score
   */
  private calculateOverallScore(breakdown: Omit<ScoreBreakdown, 'overallScore' | 'reasoning'>): number {
    const weights = {
      directRelevance: 0.3,
      applicabilityNow: 0.25,
      foundationalValue: 0.2,
      simplicityBonus: 0.05,
      personalRelevance: 0.15,
      complementarity: 0.05,
    };

    return (
      breakdown.directRelevance * weights.directRelevance +
      breakdown.applicabilityNow * weights.applicabilityNow +
      breakdown.foundationalValue * weights.foundationalValue +
      breakdown.simplicityBonus * weights.simplicityBonus +
      breakdown.personalRelevance * weights.personalRelevance +
      breakdown.complementarity * weights.complementarity
    );
  }

  /**
   * Generate reasoning text for score breakdown
   */
  private generateScoreReasoning(content: KnowledgeContentRecord, breakdown: ScoreBreakdown): string {
    const reasons: string[] = [];

    if (breakdown.directRelevance > 0.8) {
      reasons.push('High semantic similarity to problem statement');
    }

    if (breakdown.foundationalValue > 0.85) {
      reasons.push('Foundational mental model with broad applicability');
    }

    if (breakdown.personalRelevance > 0.7) {
      reasons.push('Well-matched to user persona and context');
    }

    if (content.modern_example && content.modern_example.length > 50) {
      reasons.push('Includes relevant modern examples');
    }

    if (content.super_model) {
      reasons.push('Core framework for decision-making');
    }

    return reasons.join('; ') || 'Standard relevance scoring applied';
  }

  /**
   * Curate final framework selection with diversity considerations
   */
  private curateFrameworks(
    candidates: FrameworkCandidate[],
    config: Required<FrameworkSelectionOptions>
  ): FrameworkCandidate[] {
    const selected: FrameworkCandidate[] = [];
    const usedCategories = new Set<string>();
    const usedTypes = new Set<string>();

    // Always include the highest-scoring super model if available
    const topSuperModel = candidates.find(c => c.content.super_model);
    if (topSuperModel && config.includeSuperModels) {
      selected.push(topSuperModel);
      usedCategories.add(topSuperModel.content.main_category);
      usedTypes.add(topSuperModel.content.type);
    }

    // Select remaining frameworks with diversity consideration
    for (const candidate of candidates) {
      if (selected.length >= config.maxFrameworks) break;
      if (selected.includes(candidate)) continue;

      // Skip super models if they're disabled
      if (candidate.content.super_model && !config.includeSuperModels) {
        continue;
      }

      const category = candidate.content.main_category;
      const type = candidate.content.type;

      // Calculate diversity bonus/penalty
      let diversityScore = 1.0;
      if (usedCategories.has(category)) diversityScore -= 0.2;
      if (usedTypes.has(type)) diversityScore -= 0.1;

      // Apply diversity weight
      const adjustedScore = candidate.baseScore * (1 - config.diversityWeight) + 
                           diversityScore * config.diversityWeight;

      if (adjustedScore > 0.6 || selected.length < 2) { // Always take top 2
        // Update complementarity score based on diversity
        candidate.scoreBreakdown.complementarity = diversityScore;
        candidate.scoreBreakdown.overallScore = adjustedScore;
        
        selected.push(candidate);
        usedCategories.add(category);
        usedTypes.add(type);
      }
    }

    return selected.sort((a, b) => b.scoreBreakdown.overallScore - a.scoreBreakdown.overallScore);
  }

  /**
   * Store framework selections in database
   */
  private async storeFrameworkSelections(
    sessionId: string,
    candidates: FrameworkCandidate[],
    _config: Required<FrameworkSelectionOptions>
  ): Promise<FrameworkSelection[]> {
    const selections: FrameworkSelection[] = candidates.map((candidate, index) => ({
      id: `${sessionId}-${candidate.content.id}-${Date.now()}`,
      sessionId,
      knowledgeContentId: candidate.content.id,
      relevanceScore: candidate.similarity,
      scoreBreakdown: candidate.scoreBreakdown,
      selectionRank: index + 1,
      selectionReason: `Ranked #${index + 1}: ${candidate.scoreBreakdown.reasoning}`,
      wasApplied: false,
      selectedAt: new Date(),
    }));

    try {
      const { error } = await this.supabase
        .from('framework_selections')
        .insert(selections.map(selection => ({
          id: selection.id,
          session_id: selection.sessionId,
          knowledge_content_id: selection.knowledgeContentId,
          relevance_score: selection.relevanceScore,
          score_breakdown: selection.scoreBreakdown,
          selection_rank: selection.selectionRank,
          selection_reason: selection.selectionReason,
          was_applied: selection.wasApplied,
          selected_at: selection.selectedAt.toISOString(),
        })));

      if (error) {
        throw new Error(`Database storage error: ${error.message}`);
      }

      return selections;
    } catch (error) {
      throw new PhoenixError(
        ErrorCode.DATABASE_ERROR,
        `Failed to store framework selections: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { sessionId, details: { selectionsCount: selections.length } }
      );
    }
  }

  /**
   * Map database type to KnowledgeContentType
   */
  private mapToContentType(type: string): KnowledgeContentType {
    switch (type.toLowerCase()) {
      case 'cognitive-bias':
      case 'bias':
        return 'cognitive-bias';
      case 'fallacy':
      case 'logical-fallacy':
        return 'fallacy';
      case 'strategic-framework':
      case 'framework':
        return 'strategic-framework';
      case 'tactical-tool':
      case 'tool':
        return 'tactical-tool';
      default:
        return 'mental-model';
    }
  }

  /**
   * Health check for framework selector dependencies
   */
  async healthCheck(): Promise<{ available: boolean; error?: string }> {
    try {
      // Check OpenAI API
      await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: 'test',
        dimensions: 1536,
      });

      // Check Supabase connection
      const { error } = await this.supabase
        .from('knowledge_content')
        .select('id')
        .limit(1);

      if (error) {
        return { available: false, error: `Database error: ${error.message}` };
      }

      return { available: true };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}