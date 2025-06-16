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
} from '../types/index.js';

const dockerHubApi = new DockerHubApi();

export async function getPackageReadme(params: GetPackageReadmeParams): Promise<PackageReadmeResponse> {
  const { package_name, version = 'latest', include_examples = true } = params;

  logger.info(`Fetching Docker image README: ${package_name}:${version}`);

  // Validate inputs
  validateImageName(package_name);
  if (version !== 'latest') {
    validateTag(version);
  }

  // Parse image name
  const { namespace, name } = parseImageName(package_name);
  const fullName = `${namespace}/${name}`;

  // Check cache first
  const cacheKey = createCacheKey.imageReadme(fullName, version);
  const cached = cache.get<PackageReadmeResponse>(cacheKey);
  if (cached) {
    logger.debug(`Cache hit for image README: ${fullName}:${version}`);
    return cached;
  }

  try {
    // First, verify package exists by trying to get repository info
    logger.debug(`Checking package existence: ${package_name}`);
    let repository;
    let packageExists = true;
    
    try {
      repository = await dockerHubApi.getRepository(namespace, name);
      logger.debug(`Package found: ${package_name}`);
    } catch (error: any) {
      if (error.statusCode === 404) {
        packageExists = false;
        logger.debug(`Package not found: ${package_name}`);
      } else {
        throw error;
      }
    }
    
    // If package doesn't exist, return response with exists: false
    if (!packageExists) {
      const response: PackageReadmeResponse = {
        package_name,
        version,
        description: '',
        readme_content: '',
        usage_examples: [],
        installation: {
          pull: `docker pull ${package_name}:${version}`,
        },
        basic_info: {
          name: package_name.split('/').pop() || package_name,
          version,
          description: '',
          namespace: namespace,
          full_name: fullName,
          author: '',
          keywords: [],
          architecture: [],
          os: [],
        },
        exists: false,
      };
      
      // Cache the response
      cache.set(cacheKey, response);
      return response;
    }
    
    // Verify tag exists if not 'latest'
    if (version !== 'latest') {
      const tagExists = await dockerHubApi.validateTagExists(namespace, name, version);
      if (!tagExists) {
        throw new Error(`Tag '${version}' not found for image '${fullName}'`);
      }
    }

    // Get README content
    let readmeContent = '';
    let readmeSource = 'none';

    // First, try to get README from Docker Hub
    if (repository!.full_description) {
      readmeContent = repository!.full_description;
      readmeSource = 'docker-hub';
      logger.debug(`Got README from Docker Hub: ${fullName}`);
    }
    // If no README in Docker Hub and we have repository info, try GitHub as fallback
    else {
      // Try to infer GitHub repository from various sources
      const githubRepo = await inferGitHubRepository(repository!);
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
      pull: `docker pull ${fullName}:${version}`,
      run: `docker run ${fullName}:${version}`,
    };

    // Add docker-compose example if it's a common service
    if (isCommonService(name)) {
      installation.compose = generateComposeExample(fullName, version);
    }

    // Get tag details for additional info
    const tagDetails = await dockerHubApi.getTagDetails(namespace, name, version);
    const architectures = tagDetails?.images.map(img => img.architecture) || [];
    const osTypes = tagDetails?.images.map(img => img.os) || [];

    // Create basic info
    const basicInfo: PackageBasicInfo = {
      name,
      version,
      description: repository!.description || 'No description available',
      namespace,
      full_name: fullName,
      homepage: undefined, // Docker Hub doesn't provide homepage directly
      dockerfile: undefined, // Could be inferred from repository
      license: undefined, // Not available in Docker Hub API
      author: repository!.user,
      keywords: repository!.categories?.map(cat => cat.name) || [],
      architecture: [...new Set(architectures)],
      os: [...new Set(osTypes)],
    };

    // No longer needed as DownloadStats is removed from PackageReadmeResponse

    // Create repository info (for GitHub fallback)
    let repositoryInfo: RepositoryInfo | undefined;
    const githubRepo = await inferGitHubRepository(repository!);
    if (githubRepo) {
      repositoryInfo = githubRepo;
    }

    // Create response
    const response: PackageReadmeResponse = {
      package_name,
      version,
      description: basicInfo.description,
      readme_content: cleanedReadme,
      usage_examples: usageExamples,
      installation,
      basic_info: basicInfo,
      repository: repositoryInfo,
      exists: true,
    };

    // Cache the response
    cache.set(cacheKey, response);

    logger.info(`Successfully fetched image README: ${fullName}:${version} (README source: ${readmeSource})`);
    return response;

  } catch (error) {
    logger.error(`Failed to fetch image README: ${package_name}:${version}`, { error });
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

function generateComposeExample(fullName: string, version: string): string {
  const serviceName = fullName.split('/').pop() || 'app';
  return `version: '3.8'
services:
  ${serviceName}:
    image: ${fullName}:${version}
    ports:
      - "8080:80"`;
}