import { DockerHubMcpError } from '../types/index.js';

export function validateImageName(imageName: string): void {
  if (!imageName || typeof imageName !== 'string') {
    throw new DockerHubMcpError('Image name is required and must be a string', 'INVALID_IMAGE_NAME');
  }

  const trimmed = imageName.trim();
  if (trimmed.length === 0) {
    throw new DockerHubMcpError('Image name cannot be empty', 'INVALID_IMAGE_NAME');
  }

  // Docker image name validation
  // Format: [REGISTRY_HOST[:PORT]/]NAMESPACE/NAME[:TAG]
  // For Docker Hub: [NAMESPACE/]NAME (where namespace defaults to 'library' for official images)
  
  // Remove any tag for validation
  const nameWithoutTag = trimmed.split(':')[0];
  
  // Check if it contains registry host (contains dots or port)
  if (nameWithoutTag.includes('.') || /:\d+/.test(nameWithoutTag)) {
    throw new DockerHubMcpError('Registry host not supported, use Docker Hub image names only', 'INVALID_IMAGE_NAME');
  }

  const parts = nameWithoutTag.split('/');
  if (parts.length > 2) {
    throw new DockerHubMcpError('Invalid image name format. Use: [namespace/]name', 'INVALID_IMAGE_NAME');
  }

  // Validate each part
  for (const part of parts) {
    if (!/^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/.test(part)) {
      throw new DockerHubMcpError(
        'Image name parts must start and end with lowercase letters or numbers, and can contain dots, underscores, and hyphens. Example: "nginx" or "library/postgres"',
        'INVALID_IMAGE_NAME'
      );
    }
    
    if (part.length < 2 || part.length > 255) {
      throw new DockerHubMcpError('Image name parts must be between 2 and 255 characters. Example: "db" (2 chars) or "very-long-service-name" (longer)', 'INVALID_IMAGE_NAME');
    }
    
    // Check for consecutive special characters
    if (/[._-]{2,}/.test(part)) {
      throw new DockerHubMcpError('Image name cannot contain consecutive dots, underscores, or hyphens. Example: use "my-app" not "my--app"', 'INVALID_IMAGE_NAME');
    }
  }
}

export function validateTag(tag: string): void {
  if (!tag || typeof tag !== 'string') {
    throw new DockerHubMcpError('Tag must be a string', 'INVALID_TAG');
  }

  const trimmed = tag.trim();
  if (trimmed.length === 0) {
    throw new DockerHubMcpError('Tag cannot be empty', 'INVALID_TAG');
  }

  if (trimmed.length > 128) {
    throw new DockerHubMcpError('Tag cannot exceed 128 characters', 'INVALID_TAG');
  }

  // Docker tag validation: alphanumeric, dots, dashes, underscores
  // Cannot start with dot or dash
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(trimmed)) {
    throw new DockerHubMcpError(
      'Tag must start with alphanumeric character and can contain letters, numbers, dots, dashes, and underscores',
      'INVALID_TAG'
    );
  }
}

export function validateSearchQuery(query: string): void {
  if (!query || typeof query !== 'string') {
    throw new DockerHubMcpError('Search query is required and must be a string', 'INVALID_SEARCH_QUERY');
  }

  const trimmed = query.trim();
  if (trimmed.length === 0) {
    throw new DockerHubMcpError('Search query cannot be empty', 'INVALID_SEARCH_QUERY');
  }

  if (trimmed.length > 250) {
    throw new DockerHubMcpError('Search query cannot exceed 250 characters', 'INVALID_SEARCH_QUERY');
  }
}

export function validateLimit(limit: number): void {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new DockerHubMcpError('Limit must be an integer between 1 and 100', 'INVALID_LIMIT');
  }
}

export function parseImageName(fullName: string): { namespace: string; name: string } {
  validateImageName(fullName);
  
  // Remove tag if present
  const nameWithoutTag = fullName.split(':')[0];
  const parts = nameWithoutTag.split('/');
  
  if (parts.length === 1) {
    // Official image (no namespace specified)
    return { namespace: 'library', name: parts[0] };
  } else {
    // User/organization image
    return { namespace: parts[0], name: parts[1] };
  }
}