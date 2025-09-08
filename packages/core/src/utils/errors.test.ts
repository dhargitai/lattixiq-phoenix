/**
 * Tests for error handling utilities
 */

import { describe, it, expect } from 'vitest';
import { PhoenixError, ErrorCode, createErrorResponse, isRetryableError } from './errors';

describe('PhoenixError', () => {
  describe('Constructor', () => {
    it('should create error with message and code', () => {
      const error = new PhoenixError('Test error message', ErrorCode.VALIDATION_FAILED);
      
      expect(error.message).toBe('Test error message');
      expect(error.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(error.name).toBe('PhoenixError');
      expect(error.context).toBeUndefined();
      expect(error.retryable).toBe(false);
    });

    it('should create error with context', () => {
      const context = { sessionId: 'session-123', phase: 'problem_intake' };
      const error = new PhoenixError('Context error', ErrorCode.SESSION_NOT_FOUND, context);
      
      expect(error.context).toEqual(context);
    });

    it('should create error with retryable flag', () => {
      const error = new PhoenixError('Retryable error', ErrorCode.AI_REQUEST_FAILED, undefined, true);
      
      expect(error.retryable).toBe(true);
    });

    it('should inherit from Error properly', () => {
      const error = new PhoenixError('Test', ErrorCode.UNKNOWN);
      
      expect(error instanceof Error).toBe(true);
      expect(error instanceof PhoenixError).toBe(true);
      expect(error.stack).toBeDefined();
    });
  });

  describe('Error Codes', () => {
    it('should have all expected error codes', () => {
      expect(ErrorCode.UNKNOWN).toBe('UNKNOWN');
      expect(ErrorCode.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
      expect(ErrorCode.SESSION_NOT_FOUND).toBe('SESSION_NOT_FOUND');
      expect(ErrorCode.DATABASE_ERROR).toBe('DATABASE_ERROR');
      expect(ErrorCode.AI_REQUEST_FAILED).toBe('AI_REQUEST_FAILED');
      expect(ErrorCode.FRAMEWORK_SELECTION_FAILED).toBe('FRAMEWORK_SELECTION_FAILED');
      expect(ErrorCode.PHASE_TRANSITION_FAILED).toBe('PHASE_TRANSITION_FAILED');
      expect(ErrorCode.TIMEOUT_ERROR).toBe('TIMEOUT_ERROR');
      expect(ErrorCode.AUTHENTICATION_FAILED).toBe('AUTHENTICATION_FAILED');
      expect(ErrorCode.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
      expect(ErrorCode.INVALID_CONFIGURATION).toBe('INVALID_CONFIGURATION');
    });
  });

  describe('toJSON', () => {
    it('should serialize error to JSON correctly', () => {
      const context = { userId: 'user-123', operation: 'test' };
      const error = new PhoenixError('Serialization test', ErrorCode.DATABASE_ERROR, context, true);
      
      const json = error.toJSON();
      
      expect(json).toEqual({
        name: 'PhoenixError',
        message: 'Serialization test',
        code: 'DATABASE_ERROR',
        context: context,
        retryable: true,
        timestamp: expect.any(String),
      });
      
      // Verify timestamp is valid ISO string
      expect(() => new Date(json.timestamp)).not.toThrow();
    });

    it('should serialize error without context', () => {
      const error = new PhoenixError('No context', ErrorCode.VALIDATION_FAILED);
      
      const json = error.toJSON();
      
      expect(json.context).toBeUndefined();
      expect(json.retryable).toBe(false);
    });
  });

  describe('toString', () => {
    it('should provide readable string representation', () => {
      const error = new PhoenixError('String test', ErrorCode.AI_REQUEST_FAILED);
      
      const str = error.toString();
      
      expect(str).toBe('PhoenixError [AI_REQUEST_FAILED]: String test');
    });
  });
});

describe('createErrorResponse', () => {
  it('should create error response from PhoenixError', () => {
    const context = { sessionId: 'session-123' };
    const error = new PhoenixError('Phoenix error', ErrorCode.SESSION_NOT_FOUND, context, true);
    
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
    const retryableError = new PhoenixError('Retry me', ErrorCode.AI_REQUEST_FAILED, undefined, true);
    const nonRetryableError = new PhoenixError('Dont retry', ErrorCode.VALIDATION_FAILED, undefined, false);
    
    expect(isRetryableError(retryableError)).toBe(true);
    expect(isRetryableError(nonRetryableError)).toBe(false);
  });

  it('should identify retryable error codes', () => {
    const timeoutError = new PhoenixError('Timeout', ErrorCode.TIMEOUT_ERROR);
    const rateLimitError = new PhoenixError('Rate limit', ErrorCode.RATE_LIMIT_EXCEEDED);
    const aiError = new PhoenixError('AI failed', ErrorCode.AI_REQUEST_FAILED);
    const dbError = new PhoenixError('DB failed', ErrorCode.DATABASE_ERROR);
    
    expect(isRetryableError(timeoutError)).toBe(true);
    expect(isRetryableError(rateLimitError)).toBe(true);
    expect(isRetryableError(aiError)).toBe(true);
    expect(isRetryableError(dbError)).toBe(true);
  });

  it('should identify non-retryable error codes', () => {
    const validationError = new PhoenixError('Validation', ErrorCode.VALIDATION_FAILED);
    const authError = new PhoenixError('Auth', ErrorCode.AUTHENTICATION_FAILED);
    const notFoundError = new PhoenixError('Not found', ErrorCode.SESSION_NOT_FOUND);
    const configError = new PhoenixError('Config', ErrorCode.INVALID_CONFIGURATION);
    
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
      'Special validation error', 
      ErrorCode.VALIDATION_FAILED, 
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
    
    const error = new PhoenixError('Complex context', ErrorCode.AI_REQUEST_FAILED, complexContext);
    
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
    
    const error = new PhoenixError('Function context', ErrorCode.UNKNOWN, contextWithFunctions);
    
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
    
    const error = new PhoenixError('Circular context', ErrorCode.UNKNOWN, circularContext);
    
    expect(error.context).toBe(circularContext);
    
    // JSON serialization should handle circular references gracefully
    expect(() => error.toJSON()).not.toThrow();
  });
});

describe('Error Message Formatting', () => {
  it('should handle empty error messages', () => {
    const error = new PhoenixError('', ErrorCode.VALIDATION_FAILED);
    
    expect(error.message).toBe('');
    expect(error.toString()).toBe('PhoenixError [VALIDATION_FAILED]: ');
  });

  it('should handle very long error messages', () => {
    const longMessage = 'x'.repeat(10000);
    const error = new PhoenixError(longMessage, ErrorCode.UNKNOWN);
    
    expect(error.message).toBe(longMessage);
    expect(error.message.length).toBe(10000);
  });

  it('should handle error messages with special characters', () => {
    const specialMessage = 'Error with émojis 🚀 and spécial characters: áéíóú, 中文, العربية';
    const error = new PhoenixError(specialMessage, ErrorCode.UNKNOWN);
    
    expect(error.message).toBe(specialMessage);
    
    const json = error.toJSON();
    expect(json.message).toBe(specialMessage);
  });

  it('should handle multiline error messages', () => {
    const multilineMessage = 'Line 1\nLine 2\r\nLine 3\n\nLine 5';
    const error = new PhoenixError(multilineMessage, ErrorCode.UNKNOWN);
    
    expect(error.message).toBe(multilineMessage);
  });
});

describe('Error Inheritance and Stack Traces', () => {
  it('should maintain proper inheritance chain', () => {
    const error = new PhoenixError('Inheritance test', ErrorCode.UNKNOWN);
    
    expect(error instanceof PhoenixError).toBe(true);
    expect(error instanceof Error).toBe(true);
    expect(Object.getPrototypeOf(error)).toBe(PhoenixError.prototype);
    expect(Object.getPrototypeOf(Object.getPrototypeOf(error))).toBe(Error.prototype);
  });

  it('should capture stack trace correctly', () => {
    function createError() {
      return new PhoenixError('Stack test', ErrorCode.UNKNOWN);
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
      throw new PhoenixError('Try-catch test', ErrorCode.VALIDATION_FAILED);
    } catch (e) {
      caughtError = e;
    }
    
    expect(caughtError instanceof PhoenixError).toBe(true);
    expect((caughtError as PhoenixError).code).toBe(ErrorCode.FRAMEWORK_SELECTION_FAILED);
    
    // Create error in Promise rejection
    const rejectedPromise = Promise.reject(
      new PhoenixError('Promise test', ErrorCode.AI_CALL_FAILED)
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
    
    const error = new PhoenixError('Deep context', ErrorCode.PHASE_TRANSITION_FAILED, deepContext);
    
    expect(error.context).toBeDefined();
    expect(() => error.toJSON()).not.toThrow();
  });
});