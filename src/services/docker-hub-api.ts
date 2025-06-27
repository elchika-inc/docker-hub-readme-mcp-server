import { logger } from '../utils/logger.js';
import { handleApiError, handleHttpError, withRetry } from '../utils/error-handler.js';
import { cache, createCacheKey } from './cache.js';
import type {
  DockerHubRepository,
  DockerHubTagsResponse,
  DockerHubSearchResponse,
} from '../types/index.js';
import {
  ImageNotFoundError,
  TagNotFoundError,
} from '../types/index.js';
import { API_CONFIG } from '../constants/api-config.js';
import { CACHE_CONFIG } from '../constants/cache-config.js';

export class DockerHubApi {
  private readonly baseUrl = 'https://hub.docker.com/v2';
  private readonly requestTimeout = API_CONFIG.REQUEST_TIMEOUT;

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'docker-hub-readme-mcp-server/1.0.0',
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async getRepository(namespace: string, name: string): Promise<DockerHubRepository> {
    const fullName = `${namespace}/${name}`;
    const cacheKey = createCacheKey.imageInfo(fullName, 'repository');
    
    // Check cache first
    const cached = cache.get<DockerHubRepository>(cacheKey);
    if (cached) {
      logger.debug(`Repository info cache hit: ${fullName}`);
      return cached;
    }

    return withRetry(async () => {
      logger.debug(`Fetching repository info: ${fullName}`);
      
      const url = `${this.baseUrl}/repositories/${namespace}/${name}/`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        handleHttpError(response.status, response, fullName);
      }

      const data = await response.json() as DockerHubRepository;
      
      // Cache the result
      cache.set(cacheKey, data, CACHE_CONFIG.TTL.REPOSITORY_INFO);
      logger.debug(`Repository info fetched and cached: ${fullName}`);
      
      return data;
    }, 3, 1000, `DockerHub repository info for ${fullName}`);
  }

  async getTags(namespace: string, name: string, page: number = 1, pageSize: number = 25): Promise<DockerHubTagsResponse> {
    const fullName = `${namespace}/${name}`;
    const cacheKey = createCacheKey.imageTags(`${fullName}:${page}:${pageSize}`);
    
    // Check cache first
    const cached = cache.get<DockerHubTagsResponse>(cacheKey);
    if (cached) {
      logger.debug(`Tags cache hit: ${fullName}`);
      return cached;
    }

    return withRetry(async () => {
      logger.debug(`Fetching tags: ${fullName}`);
      
      const url = `${this.baseUrl}/repositories/${namespace}/${name}/tags/?page=${page}&page_size=${pageSize}`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        handleHttpError(response.status, response, fullName);
      }

      const data = await response.json() as DockerHubTagsResponse;
      
      // Cache the result
      cache.set(cacheKey, data, CACHE_CONFIG.TTL.TAGS_INFO);
      logger.debug(`Tags fetched and cached: ${fullName}`);
      
      return data;
    }, 3, 1000, `DockerHub tags for ${fullName}`);
  }

  async searchRepositories(
    query: string,
    page: number = 1,
    pageSize: number = 25,
    isOfficial?: boolean,
    isAutomated?: boolean
  ): Promise<DockerHubSearchResponse> {
    const cacheKey = createCacheKey.searchResults(query, pageSize, isOfficial, isAutomated);
    
    // Check cache first
    const cached = cache.get<DockerHubSearchResponse>(cacheKey);
    if (cached) {
      logger.debug(`Search cache hit: ${query}`);
      return cached;
    }

    return withRetry(async () => {
      logger.debug(`Searching repositories: ${query}`);
      
      const params = new URLSearchParams({
        q: query,
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (isOfficial !== undefined) {
        params.append('is_official', isOfficial.toString());
      }

      if (isAutomated !== undefined) {
        params.append('is_automated', isAutomated.toString());
      }

      const url = `${this.baseUrl}/search/repositories/?${params.toString()}`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        handleHttpError(response.status, response, `search: ${query}`);
      }

      const data = await response.json() as DockerHubSearchResponse;
      
      // Cache the result
      cache.set(cacheKey, data, 600000); // 10 minutes TTL
      logger.debug(`Search results fetched and cached: ${query}`);
      
      return data;
    }, 3, 1000, `DockerHub search for ${query}`);
  }

  async getTagDetails(namespace: string, name: string, tag: string): Promise<DockerHubTagsResponse['results'][0] | null> {
    try {
      const tagsResponse = await this.getTags(namespace, name);
      const tagDetails = tagsResponse.results.find(t => t.name === tag);
      
      if (!tagDetails) {
        // If tag not found in first page, search through more pages
        let currentPage = 2;
        let hasMore = tagsResponse.next !== null;
        
        while (hasMore && currentPage <= 5) { // Limit to 5 pages max
          const nextTagsResponse = await this.getTags(namespace, name, currentPage);
          const foundTag = nextTagsResponse.results.find(t => t.name === tag);
          
          if (foundTag) {
            return foundTag;
          }
          
          hasMore = nextTagsResponse.next !== null;
          currentPage++;
        }
        
        return null;
      }
      
      return tagDetails;
    } catch (error) {
      handleApiError(error, `get tag details for ${namespace}/${name}:${tag}`);
    }
  }

  async getRepositoryReadme(namespace: string, name: string): Promise<string | null> {
    try {
      const repository = await this.getRepository(namespace, name);
      return repository.full_description || null;
    } catch (error) {
      if (error instanceof ImageNotFoundError) {
        return null;
      }
      handleApiError(error, `get repository readme for ${namespace}/${name}`);
    }
  }

  async validateImageExists(namespace: string, name: string): Promise<boolean> {
    try {
      await this.getRepository(namespace, name);
      return true;
    } catch (error) {
      if (error instanceof ImageNotFoundError) {
        return false;
      }
      throw error;
    }
  }

  async validateTagExists(namespace: string, name: string, tag: string): Promise<boolean> {
    try {
      const tagDetails = await this.getTagDetails(namespace, name, tag);
      return tagDetails !== null;
    } catch (error) {
      if (error instanceof ImageNotFoundError || error instanceof TagNotFoundError) {
        return false;
      }
      throw error;
    }
  }
}