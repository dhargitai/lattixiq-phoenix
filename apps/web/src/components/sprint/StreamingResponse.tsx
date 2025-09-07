'use client';

import { UIMessage } from 'ai';

interface StreamingResponseProps {
  messages: UIMessage[];
  isLoading: boolean;
}

export function StreamingResponse({ messages, isLoading }: StreamingResponseProps) {
  if (messages.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Message History */}
      {messages.map((message, index) => (
        <div key={index} className={`chat ${message.role === 'user' ? 'chat-end' : 'chat-start'}`}>
          <div className="chat-image avatar">
            <div className="w-10 rounded-full">
              {message.role === 'user' ? (
                <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center">
                  U
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-secondary text-secondary-content flex items-center justify-center">
                  🔥
                </div>
              )}
            </div>
          </div>
          <div className="chat-header">
            {message.role === 'user' ? 'You' : 'Phoenix Framework'}
            <time className="text-xs opacity-50 ml-2">
              {new Date().toLocaleTimeString()}
            </time>
          </div>
          <div className={`chat-bubble ${
            message.role === 'user' 
              ? 'chat-bubble-primary' 
              : 'chat-bubble-secondary'
          }`}>
            <div className="whitespace-pre-wrap">
              {message.parts?.map((part, partIndex) => {
                switch (part.type) {
                  case 'text':
                    return <span key={partIndex}>{part.text}</span>;
                  default:
                    return null;
                }
              }) || ''}
            </div>
          </div>
        </div>
      ))}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="chat chat-start">
          <div className="chat-image avatar">
            <div className="w-10 rounded-full">
              <div className="w-10 h-10 rounded-full bg-secondary text-secondary-content flex items-center justify-center">
                🔥
              </div>
            </div>
          </div>
          <div className="chat-header">
            Phoenix Framework
            <time className="text-xs opacity-50 ml-2">
              {new Date().toLocaleTimeString()}
            </time>
          </div>
          <div className="chat-bubble chat-bubble-secondary">
            <div className="flex items-center space-x-2">
              <span className="loading loading-dots loading-sm"></span>
              <span>Analyzing your decision...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}