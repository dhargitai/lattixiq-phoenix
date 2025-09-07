/**
 * Phoenix Framework Streaming API Endpoint
 * 
 * Provides streaming responses for Phoenix decision sprint sessions.
 * Handles message processing, session management, and conversation branching.
 */

import { NextRequest, NextResponse } from 'next/server';
import { streamText, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@supabase/supabase-js';
import { PhoenixOrchestrator } from '@phoenix/core/orchestration/phoenix-orchestrator';
import { PhoenixError, ErrorCode } from '@phoenix/core/utils/errors';

// Types for request/response
interface SprintRequest {
  message: string;
  sessionId?: string;
  userId: string;
  modelOverride?: 'gpt-4.1' | 'gemini-2.5-pro' | 'gemini-2.5-flash';
  enableFrameworkSelection?: boolean;
  parentMessageId?: string; // For conversation branching
  maxProcessingTimeMs?: number;
}

interface SprintResponse {
  sessionId: string;
  messageId: string;
  content: string;
  currentPhase: string;
  previousPhase?: string;
  frameworkSelections?: any[];
  conversationBranch?: {
    parentMessageId: string;
    branchMessageId: string;
  };
  metrics?: any;
}

interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
  suggestions?: string[];
}

// Initialize services
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// OpenAI client configured through @ai-sdk/openai

const orchestrator = new PhoenixOrchestrator();

/**
 * POST /api/sprint - Process message through Phoenix Framework
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body - handle both old and new useChat formats
    const rawBody = await req.json();
    
    // Check if this is the new useChat format (has messages array)
    let body: SprintRequest;
    if (rawBody.messages && Array.isArray(rawBody.messages)) {
      // New useChat format
      const lastMessage = rawBody.messages[rawBody.messages.length - 1];
      body = {
        message: lastMessage.parts?.[0]?.text || lastMessage.content || '',
        userId: rawBody.userId || 'anonymous',
        sessionId: rawBody.sessionId,
        ...rawBody
      };
    } else {
      // Legacy format
      body = rawBody as SprintRequest;
    }
    
    // Validate required fields
    if (!body.message || !body.userId) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          code: 'VALIDATION_ERROR',
          details: { required: ['message', 'userId'] },
          suggestions: ['Include both message and userId in request body']
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Validate message content
    if (typeof body.message !== 'string' || body.message.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid message format',
          code: 'VALIDATION_ERROR',
          suggestions: ['Provide a non-empty string message']
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Validate session ID format if provided
    if (body.sessionId && !/^[a-f0-9-]{36}$/i.test(body.sessionId)) {
      return NextResponse.json(
        {
          error: 'Invalid session ID format',
          code: 'VALIDATION_ERROR',
          suggestions: ['Use a valid UUID format for sessionId']
        } as ErrorResponse,
        { status: 400 }
      );
    }

    let sessionId = body.sessionId;

    // Create new session if not provided
    if (!sessionId) {
      try {
        const session = await orchestrator.createSession(body.userId, {
          enableConversationBranching: true,
          modelPreferences: body.modelOverride ? {
            preferredModel: body.modelOverride,
            fallbackModel: 'gpt-4.1',
          } : undefined,
          performanceTracking: true,
        });
        sessionId = session.id;
      } catch (error) {
        console.error('Session creation failed:', error);
        return NextResponse.json(
          {
            error: 'Failed to create session',
            code: 'SESSION_CREATION_ERROR',
            suggestions: ['Try again', 'Check user permissions']
          } as ErrorResponse,
          { status: 500 }
        );
      }
    }

    // Handle conversation branching vs normal message processing
    let result;
    try {
      if (body.parentMessageId) {
        // Process as conversation branch
        result = await orchestrator.branchConversation(
          sessionId,
          body.parentMessageId,
          body.message,
          {
            enableFrameworkSelection: body.enableFrameworkSelection ?? true,
            maxProcessingTimeMs: body.maxProcessingTimeMs || 180000,
            modelOverride: body.modelOverride,
          }
        );
      } else {
        // Process as normal message
        result = await orchestrator.processMessage(
          sessionId,
          body.message,
          {
            enableFrameworkSelection: body.enableFrameworkSelection ?? true,
            maxProcessingTimeMs: body.maxProcessingTimeMs || 180000,
            modelOverride: body.modelOverride,
          }
        );
      }
    } catch (error) {
      console.error('Message processing failed:', error);
      
      // Handle Phoenix-specific errors
      if (error instanceof PhoenixError) {
        const status = error.code === ErrorCode.SESSION_NOT_FOUND ? 404 :
                      error.code === ErrorCode.OPERATION_TIMEOUT ? 408 :
                      error.code === ErrorCode.VALIDATION_ERROR ? 400 : 500;
        
        return NextResponse.json(
          {
            error: error.message,
            code: error.code,
            details: error.context,
            suggestions: error.suggestions
          } as ErrorResponse,
          { status }
        );
      }

      // Handle generic errors
      return NextResponse.json(
        {
          error: 'Message processing failed',
          code: 'PROCESSING_ERROR',
          details: { error: error instanceof Error ? error.message : String(error) },
          suggestions: ['Try again', 'Check input format', 'Try a simpler message']
        } as ErrorResponse,
        { status: 500 }
      );
    }

    // Return streaming response in the format expected by useChat
    const streamResult = streamText({
      model: openai('gpt-4o-mini'), // Use for coordination only
      prompt: `Return this exact response as streaming text: ${result.content}`,
      async onFinish() {
        // Log metrics for monitoring
        if (result.metrics) {
          console.log('Sprint processing metrics:', {
            sessionId,
            phase: result.currentPhase,
            duration: result.metrics.duration,
            tokensUsed: result.metrics.tokensUsed,
            cost: result.metrics.cost,
          });
        }
      },
    });

    // Return the proper UI message stream response
    return streamResult.toUIMessageStreamResponse({
      headers: {
        'X-Session-Id': sessionId,
        'X-Current-Phase': result.currentPhase,
        'X-Framework-Count': result.frameworkSelections?.length?.toString() || '0',
      },
    });

  } catch (error) {
    console.error('API endpoint error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        suggestions: ['Try again', 'Contact support if the problem persists']
      } as ErrorResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/sprint?sessionId=xxx - Get session information
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const action = searchParams.get('action'); // 'health' for health check

    // Handle health check
    if (action === 'health') {
      try {
        const healthCheck = await orchestrator.healthCheck();
        return NextResponse.json({
          status: 'ok',
          timestamp: new Date().toISOString(),
          services: healthCheck.services,
          overall: healthCheck.overall,
          errors: healthCheck.errors,
        });
      } catch (error) {
        return NextResponse.json(
          {
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : String(error)
          },
          { status: 500 }
        );
      }
    }

    // Validate session ID for session info requests
    if (!sessionId) {
      return NextResponse.json(
        {
          error: 'Session ID required',
          code: 'VALIDATION_ERROR',
          suggestions: ['Include sessionId as query parameter']
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Get session information (this would need to be implemented in orchestrator)
    try {
      // For now, return basic session info - this would need SessionManager integration
      return NextResponse.json({
        sessionId,
        status: 'active',
        timestamp: new Date().toISOString(),
        message: 'Session information endpoint - implementation pending'
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Failed to retrieve session information',
          code: 'SESSION_ERROR',
          suggestions: ['Check session ID', 'Try again']
        } as ErrorResponse,
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('GET endpoint error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      } as ErrorResponse,
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/sprint - CORS preflight
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