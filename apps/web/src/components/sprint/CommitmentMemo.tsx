'use client';

import { useState, useEffect } from 'react';
import { useSprintStore } from '../../lib/stores/useSprintStore';
import type { CommitmentMemo } from '../../lib/stores/useSprintStore';

interface EditableCommitmentMemoProps {
  memo: CommitmentMemo;
  onSave: (updatedMemo: CommitmentMemo) => void;
  onCancel: () => void;
}

function EditableCommitmentMemo({ memo, onSave, onCancel }: EditableCommitmentMemoProps) {
  const [editedMemo, setEditedMemo] = useState<CommitmentMemo>(memo);

  const handleFieldChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setEditedMemo(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof CommitmentMemo] as any,
          [child]: value
        }
      }));
    } else {
      setEditedMemo(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleArrayFieldChange = (field: string, index: number, value: string) => {
    setEditedMemo(prev => {
      const array = prev[field as keyof CommitmentMemo] as string[];
      const newArray = [...array];
      newArray[index] = value;
      return {
        ...prev,
        [field]: newArray
      };
    });
  };

  const addArrayItem = (field: string) => {
    setEditedMemo(prev => ({
      ...prev,
      [field]: [...(prev[field as keyof CommitmentMemo] as string[]), '']
    }));
  };

  const removeArrayItem = (field: string, index: number) => {
    setEditedMemo(prev => {
      const array = prev[field as keyof CommitmentMemo] as string[];
      const newArray = array.filter((_, i) => i !== index);
      return {
        ...prev,
        [field]: newArray
      };
    });
  };

  return (
    <div className="space-y-6">
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h4 className="card-title">Edit Commitment Memo</h4>
          
          {/* Problem Statement */}
          <div>
            <label className="label">
              <span className="label-text font-medium">Problem Statement</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full h-20"
              placeholder="Clear statement of the decision being made..."
              value={editedMemo.problemStatement}
              onChange={(e) => handleFieldChange('problemStatement', e.target.value)}
            />
          </div>

          {/* Key Insights */}
          <div>
            <label className="label">
              <span className="label-text font-medium">Key Insights</span>
            </label>
            {editedMemo.keyInsights.map((insight, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <textarea
                  className="textarea textarea-bordered flex-1"
                  placeholder={`Key insight #${index + 1}...`}
                  value={insight}
                  onChange={(e) => handleArrayFieldChange('keyInsights', index, e.target.value)}
                />
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeArrayItem('keyInsights', index)}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              className="btn btn-outline btn-sm"
              onClick={() => addArrayItem('keyInsights')}
            >
              + Add Insight
            </button>
          </div>

          {/* Micro-Bet */}
          <div className="card bg-primary/5 border border-primary/20">
            <div className="card-body">
              <h5 className="card-title text-lg">🎯 Micro-Bet</h5>
              
              <div>
                <label className="label">
                  <span className="label-text font-medium">Description</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full h-20"
                  placeholder="What specific, small-scale experiment or test will you run?"
                  value={editedMemo.microBet.description}
                  onChange={(e) => handleFieldChange('microBet.description', e.target.value)}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text font-medium">Timeframe</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="e.g., 2 weeks, 1 month"
                    value={editedMemo.microBet.timeframe}
                    onChange={(e) => handleFieldChange('microBet.timeframe', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">
                  <span className="label-text font-medium">Success Metrics</span>
                </label>
                {editedMemo.microBet.successMetrics.map((metric, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      className="input input-bordered flex-1"
                      placeholder={`Success metric #${index + 1}...`}
                      value={metric}
                      onChange={(e) => handleArrayFieldChange('microBet.successMetrics', index, e.target.value)}
                    />
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => removeArrayItem('microBet.successMetrics', index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => addArrayItem('microBet.successMetrics')}
                >
                  + Add Metric
                </button>
              </div>
            </div>
          </div>

          {/* First Domino */}
          <div className="card bg-success/5 border border-success/20">
            <div className="card-body">
              <h5 className="card-title text-lg">🧩 First Domino</h5>
              
              <div>
                <label className="label">
                  <span className="label-text font-medium">Action</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full h-16"
                  placeholder="What is the very first action you will take?"
                  value={editedMemo.firstDomino.action}
                  onChange={(e) => handleFieldChange('firstDomino.action', e.target.value)}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text font-medium">Deadline</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={editedMemo.firstDomino.deadline}
                    onChange={(e) => handleFieldChange('firstDomino.deadline', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="label">
                    <span className="label-text font-medium">Responsible Person</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="Who will do this?"
                    value={editedMemo.firstDomino.responsible}
                    onChange={(e) => handleFieldChange('firstDomino.responsible', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contingency Plans */}
          <div>
            <label className="label">
              <span className="label-text font-medium">Contingency Plans</span>
            </label>
            {editedMemo.contingencyPlans.map((plan, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <textarea
                  className="textarea textarea-bordered flex-1"
                  placeholder={`Contingency plan #${index + 1}...`}
                  value={plan}
                  onChange={(e) => handleArrayFieldChange('contingencyPlans', index, e.target.value)}
                />
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeArrayItem('contingencyPlans', index)}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              className="btn btn-outline btn-sm"
              onClick={() => addArrayItem('contingencyPlans')}
            >
              + Add Contingency
            </button>
          </div>

          {/* Review Date */}
          <div>
            <label className="label">
              <span className="label-text font-medium">Review Date</span>
            </label>
            <input
              type="date"
              className="input input-bordered w-full max-w-xs"
              value={editedMemo.reviewDate}
              onChange={(e) => handleFieldChange('reviewDate', e.target.value)}
            />
            <div className="label">
              <span className="label-text-alt">When will you review progress and next steps?</span>
            </div>
          </div>

          <div className="card-actions justify-end mt-6">
            <button className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={() => onSave(editedMemo)}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CommitmentMemoComponent() {
  const {
    problemBrief,
    selectedFrameworks,
    commitmentMemo,
    setCommitmentMemo,
    completeSession,
    setLoading,
    isLoading,
  } = useSprintStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showGenerated, setShowGenerated] = useState(false);
  const [isExported, setIsExported] = useState(false);

  // Auto-generate commitment memo when component mounts
  useEffect(() => {
    if (!commitmentMemo && problemBrief && selectedFrameworks.length > 0) {
      generateCommitmentMemo();
    }
  }, [commitmentMemo, problemBrief, selectedFrameworks]);

  const generateCommitmentMemo = async () => {
    if (!problemBrief || selectedFrameworks.length === 0) return;
    
    setLoading(true);
    try {
      const memo: CommitmentMemo = {
        problemStatement: generateProblemStatement(),
        chosenFrameworks: selectedFrameworks.map(f => f.title),
        keyInsights: generateKeyInsights(),
        microBet: generateMicroBet(),
        firstDomino: generateFirstDomino(),
        contingencyPlans: generateContingencyPlans(),
        reviewDate: generateReviewDate(),
      };
      
      setCommitmentMemo(memo);
      setTimeout(() => setShowGenerated(true), 500);
    } finally {
      setLoading(false);
    }
  };

  const generateProblemStatement = (): string => {
    return `Decision: ${problemBrief?.summary || 'Problem statement not available'}

Context: ${problemBrief?.context || 'No context provided'}

Stakes: ${problemBrief?.stakes || 'Stakes not defined'}`;
  };

  const generateKeyInsights = (): string[] => {
    const insights = [];
    
    if (selectedFrameworks.length > 0) {
      insights.push(`Applied ${selectedFrameworks.length} framework${selectedFrameworks.length > 1 ? 's' : ''}: ${selectedFrameworks.map(f => f.title).join(', ')}`);
    }
    
    if (problemBrief?.decisionType) {
      insights.push(`This is a ${problemBrief.decisionType} decision, requiring ${problemBrief.decisionType === 'type-2' ? 'careful deliberation and stakeholder input' : 'quick action and learning from outcomes'}`);
    }
    
    // Add framework-specific insights
    selectedFrameworks.forEach(framework => {
      if (framework.keyTakeaway) {
        insights.push(`${framework.title}: ${framework.keyTakeaway}`);
      }
    });
    
    return insights.slice(0, 5); // Limit to 5 insights
  };

  const generateMicroBet = () => {
    const timeframe = problemBrief?.urgency === 'high' ? '1 week' : 
                     problemBrief?.urgency === 'medium' ? '2 weeks' : '1 month';
    
    return {
      description: `Run a small-scale test or pilot to validate the decision approach before full commitment. This allows for learning and adjustment with minimal risk.`,
      timeframe,
      successMetrics: [
        'Clear signal of viability within timeframe',
        'Stakeholder feedback collected and analyzed',
        'Key assumptions validated or invalidated'
      ]
    };
  };

  const generateFirstDomino = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return {
      action: 'Schedule a focused work session to plan the detailed execution of this decision, including stakeholder communication and next steps.',
      deadline: tomorrow.toISOString().split('T')[0],
      responsible: 'Me (decision maker)'
    };
  };

  const generateContingencyPlans = (): string[] => {
    const plans = [];
    
    if (problemBrief?.decisionType === 'type-2') {
      plans.push('If initial approach shows significant risks, convene stakeholder meeting to reassess');
      plans.push('If external conditions change materially, revisit decision with new framework analysis');
    } else {
      plans.push('If micro-bet fails, pivot quickly to alternative approach');
      plans.push('If results are mixed, extend testing period with modified parameters');
    }
    
    plans.push('If resource constraints emerge, scale back scope while maintaining core objectives');
    
    return plans;
  };

  const generateReviewDate = (): string => {
    const reviewDate = new Date();
    const daysToAdd = problemBrief?.urgency === 'high' ? 7 : 
                      problemBrief?.urgency === 'medium' ? 14 : 30;
    reviewDate.setDate(reviewDate.getDate() + daysToAdd);
    return reviewDate.toISOString().split('T')[0];
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      completeSession();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = (updatedMemo: CommitmentMemo) => {
    setCommitmentMemo(updatedMemo);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleExport = () => {
    if (!commitmentMemo) return;

    const content = `# Decision Commitment Memo

## Problem Statement
${commitmentMemo.problemStatement}

## Frameworks Applied
${commitmentMemo.chosenFrameworks.map(f => `- ${f}`).join('\n')}

## Key Insights
${commitmentMemo.keyInsights.map(insight => `- ${insight}`).join('\n')}

## 🎯 Micro-Bet
**Description:** ${commitmentMemo.microBet.description}

**Timeframe:** ${commitmentMemo.microBet.timeframe}

**Success Metrics:**
${commitmentMemo.microBet.successMetrics.map(metric => `- ${metric}`).join('\n')}

## 🧩 First Domino
**Action:** ${commitmentMemo.firstDomino.action}

**Deadline:** ${commitmentMemo.firstDomino.deadline}

**Responsible:** ${commitmentMemo.firstDomino.responsible}

## Contingency Plans
${commitmentMemo.contingencyPlans.map(plan => `- ${plan}`).join('\n')}

## Review Date
${commitmentMemo.reviewDate}

---
*Generated by Phoenix Framework Decision Sprint*
*Date: ${new Date().toLocaleDateString()}*
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commitment-memo-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setIsExported(true);
    setTimeout(() => setIsExported(false), 3000);
  };

  if (isLoading && !commitmentMemo) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="loading loading-spinner loading-lg"></div>
        <span className="ml-4">Generating your commitment memo...</span>
      </div>
    );
  }

  if (!commitmentMemo) {
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
          <span>Unable to generate commitment memo. Please ensure you've completed the problem brief and framework selection steps.</span>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <EditableCommitmentMemo
        memo={commitmentMemo}
        onSave={handleSaveEdit}
        onCancel={handleCancelEdit}
      />
    );
  }

  return (
    <div className="space-y-6">
      {showGenerated && (
        <>
          {/* Success Alert */}
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
            <div>
              <h3 className="font-bold">Decision Sprint Complete! 🎉</h3>
              <div className="text-sm">
                Your commitment memo has been generated. Review, edit if needed, and export your actionable plan.
              </div>
            </div>
          </div>

          {/* Commitment Memo Display */}
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
              <div className="flex justify-between items-start mb-4">
                <h3 className="card-title">Decision Commitment Memo</h3>
                <div className="flex gap-2">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={handleEdit}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    className={`btn btn-sm ${isExported ? 'btn-success' : 'btn-outline'}`}
                    onClick={handleExport}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {isExported ? 'Exported!' : 'Export'}
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Problem Statement */}
                <div>
                  <h4 className="font-semibold text-base-content/80 mb-2">Problem Statement</h4>
                  <div className="prose prose-sm bg-base-200 p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap font-sans text-sm">{commitmentMemo.problemStatement}</pre>
                  </div>
                </div>

                {/* Frameworks Applied */}
                <div>
                  <h4 className="font-semibold text-base-content/80 mb-2">Frameworks Applied</h4>
                  <div className="flex flex-wrap gap-2">
                    {commitmentMemo.chosenFrameworks.map((framework, index) => (
                      <div key={index} className="badge badge-info badge-lg">
                        {framework}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Insights */}
                <div>
                  <h4 className="font-semibold text-base-content/80 mb-2">Key Insights</h4>
                  <ul className="space-y-1">
                    {commitmentMemo.keyInsights.map((insight, index) => (
                      <li key={index} className="text-sm bg-base-200 p-2 rounded flex items-start">
                        <span className="text-primary mr-2">•</span>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Micro-Bet */}
                <div className="card bg-primary/5 border border-primary/20">
                  <div className="card-body">
                    <h4 className="card-title text-lg">🎯 Micro-Bet</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <strong className="text-sm">Description:</strong>
                        <p className="text-sm mt-1">{commitmentMemo.microBet.description}</p>
                      </div>
                      
                      <div className="flex gap-6">
                        <div>
                          <strong className="text-sm">Timeframe:</strong>
                          <p className="text-sm">{commitmentMemo.microBet.timeframe}</p>
                        </div>
                      </div>
                      
                      <div>
                        <strong className="text-sm">Success Metrics:</strong>
                        <ul className="text-sm mt-1 space-y-1">
                          {commitmentMemo.microBet.successMetrics.map((metric, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-primary mr-2">✓</span>
                              {metric}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* First Domino */}
                <div className="card bg-success/5 border border-success/20">
                  <div className="card-body">
                    <h4 className="card-title text-lg">🧩 First Domino</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <strong className="text-sm">Action:</strong>
                        <p className="text-sm mt-1">{commitmentMemo.firstDomino.action}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <strong className="text-sm">Deadline:</strong>
                          <p className="text-sm">{new Date(commitmentMemo.firstDomino.deadline).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <strong className="text-sm">Responsible:</strong>
                          <p className="text-sm">{commitmentMemo.firstDomino.responsible}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contingency Plans */}
                <div>
                  <h4 className="font-semibold text-base-content/80 mb-2">Contingency Plans</h4>
                  <ul className="space-y-2">
                    {commitmentMemo.contingencyPlans.map((plan, index) => (
                      <li key={index} className="text-sm bg-warning/10 border border-warning/20 p-3 rounded flex items-start">
                        <span className="text-warning mr-2">⚠️</span>
                        {plan}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Review Date */}
                <div className="text-center p-4 bg-info/10 border border-info/20 rounded-lg">
                  <strong className="text-sm">Next Review Date:</strong>
                  <p className="text-lg font-semibold text-info">
                    {new Date(commitmentMemo.reviewDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            <button
              className="btn btn-ghost btn-lg"
              onClick={handleEdit}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Memo
            </button>
            
            <button
              className="btn btn-success btn-lg"
              onClick={handleComplete}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Completing...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Complete Sprint
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}