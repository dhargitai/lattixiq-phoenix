// Phoenix Framework Core Types
// Data models for the Phoenix Framework system

/**
 * User interface with UUID, email, timestamps, and user preference fields
 * Source: architecture/data-models.md#User
 */
export interface User {
  id: string;
  email: string;
  createdAt: Date;
  testimonialState: 'not_asked' | 'asked_first' | 'dismissed_first' | 'submitted' | 'asked_second' | 'dismissed_second';
  reminderEnabled: boolean;
  reminderTime: string;
  reminderTimezone: string;
  reminderLastSent?: Date;
  testimonialUrl?: string;
  shownModals: string[];
  roadmapCount: number;
  freeRoadmapsUsed: boolean;
  testimonialBonusUsed: boolean;
}

/**
 * DecisionSprint interface for storing problem briefs and commitment memos
 * Source: architecture/data-models.md#DecisionSprint
 */
export interface DecisionSprint {
  id: string;
  userId: string;
  problemBrief: Record<string, any>;
  commitmentMemo: Record<string, any>;
  createdAt: Date;
}

/**
 * KnowledgeContent interface for mental models with 1536-dimensional vector embeddings
 * Source: architecture/data-models.md#KnowledgeContent
 */
export type KnowledgeContentType = 'mental-model' | 'cognitive-bias' | 'fallacy' | 'strategic-framework' | 'tactical-tool';
export type MainCategory = 'Core Sciences & Mathematics' | 'Biology & Evolution' | 'Psychology & Human Behavior' | 'Thinking & Learning Processes' | 'Human Systems & Strategy';
export type TargetPersona = 'founder' | 'executive' | 'investor' | 'product_manager';
export type StartupPhase = 'ideation' | 'seed' | 'growth' | 'scale-up' | 'crisis';
export type ProblemCategory = 'pivot' | 'hiring' | 'fundraising' | 'co-founder_conflict' | 'product-market_fit' | 'go-to-market' | 'team_and_culture' | 'operations' | 'competitive_strategy' | 'pricing' | 'risk_management';

export interface KnowledgeContent {
  id: string;
  title: string;
  type: KnowledgeContentType;
  embedding: number[]; // 1536-dimensional vector
  language: string;
  mainCategory: MainCategory;
  subcategory: string;
  
  // Crystallize & Apply Content Structure
  hook: string;
  definition: string;
  analogyOrMetaphor: string;
  keyTakeaway: string;
  classicExample: string;
  modernExample: string;
  pitfall: string;
  payoff: string;
  visualMetaphor: string;
  visualMetaphorUrl?: string;
  
  // Deep Dive Content
  diveDeeperMechanism: string;
  diveDeeperOriginStory: string;
  diveDeeperPitfallsNuances: string;
  extraContent?: string;
  
  // Targeting & Personalization
  targetPersona: TargetPersona[];
  startupPhase: StartupPhase[];
  problemCategory: ProblemCategory[];
  superModel: boolean;
}

/**
 * UserSubscriptions interface for managing Stripe subscription data
 */
export interface UserSubscriptions {
  userId: string;
  subscriptionStatus: 'free' | 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionCurrentPeriodEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ContentBlocks interface for dynamic content management
 */
export interface ContentBlocks {
  id: string;
  contentId: string;
  content: string;
  metadata?: Record<string, any>;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PHOENIX CORE SESSION MANAGEMENT TYPES
// ============================================================================

/**
 * Session status enumeration
 */
export type SessionStatus = 'active' | 'completed' | 'abandoned' | 'paused';

/**
 * Phoenix Framework phases enumeration
 */
export type PhoenixPhase = 
  | 'problem_intake'
  | 'diagnostic_interview' 
  | 'type_classification'
  | 'framework_selection'
  | 'framework_application'
  | 'commitment_memo_generation';

/**
 * Artifact types for session artifacts
 */
export type ArtifactType = 
  | 'problem_brief'
  | 'commitment_memo'
  | 'diagnostic_notes'
  | 'classification_result'
  | 'framework_application_notes'
  | 'user_insights';

/**
 * AI model types for tracking which model was used
 */
export type AIModelType = 
  | 'gpt-4.1'
  | 'gpt-4.1-mini'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | 'claude-3.5-sonnet';

/**
 * Message roles in conversations
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Session interface - tracks Phoenix Framework decision sprint sessions
 */
export interface Session {
  id: string;
  userId: string;
  status: SessionStatus;
  currentPhase: PhoenixPhase;
  phaseStates: Record<string, any>;
  config: SessionConfig;
  metadata: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Session configuration interface
 */
export interface SessionConfig {
  // Model preferences
  defaultModel?: AIModelType;
  phaseModelOverrides?: Partial<Record<PhoenixPhase, AIModelType>>;
  modelPreferences?: AIProviderConfig;
  
  // Feature flags
  enableBranching?: boolean;
  enableFrameworkRecommendations?: boolean;
  enableConversationBranching?: boolean;
  performanceTracking?: boolean;
  
  // Timeouts and limits
  responseTimeout?: number;
  maxMessagesPerPhase?: number;
  
  // User preferences
  verboseMode?: boolean;
  skipTutorials?: boolean;
}

/**
 * Message interface - stores conversation history with branching support
 */
export interface Message {
  id: string;
  sessionId: string;
  parentMessageId?: string;
  role: MessageRole;
  content: string;
  modelUsed?: AIModelType;
  phaseNumber: PhoenixPhase;
  isActiveBranch: boolean;
  metadata: MessageMetadata;
  performanceMetrics: PerformanceMetrics;
  createdAt: Date;
}

/**
 * Message metadata for additional context
 */
export interface MessageMetadata {
  // UI state
  isVisible?: boolean;
  hasAttachments?: boolean;
  
  // Processing state
  processingTime?: number;
  tokensUsed?: number;
  
  // Context
  contextSources?: string[];
  frameworksReferenced?: string[];
  
  // User interaction
  userFeedback?: 'helpful' | 'not_helpful';
  userRating?: number;
}

/**
 * Performance metrics for operations
 */
export interface PerformanceMetrics {
  totalTime?: number;
  analysisTime?: number;
  searchTime?: number;
  scoringTime?: number;
  curationTime?: number;
  promptTime?: number;
  aiGenerationTime?: number;
  toolsFound?: number;
  toolsSelected?: number;
  tokensUsed?: number;
  cost?: number;
}

/**
 * Message embedding interface
 */
export interface MessageEmbedding {
  messageId: string;
  embedding: number[]; // 1536-dimensional vector
  embeddingModel: string;
  generatedAt: Date;
}

/**
 * Session artifact interface - stores problem briefs, commitment memos, etc.
 */
export interface SessionArtifact {
  id: string;
  sessionId: string;
  artifactType: ArtifactType;
  content: ArtifactContent;
  phaseCreated: PhoenixPhase;
  createdFromMessageId?: string;
  version: number;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Union type for different artifact content structures
 */
export type ArtifactContent = 
  | ProblemBriefContent
  | CommitmentMemoContent
  | DiagnosticNotesContent
  | ClassificationResultContent
  | FrameworkApplicationNotesContent
  | UserInsightsContent;

/**
 * Problem brief content structure
 */
export interface ProblemBriefContent {
  problemStatement: string;
  context: string;
  stakeholders: string[];
  constraints: string[];
  successCriteria: string[];
  urgency: 'immediate' | 'short-term' | 'long-term';
  complexity: 'simple' | 'moderate' | 'complex';
  decisionType: '1' | '2' | 'hybrid';
  keyInsights: string[];
}

/**
 * Commitment memo content structure
 */
export interface CommitmentMemoContent {
  decision: string;
  rationale: string;
  frameworksUsed: string[];
  risks: Risk[];
  microBet: MicroBet;
  firstDomino: FirstDomino;
  successMetrics: string[];
  reviewDate: Date;
  stakeholderCommunication: string;
}

/**
 * Risk assessment structure
 */
export interface Risk {
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

/**
 * Micro bet structure
 */
export interface MicroBet {
  description: string;
  cost: string;
  timeframe: string;
  successCriteria: string[];
}

/**
 * First domino structure
 */
export interface FirstDomino {
  action: string;
  deadline: Date;
  responsible: string;
  dependencies: string[];
}

/**
 * Diagnostic notes content structure
 */
export interface DiagnosticNotesContent {
  keyFindings: string[];
  patterns: string[];
  concerns: string[];
  opportunities: string[];
  recommendations: string[];
}

/**
 * Classification result content structure
 */
export interface ClassificationResultContent {
  decisionType: '1' | '2' | 'hybrid';
  confidence: number;
  reasoning: string;
  characteristics: {
    reversibility: 'high' | 'medium' | 'low';
    consequence: 'high' | 'medium' | 'low';
    informationAvailability: 'complete' | 'partial' | 'limited';
    timeConstraint: 'tight' | 'moderate' | 'flexible';
  };
}

/**
 * Framework application notes content structure
 */
export interface FrameworkApplicationNotesContent {
  frameworksApplied: AppliedFramework[];
  insights: string[];
  decisions: string[];
  nextSteps: string[];
}

/**
 * Applied framework structure
 */
export interface AppliedFramework {
  frameworkId: string;
  frameworkName: string;
  application: string;
  insights: string[];
  score: number;
}

/**
 * User insights content structure
 */
export interface UserInsightsContent {
  patterns: string[];
  preferences: string[];
  strengths: string[];
  growthAreas: string[];
  recommendations: string[];
}

/**
 * Phase transition interface
 */
export interface PhaseTransition {
  id: string;
  sessionId: string;
  fromPhase?: PhoenixPhase;
  toPhase: PhoenixPhase;
  validationResults: ValidationResult;
  transitionReason?: string;
  triggeredByMessageId?: string;
  transitionedAt: Date;
}

/**
 * Validation result structure
 */
export interface ValidationResult {
  isValid: boolean;
  score: number;
  requiredElements: ValidationElement[];
  missingElements?: string[];
  warnings?: string[];
}

/**
 * Validation element structure
 */
export interface ValidationElement {
  name: string;
  required: boolean;
  present: boolean;
  score: number;
  details?: string;
}

/**
 * Framework selection interface
 */
export interface FrameworkSelection {
  id: string;
  sessionId: string;
  knowledgeContentId: string;
  relevanceScore: number;
  scoreBreakdown: FrameworkScoreBreakdown;
  selectionRank: number;
  selectionReason?: string;
  wasApplied: boolean;
  applicationNotes?: string;
  selectedAt: Date;
  appliedAt?: Date;
}

/**
 * Framework score breakdown for transparency
 */
export interface FrameworkScoreBreakdown {
  directRelevance: number;
  applicabilityNow: number;
  foundationalValue: number;
  simplicityBonus: number;
  personalRelevance: number;
  complementarity: number;
  overallScore: number;
  reasoning: string;
}

// Type alias for backward compatibility
export type ScoreBreakdown = FrameworkScoreBreakdown;

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

// ============================================================================
// PHASE HANDLER TYPES
// ============================================================================

/**
 * Phase handler interface - implemented by each phase handler
 */
export interface PhaseHandler {
  readonly phase: PhoenixPhase;
  
  /**
   * Process a message in this phase
   */
  processMessage(
    message: string,
    context: PhaseContext
  ): Promise<PhaseResponse>;
  
  /**
   * Validate if this phase is ready to transition to the next
   */
  validateReadiness(context: PhaseContext): Promise<ValidationResult>;
  
  /**
   * Get the next phase this handler can transition to
   */
  getNextPhase(context: PhaseContext): PhoenixPhase | null;
}

/**
 * Context available to phase handlers (legacy)
 */
export interface PhaseContextLegacy {
  session: Session;
  messages: Message[];
  artifacts: SessionArtifact[];
  selectedFrameworks?: FrameworkSelection[];
  userProfile?: User;
}

/**
 * Response from phase processing
 */
export interface PhaseResponse {
  content: string;
  shouldTransition?: boolean;
  nextPhase?: PhoenixPhase;
  artifacts?: Partial<SessionArtifact>[];
  frameworkSelections?: Partial<FrameworkSelection>[];
  metadata?: Record<string, any>;
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * Session manager interface
 */
export interface ISessionManager {
  createSession(userId: string, config?: SessionConfig): Promise<Session>;
  getSession(sessionId: string): Promise<Session | null>;
  updateSession(sessionId: string, updates: Partial<Session>): Promise<Session>;
  addMessage(sessionId: string, message: Omit<Message, 'id' | 'createdAt'>): Promise<string>;
  getConversationMessages(sessionId: string, messageId?: string): Promise<CoreMessage[]>;
  branchFromMessage(sessionId: string, messageId: string): Promise<{ newBranchId: string; parentMessageId: string }>;
  saveArtifact(sessionId: string, artifact: SessionArtifact): Promise<SessionArtifact>;
  getSessionArtifacts(sessionId: string, type?: ArtifactType): Promise<SessionArtifact[]>;
  healthCheck(): Promise<{ available: boolean; error?: string }>;
}

/**
 * Framework selector interface
 */
export interface IFrameworkSelector {
  selectFrameworks(
    problemStatement: string,
    sessionId: string,
    options?: FrameworkSelectionOptions
  ): Promise<FrameworkSelection[]>;
  healthCheck(): Promise<{ available: boolean; error?: string }>;
}

/**
 * Framework search options
 */
export interface FrameworkSearchOptions {
  maxResults?: number;
  minSimilarity?: number;
  targetPersona?: TargetPersona[];
  startupPhase?: StartupPhase[];
  problemCategory?: ProblemCategory[];
  contentTypes?: KnowledgeContentType[];
}

/**
 * Framework match from semantic search
 */
export interface FrameworkMatch extends KnowledgeContent {
  similarity: number;
  searchSource: 'semantic' | 'category' | 'persona';
}

/**
 * Scored framework with detailed scoring
 */
export interface ScoredFramework extends FrameworkMatch {
  scoreBreakdown: FrameworkScoreBreakdown;
}

/**
 * AI router interface
 */
export interface IAIRouter {
  selectModel(
    taskType: 'analysis' | 'quick_response' | 'deep_thinking' | 'framework_selection',
    modelOverride?: AIModelType,
    sessionPreferences?: Partial<AIProviderConfig>
  ): AIModel;
  
  assembleContext(
    messages: CoreMessage[],
    artifacts?: SessionArtifact[],
    frameworks?: FrameworkSelection[],
    phaseContext?: PhaseContext
  ): {
    systemPrompt: string;
    contextMessages: CoreMessage[];
    metadata: Record<string, unknown>;
  };
  
  generateResponse(
    prompt: string,
    model: AIModel,
    context?: PhaseContext
  ): Promise<AIResponse>;
  
  generateStreamingResponse(
    messages: CoreMessage[],
    model: AIModel,
    context?: PhaseContext
  ): Promise<StreamingResponse>;
  
  setModelOverride(sessionId: string, modelType: AIModelType): void;
  clearModelOverride(sessionId: string): void;
  getPerformanceMetrics(): PerformanceMetrics;
  healthCheck(): Promise<{
    openai: boolean;
    google: boolean;
    errors: string[];
  }>;
}

/**
 * Prompt context structure
 */
export interface PromptContext {
  systemPrompt: string;
  messages: ContextMessage[];
  frameworks?: KnowledgeContent[];
  artifacts?: SessionArtifact[];
  phase: PhoenixPhase;
  userProfile?: User;
  config: SessionConfig;
}

/**
 * Context message structure
 */
export interface ContextMessage {
  role: MessageRole;
  content: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// ADDITIONAL AI ROUTER TYPES FOR IMPLEMENTATION
// ============================================================================

/**
 * CoreMessage type from AI SDK - alias for compatibility
 */
export interface CoreMessage {
  id?: string;
  sessionId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  parentMessageId?: string;
  phaseNumber?: number;
  createdAt?: Date;
}

/**
 * AI Model configuration interface
 */
export interface AIModel {
  type: AIModelType;
  provider: any; // AI SDK provider instance
  config: AIModelConfig;
}

/**
 * AI Model configuration
 */
export interface AIModelConfig {
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}

/**
 * AI Provider configuration
 */
export interface AIProviderConfig {
  preferredModel?: AIModelType;
  fallbackModel?: AIModelType;
  timeout?: number;
}

/**
 * AI Response interface
 */
export interface AIResponse {
  content: string;
  model: AIModelType;
  metrics: PerformanceMetrics;
}

/**
 * Streaming Response interface
 */
export interface StreamingResponse {
  textStream: AsyncIterable<string>;
  finishReason: any;
  usage: any;
  model: AIModelType;
  operationId: string;
  onFinish?: (result: any) => Promise<void>;
}

/**
 * Enhanced performance metrics for AI operations
 */
export interface PerformanceMetrics {
  duration?: number;
  tokensUsed?: number;
  tokensInput?: number;
  tokensOutput?: number;
  cost?: number;
  modelUsed?: AIModelType;
  operationId?: string;
  totalTime?: number;
  analysisTime?: number;
  searchTime?: number;
  scoringTime?: number;
  curationTime?: number;
  promptTime?: number;
  aiGenerationTime?: number;
  toolsFound?: number;
  toolsSelected?: number;
  operation?: string;
}

/**
 * Enhanced phase context for AI router
 */
export interface PhaseContext {
  sessionId: string;
  userId: string;
  currentPhase: PhoenixPhase;
  phaseState: Record<string, any>;
  messages: CoreMessage[];
  artifacts: SessionArtifact[];
  config: SessionConfig;
  createdAt: Date;
  updatedAt: Date;
  frameworkSelections?: FrameworkSelection[];
}

/**
 * Phoenix Orchestrator interface
 */
export interface IPhoenixOrchestrator {
  processMessage(
    sessionId: string,
    message: string,
    config?: MessageProcessingConfig
  ): Promise<OrchestrationResult>;
  
  branchConversation(
    sessionId: string,
    parentMessageId: string,
    newMessage: string,
    config?: Omit<MessageProcessingConfig, 'parentMessageId'>
  ): Promise<OrchestrationResult>;
  
  createSession(userId: string, options?: OrchestrationOptions): Promise<Session>;
  getPerformanceMetrics(): PerformanceMetrics;
  healthCheck(): Promise<{
    overall: boolean;
    services: Record<string, boolean>;
    errors: string[];
  }>;
}

/**
 * Message processing configuration
 */
export interface MessageProcessingConfig {
  maxProcessingTimeMs?: number;
  enableFrameworkSelection?: boolean;
  modelOverride?: AIModelType;
  enableBranching?: boolean;
  parentMessageId?: string;
}

/**
 * Orchestration result
 */
export interface OrchestrationResult {
  sessionId: string;
  messageId: string;
  content: string;
  currentPhase: PhoenixPhase;
  previousPhase?: PhoenixPhase;
  phaseTransition?: PhaseTransition;
  frameworkSelections: FrameworkSelection[];
  artifacts: SessionArtifact[];
  metrics: PerformanceMetrics;
  conversationBranch?: {
    parentMessageId: string;
    branchMessageId: string;
  };
}

/**
 * Orchestration options
 */
export interface OrchestrationOptions {
  enableConversationBranching?: boolean;
  modelPreferences?: AIProviderConfig;
  performanceTracking?: boolean;
}