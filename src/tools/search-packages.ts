import { logger } from '../utils/logger.js';
import { validateSearchQuery, validateLimit } from '../utils/validators.js';
import { cache, createCacheKey } from '../services/cache.js';
import { DockerHubApi } from '../services/docker-hub-api.js';
import type {
  SearchPackagesParams,
  SearchPackagesResponse,
  PackageSearchResult,
} from '../types/index.js';
import { CACHE_CONFIG } from '../constants/cache-config.js';
import { withCache } from '../utils/cache-helper.js';

const dockerHubApi = new DockerHubApi();

export async function searchPackages(params: SearchPackagesParams): Promise<SearchPackagesResponse> {
  const { query, limit = 20, quality, popularity } = params;

  logger.info(`Searching Docker images: ${query} (limit: ${limit})`);

  // Validate inputs
  validateSearchQuery(query);
  validateLimit(limit);

  // Use cache helper for the entire operation
  const cacheKey = createCacheKey.searchResults(query, limit, undefined, undefined);
  
  return withCache(
    cacheKey,
    async () => {
      return await performDockerHubSearch(query, limit, quality, popularity);
    },
    CACHE_CONFIG.TTL.SEARCH_RESULTS,
    `Docker Hub search: ${query}`
  );
}

/**
 * Internal function to perform Docker Hub search
 */
async function performDockerHubSearch(
  query: string,
  limit: number,
  quality?: number,
  popularity?: number
): Promise<SearchPackagesResponse> {
  const dockerHubApi = new DockerHubApi();

  try {
    // Search repositories on Docker Hub
    // Note: Docker Hub API doesn't support quality/popularity filters directly
    // We'll use is_official as a proxy for quality
    const searchResponse = await dockerHubApi.searchRepositories(
      query,
      1, // page
      limit, // page_size
      quality ? quality > 0.5 : undefined, // use quality as is_official filter
      undefined // is_automated not used
    );

    // Transform search results
    const packages: PackageSearchResult[] = searchResponse.results
      .map(result => {
        // Calculate quality and popularity scores
        const qualityScore = result.is_official ? 1.0 : Math.min(result.star_count / 1000, 1.0);
        const popularityScore = Math.min(result.pull_count / 1000000, 1.0);
        const maintenanceScore = isRecentlyUpdated(result.last_updated) ? 1.0 : 0.5;
        const finalScore = (qualityScore + popularityScore + maintenanceScore) / 3;
        
        return {
          name: result.repo_name,
          version: 'latest',
          description: result.short_description || 'No description available',
          keywords: [], // Not available in Docker Hub search API
          author: result.repo_owner,
          publisher: result.repo_owner,
          maintainers: [result.repo_owner],
          score: {
            final: finalScore,
            detail: {
              quality: qualityScore,
              popularity: popularityScore,
              maintenance: maintenanceScore,
            },
          },
          searchScore: finalScore,
        };
      })
      .filter(pkg => {
        // Apply quality and popularity filters if specified
        if (quality && pkg.score.detail.quality < quality) return false;
        if (popularity && pkg.score.detail.popularity < popularity) return false;
        return true;
      });

    // Create response
    const response: SearchPackagesResponse = {
      query,
      total: searchResponse.count,
      packages,
    };

    logger.info(`Successfully searched images: ${query} (found ${packages.length}/${searchResponse.count} results)`);
    return response;

  } catch (error) {
    logger.error(`Failed to search images: ${query}`, { error });
    throw error;
  }
}

function isRecentlyUpdated(lastUpdated: string): boolean {
  const lastUpdateDate = new Date(lastUpdated);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return lastUpdateDate > sixMonthsAgo;
}