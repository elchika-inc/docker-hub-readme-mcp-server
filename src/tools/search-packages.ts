import { logger } from '../utils/logger.js';
import { validateSearchQuery, validateLimit } from '../utils/validators.js';
import { cache, createCacheKey } from '../services/cache.js';
import { DockerHubApi } from '../services/docker-hub-api.js';
import type {
  SearchPackagesParams,
  SearchPackagesResponse,
  PackageSearchResult,
} from '../types/index.js';

const dockerHubApi = new DockerHubApi();

export async function searchPackages(params: SearchPackagesParams): Promise<SearchPackagesResponse> {
  const { query, limit = 20, is_official, is_automated } = params;

  logger.info(`Searching Docker images: ${query} (limit: ${limit})`);

  // Validate inputs
  validateSearchQuery(query);
  validateLimit(limit);

  // Check cache first
  const cacheKey = createCacheKey.searchResults(query, limit, is_official, is_automated);
  const cached = cache.get<SearchPackagesResponse>(cacheKey);
  if (cached) {
    logger.debug(`Cache hit for search: ${query}`);
    return cached;
  }

  try {
    // Search repositories on Docker Hub
    const searchResponse = await dockerHubApi.searchRepositories(
      query,
      1, // page
      limit, // page_size
      is_official,
      is_automated
    );

    // Transform search results
    const packages: PackageSearchResult[] = searchResponse.results.map(result => ({
      name: result.repo_name.split('/').pop() || result.repo_name,
      namespace: result.repo_owner,
      full_name: result.repo_name,
      description: result.short_description || 'No description available',
      star_count: result.star_count,
      pull_count: result.pull_count,
      repo_type: result.is_official ? 'official' : 'user',
      is_official: result.is_official,
      is_automated: result.is_automated,
      last_updated: result.last_updated,
    }));

    // Create response
    const response: SearchPackagesResponse = {
      query,
      total: searchResponse.count,
      packages,
    };

    // Cache the response
    cache.set(cacheKey, response, 600000); // 10 minutes TTL

    logger.info(`Successfully searched images: ${query} (found ${packages.length}/${searchResponse.count} results)`);
    return response;

  } catch (error) {
    logger.error(`Failed to search images: ${query}`, { error });
    throw error;
  }
}