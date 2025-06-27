import { cache } from '../services/cache.js';
import { logger } from './logger.js';

/**
 * Generic cache helper that handles common caching patterns
 * @param cacheKey - The key to store/retrieve the data from cache
 * @param fetcher - Function that fetches the data if not in cache
 * @param ttl - Time to live in milliseconds (optional)
 * @param operationName - Name of the operation for logging purposes (optional)
 * @returns The cached or freshly fetched data
 */
export async function withCache<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttl?: number,
  operationName?: string
): Promise<T> {
  // Check cache first
  const cached = cache.get<T>(cacheKey);
  if (cached) {
    if (operationName) {
      logger.debug(`Cache hit for ${operationName}: ${cacheKey}`);
    }
    return cached;
  }

  if (operationName) {
    logger.debug(`Cache miss for ${operationName}, fetching data: ${cacheKey}`);
  }

  // Fetch data if not in cache
  const result = await fetcher();
  
  // Store in cache
  cache.set(cacheKey, result, ttl);
  
  if (operationName) {
    logger.debug(`Data fetched and cached for ${operationName}: ${cacheKey}`);
  }
  
  return result;
}