export enum ErrorCode {
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  INVALID_PHASE_TRANSITION = 'INVALID_PHASE_TRANSITION',
  PHASE_VALIDATION_FAILED = 'PHASE_VALIDATION_FAILED',
  AI_MODEL_ERROR = 'AI_MODEL_ERROR',
  EMBEDDING_GENERATION_FAILED = 'EMBEDDING_GENERATION_FAILED',
  FRAMEWORK_SELECTION_FAILED = 'FRAMEWORK_SELECTION_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export interface ErrorContext {
  sessionId?: string;
  userId?: string;
  phase?: string;
  operation?: string;
  details?: Record<string, any>;
}

export class PhoenixError extends Error {
  public readonly code: ErrorCode;
  public readonly context: ErrorContext;
  public readonly timestamp: Date;
  public readonly isRetryable: boolean;
  public readonly recoverySuggestions: string[];

  constructor(
    code: ErrorCode,
    message: string,
    context: ErrorContext = {},
    isRetryable: boolean = false,
    recoverySuggestions: string[] = []
  ) {
    super(message);
    this.name = 'PhoenixError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
    this.isRetryable = isRetryable;
    this.recoverySuggestions = recoverySuggestions;

    Object.setPrototypeOf(this, PhoenixError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      isRetryable: this.isRetryable,
      recoverySuggestions: this.recoverySuggestions,
      stack: this.stack,
    };
  }

  getUserMessage(): string {
    const baseMessage = this.getBaseUserMessage();
    const suggestions = this.recoverySuggestions.length > 0
      ? '\n\nTry the following:\n' + this.recoverySuggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')
      : '';
    
    return baseMessage + suggestions;
  }

  private getBaseUserMessage(): string {
    switch (this.code) {
      case ErrorCode.SESSION_NOT_FOUND:
        return 'We couldn\'t find your session. Please start a new decision sprint.';
      
      case ErrorCode.INVALID_PHASE_TRANSITION:
        return 'Unable to move to the next phase. Some required information may be missing.';
      
      case ErrorCode.PHASE_VALIDATION_FAILED:
        return 'The current phase needs more information before we can continue.';
      
      case ErrorCode.AI_MODEL_ERROR:
        return 'There was an issue with the AI processing. Please try again.';
      
      case ErrorCode.EMBEDDING_GENERATION_FAILED:
        return 'Failed to process your problem statement. Please try rephrasing.';
      
      case ErrorCode.FRAMEWORK_SELECTION_FAILED:
        return 'Unable to select appropriate frameworks. Please provide more context.';
      
      case ErrorCode.DATABASE_ERROR:
        return 'A system error occurred. Please try again in a moment.';
      
      case ErrorCode.TIMEOUT_ERROR:
        return 'The request took too long. Please try again with a simpler input.';
      
      case ErrorCode.RATE_LIMIT_ERROR:
        return 'You\'ve made too many requests. Please wait a moment before trying again.';
      
      case ErrorCode.AUTHENTICATION_ERROR:
        return 'Your session has expired. Please sign in again.';
      
      case ErrorCode.VALIDATION_ERROR:
        return 'The provided information is incomplete or invalid.';
      
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

export class SessionNotFoundError extends PhoenixError {
  constructor(sessionId: string) {
    super(
      ErrorCode.SESSION_NOT_FOUND,
      `Session ${sessionId} not found`,
      { sessionId },
      false,
      ['Start a new decision sprint', 'Check your session URL']
    );
  }
}

export class InvalidPhaseTransitionError extends PhoenixError {
  constructor(fromPhase: string, toPhase: string, reason?: string) {
    super(
      ErrorCode.INVALID_PHASE_TRANSITION,
      `Cannot transition from ${fromPhase} to ${toPhase}${reason ? `: ${reason}` : ''}`,
      { phase: fromPhase, details: { fromPhase, toPhase, reason } },
      false,
      ['Complete the current phase requirements', 'Review the phase progression']
    );
  }
}

export class PhaseValidationError extends PhoenixError {
  constructor(phase: string, missingElements: string[]) {
    super(
      ErrorCode.PHASE_VALIDATION_FAILED,
      `Phase ${phase} validation failed: missing ${missingElements.join(', ')}`,
      { phase, details: { missingElements } },
      false,
      missingElements.map(e => `Provide ${e.replace('_', ' ')}`)
    );
  }
}

export class AIModelError extends PhoenixError {
  constructor(model: string, originalError: Error) {
    super(
      ErrorCode.AI_MODEL_ERROR,
      `AI model ${model} error: ${originalError.message}`,
      { details: { model, originalMessage: originalError.message } },
      true,
      ['Retry your request', 'Simplify your input', 'Try a different phrasing']
    );
  }
}

export class TimeoutError extends PhoenixError {
  constructor(operation: string, timeoutMs: number) {
    super(
      ErrorCode.TIMEOUT_ERROR,
      `Operation ${operation} timed out after ${timeoutMs}ms`,
      { operation, details: { timeoutMs } },
      true,
      ['Try again with simpler input', 'Check your internet connection']
    );
  }
}

export class RateLimitError extends PhoenixError {
  constructor(retryAfterSeconds: number) {
    super(
      ErrorCode.RATE_LIMIT_ERROR,
      `Rate limit exceeded. Retry after ${retryAfterSeconds} seconds`,
      { details: { retryAfterSeconds } },
      true,
      [`Wait ${retryAfterSeconds} seconds before retrying`, 'Reduce request frequency']
    );
  }
}

export function handleError(error: unknown): PhoenixError {
  if (error instanceof PhoenixError) {
    return error;
  }

  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return new TimeoutError('unknown', 30000);
    }
    
    if (error.message.includes('rate limit')) {
      return new RateLimitError(60);
    }
    
    if (error.message.includes('auth') || error.message.includes('unauthorized')) {
      return new PhoenixError(
        ErrorCode.AUTHENTICATION_ERROR,
        error.message,
        {},
        false,
        ['Sign in again', 'Check your credentials']
      );
    }
    
    return new PhoenixError(
      ErrorCode.DATABASE_ERROR,
      error.message,
      {},
      true,
      ['Try again in a moment', 'Contact support if the issue persists']
    );
  }

  return new PhoenixError(
    ErrorCode.DATABASE_ERROR,
    'An unknown error occurred',
    {},
    true,
    ['Try again', 'Contact support if the issue persists']
  );
}

export class ErrorRecovery {
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY_MS = 1000;

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = ErrorRecovery.MAX_RETRIES,
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const phoenixError = handleError(error);
        
        if (!phoenixError.isRetryable || attempt === maxRetries - 1) {
          throw phoenixError;
        }

        const delay = ErrorRecovery.BASE_DELAY_MS * Math.pow(2, attempt);
        
        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  static async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string = 'operation'
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(operationName, timeoutMs));
      }, timeoutMs);
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  static async withFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    shouldUseFallback?: (error: Error) => boolean
  ): Promise<T> {
    try {
      return await primaryOperation();
    } catch (error) {
      const err = error as Error;
      
      if (shouldUseFallback && !shouldUseFallback(err)) {
        throw err;
      }
      
      console.warn('Primary operation failed, using fallback:', err.message);
      return fallbackOperation();
    }
  }
}