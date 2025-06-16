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
  namespace: string;
  full_name: string;
  description: string;
  star_count: number;
  pull_count: number;
  repo_type: string;
  is_official: boolean;
  is_automated: boolean;
  last_updated: string;
}

// Tool Parameters
export interface GetPackageReadmeParams {
  package_name: string;    // Package name (namespace/name format)
  tag?: string;           // Tag specification (optional, default: "latest")
  include_examples?: boolean; // Whether to include examples (optional, default: true)
}

export interface GetPackageInfoParams {
  package_name: string;
  include_tags?: boolean; // Whether to include available tags (default: true)
  include_stats?: boolean; // Whether to include download stats (default: true)
}

export interface SearchPackagesParams {
  query: string;          // Search query
  limit?: number;         // Maximum number of results (default: 20)
  is_official?: boolean;  // Filter for official images
  is_automated?: boolean; // Filter for automated builds
}

// Tool Responses
export interface PackageReadmeResponse {
  package_name: string;
  namespace: string;
  full_name: string;
  tag: string;
  description: string;
  readme_content: string;
  usage_examples: UsageExample[];
  installation: InstallationInfo;
  basic_info: PackageBasicInfo;
  repository?: RepositoryInfo | undefined;
  stats: DownloadStats;
}

export interface PackageInfoResponse {
  package_name: string;
  namespace: string;
  full_name: string;
  latest_tag: string;
  description: string;
  author?: string;
  keywords: string[];
  available_tags?: string[] | undefined;
  stats: DownloadStats;
  repository?: RepositoryInfo | undefined;
  last_updated: string;
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