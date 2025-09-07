'use client';

export function SprintHeader() {
  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center mb-4">
        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
          <svg 
            className="w-6 h-6 text-primary-content" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M13 10V3L4 14h7v7l9-11h-7z" 
            />
          </svg>
        </div>
      </div>
      <h1 className="text-3xl font-bold text-base-content mb-2">
        Phoenix Framework
      </h1>
      <p className="text-lg text-base-content/70">
        Decision Sprint Session
      </p>
    </div>
  );
}