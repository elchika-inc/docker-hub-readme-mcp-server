import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockCache = {
  get: vi.fn(),
  set: vi.fn(),
};

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock('../../src/services/cache.js', () => ({
  cache: mockCache,
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: mockLogger,
}));

describe('withCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('cache hit scenarios', () => {
    it('should return cached value when available', async () => {
      const { withCache } = await import('../../src/utils/cache-helper.js');
      const cachedValue = { data: 'cached-data' };
      const cacheKey = 'test-key';
      const fetcher = vi.fn();

      mockCache.get.mockReturnValue(cachedValue);

      const result = await withCache(cacheKey, fetcher);

      expect(result).toBe(cachedValue);
      expect(mockCache.get).toHaveBeenCalledWith(cacheKey);
      expect(fetcher).not.toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it('should log cache hit when operation name is provided', async () => {
      const { withCache } = await import('../../src/utils/cache-helper.js');
      const cachedValue = 'cached-data';
      const cacheKey = 'test-key';
      const operationName = 'test-operation';
      const fetcher = vi.fn();

      mockCache.get.mockReturnValue(cachedValue);

      await withCache(cacheKey, fetcher, undefined, operationName);

      expect(mockLogger.debug).toHaveBeenCalledWith(`Cache hit for ${operationName}: ${cacheKey}`);
    });

    it('should not log when operation name is not provided', async () => {
      const { withCache } = await import('../../src/utils/cache-helper.js');
      const cachedValue = 'cached-data';
      const cacheKey = 'test-key';
      const fetcher = vi.fn();

      mockCache.get.mockReturnValue(cachedValue);

      await withCache(cacheKey, fetcher);

      expect(mockLogger.debug).not.toHaveBeenCalled();
    });
  });

  describe('cache miss scenarios', () => {
    it('should fetch and cache data when not in cache', async () => {
      const { withCache } = await import('../../src/utils/cache-helper.js');
      const fetchedValue = { data: 'fetched-data' };
      const cacheKey = 'test-key';
      const fetcher = vi.fn().mockResolvedValue(fetchedValue);

      mockCache.get.mockReturnValue(null);

      const result = await withCache(cacheKey, fetcher);

      expect(result).toBe(fetchedValue);
      expect(mockCache.get).toHaveBeenCalledWith(cacheKey);
      expect(fetcher).toHaveBeenCalledOnce();
      expect(mockCache.set).toHaveBeenCalledWith(cacheKey, fetchedValue, undefined);
    });

    it('should fetch and cache data with custom TTL', async () => {
      const { withCache } = await import('../../src/utils/cache-helper.js');
      const fetchedValue = 'fetched-data';
      const cacheKey = 'test-key';
      const ttl = 5000;
      const fetcher = vi.fn().mockResolvedValue(fetchedValue);

      mockCache.get.mockReturnValue(null);

      const result = await withCache(cacheKey, fetcher, ttl);

      expect(result).toBe(fetchedValue);
      expect(mockCache.set).toHaveBeenCalledWith(cacheKey, fetchedValue, ttl);
    });

    it('should log cache miss and fetch when operation name is provided', async () => {
      const { withCache } = await import('../../src/utils/cache-helper.js');
      const fetchedValue = 'fetched-data';
      const cacheKey = 'test-key';
      const operationName = 'test-operation';
      const fetcher = vi.fn().mockResolvedValue(fetchedValue);

      mockCache.get.mockReturnValue(null);

      await withCache(cacheKey, fetcher, undefined, operationName);

      expect(mockLogger.debug).toHaveBeenCalledWith(`Cache miss for ${operationName}, fetching data: ${cacheKey}`);
      expect(mockLogger.debug).toHaveBeenCalledWith(`Data fetched and cached for ${operationName}: ${cacheKey}`);
    });
  });

  describe('error handling', () => {
    it('should propagate errors from fetcher', async () => {
      const { withCache } = await import('../../src/utils/cache-helper.js');
      const error = new Error('Fetch failed');
      const cacheKey = 'test-key';
      const fetcher = vi.fn().mockRejectedValue(error);

      mockCache.get.mockReturnValue(null);

      await expect(withCache(cacheKey, fetcher)).rejects.toThrow('Fetch failed');
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it('should not cache failed fetches', async () => {
      const { withCache } = await import('../../src/utils/cache-helper.js');
      const error = new Error('Network error');
      const cacheKey = 'test-key';
      const fetcher = vi.fn().mockRejectedValue(error);

      mockCache.get.mockReturnValue(null);

      try {
        await withCache(cacheKey, fetcher);
      } catch (e) {
        // Expected to throw
      }

      expect(mockCache.set).not.toHaveBeenCalled();
    });
  });

  describe('type safety', () => {
    it('should maintain type safety for returned values', async () => {
      const { withCache } = await import('../../src/utils/cache-helper.js');
      interface TestData {
        id: number;
        name: string;
      }

      const fetchedValue: TestData = { id: 1, name: 'test' };
      const cacheKey = 'test-key';
      const fetcher = vi.fn().mockResolvedValue(fetchedValue);

      mockCache.get.mockReturnValue(null);

      const result: TestData = await withCache(cacheKey, fetcher);

      expect(result).toBe(fetchedValue);
      expect(result.id).toBe(1);
      expect(result.name).toBe('test');
    });

    it('should handle primitive types', async () => {
      const { withCache } = await import('../../src/utils/cache-helper.js');
      const fetchedValue = 'simple-string';
      const cacheKey = 'test-key';
      const fetcher = vi.fn().mockResolvedValue(fetchedValue);

      mockCache.get.mockReturnValue(null);

      const result: string = await withCache(cacheKey, fetcher);

      expect(result).toBe(fetchedValue);
      expect(typeof result).toBe('string');
    });

    it('should handle array types', async () => {
      const { withCache } = await import('../../src/utils/cache-helper.js');
      const fetchedValue = [1, 2, 3];
      const cacheKey = 'test-key';
      const fetcher = vi.fn().mockResolvedValue(fetchedValue);

      mockCache.get.mockReturnValue(null);

      const result: number[] = await withCache(cacheKey, fetcher);

      expect(result).toBe(fetchedValue);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
    });
  });

  describe('fetcher function behavior', () => {
    it('should call fetcher function without arguments', async () => {
      const { withCache } = await import('../../src/utils/cache-helper.js');
      const fetchedValue = 'data';
      const cacheKey = 'test-key';
      const fetcher = vi.fn().mockResolvedValue(fetchedValue);

      mockCache.get.mockReturnValue(null);

      await withCache(cacheKey, fetcher);

      expect(fetcher).toHaveBeenCalledWith();
    });

    it('should handle async fetcher functions', async () => {
      const { withCache } = await import('../../src/utils/cache-helper.js');
      const fetchedValue = 'async-data';
      const cacheKey = 'test-key';
      const fetcher = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return fetchedValue;
      });

      mockCache.get.mockReturnValue(null);

      const result = await withCache(cacheKey, fetcher);

      expect(result).toBe(fetchedValue);
      expect(fetcher).toHaveBeenCalledOnce();
    });
  });
});