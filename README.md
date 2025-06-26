# Docker Hub README MCP Server

[![license](https://img.shields.io/npm/l/docker-hub-readme-mcp-server)](https://github.com/elchika-inc/docker-hub-readme-mcp-server/blob/main/LICENSE)
[![npm version](https://img.shields.io/npm/v/docker-hub-readme-mcp-server)](https://www.npmjs.com/package/docker-hub-readme-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/docker-hub-readme-mcp-server)](https://www.npmjs.com/package/docker-hub-readme-mcp-server)
[![GitHub stars](https://img.shields.io/github/stars/elchika-inc/docker-hub-readme-mcp-server)](https://github.com/elchika-inc/docker-hub-readme-mcp-server)

An MCP (Model Context Protocol) server that enables AI assistants to fetch comprehensive information about Docker images from Docker Hub, including README content, image metadata, and search functionality.

## Features

- **Package README Retrieval**: Fetch formatted README content with usage examples from Docker images hosted on Docker Hub
- **Package Information**: Get comprehensive image metadata including available tags, download statistics, and configuration details
- **Package Search**: Search Docker Hub with filtering by official images, automated builds, and popularity
- **Smart Caching**: Intelligent caching system to optimize API usage and improve response times
- **GitHub Integration**: Seamless integration with GitHub API for enhanced README fetching from linked repositories
- **Error Handling**: Robust error handling with automatic retry logic and fallback strategies

## MCP Client Configuration

Add this server to your MCP client configuration:

```json
{
  "mcpServers": {
    "docker-hub-readme": {
      "command": "npx",
      "args": ["docker-hub-readme-mcp-server"],
      "env": {
        "GITHUB_TOKEN": "your_github_token_here"
      }
    }
  }
}
```

> **Note**: The `GITHUB_TOKEN` is optional but recommended for higher API rate limits when fetching README content from GitHub.

## Available Tools

### get_package_readme

Retrieves comprehensive README content and usage examples for Docker images.

**Parameters:**
```json
{
  "package_name": "nginx",
  "version": "latest",
  "include_examples": true
}
```

- `package_name` (string, required): Docker image name (e.g., "nginx", "postgres", "microsoft/dotnet")
- `version` (string, optional): Specific image tag or "latest" (default: "latest")
- `include_examples` (boolean, optional): Include usage examples and Docker commands (default: true)

**Returns:** Formatted README content with Docker run commands, usage examples, and configuration documentation.

### get_package_info

Fetches detailed image metadata, tags, and statistics from Docker Hub.

**Parameters:**
```json
{
  "package_name": "postgres",
  "include_dependencies": true,
  "include_tags": true
}
```

- `package_name` (string, required): Docker image name
- `include_dependencies` (boolean, optional): Include base image information (default: true)
- `include_tags` (boolean, optional): Include available tags (default: true)

**Returns:** Image metadata including available tags, maintainer info, download stats, and platform support.

### search_packages

Searches Docker Hub for images with filtering capabilities.

**Parameters:**
```json
{
  "query": "web server",
  "limit": 20,
  "official_only": false
}
```

- `query` (string, required): Search terms (image name, description, keywords)
- `limit` (number, optional): Maximum number of results to return (default: 20, max: 100)
- `official_only` (boolean, optional): Filter to official images only (default: false)

**Returns:** List of matching images with names, descriptions, star counts, and pull statistics.

## Error Handling

The server handles common error scenarios gracefully:

- **Image not found**: Returns clear error messages with similar image suggestions
- **Rate limiting**: Implements automatic retry with exponential backoff
- **Network timeouts**: Configurable timeout with retry logic
- **Invalid image names**: Validates image name format and provides guidance
- **Docker Hub API failures**: Fallback strategies when API is unavailable

## License

MIT