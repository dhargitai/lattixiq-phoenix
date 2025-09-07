'use client';

import { useEffect } from 'react';
import { useSprintStore, SprintStage } from '../../lib/stores/useSprintStore';
import { SprintHeader } from '../../components/sprint/SprintHeader';
import { SprintProgress } from '../../components/sprint/SprintProgress';
import { SprintNavigation } from '../../components/sprint/SprintNavigation';
import { ProblemIntakeForm } from '../../components/sprint/ProblemIntakeForm';
import { DiagnosticInterview } from '../../components/sprint/DiagnosticInterview';
import { DecisionClassification } from '../../components/sprint/DecisionClassification';
import { ProblemBriefComponent } from '../../components/sprint/ProblemBrief';
import { FrameworkSelection } from '../../components/sprint/FrameworkSelection';
import { CommitmentMemoComponent } from '../../components/sprint/CommitmentMemo';

export default function SprintPage() {
  const {
    sessionId,
    currentStage,
    completedStages,
    isLoading,
    error,
    initializeSession,
    setCurrentStage,
    canAdvanceToStage,
    saveSession,
  } = useSprintStore();

  // Initialize session if not already created
  useEffect(() => {
    if (!sessionId) {
      initializeSession();
    }
  }, [sessionId, initializeSession]);

  const stages: SprintStage[] = [
    'problem-intake',
    'diagnostic-interview', 
    'decision-classification',
    'problem-brief',
    'framework-selection',
    'framework-application',
    'commitment-memo'
  ];

  const currentStageIndex = stages.indexOf(currentStage);
  const nextStage = stages[currentStageIndex + 1];
  const canGoNext = nextStage ? canAdvanceToStage(nextStage) : false;
  const canGoPrevious = currentStageIndex > 0;

  const handleNext = () => {
    if (nextStage && canAdvanceToStage(nextStage)) {
      setCurrentStage(nextStage);
    }
  };

  const handlePrevious = () => {
    const previousStage = stages[currentStageIndex - 1];
    if (previousStage) {
      setCurrentStage(previousStage);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Main Sprint Container - Mobile Optimized */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Sprint Header */}
        <SprintHeader />
        
        {/* Error Alert */}
        {error && (
          <div className="alert alert-error mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        
        {/* Progress Indicator */}
        <SprintProgress 
          currentStage={currentStage} 
          showNavigation={true}
          onStageClick={setCurrentStage}
        />
        
        {/* Session Info */}
        {sessionId && (
          <div className="text-center text-sm text-base-content/60 mt-4 mb-8">
            Session ID: {sessionId.split('_')[2]}
          </div>
        )}
        
        {/* Main Sprint Content - Mobile Friendly */}
        <div className="card bg-base-200 shadow-lg mt-4 sm:mt-8">
          <div className="card-body px-4 sm:px-6 py-6">
            {currentStage === 'problem-intake' && (
              <div>
                <h2 className="card-title text-2xl mb-4">
                  Let&apos;s Start Your Decision Sprint
                </h2>
                <p className="text-base-content/70 mb-6">
                  The Phoenix Framework will guide you through breaking down your decision 
                  into manageable steps. Start by describing the problem you&apos;re facing.
                </p>
                <ProblemIntakeForm />
              </div>
            )}
            
            {currentStage === 'diagnostic-interview' && (
              <div>
                <h2 className="card-title text-2xl mb-4">Diagnostic Interview</h2>
                <p className="text-base-content/70 mb-6">
                  Let&apos;s understand the context and constraints of your decision. 
                  This will help us classify your decision and select the best frameworks.
                </p>
                <DiagnosticInterview />
              </div>
            )}
            
            {currentStage === 'decision-classification' && (
              <div>
                <h2 className="card-title text-2xl mb-4">Decision Classification</h2>
                <p className="text-base-content/70 mb-6">
                  Based on your responses, we&apos;ll classify this as either a Type 1 (reversible, 
                  quick action) or Type 2 (irreversible, deliberate analysis) decision.
                </p>
                <DecisionClassification />
              </div>
            )}

            {currentStage === 'problem-brief' && (
              <div>
                <h2 className="card-title text-2xl mb-4">Problem Brief</h2>
                <p className="text-base-content/70 mb-6">
                  Review and confirm your structured problem brief. This will guide our framework selection.
                </p>
                <ProblemBriefComponent />
              </div>
            )}

            {currentStage === 'framework-selection' && (
              <div>
                <h2 className="card-title text-2xl mb-4">Framework Selection</h2>
                <p className="text-base-content/70 mb-6">
                  Select the most relevant mental models and frameworks for your specific decision.
                </p>
                <FrameworkSelection />
              </div>
            )}

            {currentStage === 'framework-application' && (
              <div>
                <h2 className="card-title text-2xl mb-4">Framework Application</h2>
                <p className="text-base-content/70 mb-6">
                  Apply your selected frameworks step-by-step to analyze your decision.
                </p>
                <div className="alert alert-info">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>Framework application component coming in next development phase. Proceeding to commitment memo.</span>
                </div>
                <div className="flex justify-center mt-6">
                  <button 
                    className="btn btn-primary btn-lg"
                    onClick={() => setCurrentStage('commitment-memo')}
                  >
                    Continue to Commitment Memo
                  </button>
                </div>
              </div>
            )}

            {currentStage === 'commitment-memo' && (
              <div>
                <h2 className="card-title text-2xl mb-4">Commitment Memo</h2>
                <p className="text-base-content/70 mb-6">
                  Your final decision summary with actionable next steps, micro-bet, and first domino.
                </p>
                <CommitmentMemoComponent />
              </div>
            )}
          </div>
        </div>
        
        {/* Sprint Navigation */}
        <div className="mt-8">
          <SprintNavigation 
            onSave={saveSession}
            showSaveRestore={true}
          />
        </div>
      </div>
    </div>
  );
}