'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useSprintStore } from '../../lib/stores/useSprintStore';
import { StreamingResponse } from './StreamingResponse';

export function ProblemIntakeForm() {
  const {
    problemInput,
    sessionId,
    setProblemInput,
    setError,
    setCurrentStage,
    markStageCompleted,
  } = useSprintStore();

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/sprint',
    }),
    onError: (error) => {
      console.error('Chat error:', error);
      setError('Failed to process your request. Please try again.');
    },
    onFinish: (message) => {
      console.log('Problem intake completed:', message);
      // Mark current stage as completed and advance to diagnostic interview
      markStageCompleted('problem-intake');
      setCurrentStage('diagnostic-interview');
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemInput.trim() || isLoading) return;

    setError(null);
    
    try {
      // Send message to streaming API
      await sendMessage(
        {
          text: problemInput,
        },
        {
          body: {
            sessionId: sessionId,
            phase: 'problem-intake'
          }
        }
      );
      
    } catch (error) {
      console.error('Error submitting problem:', error);
      setError('Failed to submit problem. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="form-control">
        <label className="label">
          <span className="label-text text-lg font-medium">
            What decision are you struggling with?
          </span>
        </label>
        <textarea
          className="textarea textarea-bordered h-32 text-base"
          placeholder="Describe your challenge in detail. Include context about your situation, the options you're considering, and what makes this decision difficult..."
          value={problemInput}
          onChange={(e) => setProblemInput(e.target.value)}
          required
        />
        <label className="label">
          <span className="label-text-alt text-base-content/60">
            Be as specific as possible - the more detail you provide, the better we can help.
          </span>
        </label>
      </div>

      {/* Character count */}
      <div className="flex justify-between items-center text-sm">
        <div className="text-base-content/60">
          {problemInput.length} characters
        </div>
        <div className={`
          ${problemInput.length < 50 
            ? 'text-warning' 
            : problemInput.length < 100 
              ? 'text-info' 
              : 'text-success'
          }
        `}>
          {problemInput.length < 50 
            ? 'Add more detail for better results' 
            : problemInput.length < 100 
              ? 'Good detail level' 
              : 'Excellent detail level'
          }
        </div>
      </div>

      {/* Submit Button */}
      <div className="form-control">
        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={!problemInput.trim() || isLoading}
        >
          {isLoading ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Processing...
            </>
          ) : (
            'Start Decision Sprint'
          )}
        </button>
      </div>

      {/* Help Text */}
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
          ></path>
        </svg>
        <div>
          <h3 className="font-bold">💡 Pro Tip</h3>
          <div className="text-sm">
            Include specific details like timeline, stakeholders, resources, and potential consequences. 
            This helps the Phoenix Framework select the most relevant mental models for your situation.
          </div>
        </div>
      </div>

      {/* Streaming Response */}
      <StreamingResponse messages={messages} isLoading={isLoading} />
    </form>
  );
}