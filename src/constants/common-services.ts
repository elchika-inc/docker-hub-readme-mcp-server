export const COMMON_DOCKER_SERVICES = [
  'nginx',
  'apache',
  'httpd',
  'mysql',
  'postgres',
  'postgresql',
  'redis',
  'mongodb',
  'mongo',
  'node',
  'python',
  'ubuntu',
  'alpine',
  'debian',
  'centos',
  'jenkins',
  'wordpress',
] as const;

export type CommonDockerService = typeof COMMON_DOCKER_SERVICES[number];