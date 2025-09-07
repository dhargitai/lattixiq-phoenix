'use client';

import { useSprintStore, SprintStage } from '../../lib/stores/useSprintStore';

interface SprintNavigationProps {
  onSave?: () => void;
  onReset?: () => void;
  showSaveRestore?: boolean;
}

export function SprintNavigation({ 
  onSave, 
  onReset, 
  showSaveRestore = true 
}: SprintNavigationProps) {
  const {
    currentStage,
    completedStages,
    sessionId,
    isCompleted,
    canAdvanceToStage,
    setCurrentStage,
    resetSession,
  } = useSprintStore();

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
  const previousStage = stages[currentStageIndex - 1];
  
  const canGoNext = nextStage ? canAdvanceToStage(nextStage) : false;
  const canGoPrevious = currentStageIndex > 0;

  const handleNext = () => {
    if (nextStage && canAdvanceToStage(nextStage)) {
      setCurrentStage(nextStage);
    }
  };

  const handlePrevious = () => {
    if (previousStage) {
      setCurrentStage(previousStage);
    }
  };

  const handleSave = () => {
    // Save current state to localStorage (already handled by Zustand persist)
    onSave?.();
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset this sprint? All progress will be lost.')) {
      resetSession();
      onReset?.();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Primary Navigation - Mobile Optimized */}
      <div className="flex justify-between items-center gap-2 px-2 sm:px-0">
        <button 
          className="btn btn-outline btn-sm sm:btn-md flex-shrink-0 touch-manipulation" 
          onClick={handlePrevious}
          disabled={!canGoPrevious}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden xs:inline">Previous</span>
        </button>
        
        <div className="text-center flex-grow">
          <div className="text-sm text-base-content/60">
            Step {currentStageIndex + 1} of {stages.length}
          </div>
          {completedStages.length > 0 && (
            <div className="text-xs text-base-content/40">
              {completedStages.length} completed
            </div>
          )}
        </div>
        
        <button 
          className="btn btn-primary btn-sm sm:btn-md flex-shrink-0 touch-manipulation" 
          onClick={handleNext}
          disabled={!canGoNext || isCompleted}
        >
          <span className="hidden xs:inline">{isCompleted ? 'Completed' : 'Continue'}</span>
          <span className="inline xs:hidden">{isCompleted ? '✓' : '→'}</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 hidden xs:inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Save/Reset Actions */}
      {showSaveRestore && (
        <div className="flex justify-center gap-2">
          <button 
            className="btn btn-ghost btn-xs"
            onClick={handleSave}
            disabled={!sessionId}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Save Progress
          </button>
          
          <button 
            className="btn btn-ghost btn-xs text-error"
            onClick={handleReset}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset Sprint
          </button>
        </div>
      )}

      {/* Session Info */}
      {sessionId && (
        <div className="text-center text-xs text-base-content/40">
          Session: {sessionId.split('_')[2]}
        </div>
      )}
    </div>
  );
}