import { BasePackageServer, ToolDefinition } from '@elchika-inc/package-readme-shared';
import { getPackageReadme } from './tools/get-package-readme.js';
import { getPackageInfo } from './tools/get-package-info.js';
import { searchPackages } from './tools/search-packages.js';
import { logger } from './utils/logger.js';
import { ParameterValidator } from './utils/parameter-validator.js';
import {
  GetPackageReadmeParams,
  GetPackageInfoParams,
  SearchPackagesParams,
  DockerHubMcpError,
} from './types/index.js';

const TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  get_readme_from_docker: {
    name: 'get_readme_from_docker',
    description: 'Get Docker image README and usage examples from Docker Hub',
    inputSchema: {
      type: 'object',
      properties: {
        package_name: {
          type: 'string',
          description: 'The name of the Docker image (namespace/name format, e.g., "nginx", "library/nginx", "microsoft/dotnet")',
        },
        version: {
          type: 'string',
          description: 'The tag/version of the image (default: "latest")',
          default: 'latest',
        },
        include_examples: {
          type: 'boolean',
          description: 'Whether to include usage examples (default: true)',
          default: true,
        }
      },
      required: ['package_name'],
    }
  },
  get_package_info_from_docker: {
    name: 'get_package_info_from_docker',
    description: 'Get Docker image basic information and metadata from Docker Hub',
    inputSchema: {
      type: 'object',
      properties: {
        package_name: {
          type: 'string',
          description: 'The name of the Docker image (namespace/name format)',
        },
        include_dependencies: {
          type: 'boolean',
          description: 'Whether to include tags as dependencies (default: true)',
          default: true,
        },
        include_dev_dependencies: {
          type: 'boolean',
          description: 'Whether to include development-related tags (default: false)',
          default: false,
        }
      },
      required: ['package_name'],
    }
  },
  search_packages_from_docker: {
    name: 'search_packages_from_docker',
    description: 'Search for Docker images in Docker Hub',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 20)',
          default: 20,
          minimum: 1,
          maximum: 250,
        },
        quality: {
          type: 'number',
          description: 'Quality score minimum (0-1)',
          minimum: 0,
          maximum: 1,
        },
        popularity: {
          type: 'number',
          description: 'Popularity score minimum (0-1)',
          minimum: 0,
          maximum: 1,
        }
      },
      required: ['query'],
    }
  },
} as const;

export class DockerHubMcpServer extends BasePackageServer {
  constructor() {
    super({
      name: 'docker-hub-readme-mcp',
      version: '1.0.0',
    });
  }

  protected getToolDefinitions(): Record<string, ToolDefinition> {
    return TOOL_DEFINITIONS;
  }

  protected async handleToolCall(name: string, args: unknown): Promise<unknown> {
    try {
      switch (name) {
        case 'get_readme_from_docker':
          return await getPackageReadme(ParameterValidator.validateGetPackageReadmeParams(args));
        
        case 'get_package_info_from_docker':
          return await getPackageInfo(ParameterValidator.validateGetPackageInfoParams(args));
        
        case 'search_packages_from_docker':
          return await searchPackages(ParameterValidator.validateSearchPackagesParams(args));
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      logger.error(`Tool execution failed: ${name}`, { error, args });
      throw error;
    }
  }


}

export default DockerHubMcpServer;