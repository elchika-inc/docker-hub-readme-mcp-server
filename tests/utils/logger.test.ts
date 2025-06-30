import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LogLevel, Logger, logger } from '../../src/utils/logger.js';

describe('LogLevel', () => {
  it('should have correct enum values', () => {
    expect(LogLevel.ERROR).toBe(0);
    expect(LogLevel.WARN).toBe(1);
    expect(LogLevel.INFO).toBe(2);
    expect(LogLevel.DEBUG).toBe(3);
  });
});

describe('Logger', () => {
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleInfoSpy: any;
  let consoleDebugSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create logger with default log level (INFO)', () => {
      const testLogger = new Logger();
      
      // Test that INFO level messages are logged
      testLogger.info('test message');
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should create logger with numeric log level', () => {
      const testLogger = new Logger(LogLevel.DEBUG);
      
      testLogger.debug('test message');
      expect(consoleDebugSpy).toHaveBeenCalled();
    });

    it('should create logger with string log level', () => {
      const testLogger = new Logger('ERROR');
      
      testLogger.error('test message');
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      // Should not log lower level messages
      testLogger.warn('test message');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should handle invalid string log level', () => {
      const testLogger = new Logger('INVALID');
      
      // Should fallback to INFO level
      testLogger.info('test message');
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should handle case-insensitive string log levels', () => {
      const testLogger = new Logger('debug');
      
      testLogger.debug('test message');
      expect(consoleDebugSpy).toHaveBeenCalled();
    });
  });

  describe('log level filtering', () => {
    it('should filter messages based on log level (ERROR)', () => {
      const testLogger = new Logger(LogLevel.ERROR);
      
      testLogger.error('error message');
      testLogger.warn('warn message');
      testLogger.info('info message');
      testLogger.debug('debug message');
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should filter messages based on log level (WARN)', () => {
      const testLogger = new Logger(LogLevel.WARN);
      
      testLogger.error('error message');
      testLogger.warn('warn message');
      testLogger.info('info message');
      testLogger.debug('debug message');
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should filter messages based on log level (INFO)', () => {
      const testLogger = new Logger(LogLevel.INFO);
      
      testLogger.error('error message');
      testLogger.warn('warn message');
      testLogger.info('info message');
      testLogger.debug('debug message');
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should filter messages based on log level (DEBUG)', () => {
      const testLogger = new Logger(LogLevel.DEBUG);
      
      testLogger.error('error message');
      testLogger.warn('warn message');
      testLogger.info('info message');
      testLogger.debug('debug message');
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('log message formatting', () => {
    it('should format log messages with timestamp and level', () => {
      const testLogger = new Logger(LogLevel.INFO);
      
      testLogger.info('test message');
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: test message$/)
      );
    });

    it('should include data when provided', () => {
      const testLogger = new Logger(LogLevel.ERROR);
      const testData = { key: 'value', number: 42 };
      
      testLogger.error('error message', testData);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] ERROR: error message$/),
        testData
      );
    });

    it('should handle message without data', () => {
      const testLogger = new Logger(LogLevel.WARN);
      
      testLogger.warn('warning message');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] WARN: warning message$/)
      );
    });
  });

  describe('error method', () => {
    it('should log error messages correctly', () => {
      const testLogger = new Logger(LogLevel.ERROR);
      
      testLogger.error('error message');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] ERROR: error message$/)
      );
    });

    it('should log error messages with data', () => {
      const testLogger = new Logger(LogLevel.ERROR);
      const errorData = { stack: 'stack trace', code: 500 };
      
      testLogger.error('error message', errorData);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] ERROR: error message$/),
        errorData
      );
    });
  });

  describe('warn method', () => {
    it('should log warn messages correctly', () => {
      const testLogger = new Logger(LogLevel.WARN);
      
      testLogger.warn('warning message');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] WARN: warning message$/)
      );
    });
  });

  describe('info method', () => {
    it('should log info messages correctly', () => {
      const testLogger = new Logger(LogLevel.INFO);
      
      testLogger.info('info message');
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: info message$/)
      );
    });
  });

  describe('debug method', () => {
    it('should log debug messages correctly', () => {
      const testLogger = new Logger(LogLevel.DEBUG);
      
      testLogger.debug('debug message');
      
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] DEBUG: debug message$/)
      );
    });
  });

  describe('exported logger instance', () => {
    it('should have WARN as default log level', () => {
      // The exported logger is created with LogLevel.WARN
      logger.warn('warning message');
      logger.info('info message'); // Should not be logged
      
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should log error and warn messages only', () => {
      logger.error('error message');
      logger.warn('warning message');
      logger.info('info message');
      logger.debug('debug message');
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });
  });

  describe('data handling', () => {
    it('should handle complex data objects', () => {
      const testLogger = new Logger(LogLevel.INFO);
      const complexData = {
        nested: { value: 'test' },
        array: [1, 2, 3],
        function: () => {},
        date: new Date(),
      };
      
      testLogger.info('complex data', complexData);
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: complex data$/),
        complexData
      );
    });

    it('should handle null and undefined data', () => {
      const testLogger = new Logger(LogLevel.INFO);
      
      testLogger.info('null data', null);
      testLogger.info('undefined data', undefined);
      
      expect(consoleInfoSpy).toHaveBeenCalledTimes(2);
      expect(consoleInfoSpy.mock.calls[0][0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: null data$/);
      expect(consoleInfoSpy.mock.calls[0][1]).toBe(null);
      expect(consoleInfoSpy.mock.calls[1][0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: undefined data$/);
      expect(consoleInfoSpy.mock.calls[1][1]).toBe(undefined);
    });
  });
});