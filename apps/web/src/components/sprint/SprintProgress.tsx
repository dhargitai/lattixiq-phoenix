'use client';

import { useSprintStore, SprintStage } from '../../lib/stores/useSprintStore';

interface SprintProgressProps {
  currentStage: SprintStage;
  showNavigation?: boolean;
  onStageClick?: (stage: SprintStage) => void;
}

const stages = [
  { id: 'problem-intake' as SprintStage, name: 'Problem Intake', description: 'Describe your challenge', icon: '📝' },
  { id: 'diagnostic-interview' as SprintStage, name: 'Diagnostic', description: 'Answer key questions', icon: '🔍' },
  { id: 'decision-classification' as SprintStage, name: 'Classification', description: 'Type 1 or Type 2?', icon: '⚖️' },
  { id: 'problem-brief' as SprintStage, name: 'Problem Brief', description: 'Validate understanding', icon: '📋' },
  { id: 'framework-selection' as SprintStage, name: 'Framework Selection', description: 'Choose mental models', icon: '🧠' },
  { id: 'framework-application' as SprintStage, name: 'Application', description: 'Apply frameworks', icon: '⚡' },
  { id: 'commitment-memo' as SprintStage, name: 'Commitment Memo', description: 'Action plan & next steps', icon: '✅' }
];

export function SprintProgress({ 
  currentStage, 
  showNavigation = false, 
  onStageClick 
}: SprintProgressProps) {
  const { completedStages, canAdvanceToStage } = useSprintStore();
  
  const currentIndex = stages.findIndex(stage => stage.id === currentStage);
  const completionPercentage = ((currentIndex + 1) / stages.length) * 100;

  const getStageStatus = (stageId: SprintStage, index: number) => {
    if (completedStages.includes(stageId)) return 'completed';
    if (stageId === currentStage) return 'current';
    if (canAdvanceToStage(stageId)) return 'available';
    return 'locked';
  };

  const getStageClasses = (status: string, isClickable: boolean) => {
    const baseClasses = `
      w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-2 text-sm font-semibold
      transition-all duration-200 relative
      ${isClickable ? 'cursor-pointer hover:scale-110 active:scale-95 touch-manipulation' : ''}
      min-h-[2rem] min-w-[2rem] sm:min-h-[2.5rem] sm:min-w-[2.5rem]
    `;
    
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-success text-success-content shadow-md`;
      case 'current':
        return `${baseClasses} bg-primary text-primary-content shadow-lg ring-2 ring-primary ring-offset-2`;
      case 'available':
        return `${baseClasses} bg-info text-info-content shadow-sm hover:bg-info-focus`;
      default:
        return `${baseClasses} bg-base-300 text-base-content/40`;
    }
  };

  const handleStageClick = (stage: typeof stages[0], status: string) => {
    if (showNavigation && onStageClick && (status === 'available' || status === 'completed' || status === 'current')) {
      onStageClick(stage.id);
    }
  };

  return (
    <div className="w-full">
      {/* Progress Bar */}
      <div className="flex items-center justify-center mb-6">
        <div className="w-full max-w-md relative">
          <progress 
            className="progress progress-primary w-full h-3" 
            value={completionPercentage} 
            max={100}
          ></progress>
          <div className="text-center mt-2 text-sm font-medium">
            {Math.round(completionPercentage)}% Complete
          </div>
        </div>
      </div>
      
      {/* Stage Indicators - Mobile Responsive */}
      <div className="flex justify-between items-center text-xs max-w-4xl mx-auto px-2 sm:px-0">
        {stages.map((stage, index) => {
          const status = getStageStatus(stage.id, index);
          const isClickable = showNavigation && (status === 'available' || status === 'completed' || status === 'current');
          
          return (
            <div 
              key={stage.id} 
              className={`
                flex flex-col items-center text-center flex-1 px-1 py-2
                ${isClickable ? 'cursor-pointer touch-manipulation' : ''}
                transition-transform duration-200 active:scale-95
              `}
              onClick={() => handleStageClick(stage, status)}
            >
              <div className={getStageClasses(status, isClickable)}>
                {status === 'completed' ? (
                  <span className="text-base sm:text-lg">✓</span>
                ) : (
                  <span className="text-base sm:text-lg">{stage.icon}</span>
                )}
                
                {/* Current stage pulse animation */}
                {status === 'current' && (
                  <div className="absolute inset-0 rounded-full animate-ping bg-primary opacity-20"></div>
                )}
              </div>
              
              <div className={`
                max-w-16 sm:max-w-24 text-center mt-1
                ${status === 'current' ? 'text-primary font-semibold' : 
                  status === 'completed' ? 'text-success font-medium' :
                  status === 'available' ? 'text-info' : 'text-base-content/40'}
              `}>
                <div className="font-medium text-xs sm:text-sm leading-tight">{stage.name}</div>
                <div className="text-xs opacity-70 mt-1 leading-tight hidden sm:block">{stage.description}</div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Stage Legend */}
      {showNavigation && (
        <div className="mt-4 flex justify-center">
          <div className="text-xs text-base-content/60 text-center">
            <span className="inline-flex items-center mr-4">
              <span className="w-3 h-3 rounded-full bg-success mr-1"></span>
              Completed
            </span>
            <span className="inline-flex items-center mr-4">
              <span className="w-3 h-3 rounded-full bg-primary mr-1"></span>
              Current
            </span>
            <span className="inline-flex items-center mr-4">
              <span className="w-3 h-3 rounded-full bg-info mr-1"></span>
              Available
            </span>
            <span className="inline-flex items-center">
              <span className="w-3 h-3 rounded-full bg-base-300 mr-1"></span>
              Locked
            </span>
          </div>
        </div>
      )}
    </div>
  );
}