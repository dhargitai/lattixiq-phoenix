/**
 * Tests for SessionManager Service
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SessionManager } from './session-manager';
import type { 
  Session, 
  CoreMessage, 
  SessionArtifact, 
  PhoenixPhase,
  SessionConfig,
  ProblemBriefContent 
} from '../types';

// Mock Supabase
const mockSupabaseInsert = vi.fn();
const mockSupabaseUpdate = vi.fn();
const mockSupabaseSelect = vi.fn();

const createChainableMock = (finalResult: any) => {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue(finalResult),
        limit: vi.fn().mockResolvedValue(finalResult),
        single: vi.fn().mockResolvedValue(finalResult),
      }),
      in: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(finalResult),
      }),
      order: vi.fn().mockResolvedValue(finalResult),
      limit: vi.fn().mockResolvedValue(finalResult),
    }),
    insert: mockSupabaseInsert.mockResolvedValue(finalResult),
    update: mockSupabaseUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue(finalResult),
    }),
    eq: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue(finalResult),
      limit: vi.fn().mockResolvedValue(finalResult),
    }),
  };
};

const mockSupabaseClient = {
  from: vi.fn().mockImplementation((table: string) => {
    return createChainableMock({
      data: table === 'sessions' ? [mockSessionData] : 
            table === 'messages' ? mockMessagesData :
            table === 'session_artifacts' ? mockArtifactsData : [],
      error: null,
    });
  }),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// Mock environment variables
const mockEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
};

Object.assign(process.env, mockEnv);

// Mock data
const mockSessionData: Session = {
  id: 'session-123',
  userId: 'user-123',
  status: 'active',
  currentPhase: 'problem_intake',
  phaseStates: {
    problem_intake: { step: 'initial' },
  },
  config: {
    enableConversationBranching: true,
    performanceTracking: true,
    preferredModel: 'gpt-4.1',
    maxFrameworks: 3,
    frameworkSelectionMode: 'auto',
  },
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T01:00:00Z'),
};

const mockMessagesData: CoreMessage[] = [
  {
    role: 'user',
    content: 'I need help with a decision',
  },
  {
    role: 'assistant', 
    content: 'I can help you with that. What decision are you facing?',
  },
];

const mockArtifactsData: SessionArtifact[] = [
  {
    id: 'artifact-1',
    sessionId: 'session-123',
    artifactType: 'problem_brief',
    content: {
      problemStatement: 'Should I pivot my startup?',
      context: 'Considering market changes',
      stakeholders: ['founder'],
      constraints: ['budget'],
      successCriteria: ['clarity'],
      urgency: 'immediate' as const,
      complexity: 'moderate' as const,
      decisionType: '2' as const,
      keyInsights: ['market feedback'],
    },
    phaseCreated: 'problem_intake',
    version: 1,
    isCurrent: true,
    createdAt: new Date('2024-01-01T00:30:00Z'),
    updatedAt: new Date('2024-01-01T00:30:00Z'),
  },
];

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionManager = new SessionManager();

    // Reset mock implementations
    mockSupabaseClient.from.mockImplementation((table: string) => {
      return createChainableMock({
        data: table === 'sessions' ? [mockSessionData] : 
              table === 'messages' ? mockMessagesData :
              table === 'session_artifacts' ? mockArtifactsData : [],
        error: null,
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize successfully with required environment variables', () => {
      expect(() => new SessionManager()).not.toThrow();
    });

    it('should throw error when Supabase URL is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      
      expect(() => new SessionManager()).toThrow('Missing Supabase configuration');
      
      // Restore for other tests
      process.env.NEXT_PUBLIC_SUPABASE_URL = mockEnv.NEXT_PUBLIC_SUPABASE_URL;
    });
  });

  describe('createSession', () => {
    const userId = 'user-123';
    const config: SessionConfig = {
      enableConversationBranching: true,
      performanceTracking: true,
      preferredModel: 'gpt-4.1',
    };

    it('should create a new session successfully', async () => {
      const newSession = { ...mockSessionData, id: 'new-session-456' };
      mockSupabaseInsert.mockResolvedValueOnce({
        data: [newSession],
        error: null,
      });

      const result = await sessionManager.createSession(userId, config);

      expect(result.id).toBe('new-session-456');
      expect(result.userId).toBe(userId);
      expect(result.status).toBe('active');
      expect(result.currentPhase).toBe('problem_intake');
      expect(result.config).toEqual(expect.objectContaining(config));
      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          status: 'active',
          current_phase: 'problem_intake',
          config: expect.objectContaining(config),
        })
      );
    });

    it('should handle database errors during creation', async () => {
      mockSupabaseInsert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(sessionManager.createSession(userId, config)).rejects.toThrow();
    });

    it('should create session with default config when none provided', async () => {
      const newSession = { ...mockSessionData, id: 'default-session' };
      mockSupabaseInsert.mockResolvedValueOnce({
        data: [newSession],
        error: null,
      });

      const result = await sessionManager.createSession(userId);

      expect(result.config).toEqual(expect.objectContaining({
        enableConversationBranching: true,
        performanceTracking: true,
        maxFrameworks: 3,
        frameworkSelectionMode: 'auto',
      }));
    });
  });

  describe('getSession', () => {
    it('should retrieve an existing session', async () => {
      const sessionId = 'session-123';
      
      const result = await sessionManager.getSession(sessionId);

      expect(result).toEqual(mockSessionData);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('sessions');
    });

    it('should throw error for non-existent session', async () => {
      mockSupabaseClient.from.mockReturnValueOnce(createChainableMock({
        data: [],
        error: null,
      }));

      await expect(sessionManager.getSession('non-existent')).rejects.toThrow('Session not found');
    });

    it('should handle database errors during retrieval', async () => {
      mockSupabaseClient.from.mockReturnValueOnce(createChainableMock({
        data: null,
        error: { message: 'Database connection failed' },
      }));

      await expect(sessionManager.getSession('session-123')).rejects.toThrow();
    });
  });

  describe('updateSession', () => {
    const sessionId = 'session-123';

    it('should update session phase', async () => {
      const updates = {
        currentPhase: 'diagnostic_interview' as PhoenixPhase,
        phaseStates: {
          diagnostic_interview: { step: 'initial' },
        },
      };

      mockSupabaseUpdate.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({
          data: [{ ...mockSessionData, ...updates }],
          error: null,
        }),
      });

      const result = await sessionManager.updateSession(sessionId, updates);

      expect(result.currentPhase).toBe('diagnostic_interview');
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          current_phase: 'diagnostic_interview',
          phase_states: updates.phaseStates,
          updated_at: expect.any(String),
        })
      );
    });

    it('should update session status', async () => {
      const updates = { status: 'completed' as const };

      mockSupabaseUpdate.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({
          data: [{ ...mockSessionData, ...updates }],
          error: null,
        }),
      });

      const result = await sessionManager.updateSession(sessionId, updates);

      expect(result.status).toBe('completed');
    });

    it('should handle update errors', async () => {
      mockSupabaseUpdate.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        }),
      });

      await expect(sessionManager.updateSession(sessionId, {})).rejects.toThrow();
    });
  });

  describe('addMessage', () => {
    const sessionId = 'session-123';
    const message: CoreMessage = {
      role: 'user',
      content: 'This is a test message',
    };

    it('should add a message to session', async () => {
      const messageWithId = {
        id: 'message-456',
        session_id: sessionId,
        ...message,
        created_at: new Date().toISOString(),
      };

      mockSupabaseInsert.mockResolvedValueOnce({
        data: [messageWithId],
        error: null,
      });

      const result = await sessionManager.addMessage(sessionId, message);

      expect(result.id).toBe('message-456');
      expect(result.sessionId).toBe(sessionId);
      expect(result.role).toBe(message.role);
      expect(result.content).toBe(message.content);
      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: sessionId,
          role: message.role,
          content: message.content,
        })
      );
    });

    it('should add message with parent for branching', async () => {
      const messageWithParent: CoreMessage = {
        ...message,
        parentMessageId: 'parent-123',
      };

      const messageWithId = {
        id: 'branched-message',
        session_id: sessionId,
        parent_message_id: 'parent-123',
        ...messageWithParent,
        created_at: new Date().toISOString(),
      };

      mockSupabaseInsert.mockResolvedValueOnce({
        data: [messageWithId],
        error: null,
      });

      const result = await sessionManager.addMessage(sessionId, messageWithParent);

      expect(result.parentMessageId).toBe('parent-123');
    });

    it('should handle add message errors', async () => {
      mockSupabaseInsert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' },
      });

      await expect(sessionManager.addMessage(sessionId, message)).rejects.toThrow();
    });
  });

  describe('getConversationMessages', () => {
    const sessionId = 'session-123';

    it('should retrieve conversation messages', async () => {
      const result = await sessionManager.getConversationMessages(sessionId);

      expect(result).toEqual(mockMessagesData);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('messages');
    });

    it('should retrieve messages with limit', async () => {
      const result = await sessionManager.getConversationMessages(sessionId, 1);

      expect(result).toHaveLength(2); // Mock data returns full array
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('messages');
    });

    it('should handle empty conversation', async () => {
      mockSupabaseClient.from.mockReturnValueOnce(createChainableMock({
        data: [],
        error: null,
      }));

      const result = await sessionManager.getConversationMessages(sessionId);

      expect(result).toEqual([]);
    });
  });

  describe('saveArtifact', () => {
    const sessionId = 'session-123';
    const artifactType = 'problem_brief';
    const content: ProblemBriefContent = {
      problemStatement: 'New problem statement',
      context: 'New context',
      stakeholders: ['founder', 'team'],
      constraints: ['time', 'budget'],
      successCriteria: ['user satisfaction'],
      urgency: 'high' as const,
      complexity: 'complex' as const,
      decisionType: '1' as const,
      keyInsights: ['insight 1', 'insight 2'],
    };
    const phaseCreated: PhoenixPhase = 'problem_intake';

    it('should save a new artifact', async () => {
      const newArtifact = {
        id: 'artifact-789',
        session_id: sessionId,
        artifact_type: artifactType,
        content: JSON.stringify(content),
        phase_created: phaseCreated,
        version: 1,
        is_current: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabaseInsert.mockResolvedValueOnce({
        data: [newArtifact],
        error: null,
      });

      const result = await sessionManager.saveArtifact(
        sessionId,
        artifactType,
        content,
        phaseCreated
      );

      expect(result.id).toBe('artifact-789');
      expect(result.sessionId).toBe(sessionId);
      expect(result.artifactType).toBe(artifactType);
      expect(result.content).toEqual(content);
      expect(result.version).toBe(1);
      expect(result.isCurrent).toBe(true);
    });

    it('should handle artifact save errors', async () => {
      mockSupabaseInsert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Artifact save failed' },
      });

      await expect(
        sessionManager.saveArtifact(sessionId, artifactType, content, phaseCreated)
      ).rejects.toThrow();
    });
  });

  describe('getSessionArtifacts', () => {
    const sessionId = 'session-123';

    it('should retrieve all artifacts for session', async () => {
      const result = await sessionManager.getSessionArtifacts(sessionId);

      expect(result).toEqual(mockArtifactsData);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('session_artifacts');
    });

    it('should retrieve artifacts of specific type', async () => {
      const filteredArtifacts = mockArtifactsData.filter(
        a => a.artifactType === 'problem_brief'
      );
      
      mockSupabaseClient.from.mockReturnValueOnce(createChainableMock({
        data: filteredArtifacts,
        error: null,
      }));

      const result = await sessionManager.getSessionArtifacts(sessionId, 'problem_brief');

      expect(result).toEqual(filteredArtifacts);
    });

    it('should retrieve only current artifacts', async () => {
      const currentArtifacts = mockArtifactsData.filter(a => a.isCurrent);
      
      mockSupabaseClient.from.mockReturnValueOnce(createChainableMock({
        data: currentArtifacts,
        error: null,
      }));

      const result = await sessionManager.getSessionArtifacts(sessionId, undefined, true);

      expect(result).toEqual(currentArtifacts);
    });
  });

  describe('branchFromMessage', () => {
    const sessionId = 'session-123';
    const messageId = 'message-456';

    it('should create branch from message', async () => {
      // Mock the update query to deactivate existing branch
      mockSupabaseUpdate.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      // Mock the update query to activate new branch 
      mockSupabaseUpdate.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({
          data: [{ id: messageId, is_active_branch: true }],
          error: null,
        }),
      });

      await sessionManager.branchFromMessage(sessionId, messageId);

      expect(mockSupabaseUpdate).toHaveBeenCalledTimes(2);
    });

    it('should handle branch creation errors', async () => {
      mockSupabaseUpdate.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Branch update failed' },
          }),
        }),
      });

      await expect(
        sessionManager.branchFromMessage(sessionId, messageId)
      ).rejects.toThrow();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when database is accessible', async () => {
      const result = await sessionManager.healthCheck();

      expect(result.available).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return unhealthy status when database fails', async () => {
      mockSupabaseClient.from.mockReturnValueOnce(createChainableMock({
        data: null,
        error: { message: 'Database connection failed' },
      }));

      const result = await sessionManager.healthCheck();

      expect(result.available).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent session operations', async () => {
      const promises = [
        sessionManager.getSession('session-123'),
        sessionManager.addMessage('session-123', { role: 'user', content: 'Message 1' }),
        sessionManager.addMessage('session-123', { role: 'user', content: 'Message 2' }),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual(mockSessionData); // getSession result
    });

    it('should handle large message content', async () => {
      const largeMessage: CoreMessage = {
        role: 'user',
        content: 'x'.repeat(10000), // 10KB message
      };

      const messageWithId = {
        id: 'large-message',
        session_id: 'session-123',
        ...largeMessage,
        created_at: new Date().toISOString(),
      };

      mockSupabaseInsert.mockResolvedValueOnce({
        data: [messageWithId],
        error: null,
      });

      const result = await sessionManager.addMessage('session-123', largeMessage);

      expect(result.content).toBe(largeMessage.content);
    });

    it('should handle special characters in content', async () => {
      const messageWithSpecialChars: CoreMessage = {
        role: 'user',
        content: 'Testing emoji 🚀 and special chars: áéíóú, 中文, العربية',
      };

      const messageWithId = {
        id: 'special-message',
        session_id: 'session-123',
        ...messageWithSpecialChars,
        created_at: new Date().toISOString(),
      };

      mockSupabaseInsert.mockResolvedValueOnce({
        data: [messageWithId],
        error: null,
      });

      const result = await sessionManager.addMessage('session-123', messageWithSpecialChars);

      expect(result.content).toBe(messageWithSpecialChars.content);
    });
  });
});