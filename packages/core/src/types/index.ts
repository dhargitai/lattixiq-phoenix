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
  
  // Feature flags
  enableBranching?: boolean;
  enableFrameworkRecommendations?: boolean;
  
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
 * Context available to phase handlers
 */
export interface PhaseContext {
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
  loadSession(sessionId: string): Promise<Session>;
  updateSession(sessionId: string, updates: Partial<Session>): Promise<Session>;
  addMessage(sessionId: string, message: Omit<Message, 'id' | 'createdAt'>): Promise<Message>;
  branchFromMessage(messageId: string): Promise<Session>;
  saveArtifact(artifact: Omit<SessionArtifact, 'id' | 'createdAt' | 'updatedAt'>): Promise<SessionArtifact>;
  getArtifacts(sessionId: string, type?: ArtifactType): Promise<SessionArtifact[]>;
}

/**
 * Framework selector interface
 */
export interface IFrameworkSelector {
  embedProblem(problemText: string): Promise<number[]>;
  findRelevantFrameworks(
    problemEmbedding: number[], 
    context: PhaseContext,
    options?: FrameworkSearchOptions
  ): Promise<FrameworkMatch[]>;
  scoreFrameworks(
    matches: FrameworkMatch[], 
    context: PhaseContext
  ): Promise<ScoredFramework[]>;
  curateFrameworks(
    scored: ScoredFramework[], 
    maxCount: number
  ): Promise<FrameworkSelection[]>;
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
  selectModel(phase: PhoenixPhase, override?: AIModelType): AIModelType;
  assembleContext(session: Session, phase: PhoenixPhase, frameworks?: FrameworkSelection[]): PromptContext;
  executeWithStreaming(model: AIModelType, context: PromptContext): AsyncGenerator<string>;
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