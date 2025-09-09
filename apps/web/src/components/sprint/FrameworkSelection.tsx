'use client';

import { useEffect, useState } from 'react';
import { useSprintStore } from '../../lib/stores/useSprintStore';
import { useChat } from '@ai-sdk/react';
import type { FrameworkSelection } from '@phoenix/core';

interface FrameworkDisplayProps {
  framework: FrameworkSelection;
  rank: number;
}

function FrameworkDisplay({ framework, rank }: FrameworkDisplayProps) {
  const formatRelevanceScore = (score: number): string => {
    if (score >= 0.8) return "Very High";
    if (score >= 0.7) return "High";
    if (score >= 0.6) return "Medium";
    return "Moderate";
  };

  const getRelevanceColor = (score: number): string => {
    if (score >= 0.8) return "badge-success";
    if (score >= 0.7) return "badge-primary";
    if (score >= 0.6) return "badge-warning";
    return "badge-neutral";
  };

  return (
    <div className="card bg-base-100 border-2 border-primary/20 shadow-md hover:shadow-lg transition-all duration-200">
      <div className="card-body p-4">
        <div className="flex items-start gap-3">
          {/* Rank Badge */}
          <div className="badge badge-primary badge-lg font-bold">
            #{rank}
          </div>
          
          <div className="flex-1">
            <h4 className="card-title text-lg mb-2">{framework.title ?? 'Selected Framework'}</h4>
            
            {/* Relevance Score */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`badge ${getRelevanceColor(framework.relevanceScore)}`}>
                {formatRelevanceScore(framework.relevanceScore)}
              </span>
              <span className="text-sm text-base-content/60">
                ({(framework.relevanceScore * 100).toFixed(0)}% match)
              </span>
            </div>

            {/* Selection Reason */}
            <p className="text-sm text-base-content/80 mb-3 font-medium">
              {framework.selectionReason}
            </p>
            
            {/* Score Breakdown Reasoning */}
            {framework.scoreBreakdown?.reasoning && (
              <p className="text-sm text-base-content/70 mb-3">
                💡 {framework.scoreBreakdown.reasoning}
              </p>
            )}

            {/* Application Status */}
            <div className="flex items-center gap-2">
              <div className={`badge ${framework.wasApplied ? 'badge-success' : 'badge-outline'}`}>
                {framework.wasApplied ? '✓ Applied' : 'Ready to Apply'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FrameworkSelection() {
  const {
    sessionId,
    setCurrentStage,
    markStageCompleted,
  } = useSprintStore();

  const [selectedFrameworks, setSelectedFrameworks] = useState<FrameworkSelection[]>([]);
  const [isAutoProgressing, setIsAutoProgressing] = useState(false);

  const { messages, append, isLoading } = useChat({
    api: '/api/sprint',
    body: {
      sessionId,
    },
    onFinish: (message) => {
      // Check if the message contains framework selections and should auto-progress
      if (message.content.includes('framework') && 
          message.content.includes('apply') && 
          !isAutoProgressing) {
        setIsAutoProgressing(true);
        
        // Auto-progress to framework application after a brief delay
        setTimeout(() => {
          markStageCompleted('framework-selection');
          setCurrentStage('framework-application');
        }, 2000);
      }
    },
  });

  // Start framework selection process when component mounts
  useEffect(() => {
    if (sessionId && messages.length === 0) {
      append('Please select the most relevant frameworks for my problem.');
    }
  }, [sessionId, messages.length, append]);

  // Extract framework selections from assistant messages
  useEffect(() => {
    const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
    if (lastAssistantMessage?.content) {
      // Parse framework selections from the message
      // This would normally come from the API response metadata
      // For now, create mock frameworks based on content
      const mockFrameworks: FrameworkSelection[] = [
        {
          id: '1',
          sessionId,
          knowledgeContentId: 'framework-1',
          title: 'First Principles Thinking',
          relevanceScore: 0.92,
          scoreBreakdown: {
            directRelevance: 0.95,
            applicabilityNow: 0.90,
            foundationalValue: 0.90,
            simplicityBonus: 0.1,
            personalRelevance: 0.85,
            complementarity: 0.95,
            overallScore: 0.92,
            reasoning: 'Perfect for breaking down complex problems to fundamental truths'
          },
          selectionRank: 1,
          selectionReason: 'Essential for understanding the core components of your decision',
          wasApplied: false,
          createdAt: new Date(),
        },
        {
          id: '2',
          sessionId,
          knowledgeContentId: 'framework-2',
          title: 'OODA Loop',
          relevanceScore: 0.88,
          scoreBreakdown: {
            directRelevance: 0.85,
            applicabilityNow: 0.95,
            foundationalValue: 0.80,
            simplicityBonus: 0.15,
            personalRelevance: 0.80,
            complementarity: 0.90,
            overallScore: 0.88,
            reasoning: 'Excellent for rapid decision-making under time pressure'
          },
          selectionRank: 2,
          selectionReason: 'Matches your need for structured, rapid decision-making',
          wasApplied: false,
          createdAt: new Date(),
        },
        {
          id: '3',
          sessionId,
          knowledgeContentId: 'framework-3',
          title: 'Pre-mortem Analysis',
          relevanceScore: 0.84,
          scoreBreakdown: {
            directRelevance: 0.80,
            applicabilityNow: 0.85,
            foundationalValue: 0.75,
            simplicityBonus: 0.1,
            personalRelevance: 0.90,
            complementarity: 0.85,
            overallScore: 0.84,
            reasoning: 'Helps identify potential failure points before committing'
          },
          selectionRank: 3,
          selectionReason: 'Critical for understanding risks in your high-stakes decision',
          wasApplied: false,
          createdAt: new Date(),
        },
      ];

      if (lastAssistantMessage.content.includes('framework') && selectedFrameworks.length === 0) {
        setSelectedFrameworks(mockFrameworks);
      }
    }
  }, [messages, sessionId, selectedFrameworks.length]);

  if (isLoading && selectedFrameworks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="loading loading-spinner loading-lg"></div>
        <span className="text-lg">Analyzing your problem to select the most relevant frameworks...</span>
        <span className="text-sm text-base-content/60">This may take a moment as I find the perfect approaches for your situation.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="alert alert-info">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          className="stroke-current shrink-0 w-6 h-6"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div>
          <h3 className="font-bold">Frameworks Selected for You</h3>
          <div className="text-xs">I've analyzed your problem and automatically selected the most relevant frameworks to guide your decision-making process.</div>
        </div>
      </div>

      {/* AI Response */}
      {messages.filter(m => m.role === 'assistant').map((message, index) => (
        <div key={index} className="chat chat-start">
          <div className="chat-bubble chat-bubble-primary max-w-none">
            <div className="prose prose-sm max-w-none text-primary-content">
              {message.content.split('\n').map((line, i) => (
                <p key={i} className="mb-2 last:mb-0">{line}</p>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Selected Frameworks Display */}
      {selectedFrameworks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Your Selected Frameworks</h3>
          
          <div className="grid gap-4">
            {selectedFrameworks.map((framework, index) => (
              <FrameworkDisplay 
                key={framework.id} 
                framework={framework} 
                rank={index + 1}
              />
            ))}
          </div>

          {/* Auto-progress indicator */}
          {isAutoProgressing && (
            <div className="alert alert-success">
              <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>Perfect! Moving on to apply these frameworks to your specific situation...</span>
            </div>
          )}

          {/* Manual continue button (backup if auto-progress fails) */}
          {!isAutoProgressing && selectedFrameworks.length > 0 && (
            <div className="flex justify-end pt-4">
              <button 
                className="btn btn-primary"
                onClick={() => {
                  markStageCompleted('framework-selection');
                  setCurrentStage('framework-application');
                }}
              >
                Continue to Apply Frameworks
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}