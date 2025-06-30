import { DockerHubMcpError, ValidationError } from '../types/index.js';

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
    throw new ValidationError('Tag must be a string');
  }

  const trimmed = tag.trim();
  if (trimmed.length === 0) {
    throw new ValidationError('Tag cannot be empty');
  }

  if (trimmed.length > 128) {
    throw new ValidationError('Tag is too long (max 128 characters)');
  }

  // Check for uppercase
  if (trimmed !== trimmed.toLowerCase()) {
    throw new ValidationError('Tag must be lowercase');
  }

  // Check for invalid characters
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(trimmed)) {
    throw new ValidationError('Tag contains invalid characters');
  }
}

export function validateSearchQuery(query: string): void {
  if (!query || typeof query !== 'string') {
    throw new ValidationError('Search query is required and must be a string');
  }

  const trimmed = query.trim();
  if (trimmed.length === 0) {
    throw new ValidationError('Search query cannot be empty');
  }

  if (trimmed.length > 255) {
    throw new ValidationError('Search query is too long (max 255 characters)');
  }
}

export function validateLimit(limit: number): void {
  if (typeof limit !== 'number') {
    throw new ValidationError('Limit must be a number');
  }

  if (!Number.isInteger(limit)) {
    throw new ValidationError('Limit must be an integer');
  }

  if (limit < 1 || limit > 100) {
    throw new ValidationError('Limit must be between 1 and 100');
  }
}

export function validatePackageName(packageName: string): void {
  if (!packageName || typeof packageName !== 'string') {
    throw new ValidationError('Package name is required and must be a string');
  }

  const trimmed = packageName.trim();
  if (trimmed.length === 0) {
    throw new ValidationError('Package name cannot be empty');
  }

  if (trimmed.length > 255) {
    throw new ValidationError('Package name is too long (max 255 characters)');
  }

  // Check for uppercase
  if (trimmed !== trimmed.toLowerCase()) {
    throw new ValidationError('Package name must be lowercase');
  }

  // Basic format validation for Docker Hub package names
  if (!/^[a-z0-9._-]+(?:\/[a-z0-9._-]+)?$/.test(trimmed)) {
    throw new ValidationError('Invalid package name format');
  }
}

export function validateBoolean(value: boolean | undefined, paramName: string): void {
  if (value !== undefined && typeof value !== 'boolean') {
    throw new ValidationError(`${paramName} must be a boolean`);
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