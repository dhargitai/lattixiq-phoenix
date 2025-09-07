// Sprint-related type definitions for the Phoenix Framework

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

export interface DecisionSprint {
  id: string;
  userId: string;
  problemBrief: Record<string, any>;
  commitmentMemo: Record<string, any>;
  createdAt: Date;
}

export type KnowledgeContentType = 'mental-model' | 'cognitive-bias' | 'fallacy' | 'strategic-framework' | 'tactical-tool';
export type TargetPersona = 'founder' | 'executive' | 'investor' | 'product_manager';
export type StartupPhase = 'ideation' | 'seed' | 'growth' | 'scale-up' | 'crisis';

export interface KnowledgeContent {
  id: string;
  title: string;
  type: KnowledgeContentType;
  embedding: number[]; // 1536-dimensional vector
  language: string;
  mainCategory: string;
  subcategory: string;
  
  // Crystallize & Apply Content Structure
  hook: string; // Engaging opener
  definition: string; // Clear explanation
  analogyOrMetaphor: string; // Conceptual bridge
  keyTakeaway: string; // Tweet-sized summary
  classicExample: string; // Well-known example
  modernExample: string; // Contemporary scenario
  pitfall: string; // Negative consequences
  payoff: string; // Benefits when applied
  visualMetaphor: string; // Visual representation prompt
  visualMetaphorUrl?: string; // Optional image URL
  
  // Deep Dive Content
  diveDeeperMechanism: string; // How it works
  diveDeeperOriginStory: string; // Historical development
  diveDeeperPitfallsNuances: string; // Advanced limitations
  extraContent?: string; // Additional markdown content
  
  // Targeting & Personalization
  targetPersona: TargetPersona[];
  startupPhase: StartupPhase[];
  problemCategory: string[];
  superModel: boolean; // Foundational concept flag
}

// Sprint session state interfaces
export interface SprintState {
  currentStage: 'problem-intake' | 'diagnostic-interview' | 'decision-classification' | 'problem-brief' | 'framework-selection' | 'framework-application' | 'commitment-memo';
  problemInput: string;
  diagnosticResponses: Record<string, any>;
  decisionType: 'type-1' | 'type-2' | null;
  problemBrief: Record<string, any> | null;
  selectedFrameworks: KnowledgeContent[];
  commitmentMemo: Record<string, any> | null;
  sessionId: string | null;
  isCompleted: boolean;
}

// Problem Brief structure
export interface ProblemBrief {
  summary: string;
  context: string;
  stakes: string;
  constraints: string;
  decisionType: 'type-1' | 'type-2';
  urgency: 'low' | 'medium' | 'high';
  complexity: 'low' | 'medium' | 'high';
}

// Commitment Memo structure  
export interface CommitmentMemo {
  problemStatement: string;
  chosenFrameworks: string[];
  keyInsights: string[];
  microBet: {
    description: string;
    timeframe: string;
    successMetrics: string[];
  };
  firstDomino: {
    action: string;
    deadline: string;
    responsible: string;
  };
  contingencyPlans: string[];
  reviewDate: string;
}