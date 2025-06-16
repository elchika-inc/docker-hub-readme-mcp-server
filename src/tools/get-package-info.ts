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
  const { package_name, include_tags = true, include_stats = true } = params;

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
    // Get repository info from Docker Hub
    const repository = await dockerHubApi.getRepository(namespace, name);

    // Get available tags if requested
    let availableTags: string[] | undefined;
    if (include_tags) {
      try {
        const tagsResponse = await dockerHubApi.getTags(namespace, name, 1, 50);
        availableTags = tagsResponse.results.map(tag => tag.name);
        logger.debug(`Found ${availableTags.length} tags for ${fullName}`);
      } catch (error) {
        logger.warn(`Failed to fetch tags for ${fullName}`, { error });
        availableTags = ['latest']; // Fallback to latest
      }
    }

    // Determine the latest tag (usually 'latest', but could be the most recent one)
    const latestTag = availableTags?.includes('latest') ? 'latest' : (availableTags?.[0] || 'latest');

    // Create stats
    const stats: DownloadStats = {
      pull_count: repository.pull_count,
      star_count: repository.star_count,
      last_updated: repository.last_updated,
    };

    // Create repository info (for potential GitHub integration)
    let repositoryInfo: RepositoryInfo | undefined;
    // Docker Hub API doesn't provide direct repository links
    // This could be enhanced to infer GitHub repositories

    // Create response
    const response: PackageInfoResponse = {
      package_name,
      namespace,
      full_name: fullName,
      latest_tag: latestTag,
      description: repository.description || 'No description available',
      author: repository.user,
      keywords: repository.categories?.map(cat => cat.name) || [],
      available_tags: availableTags,
      stats: include_stats ? stats : {
        pull_count: 0,
        star_count: 0,
        last_updated: '',
      },
      repository: repositoryInfo,
      last_updated: repository.last_updated,
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