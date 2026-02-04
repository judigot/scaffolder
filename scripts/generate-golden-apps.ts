import fs from 'node:fs';
import path from 'node:path';
import { buildProjectFiles } from '../src/utils/project-builder/buildProjectFiles.ts';
import type { IScaffolderMessage } from '../src/interfaces/scaffolderMessages.ts';
import { groupMessagesBySeverity } from '../src/utils/project-builder/messages.ts';
import convertLocalFilesToIStructure from '../src/utils/convertLocalFilesToIStructure.ts';
import { createFolderStructure } from '../src/utils/createFolderStructure.ts';
import { frameworks, type IFormStore } from '../src/useFormStore.ts';
import { isISchemaInfoArray } from '../src/interfaces/interfaces.ts';
import masterSchemaJson from '../files/Schemas/Master Schema with Multiple User Types.json';

if (!isISchemaInfoArray(masterSchemaJson)) {
  throw new Error('Invalid master schema JSON structure');
}

type Framework = (typeof frameworks)[keyof typeof frameworks];

type GoldenAppConfig = {
  projectName: string;
  framework: Framework;
  urlPath: string;
  serviceName: string;
  port: number;
  dockerfile: string;
  env: Record<string, string>;
  dependsOn: string[];
};

type GenerationOutcome = {
  projectName: string;
  messages: IScaffolderMessage[];
  hasErrors: boolean;
};

const projectsDir = path.resolve(process.cwd(), 'files/Projects');
const outputBaseDir = path.resolve(process.cwd(), '.apps');

function toDirName(projectName: string): string {
  return projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseGoldenAppConfig(
  projectName: string,
  content: string,
): GoldenAppConfig | null {
  const config: Record<string, string> = {};

  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));

  const env: Record<string, string> = {};
  for (const line of lines) {
    const [rawKey, rawValue] = line.split('=');
    if (!rawKey || rawValue === undefined) {
      continue;
    }
    const key = rawKey.trim();
    const value = rawValue.trim();
    if (key.startsWith('env.')) {
      env[key.slice('env.'.length)] = value;
      continue;
    }
    config[key] = value;
  }

  const defaultFramework = frameworks.HONO;
  const defaultUrlPath = toDirName(projectName);
  const validFrameworks = Object.values(frameworks);
  const framework = config.framework ?? defaultFramework;

  const urlPath = (config.url ?? defaultUrlPath).replace(/^\/+|\/+$/g, '');
  if (urlPath === '') {
    throw new Error(
      `Invalid url for golden app: ${projectName}. Provide url=<path> in the .golden file.`,
    );
  }

  const serviceName = config.service ?? urlPath;
  const port = config.port ? Number.parseInt(config.port, 10) : 3000;
  if (!Number.isFinite(port)) {
    throw new Error(
      `Invalid port for golden app: ${projectName}. Provide port=<number> in the .golden file.`,
    );
  }

  if (!validFrameworks.includes(framework as Framework)) {
    throw new Error(
      `Invalid framework for golden app: ${projectName}. Expected one of: ${validFrameworks.join(', ')}`,
    );
  }

  const dockerfile = config.dockerfile ?? 'Dockerfile';
  const dependsOn = config.depends
    ? config.depends
        .split(',')
        .map((dep) => dep.trim())
        .filter(Boolean)
    : [];

  return {
    projectName,
    framework: framework as Framework,
    urlPath,
    serviceName,
    port,
    dockerfile,
    env,
    dependsOn,
  };
}

function discoverGoldenApps(): GoldenAppConfig[] {
  if (!fs.existsSync(projectsDir)) {
    return [];
  }

  const projects: GoldenAppConfig[] = [];
  for (const entry of fs.readdirSync(projectsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const goldenPath = path.join(projectsDir, entry.name, '.golden');
    if (!fs.existsSync(goldenPath)) {
      continue;
    }

    const content = fs.readFileSync(goldenPath, 'utf-8');
    const config = parseGoldenAppConfig(entry.name, content);
    if (config) {
      projects.push(config);
    }
  }

  return projects.sort((a, b) => a.projectName.localeCompare(b.projectName));
}

async function generateProject(
  config: GoldenAppConfig,
  jsonOutput: boolean,
): Promise<GenerationOutcome> {
  const userFiles = convertLocalFilesToIStructure('files');
  const formData: IFormStore = {
    backendUrl: 'http://localhost:3000',
    dbType: 'postgresql',
    framework: config.framework,
    schemaInput: {},
    backendDir: '',
    frontendDir: '',
    dbConnection: '',
    includeInsertData: false,
    insertOption: 'SQLInsertQueriesFromMockData',
    includeTypeGuards: false,
    outputOnSingleFile: false,
    quote: '"',
    publicRepoURL: '',
    clientID: '',
    clientSecret: '',
    creationMode: 'Schema Builder',
    dbUsername: '',
    dbPassword: '',
    dbHost: '',
    dbPort: 0,
    dbName: '',
    setCreationMode: () => undefined,
    setMasterSchema: () => undefined,
    setOneToOne: () => undefined,
    setOneToMany: () => undefined,
    setManyToMany: () => undefined,
    setDBType: () => undefined,
    setPublicRepoURL: () => undefined,
    setDbConnection: () => undefined,
  };

  const result = await buildProjectFiles(
    `/Projects/${config.projectName}/structure.yaml`,
    userFiles,
    masterSchemaJson,
    formData,
    null,
  );

  if (result.filesFailedToFormat.length > 0) {
    console.error('Files failed to format:', result.filesFailedToFormat);
  }

  const messages = result.messages ?? [];
  const hasErrors =
    result.hasErrors === true ||
    messages.some((message) => message.severity === 'error');
  if (jsonOutput && messages.length > 0) {
    const grouped = groupMessagesBySeverity(messages);
    console.log(
      JSON.stringify(
        {
          projectName: config.projectName,
          messages: grouped,
        },
        null,
        2,
      ),
    );
  }

  const outputDir = path.join(outputBaseDir, toDirName(config.projectName));
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
  }

  fs.mkdirSync(outputDir, { recursive: true });
  createFolderStructure({
    structure: result.structure,
    targetDirectory: outputDir,
  });
  ensureDockerfile(outputDir, config);
  console.log(`Generated ${config.projectName} in ${outputDir}`);
  return { projectName: config.projectName, messages, hasErrors };
}

function ensureDockerfile(outputDir: string, config: GoldenAppConfig): void {
  const dockerfilePath = path.join(outputDir, config.dockerfile);
  if (fs.existsSync(dockerfilePath)) {
    return;
  }

  const projectDockerfile = path.resolve(
    process.cwd(),
    'files/Projects',
    config.projectName,
    config.dockerfile,
  );
  if (fs.existsSync(projectDockerfile)) {
    fs.copyFileSync(projectDockerfile, dockerfilePath);
    return;
  }

  const template = getDockerfileTemplate(config.framework);
  if (!template) {
    throw new Error(
      `Missing Dockerfile for ${config.projectName}. Add ${config.dockerfile} to files/Projects/${config.projectName}/ or add a template.`,
    );
  }
  fs.copyFileSync(template, dockerfilePath);
}

function getDockerfileTemplate(framework: Framework): string | null {
  if (framework === frameworks.HONO) {
    return path.resolve(
      process.cwd(),
      'docker/golden-templates/hono.Dockerfile',
    );
  }
  return null;
}

function readDockerfilePorts(outputDir: string, dockerfile: string): number[] {
  const dockerfilePath = path.join(outputDir, dockerfile);
  if (!fs.existsSync(dockerfilePath)) {
    return [];
  }

  const content = fs.readFileSync(dockerfilePath, 'utf-8');
  const matches = content.matchAll(/^\s*EXPOSE\s+(\d+)/gm);
  const ports: number[] = [];
  for (const match of matches) {
    const port = Number.parseInt(match[1], 10);
    if (Number.isFinite(port)) {
      ports.push(port);
    }
  }

  return ports;
}

function buildNginxConfig(apps: GoldenAppConfig[]): string {
  if (apps.length === 0) {
    return '# Auto-generated by scripts/generate-golden-apps.ts\n';
  }

  const blocks = apps.map((app) => {
    const basePath = `/${app.urlPath}`;
    const outputDir = path.join(outputBaseDir, toDirName(app.projectName));
    const dockerPorts = readDockerfilePorts(outputDir, app.dockerfile);
    const frontendPort = dockerPorts[0] ?? app.port;
    const apiPort = dockerPorts[1] ?? frontendPort;

    const apiLocation =
      apiPort === frontendPort
        ? []
        : [
            `location = ${basePath}/api {`,
            `    return 301 $scheme://$http_host${basePath}/api/;`,
            `}`,
            ``,
            `location ${basePath}/api/ {`,
            `    proxy_pass http://${app.serviceName}:${String(apiPort)}/api/;`,
            `    proxy_set_header Host $http_host;`,
            `    proxy_set_header X-Real-IP $remote_addr;`,
            `    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`,
            `    proxy_set_header X-Forwarded-Proto $scheme;`,
            `    proxy_set_header X-Forwarded-Host $http_host;`,
            `    proxy_set_header X-Forwarded-Port $server_port;`,
            `    proxy_redirect /api/ ${basePath}/api/;`,
            `}`,
            ``,
          ];

    return [
      `location = ${basePath} {`,
      `    return 301 $scheme://$http_host${basePath}/;`,
      `}`,
      ``,
      `location ${basePath}/ {`,
      `    proxy_pass http://${app.serviceName}:${String(frontendPort)}${basePath}/;`,
      `    proxy_set_header Host $http_host;`,
      `    proxy_set_header X-Real-IP $remote_addr;`,
      `    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`,
      `    proxy_set_header X-Forwarded-Proto $scheme;`,
      `    proxy_set_header X-Forwarded-Host $http_host;`,
      `    proxy_set_header X-Forwarded-Port $server_port;`,
      `    # WebSocket support for Vite HMR`,
      `    proxy_http_version 1.1;`,
      `    proxy_set_header Upgrade $http_upgrade;`,
      `    proxy_set_header Connection $connection_upgrade;`,
      `}`,
      ``,
      ...apiLocation,
    ].join('\n');
  });

  return `# Auto-generated by scripts/generate-golden-apps.ts\n\n${blocks.join('\n\n')}`;
}

function buildComposeConfig(apps: GoldenAppConfig[]): string {
  const lines: string[] = ['services:'];
  const volumes: string[] = [];

  for (const app of apps) {
    const outputDir = path.join(outputBaseDir, toDirName(app.projectName));
    const dockerfile = app.dockerfile;
    const dockerPorts = readDockerfilePorts(outputDir, dockerfile);
    const frontendPort = dockerPorts[0] ?? app.port;
    const apiPort = dockerPorts[1] ?? frontendPort;
    const dirName = toDirName(app.projectName);
    const nodeModulesVolume = `${dirName.replace(/-/g, '_')}_node_modules`;

    const envEntries = { ...app.env };
    if (!Object.prototype.hasOwnProperty.call(envEntries, 'PORT')) {
      envEntries.PORT = String(apiPort);
    }

    lines.push(`  ${app.serviceName}:`);
    lines.push(`    build:`);
    lines.push(`      context: ./.apps/${dirName}`);
    lines.push(`      dockerfile: Dockerfile.dev`);
    lines.push(`    volumes:`);
    lines.push(`      - ./.apps/${dirName}:/app`);
    lines.push(`      - ${nodeModulesVolume}:/app/node_modules`);
    lines.push(`    ports:`);
    lines.push(`      - "${String(frontendPort)}:${String(frontendPort)}"`);
    if (apiPort !== frontendPort) {
      lines.push(`      - "${String(apiPort)}:${String(apiPort)}"`);
    }
    if (Object.keys(envEntries).length > 0) {
      lines.push(`    environment:`);
      for (const [key, value] of Object.entries(envEntries)) {
        const safeValue = value.replace(/"/g, '\\"');
        lines.push(`      ${key}: "${safeValue}"`);
      }
    }
    if (app.dependsOn.length > 0) {
      lines.push(`    depends_on:`);
      for (const dep of app.dependsOn) {
        lines.push(`      - ${dep}`);
      }
    }
    lines.push(`    networks:`);
    lines.push(`      - scaffolder_network`);
    lines.push('');

    volumes.push(nodeModulesVolume);
  }

  if (volumes.length > 0) {
    lines.push('volumes:');
    for (const vol of volumes) {
      lines.push(`  ${vol}:`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const filteredArgs = args.filter((arg) => arg !== '--json' && arg !== '.');
  const filter =
    filteredArgs.length > 0 ? filteredArgs[filteredArgs.length - 1] : null;

  const goldenApps = discoverGoldenApps();
  if (goldenApps.length === 0) {
    console.log('No golden apps found. Add a .golden file to a project.');
    return;
  }

  const filteredApps =
    filter === null
      ? goldenApps
      : goldenApps.filter(
          (app) =>
            app.projectName === filter || toDirName(app.projectName) === filter,
        );

  if (filteredApps.length === 0) {
    console.log(`No golden apps matched: ${filter}`);
    return;
  }

  const outcomes: GenerationOutcome[] = [];

  for (const app of filteredApps) {
    const outcome = await generateProject(app, jsonOutput);
    outcomes.push(outcome);
  }

  const nginxConfig = buildNginxConfig(filteredApps);
  fs.writeFileSync(
    path.resolve(process.cwd(), 'docker/nginx.golden.conf'),
    nginxConfig,
    'utf-8',
  );

  const composeConfig = buildComposeConfig(filteredApps);
  fs.writeFileSync(
    path.resolve(process.cwd(), 'docker/compose.golden.yml'),
    composeConfig,
    'utf-8',
  );

  if (outcomes.some((outcome) => outcome.hasErrors)) {
    process.exit(1);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
