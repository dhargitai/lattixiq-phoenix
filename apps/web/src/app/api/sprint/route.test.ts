/**
 * Tests for Phoenix Framework Streaming API Endpoint
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET, OPTIONS } from './route';

// Mock external dependencies
vi.mock('ai', () => ({
  streamText: vi.fn(),
  createOpenAI: vi.fn(() => vi.fn()),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock('@phoenix/core/orchestration/phoenix-orchestrator', () => ({
  PhoenixOrchestrator: vi.fn(() => ({
    createSession: vi.fn(),
    processMessage: vi.fn(),
    branchConversation: vi.fn(),
    healthCheck: vi.fn(),
  })),
}));

vi.mock('@phoenix/core/utils/errors', () => ({
  PhoenixError: class PhoenixError extends Error {
    constructor(public code: string, message: string, public context?: any, public recoverable?: boolean, public suggestions?: string[]) {
      super(message);
    }
  },
  ErrorCode: {
    SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
    OPERATION_TIMEOUT: 'OPERATION_TIMEOUT',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    FRAMEWORK_SELECTION_FAILED: 'FRAMEWORK_SELECTION_FAILED',
    AI_GENERATION_ERROR: 'AI_GENERATION_ERROR',
    PHASE_TRANSITION_FAILED: 'PHASE_TRANSITION_FAILED',
    DATABASE_ERROR: 'DATABASE_ERROR',
  },
}));

// Mock modules
const mockStreamText = vi.mocked((await import('ai')).streamText);
const mockOrchestrator = vi.mocked((await import('@phoenix/core/orchestration/phoenix-orchestrator')).PhoenixOrchestrator);

describe('Phoenix Sprint API Endpoint', () => {
  let orchestratorInstance: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock orchestrator instance
    orchestratorInstance = {
      createSession: vi.fn(),
      processMessage: vi.fn(),
      branchConversation: vi.fn(),
      healthCheck: vi.fn(),
    };
    
    // Mock constructor to return our instance
    mockOrchestrator.mockImplementation(() => orchestratorInstance);

    // Mock streamText to return a proper response
    mockStreamText.mockResolvedValue({
      toTextStreamResponse: vi.fn(() => new Response()),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/sprint', () => {
    it('should create new session and process message successfully', async () => {
      // Setup mocks
      orchestratorInstance.createSession.mockResolvedValue({
        id: 'test-session-id',
        userId: 'test-user',
      });

      orchestratorInstance.processMessage.mockResolvedValue({
        sessionId: 'test-session-id',
        messageId: 'test-message-id',
        content: 'Test response content',
        currentPhase: 'problem_intake',
        frameworkSelections: [],
        metrics: {
          duration: 1000,
          tokensUsed: 50,
          cost: 0.001,
        },
      });

      // Create request
      const request = new NextRequest('http://localhost:3000/api/sprint', {
        method: 'POST',
        body: JSON.stringify({
          message: 'I have a business problem to solve',
          userId: 'test-user',
        }),
      });

      // Execute
      const response = await POST(request);

      // Verify orchestrator calls
      expect(orchestratorInstance.createSession).toHaveBeenCalledWith('test-user', {
        enableConversationBranching: true,
        modelPreferences: undefined,
        performanceTracking: true,
      });

      expect(orchestratorInstance.processMessage).toHaveBeenCalledWith(
        'test-session-id',
        'I have a business problem to solve',
        {
          enableFrameworkSelection: true,
          maxProcessingTimeMs: 180000,
          modelOverride: undefined,
        }
      );

      // Verify streaming response
      expect(mockStreamText).toHaveBeenCalled();
    });

    it('should use existing session when sessionId provided', async () => {
      // Setup mocks
      orchestratorInstance.processMessage.mockResolvedValue({
        sessionId: 'existing-session-id',
        messageId: 'test-message-id',
        content: 'Test response',
        currentPhase: 'diagnostic_interview',
        frameworkSelections: [],
      });

      // Create request with existing session
      const request = new NextRequest('http://localhost:3000/api/sprint', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Follow-up question',
          userId: 'test-user',
          sessionId: 'existing-session-id',
        }),
      });

      // Execute
      await POST(request);

      // Verify no new session created
      expect(orchestratorInstance.createSession).not.toHaveBeenCalled();

      // Verify message processed with existing session
      expect(orchestratorInstance.processMessage).toHaveBeenCalledWith(
        'existing-session-id',
        'Follow-up question',
        expect.any(Object)
      );
    });

    it('should handle conversation branching', async () => {
      // Setup mock
      orchestratorInstance.branchConversation.mockResolvedValue({
        sessionId: 'test-session-id',
        messageId: 'branch-message-id',
        content: 'Branched response',
        currentPhase: 'framework_selection',
        conversationBranch: {
          parentMessageId: 'parent-msg-id',
          branchMessageId: 'branch-message-id',
        },
      });

      // Create branching request
      const request = new NextRequest('http://localhost:3000/api/sprint', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Let me try a different approach',
          userId: 'test-user',
          sessionId: 'test-session-id',
          parentMessageId: 'parent-msg-id',
        }),
      });

      // Execute
      await POST(request);

      // Verify branching called instead of regular processing
      expect(orchestratorInstance.branchConversation).toHaveBeenCalledWith(
        'test-session-id',
        'parent-msg-id',
        'Let me try a different approach',
        expect.any(Object)
      );

      expect(orchestratorInstance.processMessage).not.toHaveBeenCalled();
    });

    it('should handle model override parameter', async () => {
      // Setup mock
      orchestratorInstance.createSession.mockResolvedValue({
        id: 'test-session-id',
        userId: 'test-user',
      });

      orchestratorInstance.processMessage.mockResolvedValue({
        sessionId: 'test-session-id',
        content: 'Response with model override',
        currentPhase: 'problem_intake',
      });

      // Create request with model override
      const request = new NextRequest('http://localhost:3000/api/sprint', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test message',
          userId: 'test-user',
          modelOverride: 'gpt-4.1',
        }),
      });

      // Execute
      await POST(request);

      // Verify session created with model preferences
      expect(orchestratorInstance.createSession).toHaveBeenCalledWith('test-user', {
        enableConversationBranching: true,
        modelPreferences: {
          preferredModel: 'gpt-4.1',
          fallbackModel: 'gpt-4.1',
        },
        performanceTracking: true,
      });
    });

    it('should validate required fields', async () => {
      // Test missing message
      const request1 = new NextRequest('http://localhost:3000/api/sprint', {
        method: 'POST',
        body: JSON.stringify({ userId: 'test-user' }),
      });

      const response1 = await POST(request1);
      const body1 = await response1.json();

      expect(response1.status).toBe(400);
      expect(body1.error).toBe('Missing required fields');
      expect(body1.code).toBe('VALIDATION_ERROR');

      // Test missing userId
      const request2 = new NextRequest('http://localhost:3000/api/sprint', {
        method: 'POST',
        body: JSON.stringify({ message: 'test' }),
      });

      const response2 = await POST(request2);
      const body2 = await response2.json();

      expect(response2.status).toBe(400);
      expect(body2.error).toBe('Missing required fields');
    });

    it('should validate message format', async () => {
      const request = new NextRequest('http://localhost:3000/api/sprint', {
        method: 'POST',
        body: JSON.stringify({
          message: '',
          userId: 'test-user',
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Invalid message format');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should validate session ID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/sprint', {
        method: 'POST',
        body: JSON.stringify({
          message: 'test message',
          userId: 'test-user',
          sessionId: 'invalid-session-id',
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Invalid session ID format');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should handle Phoenix errors appropriately', async () => {
      const { PhoenixError, ErrorCode } = await import('@phoenix/core/utils/errors');
      
      // Setup mock to throw Phoenix error
      orchestratorInstance.processMessage.mockRejectedValue(
        new PhoenixError(ErrorCode.SESSION_NOT_FOUND, 'Session not found', { sessionId: 'missing' })
      );

      const request = new NextRequest('http://localhost:3000/api/sprint', {
        method: 'POST',
        body: JSON.stringify({
          message: 'test',
          userId: 'test-user',
          sessionId: '12345678-1234-1234-1234-123456789abc',
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.code).toBe('SESSION_NOT_FOUND');
      expect(body.error).toBe('Session not found');
    });

    it('should handle generic errors', async () => {
      // Setup mock to throw generic error
      orchestratorInstance.processMessage.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/sprint', {
        method: 'POST',
        body: JSON.stringify({
          message: 'test',
          userId: 'test-user',
        }),
      });

      orchestratorInstance.createSession.mockResolvedValue({
        id: 'test-session',
        userId: 'test-user',
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.code).toBe('PROCESSING_ERROR');
      expect(body.error).toBe('Message processing failed');
    });
  });

  describe('GET /api/sprint', () => {
    it('should return health check information', async () => {
      orchestratorInstance.healthCheck.mockResolvedValue({
        overall: true,
        services: {
          sessionManager: true,
          frameworkSelector: true,
          aiRouter: true,
        },
        errors: [],
      });

      const request = new NextRequest('http://localhost:3000/api/sprint?action=health');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe('ok');
      expect(body.overall).toBe(true);
      expect(body.services).toBeDefined();
    });

    it('should handle health check errors', async () => {
      orchestratorInstance.healthCheck.mockRejectedValue(new Error('Health check failed'));

      const request = new NextRequest('http://localhost:3000/api/sprint?action=health');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.status).toBe('error');
      expect(body.error).toBe('Health check failed');
    });

    it('should require sessionId for session info', async () => {
      const request = new NextRequest('http://localhost:3000/api/sprint');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Session ID required');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return session information when sessionId provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/sprint?sessionId=test-session-id');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.sessionId).toBe('test-session-id');
      expect(body.status).toBe('active');
    });
  });

  describe('OPTIONS /api/sprint', () => {
    it('should return CORS headers', async () => {
      const response = await OPTIONS();

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
    });
  });
});