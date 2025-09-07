import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Import types (adjust path once monorepo structure is properly set up)
type KnowledgeContentType = 'mental-model' | 'cognitive-bias' | 'fallacy' | 'strategic-framework' | 'tactical-tool';
type TargetPersona = 'founder' | 'executive' | 'investor' | 'product_manager';
type StartupPhase = 'ideation' | 'seed' | 'growth' | 'scale-up' | 'crisis';

interface KnowledgeContent {
  id: string;
  title: string;
  type: KnowledgeContentType;
  embedding: number[];
  language: string;
  mainCategory: string;
  subcategory: string;
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
  diveDeeperMechanism: string;
  diveDeeperOriginStory: string;
  diveDeeperPitfallsNuances: string;
  extraContent?: string;
  targetPersona: TargetPersona[];
  startupPhase: StartupPhase[];
  problemCategory: string[];
  superModel: boolean;
}

export type SprintStage = 
  | 'problem-intake' 
  | 'diagnostic-interview' 
  | 'decision-classification' 
  | 'problem-brief' 
  | 'framework-selection' 
  | 'framework-application' 
  | 'commitment-memo';

export interface ProblemBrief {
  summary: string;
  context: string;
  stakes: string;
  constraints: string;
  decisionType: 'type-1' | 'type-2';
  urgency: 'low' | 'medium' | 'high';
  complexity: 'low' | 'medium' | 'high';
}

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

interface SprintState {
  // Session management
  sessionId: string | null;
  currentStage: SprintStage;
  isCompleted: boolean;
  createdAt: Date | null;
  
  // Problem intake
  problemInput: string;
  
  // Diagnostic interview
  diagnosticResponses: Record<string, string | number | boolean | string[]>;
  
  // Decision classification
  decisionType: 'type-1' | 'type-2' | null;
  
  // Problem brief
  problemBrief: ProblemBrief | null;
  isProblemBriefConfirmed: boolean;
  
  // Framework selection
  selectedFrameworks: KnowledgeContent[];
  frameworkRecommendations: KnowledgeContent[];
  
  // Commitment memo
  commitmentMemo: CommitmentMemo | null;
  
  // Progress tracking
  completedStages: SprintStage[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
}

interface SprintActions {
  // Session actions
  initializeSession: () => void;
  resetSession: () => void;
  completeSession: () => void;
  saveSession: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  
  // Stage navigation
  setCurrentStage: (stage: SprintStage) => void;
  markStageCompleted: (stage: SprintStage) => void;
  canAdvanceToStage: (stage: SprintStage) => boolean;
  
  // Problem intake
  setProblemInput: (input: string) => void;
  
  // Diagnostic interview
  addDiagnosticResponse: (key: string, value: string | number | boolean | string[]) => void;
  getDiagnosticResponse: (key: string) => string | number | boolean | string[] | undefined;
  
  // Decision classification
  setDecisionType: (type: 'type-1' | 'type-2') => void;
  
  // Problem brief
  setProblemBrief: (brief: ProblemBrief) => void;
  confirmProblemBrief: () => void;
  
  // Framework selection
  setFrameworkRecommendations: (frameworks: KnowledgeContent[]) => void;
  selectFramework: (framework: KnowledgeContent) => void;
  deselectFramework: (frameworkId: string) => void;
  
  // Commitment memo
  setCommitmentMemo: (memo: CommitmentMemo) => void;
  
  // UI state
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

type SprintStore = SprintState & SprintActions;

const initialState: SprintState = {
  sessionId: null,
  currentStage: 'problem-intake',
  isCompleted: false,
  createdAt: null,
  problemInput: '',
  diagnosticResponses: {},
  decisionType: null,
  problemBrief: null,
  isProblemBriefConfirmed: false,
  selectedFrameworks: [],
  frameworkRecommendations: [],
  commitmentMemo: null,
  completedStages: [],
  isLoading: false,
  error: null,
};

const stageOrder: SprintStage[] = [
  'problem-intake',
  'diagnostic-interview', 
  'decision-classification',
  'problem-brief',
  'framework-selection',
  'framework-application',
  'commitment-memo'
];

export const useSprintStore = create<SprintStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Session actions
      initializeSession: () => {
        const sessionId = `sprint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        set({
          sessionId,
          createdAt: new Date(),
          currentStage: 'problem-intake',
          completedStages: [],
          isCompleted: false,
        });
      },
      
      resetSession: () => {
        set(initialState);
      },
      
      completeSession: () => {
        set({
          isCompleted: true,
          currentStage: 'commitment-memo',
          completedStages: [...stageOrder],
        });
      },

      saveSession: async () => {
        const state = get();
        if (!state.sessionId) return;
        
        try {
          // Save to localStorage as backup (Zustand persist already handles this)
          const sessionData = {
            sessionId: state.sessionId,
            currentStage: state.currentStage,
            isCompleted: state.isCompleted,
            createdAt: state.createdAt,
            problemInput: state.problemInput,
            diagnosticResponses: state.diagnosticResponses,
            decisionType: state.decisionType,
            problemBrief: state.problemBrief,
            isProblemBriefConfirmed: state.isProblemBriefConfirmed,
            selectedFrameworks: state.selectedFrameworks,
            commitmentMemo: state.commitmentMemo,
            completedStages: state.completedStages,
          };
          
          localStorage.setItem(`phoenix-sprint-${state.sessionId}`, JSON.stringify(sessionData));
          
          // TODO: In future, save to database via API
          // await fetch('/api/sprint/save', {
          //   method: 'POST',
          //   headers: { 'Content-Type': 'application/json' },
          //   body: JSON.stringify(sessionData)
          // });
          
        } catch (error) {
          console.error('Failed to save session:', error);
          set({ error: 'Failed to save session' });
        }
      },

      loadSession: async (sessionId: string) => {
        try {
          set({ isLoading: true });
          
          // Load from localStorage first
          const savedData = localStorage.getItem(`phoenix-sprint-${sessionId}`);
          if (savedData) {
            const sessionData = JSON.parse(savedData);
            set({
              ...sessionData,
              createdAt: new Date(sessionData.createdAt),
              isLoading: false,
              error: null,
            });
            return;
          }
          
          // TODO: In future, load from database via API
          // const response = await fetch(`/api/sprint/${sessionId}`);
          // if (response.ok) {
          //   const sessionData = await response.json();
          //   set({ ...sessionData, isLoading: false });
          // }
          
          set({ 
            isLoading: false, 
            error: 'Session not found' 
          });
          
        } catch (error) {
          console.error('Failed to load session:', error);
          set({ 
            isLoading: false, 
            error: 'Failed to load session' 
          });
        }
      },
      
      // Stage navigation
      setCurrentStage: (stage: SprintStage) => {
        set({ currentStage: stage });
      },
      
      markStageCompleted: (stage: SprintStage) => {
        const { completedStages } = get();
        if (!completedStages.includes(stage)) {
          set({ 
            completedStages: [...completedStages, stage]
          });
        }
      },
      
      canAdvanceToStage: (targetStage: SprintStage) => {
        const { completedStages } = get();
        const targetIndex = stageOrder.indexOf(targetStage);
        const previousStage = stageOrder[targetIndex - 1];
        
        // Can always go to first stage
        if (targetIndex === 0) return true;
        
        // Can advance if previous stage is completed
        return previousStage ? completedStages.includes(previousStage) : false;
      },
      
      // Problem intake
      setProblemInput: (input: string) => {
        set({ problemInput: input });
      },
      
      // Diagnostic interview
      addDiagnosticResponse: (key: string, value: string | number | boolean | string[]) => {
        const { diagnosticResponses } = get();
        set({
          diagnosticResponses: {
            ...diagnosticResponses,
            [key]: value
          }
        });
      },
      
      getDiagnosticResponse: (key: string) => {
        const { diagnosticResponses } = get();
        return diagnosticResponses[key];
      },
      
      // Decision classification
      setDecisionType: (type: 'type-1' | 'type-2') => {
        set({ decisionType: type });
      },
      
      // Problem brief
      setProblemBrief: (brief: ProblemBrief) => {
        set({ problemBrief: brief });
      },
      
      confirmProblemBrief: () => {
        set({ isProblemBriefConfirmed: true });
      },
      
      // Framework selection
      setFrameworkRecommendations: (frameworks: KnowledgeContent[]) => {
        set({ frameworkRecommendations: frameworks });
      },
      
      selectFramework: (framework: KnowledgeContent) => {
        const { selectedFrameworks } = get();
        if (!selectedFrameworks.find(f => f.id === framework.id)) {
          set({
            selectedFrameworks: [...selectedFrameworks, framework]
          });
        }
      },
      
      deselectFramework: (frameworkId: string) => {
        const { selectedFrameworks } = get();
        set({
          selectedFrameworks: selectedFrameworks.filter(f => f.id !== frameworkId)
        });
      },
      
      // Commitment memo
      setCommitmentMemo: (memo: CommitmentMemo) => {
        set({ commitmentMemo: memo });
      },
      
      // UI state
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
      
      setError: (error: string | null) => {
        set({ error });
      },
    }),
    {
      name: 'phoenix-sprint-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist essential state, not UI state
        sessionId: state.sessionId,
        currentStage: state.currentStage,
        isCompleted: state.isCompleted,
        createdAt: state.createdAt,
        problemInput: state.problemInput,
        diagnosticResponses: state.diagnosticResponses,
        decisionType: state.decisionType,
        problemBrief: state.problemBrief,
        isProblemBriefConfirmed: state.isProblemBriefConfirmed,
        selectedFrameworks: state.selectedFrameworks,
        commitmentMemo: state.commitmentMemo,
        completedStages: state.completedStages,
      }),
    }
  )
);