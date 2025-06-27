export const CACHE_CONFIG = {
  TTL: {
    REPOSITORY_INFO: 300000, // 5 minutes in milliseconds
    TAGS_INFO: 300000, // 5 minutes in milliseconds
    SEARCH_RESULTS: 600000, // 10 minutes in milliseconds
    DEFAULT: 3600 * 1000, // 1 hour in milliseconds
  },
  SIZES: {
    DEFAULT_MAX_SIZE: 104857600, // 100MB in bytes
  },
  CLEANUP_INTERVAL: 300000, // 5 minutes in milliseconds
} as const;