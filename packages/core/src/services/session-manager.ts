import { createClient } from '@supabase/supabase-js';
import type {
  Session,
  SessionConfig,
  Message,
  MessageRole,
  SessionArtifact,
  ArtifactType,
  ISessionManager,
  SessionStatus,
  PhoenixPhase,
} from '../types';

export class SessionManager implements ISessionManager {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async createSession(userId: string, config: SessionConfig = {}): Promise<Session> {
    const defaultConfig: SessionConfig = {
      enableBranching: true,
      enableFrameworkRecommendations: true,
      responseTimeout: 30000,
      maxMessagesPerPhase: 50,
      verboseMode: false,
      skipTutorials: false,
      ...config,
    };

    const { data, error } = await this.supabase
      .from('sessions')
      .insert({
        user_id: userId,
        status: 'active',
        current_phase: 'problem_intake',
        phase_states: {},
        config: defaultConfig,
        metadata: {},
        started_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    return this.transformSession(data);
  }

  async loadSession(sessionId: string): Promise<Session> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      throw new Error(`Failed to load session: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return this.transformSession(data);
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session> {
    const updateData: any = {};
    
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.currentPhase !== undefined) updateData.current_phase = updates.currentPhase;
    if (updates.phaseStates !== undefined) updateData.phase_states = updates.phaseStates;
    if (updates.config !== undefined) updateData.config = updates.config;
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
    if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt;
    
    updateData.last_activity_at = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update session: ${error.message}`);
    }

    return this.transformSession(data);
  }

  async addMessage(
    sessionId: string, 
    message: Omit<Message, 'id' | 'createdAt'>
  ): Promise<Message> {
    const { data, error } = await this.supabase
      .from('messages')
      .insert({
        session_id: sessionId,
        parent_message_id: message.parentMessageId || null,
        role: message.role,
        content: message.content,
        model_used: message.modelUsed || null,
        phase_number: message.phaseNumber,
        is_active_branch: message.isActiveBranch !== false,
        metadata: message.metadata || {},
        performance_metrics: message.performanceMetrics || {},
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add message: ${error.message}`);
    }

    return this.transformMessage(data);
  }

  async branchFromMessage(messageId: string): Promise<Session> {
    const { data: messageData, error: messageError } = await this.supabase
      .from('messages')
      .select('session_id')
      .eq('id', messageId)
      .single();

    if (messageError || !messageData) {
      throw new Error(`Message not found: ${messageId}`);
    }

    const sessionId = messageData.session_id;
    
    const { error: deactivateError } = await this.supabase
      .from('messages')
      .update({ is_active_branch: false })
      .eq('session_id', sessionId)
      .gt('created_at', (await this.supabase
        .from('messages')
        .select('created_at')
        .eq('id', messageId)
        .single()).data.created_at);

    if (deactivateError) {
      throw new Error(`Failed to deactivate branch: ${deactivateError.message}`);
    }

    await this.supabase
      .from('sessions')
      .update({
        metadata: {
          branched_from_message: messageId,
          branched_at: new Date().toISOString(),
        }
      })
      .eq('id', sessionId);

    return this.loadSession(sessionId);
  }

  async saveArtifact(
    artifact: Omit<SessionArtifact, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SessionArtifact> {
    const { error: updateError } = await this.supabase
      .from('session_artifacts')
      .update({ is_current: false })
      .eq('session_id', artifact.sessionId)
      .eq('artifact_type', artifact.artifactType)
      .eq('is_current', true);

    if (updateError) {
      console.warn('Failed to update previous artifacts:', updateError);
    }

    const { data, error } = await this.supabase
      .from('session_artifacts')
      .insert({
        session_id: artifact.sessionId,
        artifact_type: artifact.artifactType,
        content: artifact.content,
        phase_created: artifact.phaseCreated,
        created_from_message_id: artifact.createdFromMessageId || null,
        version: artifact.version || 1,
        is_current: artifact.isCurrent !== false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save artifact: ${error.message}`);
    }

    return this.transformArtifact(data);
  }

  async getArtifacts(sessionId: string, type?: ArtifactType): Promise<SessionArtifact[]> {
    let query = this.supabase
      .from('session_artifacts')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_current', true)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('artifact_type', type);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get artifacts: ${error.message}`);
    }

    return (data || []).map(this.transformArtifact);
  }

  async getMessages(sessionId: string, activeBranchOnly: boolean = true): Promise<Message[]> {
    let query = this.supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (activeBranchOnly) {
      query = query.eq('is_active_branch', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get messages: ${error.message}`);
    }

    return (data || []).map(this.transformMessage);
  }

  async getMessagesByPhase(
    sessionId: string, 
    phase: PhoenixPhase
  ): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('phase_number', phase)
      .eq('is_active_branch', true)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get messages by phase: ${error.message}`);
    }

    return (data || []).map(this.transformMessage);
  }

  async completeSession(sessionId: string): Promise<Session> {
    return this.updateSession(sessionId, {
      status: 'completed' as SessionStatus,
      completedAt: new Date(),
    });
  }

  async pauseSession(sessionId: string): Promise<Session> {
    return this.updateSession(sessionId, {
      status: 'paused' as SessionStatus,
    });
  }

  async resumeSession(sessionId: string): Promise<Session> {
    return this.updateSession(sessionId, {
      status: 'active' as SessionStatus,
    });
  }

  async abandonSession(sessionId: string): Promise<Session> {
    return this.updateSession(sessionId, {
      status: 'abandoned' as SessionStatus,
      completedAt: new Date(),
    });
  }

  private transformSession(data: any): Session {
    return {
      id: data.id,
      userId: data.user_id,
      status: data.status,
      currentPhase: data.current_phase,
      phaseStates: data.phase_states,
      config: data.config,
      metadata: data.metadata,
      startedAt: new Date(data.started_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      lastActivityAt: new Date(data.last_activity_at),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private transformMessage(data: any): Message {
    return {
      id: data.id,
      sessionId: data.session_id,
      parentMessageId: data.parent_message_id,
      role: data.role,
      content: data.content,
      modelUsed: data.model_used,
      phaseNumber: data.phase_number,
      isActiveBranch: data.is_active_branch,
      metadata: data.metadata,
      performanceMetrics: data.performance_metrics,
      createdAt: new Date(data.created_at),
    };
  }

  private transformArtifact(data: any): SessionArtifact {
    return {
      id: data.id,
      sessionId: data.session_id,
      artifactType: data.artifact_type,
      content: data.content,
      phaseCreated: data.phase_created,
      createdFromMessageId: data.created_from_message_id,
      version: data.version,
      isCurrent: data.is_current,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}