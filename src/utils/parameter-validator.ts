import { GetPackageReadmeParams, GetPackageInfoParams, SearchPackagesParams } from '../types/index.js';

export class ParameterValidator {
  static validateGetPackageReadmeParams(args: unknown): GetPackageReadmeParams {
    const params = this.validateArgsAsObject(args);

    if (!params.package_name || typeof params.package_name !== 'string') {
      throw new Error('package_name is required and must be a string. Example: "nginx" or "library/postgres"');
    }

    if (params.version !== undefined && typeof params.version !== 'string') {
      throw new Error('version must be a string. Example: "latest", "1.0.0", or "alpine"');
    }

    if (params.include_examples !== undefined && typeof params.include_examples !== 'boolean') {
      throw new Error('include_examples must be a boolean value (true or false)');
    }

    const result: GetPackageReadmeParams = {
      package_name: params.package_name,
    };
    
    if (params.version !== undefined) {
      result.version = params.version as string;
    }
    
    if (params.include_examples !== undefined) {
      result.include_examples = params.include_examples as boolean;
    }
    
    return result;
  }

  static validateGetPackageInfoParams(args: unknown): GetPackageInfoParams {
    const params = this.validateArgsAsObject(args);

    if (!params.package_name || typeof params.package_name !== 'string') {
      throw new Error('package_name is required and must be a string. Example: "nginx" or "library/postgres"');
    }

    if (params.include_dependencies !== undefined && typeof params.include_dependencies !== 'boolean') {
      throw new Error('include_dependencies must be a boolean value (true or false)');
    }

    if (params.include_dev_dependencies !== undefined && typeof params.include_dev_dependencies !== 'boolean') {
      throw new Error('include_dev_dependencies must be a boolean value (true or false)');
    }

    const result: GetPackageInfoParams = {
      package_name: params.package_name,
    };
    
    if (params.include_dependencies !== undefined) {
      result.include_dependencies = params.include_dependencies as boolean;
    }
    
    if (params.include_dev_dependencies !== undefined) {
      result.include_dev_dependencies = params.include_dev_dependencies as boolean;
    }
    
    return result;
  }

  static validateSearchPackagesParams(args: unknown): SearchPackagesParams {
    const params = this.validateArgsAsObject(args);

    if (!params.query || typeof params.query !== 'string') {
      throw new Error('query is required and must be a string. Example: "nginx", "database", or "python"');
    }

    if (params.limit !== undefined) {
      if (typeof params.limit !== 'number' || params.limit < 1 || params.limit > 100) {
        throw new Error('limit must be a number between 1 and 100. Example: 20 (default) or 50');
      }
    }

    if (params.quality !== undefined) {
      if (typeof params.quality !== 'number' || params.quality < 0 || params.quality > 1) {
        throw new Error('quality must be a number between 0 and 1. Example: 0.8 for high quality results');
      }
    }

    if (params.popularity !== undefined) {
      if (typeof params.popularity !== 'number' || params.popularity < 0 || params.popularity > 1) {
        throw new Error('popularity must be a number between 0 and 1. Example: 0.5 for moderately popular images');
      }
    }

    const result: SearchPackagesParams = {
      query: params.query,
    };
    
    if (params.limit !== undefined) {
      result.limit = params.limit as number;
    }
    
    if (params.quality !== undefined) {
      result.quality = params.quality as number;
    }
    
    if (params.popularity !== undefined) {
      result.popularity = params.popularity as number;
    }
    
    return result;
  }

  private static validateArgsAsObject(args: unknown): Record<string, unknown> {
    if (!args || typeof args !== 'object') {
      throw new Error('Arguments must be an object with required parameters. Example: { "package_name": "nginx" }');
    }
    return args as Record<string, unknown>;
  }
}