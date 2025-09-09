/**
 * Semantic Search API Endpoint
 * 
 * Provides semantic search functionality for knowledge content and framework selection.
 * Uses vector similarity search with pgvector for intelligent framework recommendations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Types
interface SemanticSearchRequest {
  query: string;
  filters?: {
    contentType?: string[];
    targetPersona?: string[];
    startupPhase?: string[];
    problemCategory?: string[];
    language?: string;
    superModel?: boolean;
  };
  limit?: number;
  threshold?: number; // Similarity threshold (0-1)
}

interface SemanticSearchResponse {
  results: KnowledgeContentResult[];
  query: string;
  totalResults: number;
  processingTimeMs: number;
}

interface KnowledgeContentResult {
  id: string;
  title: string;
  type: string;
  similarity: number;
  content: {
    hook: string;
    definition: string;
    keyTakeaway: string;
    classicExample: string;
    modernExample: string;
    pitfall: string;
    payoff: string;
  };
  metadata: {
    mainCategory: string;
    subcategory: string;
    targetPersona: string[];
    startupPhase: string[];
    problemCategory: string[];
    superModel: boolean;
  };
}

interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
  suggestions?: string[];
}

// Initialize services
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * Generate embedding for query text
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1536, // Match database vector dimensions
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw new Error('Failed to generate embedding for search query');
  }
}

/**
 * Build SQL filters from request filters
 */
function buildFilters(filters?: SemanticSearchRequest['filters']): { where: string; params: unknown[] } {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (!filters) {
    return { where: '', params: [] };
  }

  if (filters.contentType && filters.contentType.length > 0) {
    conditions.push(`type = ANY($${paramIndex})`);
    params.push(filters.contentType);
    paramIndex++;
  }

  if (filters.language) {
    conditions.push(`language = $${paramIndex}`);
    params.push(filters.language);
    paramIndex++;
  }

  if (filters.targetPersona && filters.targetPersona.length > 0) {
    conditions.push(`target_persona && $${paramIndex}`);
    params.push(filters.targetPersona);
    paramIndex++;
  }

  if (filters.startupPhase && filters.startupPhase.length > 0) {
    conditions.push(`startup_phase && $${paramIndex}`);
    params.push(filters.startupPhase);
    paramIndex++;
  }

  if (filters.problemCategory && filters.problemCategory.length > 0) {
    conditions.push(`problem_category && $${paramIndex}`);
    params.push(filters.problemCategory);
    paramIndex++;
  }

  if (filters.superModel !== undefined) {
    conditions.push(`super_model = $${paramIndex}`);
    params.push(filters.superModel);
    paramIndex++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

/**
 * Execute semantic search query
 */
async function executeSemanticSearch(
  embedding: number[],
  filters: SemanticSearchRequest['filters'],
  limit: number,
  threshold: number
): Promise<KnowledgeContentResult[]> {
  const { where, params } = buildFilters(filters);
  
  // Use Supabase's built-in vector similarity function
  const query = `
    SELECT 
      id,
      title,
      type,
      main_category,
      subcategory,
      hook,
      definition,
      key_takeaway,
      classic_example,
      modern_example,
      pitfall,
      payoff,
      target_persona,
      startup_phase,
      problem_category,
      super_model,
      1 - (embedding <=> $${params.length + 1}::vector) AS similarity
    FROM knowledge_content
    ${where}
    ${where ? 'AND' : 'WHERE'} 1 - (embedding <=> $${params.length + 1}::vector) > $${params.length + 2}
    ORDER BY embedding <=> $${params.length + 1}::vector
    LIMIT $${params.length + 3}
  `;

  const queryParams = [...params, JSON.stringify(embedding), threshold, limit];

  try {
    const { data, error } = await supabase.rpc('execute_raw_sql', {
      sql: query,
      params: queryParams
    });

    if (error) {
      console.error('Semantic search query failed:', error);
      throw new Error(`Database query failed: ${error.message}`);
    }

    // Transform results to expected format
    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      title: row.title as string,
      type: row.type as string,
      similarity: parseFloat(row.similarity as string),
      content: {
        hook: row.hook as string,
        definition: row.definition as string,
        keyTakeaway: row.key_takeaway as string,
        classicExample: row.classic_example as string,
        modernExample: row.modern_example as string,
        pitfall: row.pitfall as string,
        payoff: row.payoff as string,
      },
      metadata: {
        mainCategory: row.main_category as string,
        subcategory: row.subcategory as string,
        targetPersona: row.target_persona as string[],
        startupPhase: row.startup_phase as string[],
        problemCategory: row.problem_category as string[],
        superModel: row.super_model as boolean,
      },
    }));
  } catch (error) {
    console.error('Semantic search execution failed:', error);
    throw error;
  }
}

/**
 * POST /api/search/semantic - Perform semantic search
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body: SemanticSearchRequest = await req.json();
    
    // Validate required fields
    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid or missing query',
          code: 'VALIDATION_ERROR',
          suggestions: ['Provide a non-empty string query']
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Set defaults
    const limit = Math.min(body.limit || 10, 50); // Max 50 results
    const threshold = body.threshold || 0.3; // Minimum similarity threshold

    // Validate threshold
    if (threshold < 0 || threshold > 1) {
      return NextResponse.json(
        {
          error: 'Invalid similarity threshold',
          code: 'VALIDATION_ERROR',
          details: { threshold, validRange: '0-1' },
          suggestions: ['Use threshold between 0 and 1']
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Generate embedding for search query
    let embedding: number[];
    try {
      embedding = await generateEmbedding(body.query);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Failed to process search query',
          code: 'EMBEDDING_ERROR',
          suggestions: ['Try a different query', 'Check if query contains valid text']
        } as ErrorResponse,
        { status: 500 }
      );
    }

    // Execute semantic search
    let results: KnowledgeContentResult[];
    try {
      results = await executeSemanticSearch(embedding, body.filters, limit, threshold);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Search execution failed',
          code: 'SEARCH_ERROR',
          details: { error: error instanceof Error ? error.message : String(error) },
          suggestions: ['Try again', 'Simplify your query', 'Adjust search filters']
        } as ErrorResponse,
        { status: 500 }
      );
    }

    const processingTime = Date.now() - startTime;

    // Return search results
    const response: SemanticSearchResponse = {
      results,
      query: body.query,
      totalResults: results.length,
      processingTimeMs: processingTime,
    };

    return NextResponse.json(response, {
      headers: {
        'X-Processing-Time-Ms': processingTime.toString(),
        'X-Results-Count': results.length.toString(),
        'X-Similarity-Threshold': threshold.toString(),
      },
    });

  } catch (error) {
    console.error('Semantic search API error:', error);
    
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        suggestions: ['Try again', 'Contact support if the problem persists']
      } as ErrorResponse,
      { 
        status: 500,
        headers: {
          'X-Processing-Time-Ms': processingTime.toString(),
        }
      }
    );
  }
}

/**
 * GET /api/search/semantic - Health check and endpoint info
 */
export async function GET() {
  return NextResponse.json({
    endpoint: 'Semantic Search API',
    status: 'active',
    version: '1.0.0',
    supportedMethods: ['POST'],
    documentation: {
      postBody: {
        query: 'string (required) - Search query text',
        filters: 'object (optional) - Content filters',
        limit: 'number (optional) - Max results, default 10, max 50',
        threshold: 'number (optional) - Similarity threshold, default 0.3',
      },
      exampleResponse: {
        results: 'KnowledgeContentResult[]',
        query: 'string',
        totalResults: 'number',
        processingTimeMs: 'number',
      }
    }
  });
}

/**
 * OPTIONS /api/search/semantic - CORS preflight
 */
export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}