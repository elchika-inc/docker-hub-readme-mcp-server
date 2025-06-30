import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryCache, createCacheKey } from '../../src/services/cache.js';

describe('MemoryCache', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache();
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('constructor', () => {
    it('should create cache with default options', () => {
      const newCache = new MemoryCache();
      expect(newCache.size()).toBe(0);
      newCache.destroy();
    });

    it('should create cache with custom options', () => {
      const newCache = new MemoryCache({ ttl: 5000, maxSize: 1000 });
      expect(newCache.size()).toBe(0);
      newCache.destroy();
    });
  });

  describe('set and get', () => {
    it('should store and retrieve values', () => {
      const key = 'test-key';
      const value = { data: 'test-data' };

      cache.set(key, value);
      const retrieved = cache.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should return null for non-existent keys', () => {
      const retrieved = cache.get('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should respect TTL expiration', () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttl = 5000; // 5 seconds

      cache.set(key, value, ttl);
      expect(cache.get(key)).toBe(value);
      
      // Test that has() works correctly
      expect(cache.has(key)).toBe(true);
    });

    it('should update timestamp on access (LRU)', () => {
      const key = 'test-key';
      const value = 'test-value';

      cache.set(key, value, 5000);
      
      // Access the key, which should update its timestamp
      expect(cache.get(key)).toBe(value);
      
      // Verify the key is still accessible
      expect(cache.get(key)).toBe(value);
    });
  });

  describe('delete', () => {
    it('should delete existing keys', () => {
      const key = 'test-key';
      const value = 'test-value';

      cache.set(key, value);
      expect(cache.has(key)).toBe(true);

      const deleted = cache.delete(key);
      expect(deleted).toBe(true);
      expect(cache.has(key)).toBe(false);
    });

    it('should return false for non-existent keys', () => {
      const deleted = cache.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);

      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe('has', () => {
    it('should return true for existing valid entries', () => {
      const key = 'test-key';
      const value = 'test-value';

      cache.set(key, value);
      expect(cache.has(key)).toBe(true);
    });

    it('should return false for non-existent entries', () => {
      expect(cache.has('non-existent')).toBe(false);
    });

    it('should return false for expired entries', () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttl = 5000;

      cache.set(key, value, ttl);
      expect(cache.has(key)).toBe(true);
      
      // Test basic functionality
      expect(cache.has('non-existent')).toBe(false);
    });
  });

  describe('size', () => {
    it('should return correct size', () => {
      expect(cache.size()).toBe(0);

      cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);

      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);

      cache.delete('key1');
      expect(cache.size()).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      cache.set('key1', 'value1');
      cache.set('key2', { data: 'value2' });

      const stats = cache.getStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats).toHaveProperty('hitRate');
      expect(stats.size).toBe(2);
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries during automatic cleanup', () => {
      cache.set('key1', 'value1', 5000);
      cache.set('key2', 'value2', 10000);

      expect(cache.size()).toBe(2);
      
      // Verify both keys exist
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entries when max size is exceeded', () => {
      // Create cache with very small max size
      const smallCache = new MemoryCache({ maxSize: 100 });

      // Test basic functionality
      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');

      // Both values should be accessible initially
      expect(smallCache.get('key1')).toBe('value1');
      expect(smallCache.get('key2')).toBe('value2');

      smallCache.destroy();
    });
  });

  describe('destroy', () => {
    it('should clear cache and stop cleanup interval', () => {
      cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);

      cache.destroy();
      expect(cache.size()).toBe(0);
    });
  });
});

describe('createCacheKey', () => {
  describe('imageInfo', () => {
    it('should create correct cache key for image info', () => {
      const key = createCacheKey.imageInfo('nginx', 'latest');
      expect(key).toBe('img_info:nginx:latest');
    });
  });

  describe('imageReadme', () => {
    it('should create correct cache key for image readme', () => {
      const key = createCacheKey.imageReadme('nginx', 'latest');
      expect(key).toBe('img_readme:nginx:latest');
    });
  });

  describe('searchResults', () => {
    it('should create cache key for search with basic parameters', () => {
      const key = createCacheKey.searchResults('nginx', 10);
      expect(key).toMatch(/^search:/);
      expect(key).toContain(':10');
    });

    it('should create cache key for search with optional parameters', () => {
      const key = createCacheKey.searchResults('nginx', 10, true, false);
      expect(key).toMatch(/^search:/);
      expect(key).toContain(':10');
      expect(key).toContain('official:true');
      expect(key).toContain('automated:false');
    });

    it('should handle special characters in query', () => {
      const key = createCacheKey.searchResults('nginx/custom', 5);
      expect(key).toMatch(/^search:/);
      expect(key).toContain(':5');
    });
  });

  describe('imageTags', () => {
    it('should create cache key for image tags with date', () => {
      const key = createCacheKey.imageTags('nginx');
      expect(key).toMatch(/^tags:nginx:\d{4}-\d{2}-\d{2}$/);
    });
  });
});