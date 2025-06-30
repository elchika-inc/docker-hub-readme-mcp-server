import { describe, it, expect } from 'vitest';
import { ParameterValidator } from '../../src/utils/parameter-validator.js';

describe('ParameterValidator', () => {
  describe('validateArgsAsObject', () => {
    it('should throw error for null arguments', () => {
      expect(() => {
        ParameterValidator.validateGetPackageReadmeParams(null);
      }).toThrow('Arguments must be an object with required parameters');
    });

    it('should throw error for undefined arguments', () => {
      expect(() => {
        ParameterValidator.validateGetPackageReadmeParams(undefined);
      }).toThrow('Arguments must be an object with required parameters');
    });

    it('should throw error for non-object arguments', () => {
      expect(() => {
        ParameterValidator.validateGetPackageReadmeParams('string');
      }).toThrow('Arguments must be an object with required parameters');

      expect(() => {
        ParameterValidator.validateGetPackageReadmeParams(123);
      }).toThrow('Arguments must be an object with required parameters');

      expect(() => {
        ParameterValidator.validateGetPackageReadmeParams(true);
      }).toThrow('Arguments must be an object with required parameters');
    });
  });

  describe('validateGetPackageReadmeParams', () => {
    describe('package_name validation', () => {
      it('should accept valid package names', () => {
        const validParams = [
          { package_name: 'nginx' },
          { package_name: 'library/nginx' },
          { package_name: 'user/custom-app' },
          { package_name: 'registry.example.com/namespace/image' },
        ];

        validParams.forEach(params => {
          const result = ParameterValidator.validateGetPackageReadmeParams(params);
          expect(result.package_name).toBe(params.package_name);
        });
      });

      it('should throw error for missing package_name', () => {
        expect(() => {
          ParameterValidator.validateGetPackageReadmeParams({});
        }).toThrow('package_name is required and must be a string');
      });

      it('should throw error for non-string package_name', () => {
        expect(() => {
          ParameterValidator.validateGetPackageReadmeParams({ package_name: 123 });
        }).toThrow('package_name is required and must be a string');

        expect(() => {
          ParameterValidator.validateGetPackageReadmeParams({ package_name: null });
        }).toThrow('package_name is required and must be a string');

        expect(() => {
          ParameterValidator.validateGetPackageReadmeParams({ package_name: undefined });
        }).toThrow('package_name is required and must be a string');
      });

      it('should throw error for empty package_name', () => {
        expect(() => {
          ParameterValidator.validateGetPackageReadmeParams({ package_name: '' });
        }).toThrow('package_name is required and must be a string');
      });
    });

    describe('version validation', () => {
      it('should accept valid version strings', () => {
        const validVersions = ['latest', '1.0.0', 'alpine', 'v2.1', 'stable'];

        validVersions.forEach(version => {
          const result = ParameterValidator.validateGetPackageReadmeParams({
            package_name: 'nginx',
            version,
          });
          expect(result.version).toBe(version);
        });
      });

      it('should accept undefined version', () => {
        const result = ParameterValidator.validateGetPackageReadmeParams({
          package_name: 'nginx',
        });
        expect(result.version).toBeUndefined();
      });

      it('should throw error for non-string version', () => {
        expect(() => {
          ParameterValidator.validateGetPackageReadmeParams({
            package_name: 'nginx',
            version: 123,
          });
        }).toThrow('version must be a string');

        expect(() => {
          ParameterValidator.validateGetPackageReadmeParams({
            package_name: 'nginx',
            version: null,
          });
        }).toThrow('version must be a string');
      });
    });

    describe('include_examples validation', () => {
      it('should accept boolean values', () => {
        const result1 = ParameterValidator.validateGetPackageReadmeParams({
          package_name: 'nginx',
          include_examples: true,
        });
        expect(result1.include_examples).toBe(true);

        const result2 = ParameterValidator.validateGetPackageReadmeParams({
          package_name: 'nginx',
          include_examples: false,
        });
        expect(result2.include_examples).toBe(false);
      });

      it('should accept undefined include_examples', () => {
        const result = ParameterValidator.validateGetPackageReadmeParams({
          package_name: 'nginx',
        });
        expect(result.include_examples).toBeUndefined();
      });

      it('should throw error for non-boolean include_examples', () => {
        expect(() => {
          ParameterValidator.validateGetPackageReadmeParams({
            package_name: 'nginx',
            include_examples: 'true',
          });
        }).toThrow('include_examples must be a boolean value');

        expect(() => {
          ParameterValidator.validateGetPackageReadmeParams({
            package_name: 'nginx',
            include_examples: 1,
          });
        }).toThrow('include_examples must be a boolean value');
      });
    });

    it('should return complete valid params object', () => {
      const result = ParameterValidator.validateGetPackageReadmeParams({
        package_name: 'nginx',
        version: 'latest',
        include_examples: true,
      });

      expect(result).toEqual({
        package_name: 'nginx',
        version: 'latest',
        include_examples: true,
      });
    });
  });

  describe('validateGetPackageInfoParams', () => {
    describe('package_name validation', () => {
      it('should accept valid package names', () => {
        const result = ParameterValidator.validateGetPackageInfoParams({
          package_name: 'nginx',
        });
        expect(result.package_name).toBe('nginx');
      });

      it('should throw error for missing package_name', () => {
        expect(() => {
          ParameterValidator.validateGetPackageInfoParams({});
        }).toThrow('package_name is required and must be a string');
      });
    });

    describe('include_dependencies validation', () => {
      it('should accept boolean values', () => {
        const result = ParameterValidator.validateGetPackageInfoParams({
          package_name: 'nginx',
          include_dependencies: true,
        });
        expect(result.include_dependencies).toBe(true);
      });

      it('should throw error for non-boolean include_dependencies', () => {
        expect(() => {
          ParameterValidator.validateGetPackageInfoParams({
            package_name: 'nginx',
            include_dependencies: 'true',
          });
        }).toThrow('include_dependencies must be a boolean value');
      });
    });

    describe('include_dev_dependencies validation', () => {
      it('should accept boolean values', () => {
        const result = ParameterValidator.validateGetPackageInfoParams({
          package_name: 'nginx',
          include_dev_dependencies: false,
        });
        expect(result.include_dev_dependencies).toBe(false);
      });

      it('should throw error for non-boolean include_dev_dependencies', () => {
        expect(() => {
          ParameterValidator.validateGetPackageInfoParams({
            package_name: 'nginx',
            include_dev_dependencies: 'false',
          });
        }).toThrow('include_dev_dependencies must be a boolean value');
      });
    });

    it('should return complete valid params object', () => {
      const result = ParameterValidator.validateGetPackageInfoParams({
        package_name: 'library/postgres',
        include_dependencies: true,
        include_dev_dependencies: false,
      });

      expect(result).toEqual({
        package_name: 'library/postgres',
        include_dependencies: true,
        include_dev_dependencies: false,
      });
    });
  });

  describe('validateSearchPackagesParams', () => {
    describe('query validation', () => {
      it('should accept valid query strings', () => {
        const validQueries = ['nginx', 'database', 'python web server', 'redis-alpine'];

        validQueries.forEach(query => {
          const result = ParameterValidator.validateSearchPackagesParams({ query });
          expect(result.query).toBe(query);
        });
      });

      it('should throw error for missing query', () => {
        expect(() => {
          ParameterValidator.validateSearchPackagesParams({});
        }).toThrow('query is required and must be a string');
      });

      it('should throw error for non-string query', () => {
        expect(() => {
          ParameterValidator.validateSearchPackagesParams({ query: 123 });
        }).toThrow('query is required and must be a string');

        expect(() => {
          ParameterValidator.validateSearchPackagesParams({ query: null });
        }).toThrow('query is required and must be a string');
      });

      it('should throw error for empty query', () => {
        expect(() => {
          ParameterValidator.validateSearchPackagesParams({ query: '' });
        }).toThrow('query is required and must be a string');
      });
    });

    describe('limit validation', () => {
      it('should accept valid limit numbers', () => {
        const validLimits = [1, 20, 50, 100];

        validLimits.forEach(limit => {
          const result = ParameterValidator.validateSearchPackagesParams({
            query: 'nginx',
            limit,
          });
          expect(result.limit).toBe(limit);
        });
      });

      it('should accept undefined limit', () => {
        const result = ParameterValidator.validateSearchPackagesParams({
          query: 'nginx',
        });
        expect(result.limit).toBeUndefined();
      });

      it('should throw error for invalid limit values', () => {
        const invalidLimits = [0, -1, 101, '20'];

        invalidLimits.forEach(limit => {
          expect(() => {
            ParameterValidator.validateSearchPackagesParams({
              query: 'nginx',
              limit,
            });
          }).toThrow('limit must be a number between 1 and 100. Example: 20 (default) or 50');
        });
      });
    });

    describe('quality validation', () => {
      it('should accept valid quality numbers', () => {
        const validQualities = [0, 0.5, 0.8, 1];

        validQualities.forEach(quality => {
          const result = ParameterValidator.validateSearchPackagesParams({
            query: 'nginx',
            quality,
          });
          expect(result.quality).toBe(quality);
        });
      });

      it('should accept undefined quality', () => {
        const result = ParameterValidator.validateSearchPackagesParams({
          query: 'nginx',
        });
        expect(result.quality).toBeUndefined();
      });

      it('should throw error for invalid quality values', () => {
        const invalidQualities = [-0.1, 1.1, '0.5', NaN];

        invalidQualities.forEach(quality => {
          expect(() => {
            ParameterValidator.validateSearchPackagesParams({
              query: 'nginx',
              quality,
            });
          }).toThrow('quality must be a number between 0 and 1. Example: 0.8 for high quality results');
        });
      });
    });

    describe('popularity validation', () => {
      it('should accept valid popularity numbers', () => {
        const validPopularities = [0, 0.3, 0.7, 1];

        validPopularities.forEach(popularity => {
          const result = ParameterValidator.validateSearchPackagesParams({
            query: 'nginx',
            popularity,
          });
          expect(result.popularity).toBe(popularity);
        });
      });

      it('should accept undefined popularity', () => {
        const result = ParameterValidator.validateSearchPackagesParams({
          query: 'nginx',
        });
        expect(result.popularity).toBeUndefined();
      });

      it('should throw error for invalid popularity values', () => {
        const invalidPopularities = [-0.1, 1.1, '0.5', NaN];

        invalidPopularities.forEach(popularity => {
          expect(() => {
            ParameterValidator.validateSearchPackagesParams({
              query: 'nginx',
              popularity,
            });
          }).toThrow('popularity must be a number between 0 and 1. Example: 0.5 for moderately popular images');
        });
      });
    });

    it('should return complete valid params object', () => {
      const result = ParameterValidator.validateSearchPackagesParams({
        query: 'web server',
        limit: 25,
        quality: 0.8,
        popularity: 0.6,
      });

      expect(result).toEqual({
        query: 'web server',
        limit: 25,
        quality: 0.8,
        popularity: 0.6,
      });
    });

    it('should handle partial parameters correctly', () => {
      const result = ParameterValidator.validateSearchPackagesParams({
        query: 'database',
        limit: 10,
      });

      expect(result).toEqual({
        query: 'database',
        limit: 10,
      });
      expect(result.quality).toBeUndefined();
      expect(result.popularity).toBeUndefined();
    });
  });

  describe('error messages', () => {
    it('should provide helpful error messages with examples', () => {
      expect(() => {
        ParameterValidator.validateGetPackageReadmeParams({ package_name: 123 });
      }).toThrow('package_name is required and must be a string. Example: "nginx" or "library/postgres"');

      expect(() => {
        ParameterValidator.validateGetPackageReadmeParams({ package_name: 'nginx', version: 123 });
      }).toThrow('version must be a string. Example: "latest", "1.0.0", or "alpine"');

      expect(() => {
        ParameterValidator.validateSearchPackagesParams({ query: 'nginx', limit: 0 });
      }).toThrow('limit must be a number between 1 and 100. Example: 20 (default) or 50');

      expect(() => {
        ParameterValidator.validateSearchPackagesParams({ query: 'nginx', quality: 1.5 });
      }).toThrow('quality must be a number between 0 and 1. Example: 0.8 for high quality results');

      expect(() => {
        ParameterValidator.validateSearchPackagesParams({ query: 'nginx', popularity: -0.1 });
      }).toThrow('popularity must be a number between 0 and 1. Example: 0.5 for moderately popular images');
    });
  });
});