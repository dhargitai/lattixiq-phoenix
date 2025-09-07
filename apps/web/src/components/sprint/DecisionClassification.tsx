'use client';

import { useState, useEffect } from 'react';
import { useSprintStore } from '../../lib/stores/useSprintStore';

type DecisionFactors = {
  reversibility: 'high' | 'medium' | 'low';
  consequences: 'low' | 'medium' | 'high';
  informationQuality: number;
  timeframe: 'immediate' | 'short' | 'medium' | 'long';
};

const classifyDecision = (factors: DecisionFactors): 'type-1' | 'type-2' => {
  // Type 2 decision criteria (irreversible, high-consequence decisions)
  const isLowReversibility = factors.reversibility === 'low';
  const isHighConsequence = factors.consequences === 'high';
  const hasLowInformation = factors.informationQuality < 6;
  const hasTimeToDeliberate = factors.timeframe !== 'immediate';
  
  // Type 2: Low reversibility OR high consequences with adequate information and time
  if (isLowReversibility || (isHighConsequence && !hasLowInformation && hasTimeToDeliberate)) {
    return 'type-2';
  }
  
  // Type 1: Everything else (reversible, lower stakes, or time-pressured decisions)
  return 'type-1';
};

const getDecisionFactors = (diagnosticResponses: Record<string, string | number | boolean>): DecisionFactors => {
  // Map diagnostic responses to decision factors
  const reversibility = (() => {
    const response = diagnosticResponses.reversibility as string;
    if (response?.includes('Very easy')) return 'high';
    if (response?.includes('Somewhat') || response?.includes('Difficult')) return 'medium';
    return 'low';
  })();
  
  const consequences = (() => {
    const response = diagnosticResponses.consequences_scale as string;
    if (response?.includes('Minor') || response?.includes('Moderate')) return 'low';
    if (response?.includes('Significant')) return 'medium';
    return 'high';
  })();
  
  const informationQuality = diagnosticResponses.information_confidence as number || 5;
  
  const timeframe = (() => {
    const response = diagnosticResponses.timeline_pressure as string;
    if (response?.includes('Immediately')) return 'immediate';
    if (response?.includes('This week')) return 'short';
    if (response?.includes('This month')) return 'medium';
    return 'long';
  })();
  
  return { reversibility, consequences, informationQuality, timeframe };
};

export function DecisionClassification() {
  const {
    diagnosticResponses,
    decisionType,
    setDecisionType,
    setCurrentStage,
    markStageCompleted,
    setLoading,
    isLoading,
  } = useSprintStore();
  
  const [factors, setFactors] = useState<DecisionFactors | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  useEffect(() => {
    const calculatedFactors = getDecisionFactors(diagnosticResponses);
    setFactors(calculatedFactors);
    
    const suggestedType = classifyDecision(calculatedFactors);
    setDecisionType(suggestedType);
    
    // Auto-show analysis after a brief delay
    setTimeout(() => setShowAnalysis(true), 500);
  }, [diagnosticResponses, setDecisionType]);
  
  const handleConfirm = async () => {
    setLoading(true);
    try {
      markStageCompleted('decision-classification');
      setCurrentStage('problem-brief');
    } finally {
      setLoading(false);
    }
  };
  
  const handleOverride = (newType: 'type-1' | 'type-2') => {
    setDecisionType(newType);
  };

  if (!factors || !decisionType) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="loading loading-spinner loading-lg"></div>
        <span className="ml-4">Analyzing your decision...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showAnalysis && (
        <>
          {/* Classification Result */}
          <div className={`alert ${decisionType === 'type-2' ? 'alert-warning' : 'alert-info'}`}>
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
              <h3 className="font-bold">
                This appears to be a {decisionType === 'type-2' ? 'Type 2' : 'Type 1'} Decision
              </h3>
              <div className="text-sm">
                {decisionType === 'type-2' 
                  ? 'High-stakes or irreversible decision requiring careful deliberation'
                  : 'Reversible decision where quick action and learning from outcomes is preferred'
                }
              </div>
            </div>
          </div>

          {/* Decision Framework Explanation */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className={`card ${decisionType === 'type-2' ? 'bg-warning/10 border-warning' : 'bg-base-100 border-base-300'} border-2`}>
              <div className="card-body">
                <h4 className="card-title text-warning">Type 2 Decisions</h4>
                <ul className="text-sm space-y-1">
                  <li>• Irreversible or costly to reverse</li>
                  <li>• High consequences if wrong</li>
                  <li>• Benefit from careful analysis</li>
                  <li>• Worth gathering more information</li>
                  <li>• Should involve stakeholders</li>
                </ul>
                <div className="text-xs text-base-content/60 mt-2">
                  Examples: Hiring decisions, major investments, strategic direction
                </div>
              </div>
            </div>

            <div className={`card ${decisionType === 'type-1' ? 'bg-info/10 border-info' : 'bg-base-100 border-base-300'} border-2`}>
              <div className="card-body">
                <h4 className="card-title text-info">Type 1 Decisions</h4>
                <ul className="text-sm space-y-1">
                  <li>• Easily reversible</li>
                  <li>• Lower consequences</li>
                  <li>• Favor quick action</li>
                  <li>• Learn by doing</li>
                  <li>• Don&apos;t over-analyze</li>
                </ul>
                <div className="text-xs text-base-content/60 mt-2">
                  Examples: Feature launches, process changes, experiments
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Details */}
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
              <h4 className="card-title">Decision Analysis</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Reversibility:</strong> {factors.reversibility}
                  <br />
                  <strong>Consequences:</strong> {factors.consequences}
                </div>
                <div>
                  <strong>Information Quality:</strong> {factors.informationQuality}/10
                  <br />
                  <strong>Timeline:</strong> {factors.timeframe}
                </div>
              </div>
            </div>
          </div>

          {/* Override Options */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h4 className="card-title text-sm">Disagree with this classification?</h4>
              <p className="text-xs text-base-content/70 mb-4">
                You can override the suggested classification if you have additional context.
              </p>
              <div className="flex gap-2">
                <button
                  className={`btn btn-sm ${decisionType === 'type-1' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => handleOverride('type-1')}
                >
                  Make it Type 1
                </button>
                <button
                  className={`btn btn-sm ${decisionType === 'type-2' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => handleOverride('type-2')}
                >
                  Make it Type 2
                </button>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <div className="flex justify-center">
            <button
              className="btn btn-primary btn-lg"
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Processing...
                </>
              ) : (
                'Continue with Analysis'
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}