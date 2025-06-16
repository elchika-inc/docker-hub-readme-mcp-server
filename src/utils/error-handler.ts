import { logger } from './logger.js';
import {
  DockerHubMcpError,
  ImageNotFoundError,
  RateLimitError,
  NetworkError,
} from '../types/index.js';

export function handleApiError(error: unknown, context: string): never {
  if (error instanceof DockerHubMcpError) {
    logger.error(`${context}: ${error.message}`, { code: error.code, details: error.details });
    throw error;
  }

  if (error instanceof Error) {
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      const networkError = new NetworkError(`Connection failed in ${context}`, error);
      logger.error(networkError.message, { originalError: error.message });
      throw networkError;
    }

    if (error.message.includes('timeout')) {
      const networkError = new NetworkError(`Request timeout in ${context}`, error);
      logger.error(networkError.message, { originalError: error.message });
      throw networkError;
    }

    logger.error(`Unexpected error in ${context}: ${error.message}`, { stack: error.stack });
    throw new DockerHubMcpError(`Unexpected error in ${context}`, 'UNEXPECTED_ERROR', undefined, error);
  }

  logger.error(`Unknown error in ${context}`, { error });
  throw new DockerHubMcpError(`Unknown error in ${context}`, 'UNKNOWN_ERROR', undefined, error);
}

export function handleHttpError(status: number, response: Response, context: string): never {
  const statusText = response.statusText || 'Unknown error';
  
  switch (status) {
    case 404:
      throw new ImageNotFoundError(context);
    case 429: {
      const retryAfter = response.headers.get('retry-after');
      const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
      throw new RateLimitError(context, retryAfterSeconds);
    }
    case 500:
    case 502:
    case 503:
    case 504:
      throw new NetworkError(`Server error (${status}): ${statusText}`);
    default:
      throw new DockerHubMcpError(
        `HTTP error ${status}: ${statusText}`,
        'HTTP_ERROR',
        status
      );
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  context: string = 'operation'
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        logger.error(`${context} failed after ${maxRetries + 1} attempts`, { error: lastError.message });
        break;
      }

      if (error instanceof RateLimitError) {
        const retryAfter = (error.details as { retryAfter?: number })?.retryAfter;
        const delay = retryAfter ? retryAfter * 1000 : baseDelay * Math.pow(2, attempt);
        logger.warn(`${context} rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await sleep(delay);
        continue;
      }

      if (error instanceof NetworkError || 
          (error instanceof DockerHubMcpError && error.statusCode && error.statusCode >= 500)) {
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn(`${context} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`, { error: lastError.message });
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  if (lastError) {
    throw lastError;
  }
  throw new Error('All retry attempts failed without capturing an error');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}