export interface UsageExample {
  title: string;
  description?: string | undefined;
  code: string;
  language: string; // 'dockerfile', 'bash', 'yaml', etc.
}

export interface InstallationInfo {
  pull: string;      // "docker pull image:tag"
  run?: string;      // "docker run image:tag"
  compose?: string;  // docker-compose example
}

export interface AuthorInfo {
  name: string;
  email?: string;
  url?: string;
}

export interface RepositoryInfo {
  type: string;
  url: string;
  directory?: string | undefined;
}

export interface PackageBasicInfo {
  name: string;
  version: string;
  description: string;
  namespace: string;
  full_name: string; // namespace/name
  homepage?: string | undefined;
  dockerfile?: string | undefined;
  license?: string | undefined;
  author?: string | AuthorInfo | undefined;
  keywords: string[];
  architecture: string[];
  os: string[];
}

export interface DownloadStats {
  pull_count: number;
  star_count: number;
  last_updated: string;
}

export interface PackageSearchResult {
  name: string;
  version: string;
  description: string;
  keywords: string[];
  author: string;
  publisher: string;
  maintainers: string[];
  score: {
    final: number;
    detail: {
      quality: number;
      popularity: number;
      maintenance: number;
    };
  };
  searchScore: number;
}

// Tool Parameters
export interface GetPackageReadmeParams {
  package_name: string;    // Package name (namespace/name format)
  version?: string;        // Version/tag specification (optional, default: "latest")
  include_examples?: boolean; // Whether to include examples (optional, default: true)
}

export interface GetPackageInfoParams {
  package_name: string;
  include_dependencies?: boolean; // Whether to include tags as dependencies (default: true)
  include_dev_dependencies?: boolean; // Whether to include dev-related tags (default: false)
}

export interface SearchPackagesParams {
  query: string;          // Search query
  limit?: number;         // Maximum number of results (default: 20)
  quality?: number;       // Quality score minimum (0-1)
  popularity?: number;    // Popularity score minimum (0-1)
}

// Tool Responses
export interface PackageReadmeResponse {
  package_name: string;
  version: string;
  description: string;
  readme_content: string;
  usage_examples: UsageExample[];
  installation: InstallationInfo;
  basic_info: PackageBasicInfo;
  repository?: RepositoryInfo | undefined;
  exists: boolean;
}

export interface PackageInfoResponse {
  package_name: string;
  latest_version: string;
  description: string;
  author: string;
  license: string;
  keywords: string[];
  dependencies: Record<string, string>;
  dev_dependencies: Record<string, string>;
  download_stats: DownloadStats;
  repository?: RepositoryInfo | undefined;
  exists: boolean;
}

export interface SearchPackagesResponse {
  query: string;
  total: number;
  packages: PackageSearchResult[];
}

// Cache Types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheOptions {
  ttl?: number;
  maxSize?: number;
}

// Docker Hub API Types
export interface DockerHubRepository {
  user: string;
  name: string;
  namespace: string;
  repository_type: string;
  status: number;
  description: string;
  is_private: boolean;
  is_automated: boolean;
  can_edit: boolean;
  star_count: number;
  pull_count: number;
  last_updated: string;
  date_registered: string;
  collaborator: boolean;
  affiliation: string;
  hub_user: string;
  has_starred: boolean;
  full_description: string;
  permissions: {
    read: boolean;
    write: boolean;
    admin: boolean;
  };
  media_types: string[];
  content_types: string[];
  categories: {
    name: string;
    label: string;
  }[];
}

export interface DockerHubTag {
  creator: number;
  id: number;
  image_id: string | null;
  images: {
    architecture: string;
    features: string;
    variant: string | null;
    digest: string;
    os: string;
    os_features: string;
    os_version: string | null;
    size: number;
    status: string;
    last_pulled: string;
    last_pushed: string;
  }[];
  last_updated: string;
  last_updater: number;
  last_updater_username: string;
  name: string;
  repository: number;
  full_size: number;
  v2: boolean;
  tag_status: string;
  tag_last_pulled: string;
  tag_last_pushed: string;
}

export interface DockerHubTagsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: DockerHubTag[];
}

export interface DockerHubSearchResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    repo_name: string;
    short_description: string;
    star_count: number;
    pull_count: number;
    repo_owner: string;
    is_automated: boolean;
    is_official: boolean;
    last_updated: string;
  }[];
}

// Error Types
export class DockerHubMcpError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'DockerHubMcpError';
  }
}

export class ImageNotFoundError extends DockerHubMcpError {
  constructor(imageName: string) {
    super(`Docker image '${imageName}' not found`, 'IMAGE_NOT_FOUND', 404);
  }
}

export class TagNotFoundError extends DockerHubMcpError {
  constructor(imageName: string, tag: string) {
    super(`Tag '${tag}' of image '${imageName}' not found`, 'TAG_NOT_FOUND', 404);
  }
}

export class RateLimitError extends DockerHubMcpError {
  constructor(service: string, retryAfter?: number) {
    super(`Rate limit exceeded for ${service}`, 'RATE_LIMIT_EXCEEDED', 429, { retryAfter });
  }
}

export class NetworkError extends DockerHubMcpError {
  constructor(message: string, originalError?: Error) {
    super(`Network error: ${message}`, 'NETWORK_ERROR', undefined, originalError);
  }
}