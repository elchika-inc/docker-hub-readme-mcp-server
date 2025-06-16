import { logger } from '../utils/logger.js';
import { validateImageName, parseImageName } from '../utils/validators.js';
import { cache, createCacheKey } from '../services/cache.js';
import { DockerHubApi } from '../services/docker-hub-api.js';
import type {
  GetPackageInfoParams,
  PackageInfoResponse,
  DownloadStats,
  RepositoryInfo,
} from '../types/index.js';

const dockerHubApi = new DockerHubApi();

export async function getPackageInfo(params: GetPackageInfoParams): Promise<PackageInfoResponse> {
  const { package_name, include_dependencies = true } = params;

  logger.info(`Fetching Docker image info: ${package_name}`);

  // Validate inputs
  validateImageName(package_name);

  // Parse image name
  const { namespace, name } = parseImageName(package_name);
  const fullName = `${namespace}/${name}`;

  // Check cache first
  const cacheKey = createCacheKey.imageInfo(fullName, 'info');
  const cached = cache.get<PackageInfoResponse>(cacheKey);
  if (cached) {
    logger.debug(`Cache hit for image info: ${fullName}`);
    return cached;
  }

  try {
    // First, verify package exists by trying to get repository info
    logger.debug(`Checking package existence: ${package_name}`);
    let repository;
    let packageExists = true;
    
    try {
      repository = await dockerHubApi.getRepository(namespace, name);
      logger.debug(`Package found: ${package_name}`);
    } catch (error: any) {
      if (error.statusCode === 404) {
        packageExists = false;
        logger.debug(`Package not found: ${package_name}`);
      } else {
        throw error;
      }
    }
    
    // If package doesn't exist, return response with exists: false
    if (!packageExists) {
      const response: PackageInfoResponse = {
        package_name,
        latest_version: '',
        description: '',
        author: '',
        license: '',
        keywords: [],
        dependencies: {},
        dev_dependencies: {},
        download_stats: {
          pull_count: 0,
          star_count: 0,
          last_updated: '',
        },
        exists: false,
      };
      
      // Cache the response
      cache.set(cacheKey, response, 300000); // 5 minutes TTL
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

    // Create stats
    const downloadStats: DownloadStats = {
      pull_count: repository!.pull_count,
      star_count: repository!.star_count,
      last_updated: repository!.last_updated,
    };

    // Create repository info (for potential GitHub integration)
    let repositoryInfo: RepositoryInfo | undefined;
    // Docker Hub API doesn't provide direct repository links
    // This could be enhanced to infer GitHub repositories

    // Create response
    const response: PackageInfoResponse = {
      package_name,
      latest_version: latestVersion,
      description: repository!.description || 'No description available',
      author: repository!.user,
      license: '', // Not available in Docker Hub API
      keywords: repository!.categories?.map(cat => cat.name) || [],
      dependencies: dependencies || {},
      dev_dependencies: devDependencies || {},
      download_stats: downloadStats,
      repository: repositoryInfo,
      exists: true,
    };

    // Cache the response
    cache.set(cacheKey, response, 300000); // 5 minutes TTL

    logger.info(`Successfully fetched image info: ${fullName}`);
    return response;

  } catch (error) {
    logger.error(`Failed to fetch image info: ${package_name}`, { error });
    throw error;
  }
}