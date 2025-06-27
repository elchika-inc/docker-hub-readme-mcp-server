import { logger } from '../utils/logger.js';
import { validateImageName, parseImageName } from '../utils/validators.js';
import { cache, createCacheKey } from '../services/cache.js';
import { DockerHubApi } from '../services/docker-hub-api.js';
import type {
  GetPackageInfoParams,
  PackageInfoResponse,
  RepositoryInfo,
} from '../types/index.js';
import { CACHE_CONFIG } from '../constants/cache-config.js';
import { withCache } from '../utils/cache-helper.js';

const dockerHubApi = new DockerHubApi();

export async function getPackageInfo(params: GetPackageInfoParams): Promise<PackageInfoResponse> {
  const { package_name, include_dependencies = true } = params;

  logger.info(`Fetching Docker image info: ${package_name}`);

  // Validate inputs
  validateImageName(package_name);

  // Parse image name
  const { namespace, name } = parseImageName(package_name);
  const fullName = `${namespace}/${name}`;

  // Use cache helper for the entire operation
  const cacheKey = createCacheKey.imageInfo(fullName, 'info');
  
  return withCache(
    cacheKey,
    async () => {
      return await fetchPackageInfo(namespace, name, fullName, include_dependencies);
    },
    CACHE_CONFIG.TTL.REPOSITORY_INFO,
    `Docker image info: ${fullName}`
  );
}

/**
 * Internal function to fetch package info data
 */
async function fetchPackageInfo(
  namespace: string,
  name: string,
  fullName: string,
  include_dependencies: boolean
): Promise<PackageInfoResponse> {
  const dockerHubApi = new DockerHubApi();

  try {
    // First, verify package exists by trying to get repository info
    logger.debug(`Checking package existence: ${fullName}`);
    let repository;
    let packageExists = true;
    
    try {
      repository = await dockerHubApi.getRepository(namespace, name);
      logger.debug(`Package found: ${fullName}`);
    } catch (error: any) {
      if (error.statusCode === 404) {
        packageExists = false;
        logger.debug(`Package not found: ${fullName}`);
      } else {
        throw error;
      }
    }
    
    // If package doesn't exist, return response with exists: false
    if (!packageExists) {
      const response: PackageInfoResponse = {
        package_name: fullName,
        latest_version: '',
        description: '',
        author: '',
        license: '',
        keywords: [],
        dependencies: {},
        dev_dependencies: {},
        exists: false,
      };
      
      return response;
    }

    // Get available tags if requested
    let dependencies: Record<string, string> | undefined;
    let devDependencies: Record<string, string> | undefined;
    
    if (include_dependencies) {
      try {
        const tagsResponse = await dockerHubApi.getTags(namespace, name, 1, 50);
        const availableTags = tagsResponse.results.map(tag => tag.name);
        dependencies = {};
        availableTags.forEach(tag => {
          dependencies![tag] = 'latest';
        });
        logger.debug(`Found ${availableTags.length} tags for ${fullName}`);
      } catch (error) {
        logger.warn(`Failed to fetch tags for ${fullName}`, { error });
        dependencies = { 'latest': 'latest' }; // Fallback
      }
    }

    // Determine the latest version
    const latestVersion = dependencies && Object.keys(dependencies).includes('latest') 
      ? 'latest' 
      : (dependencies ? Object.keys(dependencies)[0] || 'latest' : 'latest');


    // Create repository info (for potential GitHub integration)
    let repositoryInfo: RepositoryInfo | undefined;
    // Docker Hub API doesn't provide direct repository links
    // This could be enhanced to infer GitHub repositories

    // Create response
    const response: PackageInfoResponse = {
      package_name: fullName,
      latest_version: latestVersion,
      description: repository!.description || 'No description available',
      author: repository!.user,
      license: '', // Not available in Docker Hub API
      keywords: repository!.categories?.map(cat => cat.name) || [],
      dependencies: dependencies || {},
      dev_dependencies: devDependencies || {},
      repository: repositoryInfo,
      exists: true,
    };


    logger.info(`Successfully fetched image info: ${fullName}`);
    return response;

  } catch (error) {
    logger.error(`Failed to fetch image info: ${fullName}`, { error });
    throw error;
  }
}