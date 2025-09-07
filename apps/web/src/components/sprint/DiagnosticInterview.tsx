'use client';

import { useState } from 'react';
import { useSprintStore } from '../../lib/stores/useSprintStore';

interface Question {
  id: string;
  text: string;
  type: 'text' | 'radio' | 'scale' | 'multiselect';
  options?: string[];
  required: boolean;
}

const diagnosticQuestions: Question[] = [
  {
    id: 'timeline_pressure',
    text: 'How urgent is this decision? When do you need to decide?',
    type: 'radio',
    options: ['Immediately (within 24 hours)', 'This week', 'This month', 'Within 3 months', 'No specific deadline'],
    required: true
  },
  {
    id: 'reversibility',
    text: 'How easily can this decision be reversed or changed later?',
    type: 'radio',
    options: ['Very easy to reverse', 'Somewhat reversible', 'Difficult but possible', 'Nearly impossible to reverse'],
    required: true
  },
  {
    id: 'stakeholders',
    text: 'Who else is affected by or involved in this decision?',
    type: 'text',
    required: true
  },
  {
    id: 'information_confidence',
    text: 'How confident are you that you have enough information to decide?',
    type: 'scale',
    required: true
  },
  {
    id: 'consequences_scale',
    text: 'What are the potential consequences if this decision goes wrong?',
    type: 'radio',
    options: ['Minor setback', 'Moderate impact', 'Significant consequences', 'Business-threatening'],
    required: true
  },
  {
    id: 'decision_factors',
    text: 'What factors are making this decision difficult? (Select all that apply)',
    type: 'multiselect',
    options: ['Too many options', 'Insufficient information', 'Conflicting advice', 'High stakes', 'Time pressure', 'Uncertain outcomes', 'Personal emotions'],
    required: true
  }
];

export function DiagnosticInterview() {
  const {
    diagnosticResponses,
    addDiagnosticResponse,
    getDiagnosticResponse,
    setCurrentStage,
    markStageCompleted,
    setLoading,
    isLoading,
  } = useSprintStore();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  const currentQuestion = diagnosticQuestions[currentQuestionIndex];
  const currentValue = getDiagnosticResponse(currentQuestion.id);
  const isLastQuestion = currentQuestionIndex === diagnosticQuestions.length - 1;
  
  const handleAnswer = (value: string | number | boolean | string[]) => {
    addDiagnosticResponse(currentQuestion.id, value);
  };

  const handleNext = async () => {
    if (isLastQuestion) {
      // Complete diagnostic interview and move to decision classification
      setLoading(true);
      try {
        markStageCompleted('diagnostic-interview');
        setCurrentStage('decision-classification');
      } finally {
        setLoading(false);
      }
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const canProceed = currentQuestion.required ? currentValue !== undefined : true;

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex justify-between items-center mb-8">
        <div className="text-sm text-base-content/60">
          Question {currentQuestionIndex + 1} of {diagnosticQuestions.length}
        </div>
        <progress 
          className="progress progress-primary w-64" 
          value={currentQuestionIndex + 1} 
          max={diagnosticQuestions.length}
        ></progress>
      </div>

      {/* Question */}
      <div className="card bg-base-100 border-2 border-primary/20">
        <div className="card-body">
          <h3 className="card-title text-xl mb-4">{currentQuestion.text}</h3>
          
          {/* Answer input based on question type */}
          {currentQuestion.type === 'text' && (
            <textarea
              className="textarea textarea-bordered w-full h-32"
              placeholder="Please provide details..."
              value={(currentValue as string) || ''}
              onChange={(e) => handleAnswer(e.target.value)}
            />
          )}

          {currentQuestion.type === 'radio' && currentQuestion.options && (
            <div className="space-y-2">
              {currentQuestion.options.map((option) => (
                <label key={option} className="cursor-pointer label">
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    value={option}
                    checked={currentValue === option}
                    onChange={(e) => handleAnswer(e.target.value)}
                    className="radio radio-primary mr-3"
                  />
                  <span className="label-text text-base">{option}</span>
                </label>
              ))}
            </div>
          )}

          {currentQuestion.type === 'scale' && (
            <div className="space-y-4">
              <div className="flex justify-between text-sm text-base-content/60">
                <span>Not confident</span>
                <span>Very confident</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={currentValue as number || 5}
                onChange={(e) => handleAnswer(parseInt(e.target.value))}
                className="range range-primary"
                step="1"
              />
              <div className="w-full flex justify-between text-xs px-2">
                {[...Array(10)].map((_, i) => (
                  <span key={i}>|</span>
                ))}
              </div>
              <div className="text-center text-lg font-semibold text-primary">
                {currentValue || 5}/10
              </div>
            </div>
          )}

          {currentQuestion.type === 'multiselect' && currentQuestion.options && (
            <div className="space-y-2">
              {currentQuestion.options.map((option) => (
                <label key={option} className="cursor-pointer label">
                  <input
                    type="checkbox"
                    checked={Array.isArray(currentValue) ? currentValue.includes(option) : false}
                    onChange={(e) => {
                      const currentArray = Array.isArray(currentValue) ? currentValue : [];
                      if (e.target.checked) {
                        handleAnswer([...currentArray, option]);
                      } else {
                        handleAnswer(currentArray.filter(item => item !== option));
                      }
                    }}
                    className="checkbox checkbox-primary mr-3"
                  />
                  <span className="label-text text-base">{option}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          className="btn btn-outline"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </button>
        
        <button
          className="btn btn-primary"
          onClick={handleNext}
          disabled={!canProceed || isLoading}
        >
          {isLoading ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Processing...
            </>
          ) : isLastQuestion ? (
            'Analyze Decision'
          ) : (
            'Next Question'
          )}
        </button>
      </div>

      {/* Help text */}
      <div className="text-center text-sm text-base-content/60">
        These questions help the Phoenix Framework understand your decision context 
        and select the most relevant mental models for your situation.
      </div>
    </div>
  );
}