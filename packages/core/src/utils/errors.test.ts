/**
 * Tests for error handling utilities
 */

import { describe, it, expect } from 'vitest';
import { PhoenixError, ErrorCode, createErrorResponse, isRetryableError } from './errors';

describe('PhoenixError', () => {
  describe('Constructor', () => {
    it('should create error with message and code', () => {
      const error = new PhoenixError(ErrorCode.VALIDATION_ERROR, 'Test error message');
      
      expect(error.message).toBe('Test error message');
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.name).toBe('PhoenixError');
      expect(Object.keys(error.context).length).toBe(0);
      expect(error.isRetryable).toBe(false);
    });

    it('should create error with context', () => {
      const context = { sessionId: 'session-123', phase: 'problem_intake' };
      const error = new PhoenixError(ErrorCode.SESSION_NOT_FOUND, 'Context error', context);
      
      expect(error.context).toEqual(context);
    });

    it('should create error with retryable flag', () => {
      const error = new PhoenixError(ErrorCode.AI_MODEL_ERROR, 'Retryable error', {}, true);
      
      expect(error.isRetryable).toBe(true);
    });

    it('should inherit from Error properly', () => {
      const error = new PhoenixError(ErrorCode.VALIDATION_ERROR, 'Test');
      
      expect(error instanceof Error).toBe(true);
      expect(error instanceof PhoenixError).toBe(true);
      expect(error.stack).toBeDefined();
    });
  });

  describe('Error Codes', () => {
    it('should have all expected error codes', () => {
      expect(ErrorCode.SESSION_NOT_FOUND).toBe('SESSION_NOT_FOUND');
      expect(ErrorCode.INVALID_PHASE_TRANSITION).toBe('INVALID_PHASE_TRANSITION');
      expect(ErrorCode.PHASE_VALIDATION_FAILED).toBe('PHASE_VALIDATION_FAILED');
      expect(ErrorCode.AI_MODEL_ERROR).toBe('AI_MODEL_ERROR');
      expect(ErrorCode.AI_TIMEOUT).toBe('AI_TIMEOUT');
      expect(ErrorCode.AI_GENERATION_ERROR).toBe('AI_GENERATION_ERROR');
      expect(ErrorCode.AI_STREAMING_ERROR).toBe('AI_STREAMING_ERROR');
      expect(ErrorCode.INVALID_MODEL_TYPE).toBe('INVALID_MODEL_TYPE');
      expect(ErrorCode.EMBEDDING_GENERATION_FAILED).toBe('EMBEDDING_GENERATION_FAILED');
      expect(ErrorCode.FRAMEWORK_SELECTION_FAILED).toBe('FRAMEWORK_SELECTION_FAILED');
      expect(ErrorCode.DATABASE_ERROR).toBe('DATABASE_ERROR');
      expect(ErrorCode.TIMEOUT_ERROR).toBe('TIMEOUT_ERROR');
      expect(ErrorCode.RATE_LIMIT_ERROR).toBe('RATE_LIMIT_ERROR');
      expect(ErrorCode.AUTHENTICATION_ERROR).toBe('AUTHENTICATION_ERROR');
      expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    });
  });

  describe('toJSON', () => {
    it('should serialize error to JSON correctly', () => {
      const context = { userId: 'user-123', operation: 'test' };
      const error = new PhoenixError(ErrorCode.DATABASE_ERROR, 'Serialization test', context, true);
      
      const json = error.toJSON();
      
      expect(json).toEqual({
        name: 'PhoenixError',
        message: 'Serialization test',
        code: 'DATABASE_ERROR',
        context: context,
        isRetryable: true,
        recoverySuggestions: [],
        timestamp: expect.any(String),
        stack: expect.any(String),
      });
      
      // Verify timestamp is valid ISO string
      expect(() => new Date(json.timestamp)).not.toThrow();
    });

    it('should serialize error without context', () => {
      const error = new PhoenixError(ErrorCode.VALIDATION_ERROR, 'No context');
      
      const json = error.toJSON();
      
      expect(json.context).toBeUndefined();
      expect(json.isRetryable).toBe(false);
    });
  });

  describe('toString', () => {
    it('should provide readable string representation', () => {
      const error = new PhoenixError(ErrorCode.AI_MODEL_ERROR, 'String test');
      
      const str = error.toString();
      
      expect(str).toBe('PhoenixError [AI_MODEL_ERROR]: String test');
    });
  });
});

describe('createErrorResponse', () => {
  it('should create error response from PhoenixError', () => {
    const context = { sessionId: 'session-123' };
    const error = new PhoenixError(ErrorCode.SESSION_NOT_FOUND, 'Phoenix error', context, true);
    
    const response = createErrorResponse(error);
    
    expect(response).toEqual({
      success: false,
      error: {
        code: 'SESSION_NOT_FOUND',
        message: 'Phoenix error',
        context: context,
        retryable: true,
        timestamp: expect.any(String),
      },
    });
  });

  it('should create error response from regular Error', () => {
    const error = new Error('Regular error message');
    
    const response = createErrorResponse(error);
    
    expect(response).toEqual({
      success: false,
      error: {
        code: 'UNKNOWN',
        message: 'Regular error message',
        retryable: false,
        timestamp: expect.any(String),
      },
    });
  });

  it('should create error response from string', () => {
    const response = createErrorResponse('String error message');
    
    expect(response).toEqual({
      success: false,
      error: {
        code: 'UNKNOWN',
        message: 'String error message',
        retryable: false,
        timestamp: expect.any(String),
      },
    });
  });

  it('should create error response from unknown type', () => {
    const response = createErrorResponse({ unexpected: 'object' });
    
    expect(response).toEqual({
      success: false,
      error: {
        code: 'UNKNOWN',
        message: 'Unknown error occurred',
        retryable: false,
        timestamp: expect.any(String),
      },
    });
  });

  it('should handle null/undefined errors', () => {
    const nullResponse = createErrorResponse(null);
    const undefinedResponse = createErrorResponse(undefined);
    
    expect(nullResponse.error.message).toBe('Unknown error occurred');
    expect(undefinedResponse.error.message).toBe('Unknown error occurred');
  });
});

describe('isRetryableError', () => {
  it('should identify retryable PhoenixError', () => {
    const retryableError = new PhoenixError(ErrorCode.AI_MODEL_ERROR, 'Retry me', undefined, true);
    const nonRetryableError = new PhoenixError(ErrorCode.VALIDATION_ERROR, 'Dont retry', undefined, false);
    
    expect(isRetryableError(retryableError)).toBe(true);
    expect(isRetryableError(nonRetryableError)).toBe(false);
  });

  it('should identify retryable error codes', () => {
    const timeoutError = new PhoenixError(ErrorCode.TIMEOUT_ERROR, 'Timeout');
    const rateLimitError = new PhoenixError(ErrorCode.RATE_LIMIT_ERROR, 'Rate limit');
    const aiError = new PhoenixError(ErrorCode.AI_MODEL_ERROR, 'AI failed');
    const dbError = new PhoenixError(ErrorCode.DATABASE_ERROR, 'DB failed');
    
    expect(isRetryableError(timeoutError)).toBe(true);
    expect(isRetryableError(rateLimitError)).toBe(true);
    expect(isRetryableError(aiError)).toBe(true);
    expect(isRetryableError(dbError)).toBe(true);
  });

  it('should identify non-retryable error codes', () => {
    const validationError = new PhoenixError(ErrorCode.VALIDATION_ERROR, 'Validation');
    const authError = new PhoenixError(ErrorCode.AUTHENTICATION_ERROR, 'Auth');
    const notFoundError = new PhoenixError(ErrorCode.SESSION_NOT_FOUND, 'Not found');
    const configError = new PhoenixError(ErrorCode.PHASE_VALIDATION_FAILED, 'Config');
    
    expect(isRetryableError(validationError)).toBe(false);
    expect(isRetryableError(authError)).toBe(false);
    expect(isRetryableError(notFoundError)).toBe(false);
    expect(isRetryableError(configError)).toBe(false);
  });

  it('should handle non-PhoenixError types', () => {
    const regularError = new Error('Regular error');
    const stringError = 'String error';
    const objectError = { message: 'Object error' };
    
    expect(isRetryableError(regularError)).toBe(false);
    expect(isRetryableError(stringError)).toBe(false);
    expect(isRetryableError(objectError)).toBe(false);
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError(undefined)).toBe(false);
  });

  it('should respect explicit retryable flag over default behavior', () => {
    // Normally validation errors are not retryable
    const retryableValidationError = new PhoenixError(
      ErrorCode.VALIDATION_FAILED,
      'Special validation error', 
      undefined, 
      true // Explicitly marked as retryable
    );
    
    expect(isRetryableError(retryableValidationError)).toBe(true);
  });
});

describe('Error Context Handling', () => {
  it('should handle complex nested context', () => {
    const complexContext = {
      sessionId: 'session-123',
      userId: 'user-456',
      operation: {
        type: 'framework_selection',
        params: {
          maxFrameworks: 3,
          filters: ['mental-model', 'strategic-framework'],
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        attempt: 2,
        previousErrors: ['timeout', 'rate_limit'],
      },
    };
    
    const error = new PhoenixError(ErrorCode.AI_MODEL_ERROR, 'Complex context', complexContext as any);
    
    expect(error.context).toEqual(complexContext);
    
    const json = error.toJSON();
    expect(json.context).toEqual(complexContext);
  });

  it('should handle context with functions (should be filtered out)', () => {
    const contextWithFunctions = {
      sessionId: 'session-123',
      callback: () => console.log('test'), // Function should be filtered out in JSON
      data: { value: 42 },
    };
    
    const error = new PhoenixError(ErrorCode.VALIDATION_ERROR, 'Function context', contextWithFunctions);
    
    // The context is stored as-is
    expect(error.context).toEqual(contextWithFunctions);
    
    // But JSON serialization should handle functions gracefully
    const json = error.toJSON();
    expect(json.context.sessionId).toBe('session-123');
    expect(json.context.data).toEqual({ value: 42 });
    // Function should be undefined or filtered out
    expect(typeof json.context.callback).not.toBe('function');
  });

  it('should handle circular references in context', () => {
    const circularContext: any = {
      sessionId: 'session-123',
      data: { value: 42 },
    };
    circularContext.self = circularContext; // Create circular reference
    
    const error = new PhoenixError(ErrorCode.VALIDATION_ERROR, 'Circular context', circularContext);
    
    expect(error.context).toBe(circularContext);
    
    // JSON serialization should handle circular references gracefully
    expect(() => error.toJSON()).not.toThrow();
  });
});

describe('Error Message Formatting', () => {
  it('should handle empty error messages', () => {
    const error = new PhoenixError(ErrorCode.VALIDATION_ERROR, '');
    
    expect(error.message).toBe('');
    expect(error.toString()).toBe('PhoenixError [VALIDATION_ERROR]: ');
  });

  it('should handle very long error messages', () => {
    const longMessage = 'x'.repeat(10000);
    const error = new PhoenixError(ErrorCode.UNKNOWN, longMessage);
    
    expect(error.message).toBe(longMessage);
    expect(error.message.length).toBe(10000);
  });

  it('should handle error messages with special characters', () => {
    const specialMessage = 'Error with émojis 🚀 and spécial characters: áéíóú, 中文, العربية';
    const error = new PhoenixError(ErrorCode.UNKNOWN, specialMessage);
    
    expect(error.message).toBe(specialMessage);
    
    const json = error.toJSON();
    expect(json.message).toBe(specialMessage);
  });

  it('should handle multiline error messages', () => {
    const multilineMessage = 'Line 1\nLine 2\r\nLine 3\n\nLine 5';
    const error = new PhoenixError(ErrorCode.UNKNOWN, multilineMessage);
    
    expect(error.message).toBe(multilineMessage);
  });
});

describe('Error Inheritance and Stack Traces', () => {
  it('should maintain proper inheritance chain', () => {
    const error = new PhoenixError(ErrorCode.VALIDATION_ERROR, 'Inheritance test');
    
    expect(error instanceof PhoenixError).toBe(true);
    expect(error instanceof Error).toBe(true);
    expect(Object.getPrototypeOf(error)).toBe(PhoenixError.prototype);
    expect(Object.getPrototypeOf(Object.getPrototypeOf(error))).toBe(Error.prototype);
  });

  it('should capture stack trace correctly', () => {
    function createError() {
      return new PhoenixError(ErrorCode.VALIDATION_ERROR, 'Stack test');
    }
    
    function wrapperFunction() {
      return createError();
    }
    
    const error = wrapperFunction();
    
    expect(error.stack).toBeDefined();
    expect(typeof error.stack).toBe('string');
    expect(error.stack).toContain('createError');
    expect(error.stack).toContain('wrapperFunction');
  });

  it('should handle error creation in different contexts', () => {
    // Create error in try-catch
    let caughtError;
    try {
      throw new PhoenixError(ErrorCode.VALIDATION_ERROR, 'Try-catch test');
    } catch (e) {
      caughtError = e;
    }
    
    expect(caughtError instanceof PhoenixError).toBe(true);
    expect((caughtError as PhoenixError).code).toBe(ErrorCode.FRAMEWORK_SELECTION_FAILED);
    
    // Create error in Promise rejection
    const rejectedPromise = Promise.reject(
      new PhoenixError(ErrorCode.AI_MODEL_ERROR, 'Promise test')
    );
    
    return expect(rejectedPromise).rejects.toThrow('Promise test');
  });
});

describe('Edge Cases and Robustness', () => {
  it('should handle undefined/null error codes gracefully', () => {
    // @ts-expect-error - Testing runtime behavior with invalid input
    const error1 = new PhoenixError('Null code', null);
    // @ts-expect-error - Testing runtime behavior with invalid input  
    const error2 = new PhoenixError('Undefined code', undefined);
    
    // Should not crash, even with invalid codes
    expect(error1.message).toBe('Null code');
    expect(error2.message).toBe('Undefined code');
  });

  it('should handle error creation with no parameters', () => {
    expect(() => {
      // @ts-expect-error - Testing runtime behavior with no parameters
      new PhoenixError();
    }).not.toThrow();
  });

  it('should handle very deep context objects', () => {
    let deepContext: any = { level: 0 };
    
    // Create 100 levels deep object
    for (let i = 1; i < 100; i++) {
      deepContext.nested = { level: i };
      deepContext = deepContext.nested;
    }
    
    const error = new PhoenixError(ErrorCode.PHASE_VALIDATION_FAILED, 'Deep context', deepContext);
    
    expect(error.context).toBeDefined();
    expect(() => error.toJSON()).not.toThrow();
  });
});