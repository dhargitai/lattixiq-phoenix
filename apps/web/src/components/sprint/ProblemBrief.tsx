'use client';

import { useState, useEffect } from 'react';
import { useSprintStore } from '../../lib/stores/useSprintStore';
import type { ProblemBrief } from '../../lib/stores/useSprintStore';

interface ProblemBriefEditorProps {
  brief: ProblemBrief;
  onSave: (updatedBrief: ProblemBrief) => void;
  onCancel: () => void;
}

function ProblemBriefEditor({ brief, onSave, onCancel }: ProblemBriefEditorProps) {
  const [editedBrief, setEditedBrief] = useState<ProblemBrief>(brief);

  const handleFieldChange = (field: keyof ProblemBrief, value: string | string[]) => {
    setEditedBrief(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    onSave(editedBrief);
  };

  return (
    <div className="space-y-6">
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h4 className="card-title">Edit Problem Brief</h4>
          
          {/* Problem Summary */}
          <div>
            <label className="label">
              <span className="label-text font-medium">Problem Summary</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full h-24"
              placeholder="Concise description of the core problem..."
              value={editedBrief.summary}
              onChange={(e) => handleFieldChange('summary', e.target.value)}
            />
          </div>

          {/* Context */}
          <div>
            <label className="label">
              <span className="label-text font-medium">Context & Background</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full h-24"
              placeholder="Relevant background information..."
              value={editedBrief.context}
              onChange={(e) => handleFieldChange('context', e.target.value)}
            />
          </div>

          {/* Stakes */}
          <div>
            <label className="label">
              <span className="label-text font-medium">What's at Stake</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full h-24"
              placeholder="Consequences of getting this right or wrong..."
              value={editedBrief.stakes}
              onChange={(e) => handleFieldChange('stakes', e.target.value)}
            />
          </div>

          {/* Constraints */}
          <div>
            <label className="label">
              <span className="label-text font-medium">Constraints & Limitations</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full h-24"
              placeholder="Time, budget, resource, or other constraints..."
              value={editedBrief.constraints}
              onChange={(e) => handleFieldChange('constraints', e.target.value)}
            />
          </div>

          {/* Decision Type */}
          <div>
            <label className="label">
              <span className="label-text font-medium">Decision Type</span>
            </label>
            <div className="flex gap-4">
              <label className="cursor-pointer label">
                <input
                  type="radio"
                  name="decisionType"
                  className="radio radio-primary"
                  checked={editedBrief.decisionType === 'type-1'}
                  onChange={() => handleFieldChange('decisionType', 'type-1')}
                />
                <span className="label-text ml-2">Type 1 (Reversible)</span>
              </label>
              <label className="cursor-pointer label">
                <input
                  type="radio"
                  name="decisionType"
                  className="radio radio-warning"
                  checked={editedBrief.decisionType === 'type-2'}
                  onChange={() => handleFieldChange('decisionType', 'type-2')}
                />
                <span className="label-text ml-2">Type 2 (One-way)</span>
              </label>
            </div>
          </div>

          {/* Urgency & Complexity */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                <span className="label-text font-medium">Urgency Level</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={editedBrief.urgency}
                onChange={(e) => handleFieldChange('urgency', e.target.value as 'low' | 'medium' | 'high')}
              >
                <option value="low">Low - No immediate pressure</option>
                <option value="medium">Medium - Some time pressure</option>
                <option value="high">High - Urgent decision needed</option>
              </select>
            </div>
            
            <div>
              <label className="label">
                <span className="label-text font-medium">Complexity Level</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={editedBrief.complexity}
                onChange={(e) => handleFieldChange('complexity', e.target.value as 'low' | 'medium' | 'high')}
              >
                <option value="low">Low - Straightforward</option>
                <option value="medium">Medium - Some complexity</option>
                <option value="high">High - Very complex</option>
              </select>
            </div>
          </div>

          <div className="card-actions justify-end mt-6">
            <button className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProblemBriefComponent() {
  const {
    problemInput,
    diagnosticResponses,
    decisionType,
    problemBrief,
    isProblemBriefConfirmed,
    setProblemBrief,
    confirmProblemBrief,
    setCurrentStage,
    markStageCompleted,
    setLoading,
    isLoading,
  } = useSprintStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showGenerated, setShowGenerated] = useState(false);

  // Auto-generate problem brief when component mounts
  useEffect(() => {
    if (!problemBrief && problemInput && decisionType) {
      generateProblemBrief();
    }
  }, [problemInput, decisionType, problemBrief]);

  const generateProblemBrief = async () => {
    if (!problemInput || !decisionType) return;
    
    setLoading(true);
    try {
      // Generate problem brief based on existing data
      const brief: ProblemBrief = {
        summary: problemInput,
        context: generateContextFromDiagnostics(),
        stakes: generateStakesFromDiagnostics(),
        constraints: generateConstraintsFromDiagnostics(),
        decisionType: decisionType,
        urgency: mapUrgencyFromDiagnostics(),
        complexity: mapComplexityFromDiagnostics(),
      };
      
      setProblemBrief(brief);
      setTimeout(() => setShowGenerated(true), 500);
    } finally {
      setLoading(false);
    }
  };

  const generateContextFromDiagnostics = (): string => {
    const context = [];
    
    if (diagnosticResponses.business_context) {
      context.push(`Business context: ${diagnosticResponses.business_context}`);
    }
    if (diagnosticResponses.previous_attempts) {
      context.push(`Previous attempts: ${diagnosticResponses.previous_attempts}`);
    }
    if (diagnosticResponses.stakeholders) {
      context.push(`Key stakeholders: ${diagnosticResponses.stakeholders}`);
    }
    
    return context.join('. ') || 'Context information was not provided during the diagnostic interview.';
  };

  const generateStakesFromDiagnostics = (): string => {
    const stakes = [];
    
    if (diagnosticResponses.success_outcome) {
      stakes.push(`Success means: ${diagnosticResponses.success_outcome}`);
    }
    if (diagnosticResponses.failure_impact) {
      stakes.push(`Failure could result in: ${diagnosticResponses.failure_impact}`);
    }
    if (diagnosticResponses.consequences_scale) {
      stakes.push(`Impact level: ${diagnosticResponses.consequences_scale}`);
    }
    
    return stakes.join('. ') || 'The stakes and potential outcomes need to be clarified.';
  };

  const generateConstraintsFromDiagnostics = (): string => {
    const constraints = [];
    
    if (diagnosticResponses.timeline_pressure) {
      constraints.push(`Timeline: ${diagnosticResponses.timeline_pressure}`);
    }
    if (diagnosticResponses.budget_constraints) {
      constraints.push(`Budget: ${diagnosticResponses.budget_constraints}`);
    }
    if (diagnosticResponses.resource_limitations) {
      constraints.push(`Resources: ${diagnosticResponses.resource_limitations}`);
    }
    if (diagnosticResponses.external_dependencies) {
      constraints.push(`Dependencies: ${diagnosticResponses.external_dependencies}`);
    }
    
    return constraints.join('. ') || 'No specific constraints were identified.';
  };

  const mapUrgencyFromDiagnostics = (): 'low' | 'medium' | 'high' => {
    const timeline = diagnosticResponses.timeline_pressure as string;
    if (timeline?.includes('Immediately') || timeline?.includes('This week')) return 'high';
    if (timeline?.includes('This month')) return 'medium';
    return 'low';
  };

  const mapComplexityFromDiagnostics = (): 'low' | 'medium' | 'high' => {
    const stakeholders = diagnosticResponses.stakeholders_count as number || 1;
    const informationQuality = diagnosticResponses.information_confidence as number || 5;
    
    if (stakeholders > 5 || informationQuality < 4) return 'high';
    if (stakeholders > 2 || informationQuality < 7) return 'medium';
    return 'low';
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      confirmProblemBrief();
      markStageCompleted('problem-brief');
      setCurrentStage('framework-selection');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = (updatedBrief: ProblemBrief) => {
    setProblemBrief(updatedBrief);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  if (isLoading && !problemBrief) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="loading loading-spinner loading-lg"></div>
        <span className="ml-4">Generating your problem brief...</span>
      </div>
    );
  }

  if (!problemBrief) {
    return (
      <div className="space-y-6">
        <div className="alert alert-warning">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="stroke-current shrink-0 h-6 w-6" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
          <span>Unable to generate problem brief. Please ensure you've completed the problem input and decision classification steps.</span>
        </div>
        
        <div className="flex justify-center">
          <button 
            className="btn btn-primary" 
            onClick={() => setCurrentStage('problem-intake')}
          >
            Return to Problem Input
          </button>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <ProblemBriefEditor
        brief={problemBrief}
        onSave={handleSaveEdit}
        onCancel={handleCancelEdit}
      />
    );
  }

  return (
    <div className="space-y-6">
      {showGenerated && (
        <>
          {/* Status Alert */}
          {!isProblemBriefConfirmed ? (
            <div className="alert alert-info">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="font-bold">Review Your Problem Brief</h3>
                <div className="text-sm">
                  I've generated a comprehensive problem brief based on your inputs. Please review and confirm or edit as needed.
                </div>
              </div>
            </div>
          ) : (
            <div className="alert alert-success">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="stroke-current shrink-0 h-6 w-6" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <span>Problem Brief confirmed! Ready to proceed with framework selection.</span>
            </div>
          )}

          {/* Problem Brief Display */}
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
              <div className="flex justify-between items-start">
                <h3 className="card-title">Problem Brief</h3>
                {!isProblemBriefConfirmed && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={handleEdit}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-4 w-4 mr-1" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
                      />
                    </svg>
                    Edit
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* Summary */}
                <div>
                  <h4 className="font-semibold text-base-content/80 mb-2">Problem Summary</h4>
                  <p className="text-sm bg-base-200 p-3 rounded-lg">{problemBrief.summary}</p>
                </div>

                {/* Context */}
                <div>
                  <h4 className="font-semibold text-base-content/80 mb-2">Context & Background</h4>
                  <p className="text-sm bg-base-200 p-3 rounded-lg">{problemBrief.context}</p>
                </div>

                {/* Stakes */}
                <div>
                  <h4 className="font-semibold text-base-content/80 mb-2">What's at Stake</h4>
                  <p className="text-sm bg-base-200 p-3 rounded-lg">{problemBrief.stakes}</p>
                </div>

                {/* Constraints */}
                <div>
                  <h4 className="font-semibold text-base-content/80 mb-2">Constraints & Limitations</h4>
                  <p className="text-sm bg-base-200 p-3 rounded-lg">{problemBrief.constraints}</p>
                </div>

                {/* Decision Attributes */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className={`badge ${problemBrief.decisionType === 'type-2' ? 'badge-warning' : 'badge-info'} badge-lg`}>
                      {problemBrief.decisionType === 'type-2' ? 'Type 2' : 'Type 1'} Decision
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`badge ${
                      problemBrief.urgency === 'high' ? 'badge-error' : 
                      problemBrief.urgency === 'medium' ? 'badge-warning' : 'badge-success'
                    } badge-lg`}>
                      {problemBrief.urgency.charAt(0).toUpperCase() + problemBrief.urgency.slice(1)} Urgency
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`badge ${
                      problemBrief.complexity === 'high' ? 'badge-error' : 
                      problemBrief.complexity === 'medium' ? 'badge-warning' : 'badge-success'
                    } badge-lg`}>
                      {problemBrief.complexity.charAt(0).toUpperCase() + problemBrief.complexity.slice(1)} Complexity
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {!isProblemBriefConfirmed ? (
            <div className="flex justify-center gap-4">
              <button
                className="btn btn-ghost btn-lg"
                onClick={handleEdit}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 mr-2" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
                  />
                </svg>
                Edit Brief
              </button>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleConfirm}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Confirming...
                  </>
                ) : (
                  <>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-5 w-5 mr-2" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M5 13l4 4L19 7" 
                      />
                    </svg>
                    Confirm & Continue
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                className="btn btn-primary btn-lg"
                onClick={() => setCurrentStage('framework-selection')}
              >
                Proceed to Framework Selection
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 ml-2" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 5l7 7-7 7" 
                  />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}