import { describe, it, expect } from 'vitest';
import { 
  validatePackageName, 
  validateSearchQuery, 
  validateTag, 
  validateLimit, 
  validateBoolean 
} from '../../src/utils/validators.js';
import { ValidationError } from '../../src/types/index.js';

describe('validators', () => {
  describe('validatePackageName', () => {
    it('should accept valid package names', () => {
      const validNames = [
        'nginx',
        'library/nginx', 
        'user/app',
        'my-app',
        'my_app',
        'app123',
      ];

      validNames.forEach(name => {
        expect(() => validatePackageName(name)).not.toThrow();
      });
    });

    it('should reject invalid package names', () => {
      const invalidNames = [
        '',
        'UPPERCASE',
        'user/UPPERCASE',
        'a'.repeat(256), // Too long
      ];

      invalidNames.forEach(name => {
        expect(() => validatePackageName(name)).toThrow(ValidationError);
      });
    });
  });

  describe('validateSearchQuery', () => {
    it('should accept valid search queries', () => {
      const validQueries = [
        'nginx',
        'web server',
        'my-app',
        'français',
        '中文',
      ];

      validQueries.forEach(query => {
        expect(() => validateSearchQuery(query)).not.toThrow();
      });
    });

    it('should reject invalid search queries', () => {
      const invalidQueries = [
        '',
        'a'.repeat(256), // Too long
      ];

      invalidQueries.forEach(query => {
        expect(() => validateSearchQuery(query)).toThrow(ValidationError);
      });
    });
  });

  describe('validateTag', () => {
    it('should accept valid tags', () => {
      const validTags = [
        'latest',
        'v1.0',
        'stable',
        'beta',
        'main',
        'feature-branch',
        'release_1.0',
      ];

      validTags.forEach(tag => {
        expect(() => validateTag(tag)).not.toThrow();
      });
    });

    it('should reject invalid tags', () => {
      const invalidTags = [
        '',
        'TAG-WITH-UPPERCASE',
        'a'.repeat(129), // Too long
      ];

      invalidTags.forEach(tag => {
        expect(() => validateTag(tag)).toThrow(ValidationError);
      });
    });
  });

  describe('validateLimit', () => {
    it('should accept valid limits', () => {
      const validLimits = [1, 5, 10, 25, 50, 100];

      validLimits.forEach(limit => {
        expect(() => validateLimit(limit)).not.toThrow();
      });
    });

    it('should reject invalid limits', () => {
      const invalidLimits = [0, -1, 101, 1.5, NaN];

      invalidLimits.forEach(limit => {
        expect(() => validateLimit(limit)).toThrow(ValidationError);
      });
    });
  });

  describe('validateBoolean', () => {
    it('should accept valid booleans', () => {
      expect(() => validateBoolean(true, 'test')).not.toThrow();
      expect(() => validateBoolean(false, 'test')).not.toThrow();
      expect(() => validateBoolean(undefined, 'test')).not.toThrow();
    });

    it('should reject invalid boolean values', () => {
      const invalidBooleans = [
        'true',
        'false',
        0,
        1,
        null,
      ];

      invalidBooleans.forEach(value => {
        expect(() => validateBoolean(value as any, 'test')).toThrow(ValidationError);
      });
    });
  });
});