import { logger } from '../utils/logger.js';
import { validateImageName, validateTag, parseImageName } from '../utils/validators.js';
import { cache, createCacheKey } from '../services/cache.js';
import { DockerHubApi } from '../services/docker-hub-api.js';
import { githubApi } from '../services/github-api.js';
import { readmeParser } from '../services/readme-parser.js';
import type {
  GetPackageReadmeParams,
  PackageReadmeResponse,
  InstallationInfo,
  PackageBasicInfo,
  RepositoryInfo,
  DownloadStats,
} from '../types/index.js';

const dockerHubApi = new DockerHubApi();

export async function getPackageReadme(params: GetPackageReadmeParams): Promise<PackageReadmeResponse> {
  const { package_name, tag = 'latest', include_examples = true } = params;

  logger.info(`Fetching Docker image README: ${package_name}:${tag}`);

  // Validate inputs
  validateImageName(package_name);
  if (tag !== 'latest') {
    validateTag(tag);
  }

  // Parse image name
  const { namespace, name } = parseImageName(package_name);
  const fullName = `${namespace}/${name}`;

  // Check cache first
  const cacheKey = createCacheKey.imageReadme(fullName, tag);
  const cached = cache.get<PackageReadmeResponse>(cacheKey);
  if (cached) {
    logger.debug(`Cache hit for image README: ${fullName}:${tag}`);
    return cached;
  }

  try {
    // Get repository info from Docker Hub
    const repository = await dockerHubApi.getRepository(namespace, name);
    
    // Verify tag exists if not 'latest'
    if (tag !== 'latest') {
      const tagExists = await dockerHubApi.validateTagExists(namespace, name, tag);
      if (!tagExists) {
        throw new Error(`Tag '${tag}' not found for image '${fullName}'`);
      }
    }

    // Get README content
    let readmeContent = '';
    let readmeSource = 'none';

    // First, try to get README from Docker Hub
    if (repository.full_description) {
      readmeContent = repository.full_description;
      readmeSource = 'docker-hub';
      logger.debug(`Got README from Docker Hub: ${fullName}`);
    }
    // If no README in Docker Hub and we have repository info, try GitHub as fallback
    else {
      // Try to infer GitHub repository from various sources
      const githubRepo = await inferGitHubRepository(repository);
      if (githubRepo) {
        const githubReadme = await githubApi.getReadmeFromRepository(githubRepo);
        if (githubReadme) {
          readmeContent = githubReadme;
          readmeSource = 'github';
          logger.debug(`Got README from GitHub: ${fullName}`);
        }
      }
    }

    // Clean and process README content
    const cleanedReadme = readmeParser.cleanMarkdown(readmeContent);
    
    // Extract usage examples
    const usageExamples = readmeParser.parseUsageExamples(readmeContent, include_examples);

    // Create installation info
    const installation: InstallationInfo = {
      pull: `docker pull ${fullName}:${tag}`,
      run: `docker run ${fullName}:${tag}`,
    };

    // Add docker-compose example if it's a common service
    if (isCommonService(name)) {
      installation.compose = generateComposeExample(fullName, tag);
    }

    // Get tag details for additional info
    const tagDetails = await dockerHubApi.getTagDetails(namespace, name, tag);
    const architectures = tagDetails?.images.map(img => img.architecture) || [];
    const osTypes = tagDetails?.images.map(img => img.os) || [];

    // Create basic info
    const basicInfo: PackageBasicInfo = {
      name,
      version: tag,
      description: repository.description || 'No description available',
      namespace,
      full_name: fullName,
      homepage: undefined, // Docker Hub doesn't provide homepage directly
      dockerfile: undefined, // Could be inferred from repository
      license: undefined, // Not available in Docker Hub API
      author: repository.user,
      keywords: repository.categories?.map(cat => cat.name) || [],
      architecture: [...new Set(architectures)],
      os: [...new Set(osTypes)],
    };

    // Create stats
    const stats: DownloadStats = {
      pull_count: repository.pull_count,
      star_count: repository.star_count,
      last_updated: repository.last_updated,
    };

    // Create repository info (for GitHub fallback)
    let repositoryInfo: RepositoryInfo | undefined;
    const githubRepo = await inferGitHubRepository(repository);
    if (githubRepo) {
      repositoryInfo = githubRepo;
    }

    // Create response
    const response: PackageReadmeResponse = {
      package_name,
      namespace,
      full_name: fullName,
      tag,
      description: basicInfo.description,
      readme_content: cleanedReadme,
      usage_examples: usageExamples,
      installation,
      basic_info: basicInfo,
      repository: repositoryInfo,
      stats,
    };

    // Cache the response
    cache.set(cacheKey, response);

    logger.info(`Successfully fetched image README: ${fullName}:${tag} (README source: ${readmeSource})`);
    return response;

  } catch (error) {
    logger.error(`Failed to fetch image README: ${package_name}:${tag}`, { error });
    throw error;
  }
}

async function inferGitHubRepository(_repository: any): Promise<RepositoryInfo | null> {
  // Docker Hub doesn't always provide direct repository links
  // We could implement heuristics to find the GitHub repository
  // For now, return null - this could be enhanced
  return null;
}

function isCommonService(name: string): boolean {
  const commonServices = [
    'nginx', 'apache', 'httpd', 'mysql', 'postgres', 'postgresql',
    'redis', 'mongodb', 'mongo', 'node', 'python', 'ubuntu',
    'alpine', 'debian', 'centos', 'jenkins', 'wordpress',
  ];
  return commonServices.includes(name.toLowerCase());
}

function generateComposeExample(fullName: string, tag: string): string {
  const serviceName = fullName.split('/').pop() || 'app';
  return `version: '3.8'
services:
  ${serviceName}:
    image: ${fullName}:${tag}
    ports:
      - "8080:80"`;
}