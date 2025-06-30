import { describe, it, expect } from 'vitest';
import { ReadmeParser } from '../src/services/readme-parser.js';
import { cache, createCacheKey } from '../src/services/cache.js';

describe('Integration Tests', () => {
  describe('ReadmeParser', () => {
    it('should parse usage examples from README content', () => {
      const parser = new ReadmeParser();
      const readme = `
# Test Image

## Usage

\`\`\`bash
docker run nginx
\`\`\`
      `;

      const result = parser.parseUsageExamples(readme, true);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        code: 'docker run nginx',
        language: 'bash',
      });
    });

    it('should extract description from README', () => {
      const parser = new ReadmeParser();
      const readme = `
# Test Image

This is a test image for Docker.

## Features
      `;

      const result = parser.extractDescription(readme);
      
      expect(result).toBe('This is a test image for Docker.');
    });

    it('should clean markdown content', () => {
      const parser = new ReadmeParser();
      const content = '![Badge](https://example.com/badge.png) Some text';
      
      const result = parser.cleanMarkdown(content);
      
      expect(result).toBe('Badge Some text');
    });
  });

  describe('Cache', () => {
    it('should store and retrieve values', () => {
      cache.clear();
      cache.set('test-key', 'test-value', 60000);
      
      const result = cache.get('test-key');
      
      expect(result).toBe('test-value');
    });

    it('should track cache size', () => {
      cache.clear();
      expect(cache.size()).toBe(0);
      
      cache.set('key1', 'value1', 60000);
      expect(cache.size()).toBe(1);
      
      cache.delete('key1');
      expect(cache.size()).toBe(0);
    });
  });

  describe('createCacheKey', () => {
    it('should create consistent keys', () => {
      const key1 = createCacheKey.imageInfo('nginx', 'repository');
      const key2 = createCacheKey.imageInfo('nginx', 'repository');
      
      expect(key1).toBe(key2);
    });

    it('should create different keys for different inputs', () => {
      const key1 = createCacheKey.imageInfo('nginx', 'repository');
      const key2 = createCacheKey.imageInfo('redis', 'repository');
      
      expect(key1).not.toBe(key2);
    });

    it('should create search result keys', () => {
      const key = createCacheKey.searchResults('nginx', 25);
      
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });
  });
});