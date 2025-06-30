import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock('../../src/utils/logger.js', () => ({
  logger: mockLogger,
}));

describe('handleApiError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DockerHubMcpError handling', () => {
    it('should rethrow DockerHubMcpError and log appropriately', async () => {
      const { handleApiError } = await import('../../src/utils/error-handler.js');
      const { DockerHubMcpError } = await import('../../src/types/index.js');
      
      const originalError = new DockerHubMcpError('Test error', 'TEST_CODE', 500, { detail: 'test' });
      const context = 'test operation';

      expect(() => handleApiError(originalError, context)).toThrow(DockerHubMcpError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `${context}: ${originalError.message}`,
        { code: originalError.code, details: originalError.details }
      );
    });
  });

  describe('Network error handling', () => {
    it('should handle ENOTFOUND errors', async () => {
      const { handleApiError } = await import('../../src/utils/error-handler.js');
      const { NetworkError } = await import('../../src/types/index.js');
      
      const originalError = new Error('getaddrinfo ENOTFOUND example.com');
      const context = 'test operation';

      expect(() => handleApiError(originalError, context)).toThrow(NetworkError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Connection failed in test operation'),
        { originalError: originalError.message }
      );
    });

    it('should handle ECONNREFUSED errors', async () => {
      const { handleApiError } = await import('../../src/utils/error-handler.js');
      const { NetworkError } = await import('../../src/types/index.js');
      
      const originalError = new Error('connect ECONNREFUSED 127.0.0.1:8080');
      const context = 'test operation';

      expect(() => handleApiError(originalError, context)).toThrow(NetworkError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Connection failed in test operation'),
        { originalError: originalError.message }
      );
    });

    it('should handle timeout errors', async () => {
      const { handleApiError } = await import('../../src/utils/error-handler.js');
      const { NetworkError } = await import('../../src/types/index.js');
      
      const originalError = new Error('Request timeout occurred');
      const context = 'test operation';

      expect(() => handleApiError(originalError, context)).toThrow(NetworkError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Request timeout in test operation'),
        { originalError: originalError.message }
      );
    });
  });

  describe('Generic Error handling', () => {
    it('should wrap generic errors in DockerHubMcpError', async () => {
      const { handleApiError } = await import('../../src/utils/error-handler.js');
      const { DockerHubMcpError } = await import('../../src/types/index.js');
      
      const originalError = new Error('Some unexpected error');
      const context = 'test operation';

      expect(() => handleApiError(originalError, context)).toThrow(DockerHubMcpError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected error in test operation'),
        { stack: originalError.stack }
      );
    });
  });

  describe('Unknown error handling', () => {
    it('should handle non-Error objects', async () => {
      const { handleApiError } = await import('../../src/utils/error-handler.js');
      const { DockerHubMcpError } = await import('../../src/types/index.js');
      
      const unknownError = 'string error';
      const context = 'test operation';

      expect(() => handleApiError(unknownError, context)).toThrow(DockerHubMcpError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Unknown error in test operation'),
        { error: unknownError }
      );
    });

    it('should handle null/undefined errors', async () => {
      const { handleApiError } = await import('../../src/utils/error-handler.js');
      const { DockerHubMcpError } = await import('../../src/types/index.js');
      
      const context = 'test operation';

      expect(() => handleApiError(null, context)).toThrow(DockerHubMcpError);
      expect(() => handleApiError(undefined, context)).toThrow(DockerHubMcpError);
    });
  });
});

describe('handleHttpError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('404 Not Found', () => {
    it('should throw ImageNotFoundError for 404 status', async () => {
      const { handleHttpError } = await import('../../src/utils/error-handler.js');
      const { ImageNotFoundError } = await import('../../src/types/index.js');
      
      const response = new Response(null, { status: 404, statusText: 'Not Found' });
      const context = 'test image';

      expect(() => handleHttpError(404, response, context)).toThrow(ImageNotFoundError);
    });
  });

  describe('429 Rate Limited', () => {
    it('should throw RateLimitError with retry-after header', async () => {
      const { handleHttpError } = await import('../../src/utils/error-handler.js');
      const { RateLimitError } = await import('../../src/types/index.js');
      
      const response = new Response(null, {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'retry-after': '60' }
      });
      const context = 'test operation';

      expect(() => handleHttpError(429, response, context)).toThrow(RateLimitError);
    });

    it('should throw RateLimitError without retry-after header', async () => {
      const { handleHttpError } = await import('../../src/utils/error-handler.js');
      const { RateLimitError } = await import('../../src/types/index.js');
      
      const response = new Response(null, {
        status: 429,
        statusText: 'Too Many Requests'
      });
      const context = 'test operation';

      expect(() => handleHttpError(429, response, context)).toThrow(RateLimitError);
    });
  });

  describe('Server errors', () => {
    it('should throw NetworkError for server error codes', async () => {
      const { handleHttpError } = await import('../../src/utils/error-handler.js');
      const { NetworkError } = await import('../../src/types/index.js');
      
      const serverErrorCodes = [500, 502, 503, 504];

      for (const status of serverErrorCodes) {
        const response = new Response(null, { status, statusText: 'Server Error' });
        const context = 'test operation';

        expect(() => handleHttpError(status, response, context)).toThrow(NetworkError);
      }
    });
  });

  describe('Other HTTP errors', () => {
    it('should throw DockerHubMcpError for other status codes', async () => {
      const { handleHttpError } = await import('../../src/utils/error-handler.js');
      const { DockerHubMcpError } = await import('../../src/types/index.js');
      
      const response = new Response(null, { status: 403, statusText: 'Forbidden' });
      const context = 'test operation';

      expect(() => handleHttpError(403, response, context)).toThrow(DockerHubMcpError);
    });

    it('should handle response without statusText', async () => {
      const { handleHttpError } = await import('../../src/utils/error-handler.js');
      const { DockerHubMcpError } = await import('../../src/types/index.js');
      
      const response = new Response(null, { status: 400 });
      const context = 'test operation';

      expect(() => handleHttpError(400, response, context)).toThrow(DockerHubMcpError);
    });
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('successful execution', () => {
    it('should return result on first attempt', async () => {
      const { withRetry } = await import('../../src/utils/error-handler.js');
      
      const expectedResult = 'success';
      const fn = vi.fn().mockResolvedValue(expectedResult);

      const result = await withRetry(fn, 3, 1000, 'test operation');

      expect(result).toBe(expectedResult);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry behavior', () => {
    it('should retry on NetworkError', async () => {
      const { withRetry } = await import('../../src/utils/error-handler.js');
      const { NetworkError } = await import('../../src/types/index.js');
      
      const expectedResult = 'success';
      const fn = vi.fn()
        .mockRejectedValueOnce(new NetworkError('Network error'))
        .mockResolvedValue(expectedResult);

      const resultPromise = withRetry(fn, 3, 1000, 'test operation');
      
      // Advance timers to simulate delay
      await vi.advanceTimersByTimeAsync(1000);
      
      const result = await resultPromise;

      expect(result).toBe(expectedResult);
      expect(fn).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('test operation failed, retrying in 1000ms'),
        expect.any(Object)
      );
    });

    it('should retry on server errors (5xx)', async () => {
      const { withRetry } = await import('../../src/utils/error-handler.js');
      const { DockerHubMcpError } = await import('../../src/types/index.js');
      
      const expectedResult = 'success';
      const serverError = new DockerHubMcpError('Server error', 'SERVER_ERROR', 503);
      const fn = vi.fn()
        .mockRejectedValueOnce(serverError)
        .mockResolvedValue(expectedResult);

      const resultPromise = withRetry(fn, 3, 1000, 'test operation');
      
      await vi.advanceTimersByTimeAsync(1000);
      
      const result = await resultPromise;

      expect(result).toBe(expectedResult);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle RateLimitError with exponential backoff', async () => {
      const { withRetry } = await import('../../src/utils/error-handler.js');
      const { RateLimitError } = await import('../../src/types/index.js');
      
      const expectedResult = 'success';
      const rateLimitError = new RateLimitError('Rate limited', 30);
      const fn = vi.fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue(expectedResult);

      const resultPromise = withRetry(fn, 3, 1000, 'test operation');
      
      // Rate limit should use the retry-after value (30 seconds = 30000ms)
      await vi.advanceTimersByTimeAsync(30000);
      
      const result = await resultPromise;

      expect(result).toBe(expectedResult);
      expect(fn).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('test operation rate limited, retrying in 30000ms'),
      );
    });
  });

  describe('retry limits', () => {
    it('should exhaust retries and throw last error', async () => {
      const { withRetry } = await import('../../src/utils/error-handler.js');
      const { NetworkError } = await import('../../src/types/index.js');
      
      const error = new NetworkError('Persistent error');
      const fn = vi.fn().mockRejectedValue(error);

      const resultPromise = withRetry(fn, 2, 1000, 'test operation');
      
      // Advance timers for all retry attempts
      await vi.advanceTimersByTimeAsync(1000); // First retry
      await vi.advanceTimersByTimeAsync(2000); // Second retry (exponential backoff)
      
      await expect(resultPromise).rejects.toThrow('Persistent error');
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('test operation failed after 3 attempts'),
        expect.any(Object)
      );
    });
  });

  describe('non-retryable errors', () => {
    it('should not retry on ImageNotFoundError', async () => {
      const { withRetry } = await import('../../src/utils/error-handler.js');
      const { ImageNotFoundError } = await import('../../src/types/index.js');
      
      const error = new ImageNotFoundError('Image not found');
      const fn = vi.fn().mockRejectedValue(error);

      await expect(withRetry(fn, 3, 1000, 'test operation')).rejects.toThrow('Image not found');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not retry on client errors (4xx except 429)', async () => {
      const { withRetry } = await import('../../src/utils/error-handler.js');
      const { DockerHubMcpError } = await import('../../src/types/index.js');
      
      const error = new DockerHubMcpError('Bad request', 'BAD_REQUEST', 400);
      const fn = vi.fn().mockRejectedValue(error);

      await expect(withRetry(fn, 3, 1000, 'test operation')).rejects.toThrow('Bad request');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('exponential backoff', () => {
    it('should use exponential backoff for delays', async () => {
      const { withRetry } = await import('../../src/utils/error-handler.js');
      const { NetworkError } = await import('../../src/types/index.js');
      
      const error = new NetworkError('Network error');
      const fn = vi.fn().mockRejectedValue(error);

      const resultPromise = withRetry(fn, 3, 1000, 'test operation');
      
      // Should use delays: 1000ms, 2000ms, 4000ms
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);
      
      await expect(resultPromise).rejects.toThrow('Network error');
      
      // Verify the correct delay messages were logged
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('retrying in 1000ms (attempt 1/4)'),
        expect.any(Object)
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('retrying in 2000ms (attempt 2/4)'),
        expect.any(Object)
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('retrying in 4000ms (attempt 3/4)'),
        expect.any(Object)
      );
    });
  });

  describe('edge cases', () => {
    it('should handle functions that throw non-Error objects', async () => {
      const { withRetry } = await import('../../src/utils/error-handler.js');
      
      const fn = vi.fn().mockRejectedValue('string error');

      await expect(withRetry(fn, 1, 1000, 'test operation')).rejects.toThrow('string error');
    });

    it('should handle zero retries', async () => {
      const { withRetry } = await import('../../src/utils/error-handler.js');
      
      const error = new Error('Immediate failure');
      const fn = vi.fn().mockRejectedValue(error);

      await expect(withRetry(fn, 0, 1000, 'test operation')).rejects.toThrow('Immediate failure');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});