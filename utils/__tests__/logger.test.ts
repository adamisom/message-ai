/**
 * Tests for logger utility
 */

import { logger, createLogger } from '../logger';

// Mock console methods
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

describe('logger', () => {
  let mockLog: jest.Mock;
  let mockWarn: jest.Mock;
  let mockError: jest.Mock;

  beforeEach(() => {
    mockLog = jest.fn();
    mockWarn = jest.fn();
    mockError = jest.fn();
    console.log = mockLog;
    console.warn = mockWarn;
    console.error = mockError;
  });

  afterEach(() => {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  });

  describe('log', () => {
    it('should log in development mode', () => {
      // __DEV__ is true in test environment
      logger.log('test message');
      expect(mockLog).toHaveBeenCalledWith('test message');
    });

    it('should handle multiple arguments', () => {
      logger.log('test', 123, { foo: 'bar' });
      expect(mockLog).toHaveBeenCalledWith('test', 123, { foo: 'bar' });
    });
  });

  describe('warn', () => {
    it('should warn in development mode', () => {
      logger.warn('warning message');
      expect(mockWarn).toHaveBeenCalledWith('warning message');
    });

    it('should handle multiple arguments', () => {
      logger.warn('warning', 456);
      expect(mockWarn).toHaveBeenCalledWith('warning', 456);
    });
  });

  describe('error', () => {
    it('should always log errors', () => {
      logger.error('error message');
      expect(mockError).toHaveBeenCalledWith('error message');
    });

    it('should handle multiple arguments', () => {
      logger.error('error', new Error('test'));
      expect(mockError).toHaveBeenCalledWith('error', expect.any(Error));
    });
  });

  describe('debug', () => {
    it('should log with debug tag', () => {
      logger.debug('TestModule', 'debug message');
      expect(mockLog).toHaveBeenCalledWith('[DEBUG:TestModule]', 'debug message');
    });
  });

  describe('info', () => {
    it('should log with info tag', () => {
      logger.info('TestModule', 'info message');
      expect(mockLog).toHaveBeenCalledWith('[INFO:TestModule]', 'info message');
    });
  });

  describe('createLogger', () => {
    it('should create scoped logger', () => {
      const scopedLogger = createLogger('MyModule');
      
      scopedLogger.log('test');
      expect(mockLog).toHaveBeenCalledWith('[MyModule]', 'test');

      scopedLogger.warn('warning');
      expect(mockWarn).toHaveBeenCalledWith('[MyModule]', 'warning');

      scopedLogger.error('error');
      expect(mockError).toHaveBeenCalledWith('[MyModule]', 'error');
    });

    it('should support debug and info methods', () => {
      const scopedLogger = createLogger('MyModule');
      
      scopedLogger.debug('debug test');
      expect(mockLog).toHaveBeenCalledWith('[DEBUG:MyModule]', 'debug test');

      scopedLogger.info('info test');
      expect(mockLog).toHaveBeenCalledWith('[INFO:MyModule]', 'info test');
    });
  });
});

