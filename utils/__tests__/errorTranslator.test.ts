/**
 * Error Translator Tests
 * Tests user-friendly error message translation
 */

import { translateError } from '../errorTranslator';

describe('errorTranslator', () => {
  describe('Network Errors', () => {
    it('should translate network errors', () => {
      const error = new Error('network request failed');
      const result = translateError(error);
      
      expect(result.title).toBe('Connection Issue');
      expect(result.message).toContain('internet connection');
      expect(result.action).toBe('Retry');
      expect(result.severity).toBe('warning');
    });

    it('should translate fetch failed errors', () => {
      const error = new Error('fetch failed');
      const result = translateError(error);
      
      expect(result.title).toBe('Connection Issue');
      expect(result.action).toBe('Retry');
    });
  });

  describe('Permission Errors', () => {
    it('should translate permission denied errors', () => {
      const error = new Error('permission denied');
      const result = translateError(error);
      
      expect(result.title).toBe('Access Denied');
      expect(result.message).toContain("don't have permission");
      expect(result.action).toBe('Contact Support');
      expect(result.severity).toBe('error');
    });

    it('should translate insufficient permissions errors', () => {
      const error = new Error('insufficient permissions to perform operation');
      const result = translateError(error);
      
      expect(result.title).toBe('Access Denied');
    });
  });

  describe('Rate Limiting Errors', () => {
    it('should translate rate limit errors', () => {
      const error = new Error('rate limit exceeded');
      const result = translateError(error);
      
      expect(result.title).toBe('Too Many Requests');
      expect(result.message).toContain('usage limit');
      expect(result.action).toBe('Wait');
      expect(result.severity).toBe('warning');
    });

    it('should translate quota exceeded errors', () => {
      const error = new Error('quota exceeded for this resource');
      const result = translateError(error);
      
      expect(result.title).toBe('Too Many Requests');
    });
  });

  describe('Authentication Errors', () => {
    it('should translate auth errors', () => {
      const error = new Error('authentication failed');
      const result = translateError(error);
      
      expect(result.title).toBe('Session Expired');
      expect(result.message).toContain('session has expired');
      expect(result.action).toBe('Log In');
      expect(result.severity).toBe('warning');
    });

    it('should translate unauthenticated errors', () => {
      const error = new Error('unauthenticated request');
      const result = translateError(error);
      
      expect(result.title).toBe('Session Expired');
    });
  });

  describe('AI Service Errors', () => {
    it('should translate Anthropic errors', () => {
      const error = new Error('anthropic api error');
      const result = translateError(error);
      
      expect(result.title).toBe('AI Service Unavailable');
      expect(result.message).toContain('AI feature is temporarily unavailable');
      expect(result.action).toBe('Retry');
      expect(result.severity).toBe('warning');
    });

    it('should translate OpenAI errors', () => {
      const error = new Error('openai service down');
      const result = translateError(error);
      
      expect(result.title).toBe('AI Service Unavailable');
    });

    it('should translate generic AI errors', () => {
      const error = new Error('ai processing failed');
      const result = translateError(error);
      
      expect(result.title).toBe('AI Service Unavailable');
    });
  });

  describe('Timeout Errors', () => {
    it('should translate timeout errors', () => {
      const error = new Error('request timeout after 10000ms');
      const result = translateError(error);
      
      expect(result.title).toBe('Request Timed Out');
      expect(result.message).toContain('taking longer than expected');
      expect(result.action).toBe('Retry');
      expect(result.severity).toBe('warning');
    });
  });

  describe('Generic Errors', () => {
    it('should translate unknown errors to generic message', () => {
      const error = new Error('something completely unexpected happened');
      const result = translateError(error);
      
      expect(result.title).toBe('Something Went Wrong');
      expect(result.message).toBe('An unexpected error occurred. Please try again.');
      expect(result.action).toBe('Retry');
      expect(result.severity).toBe('error');
    });

    it('should handle error with no message', () => {
      const error = new Error('');
      const result = translateError(error);
      
      expect(result.title).toBe('Something Went Wrong');
    });
  });

  describe('Case Insensitivity', () => {
    it('should match errors regardless of case', () => {
      const error1 = new Error('NETWORK ERROR');
      const error2 = new Error('Network Error');
      const error3 = new Error('network error');
      
      const result1 = translateError(error1);
      const result2 = translateError(error2);
      const result3 = translateError(error3);
      
      expect(result1.title).toBe('Connection Issue');
      expect(result2.title).toBe('Connection Issue');
      expect(result3.title).toBe('Connection Issue');
    });
  });

  describe('Partial Matches', () => {
    it('should match partial strings', () => {
      const error = new Error('Failed to fetch user data due to network connectivity issues');
      const result = translateError(error);
      
      expect(result.title).toBe('Connection Issue');
    });

    it('should prioritize specific matches over generic', () => {
      const error = new Error('rate limit exceeded due to authentication failure');
      const result = translateError(error);
      
      // Should match rate limit first (comes before auth in translator)
      expect(result.title).toBe('Too Many Requests');
    });
  });

  describe('All Error Properties', () => {
    it('should return all required properties', () => {
      const error = new Error('test error');
      const result = translateError(error);
      
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('severity');
      
      expect(typeof result.title).toBe('string');
      expect(typeof result.message).toBe('string');
      expect(typeof result.action).toBe('string');
      expect(['info', 'warning', 'error', 'critical']).toContain(result.severity);
    });
  });
});

