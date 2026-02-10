import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import postgres from 'postgres';

type GoldenAppConfig = {
  projectName: string;
  dirName: string;
  port: number;
};

type ApiTestSummary = {
  appName: string;
  passed: number;
  failed: number;
};

const projectsDir = path.resolve(process.cwd(), 'files/Projects');
const outputBaseDir = path.resolve(process.cwd(), '.apps');
const defaultDbUrl =
  'postgresql://scaffolder:scaffolder123@localhost:15432/scaffolder';

function resolveDatabaseUrl(): string {
  const candidate =
    process.env.GOLDEN_DATABASE_URL ?? process.env.DATABASE_URL ?? defaultDbUrl;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:') {
      return candidate;
    }
  } catch {
    // ignore parse errors and fall back
  }

  console.warn(
    'Invalid DATABASE_URL detected for golden app tests. Falling back to local PostgreSQL defaults.',
  );
  return defaultDbUrl;
}

const databaseUrl = resolveDatabaseUrl();
const isCi = process.env.CI === 'true';

const COMMAND_TIMEOUTS_MS = {
  install: 10 * 60 * 1000,
  drizzlePush: 3 * 60 * 1000,
  apiTest: 12 * 60 * 1000,
  serverReady: 60 * 1000,
} as const;

function toDirName(projectName: string): string {
  return projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseGoldenAppConfig(
  projectName: string,
  content: string,
): GoldenAppConfig {
  const config: Record<string, string> = {};
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));

  for (const line of lines) {
    const [rawKey, rawValue] = line.split('=');
    if (!rawKey || rawValue === undefined) {
      continue;
    }
    const key = rawKey.trim();
    const value = rawValue.trim();
    if (key.startsWith('env.')) {
      continue;
    }
    config[key] = value;
  }

  const dirName = toDirName(projectName);
  const port = config.port ? Number.parseInt(config.port, 10) : 3000;
  if (!Number.isFinite(port)) {
    throw new Error(
      `Invalid port for golden app: ${projectName}. Provide port=<number> in the .golden file.`,
    );
  }

  return {
    projectName,
    dirName,
    port,
  };
}

async function discoverGoldenApps(): Promise<GoldenAppConfig[]> {
  if (!existsSync(projectsDir)) {
    return [];
  }

  const projects: GoldenAppConfig[] = [];
  const entries = await fs.readdir(projectsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const goldenPath = path.join(projectsDir, entry.name, '.golden');
    if (!existsSync(goldenPath)) {
      continue;
    }

    const content = await fs.readFile(goldenPath, 'utf-8');
    projects.push(parseGoldenAppConfig(entry.name, content));
  }

  return projects.sort((a, b) => a.projectName.localeCompare(b.projectName));
}

function buildDatabaseName(dirName: string): string {
  const safe = dirName.replace(/[^a-z0-9_]+/g, '_');
  return `golden_${safe}`;
}

function runCommand(
  label: string,
  command: string,
  cwd: string,
  env: Record<string, string>,
  timeoutMs?: number,
): void {
  const startedAt = Date.now();
  console.log(`→ ${label}: ${command}`);

  const result = spawnSync(command, {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
    shell: true,
    stdio: 'inherit',
    timeout: timeoutMs,
  });

  if (result.error) {
    if ((result.error as NodeJS.ErrnoException).code === 'ETIMEDOUT') {
      throw new Error(
        `${label} timed out after ${Math.ceil((timeoutMs ?? 0) / 1000)}s: ${command}`,
      );
    }
    throw new Error(`${label} failed to start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(
      `${label} failed (${result.status ?? 'unknown'}): ${command}`,
    );
  }

  const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`✓ ${label} finished in ${elapsedSeconds}s`);
}

function stripAnsi(input: string): string {
  const esc = String.fromCharCode(27);
  return input
    .split(esc)
    .join('')
    .replace(/\[[0-9;]*[A-Za-z]/g, '');
}

function parseApiTestSummary(output: string, appName: string): ApiTestSummary {
  const sanitized = stripAnsi(output);
  const passedMatch = sanitized.match(/(^|\n)Passed:\s*(\d+)\s*($|\n)/m);
  const failedMatch = sanitized.match(/(^|\n)Failed:\s*(\d+)\s*($|\n)/m);

  if (!passedMatch || !failedMatch) {
    throw new Error(
      `Could not parse api-test summary for ${appName}. Expected 'Passed:' and 'Failed:' lines.`,
    );
  }

  return {
    appName,
    passed: Number.parseInt(passedMatch[2], 10),
    failed: Number.parseInt(failedMatch[2], 10),
  };
}

async function waitForServer(
  url: string,
  maxAttempts = 30,
  isServerAlive?: () => boolean,
): Promise<void> {
  console.log(`→ Waiting for server health: ${url}`);

  for (let i = 0; i < maxAttempts; i += 1) {
    if (isServerAlive && !isServerAlive()) {
      throw new Error(
        `Server process exited before readiness check passed: ${url}`,
      );
    }

    try {
      const res = await fetch(url);
      if (res.ok) {
        console.log(`✓ Server health check passed: ${url}`);
        return;
      }
      if (i === 0 || (i + 1) % 5 === 0) {
        console.log(
          `  health check attempt ${String(i + 1)}/${String(maxAttempts)} returned ${String(res.status)}`,
        );
      }
    } catch {
      // ignore
      if (i === 0 || (i + 1) % 5 === 0) {
        console.log(
          `  health check attempt ${String(i + 1)}/${String(maxAttempts)} connection not ready yet`,
        );
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Server did not become ready: ${url}`);
}

async function runGoldenAppTests(
  app: GoldenAppConfig,
): Promise<ApiTestSummary | null> {
  const outputDir = path.join(outputBaseDir, app.dirName);
  if (!existsSync(outputDir)) {
    throw new Error(
      `Golden app not generated: ${outputDir}. Run scripts/generate-golden-apps.ts first.`,
    );
  }

  const apiTestPath = path.join(outputDir, 'api-test.sh');
  if (!existsSync(apiTestPath)) {
    console.log(`Skipping ${app.projectName}: api-test.sh not found.`);
    return null;
  }

  const dbName = buildDatabaseName(app.dirName);
  const adminSql = postgres(databaseUrl, { max: 1 });

  // Terminate existing connections and recreate database for true isolation
  await adminSql.unsafe(`
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = '${dbName}'
    AND pid <> pg_backend_pid()
  `);
  await adminSql.unsafe(`DROP DATABASE IF EXISTS ${dbName}`);
  await adminSql.unsafe(`CREATE DATABASE ${dbName}`);
  await adminSql.end();

  // Build connection URL for the isolated test database
  const parsedUrl = new URL(databaseUrl);
  parsedUrl.pathname = `/${dbName}`;
  const testDbUrl = parsedUrl.toString();

  const env = {
    DATABASE_URL: testDbUrl,
    PORT: String(app.port),
  };

  console.log(`\n=== ${app.projectName} (${app.dirName}) ===`);
  const serverLogPath = path.join(outputDir, 'server.log');
  const serverLog = createWriteStream(serverLogPath, { flags: 'w' });
  let serverProcess: ReturnType<typeof spawn> | null = null;

  try {
    runCommand(
      `${app.projectName} install dependencies`,
      'bun install',
      outputDir,
      env,
      COMMAND_TIMEOUTS_MS.install,
    );
    runCommand(
      `${app.projectName} apply schema`,
      'bun drizzle-kit push --force',
      outputDir,
      env,
      COMMAND_TIMEOUTS_MS.drizzlePush,
    );

    console.log(
      `→ ${app.projectName} starting API server on port ${String(app.port)}`,
    );

    serverProcess = spawn('bun', ['run', 'dev:api'], {
      cwd: outputDir,
      env: {
        ...process.env,
        ...env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (isCi) {
      serverProcess.stdout?.on('data', (chunk) => {
        process.stdout.write(`[${app.dirName}:stdout] ${String(chunk)}`);
      });
      serverProcess.stderr?.on('data', (chunk) => {
        process.stdout.write(`[${app.dirName}:stderr] ${String(chunk)}`);
      });
    }

    serverProcess.stdout?.pipe(serverLog);
    serverProcess.stderr?.pipe(serverLog);

    await waitForServer(
      `http://localhost:${String(app.port)}/api/health`,
      COMMAND_TIMEOUTS_MS.serverReady / 1000,
      () => serverProcess?.exitCode === null,
    );

    console.log(`→ ${app.projectName} running api-test.sh`);

    const apiTestProcess = spawn(
      'bash',
      ['api-test.sh', `http://localhost:${String(app.port)}/api`],
      {
        cwd: outputDir,
        env: {
          ...process.env,
          ...env,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let combinedOutput = '';
    let timedOut = false;
    const apiTestTimer = setTimeout(() => {
      timedOut = true;
      apiTestProcess.kill('SIGTERM');
    }, COMMAND_TIMEOUTS_MS.apiTest);

    apiTestProcess.stdout?.on('data', (chunk) => {
      const text = String(chunk);
      combinedOutput += text;
      process.stdout.write(text);
    });

    apiTestProcess.stderr?.on('data', (chunk) => {
      const text = String(chunk);
      combinedOutput += text;
      process.stderr.write(text);
    });

    const apiTestExitCode = await new Promise<number>((resolve, reject) => {
      apiTestProcess.on('error', reject);
      apiTestProcess.on('close', (code) => {
        resolve(code ?? 1);
      });
    });

    clearTimeout(apiTestTimer);

    if (timedOut) {
      throw new Error(
        `api-test.sh timed out for ${app.projectName} after ${String(COMMAND_TIMEOUTS_MS.apiTest / 1000)}s`,
      );
    }

    await fs.writeFile(
      path.join(outputDir, 'api-test.log'),
      combinedOutput,
      'utf-8',
    );

    if (apiTestExitCode !== 0) {
      throw new Error(
        `api-test.sh failed for ${app.projectName}. See ${path.join(outputDir, 'api-test.log')}`,
      );
    }

    return parseApiTestSummary(combinedOutput, app.projectName);
  } finally {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
    serverLog.end();
    const cleanup = postgres(databaseUrl, { max: 1 });
    await cleanup.unsafe(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${dbName}'
      AND pid <> pg_backend_pid()
    `);
    await cleanup.unsafe(`DROP DATABASE IF EXISTS ${dbName}`);
    await cleanup.end();
  }
}

async function main(): Promise<void> {
  const apps = await discoverGoldenApps();
  if (apps.length === 0) {
    console.log('No golden apps found. Add a .golden file to a project.');
    return;
  }

  console.log('Generating golden apps...');
  runCommand(
    'Generate golden apps',
    'bun run scripts/generate-golden-apps.ts --json',
    process.cwd(),
    {
      DATABASE_URL: databaseUrl,
    },
    COMMAND_TIMEOUTS_MS.install,
  );

  const usedPorts = new Set<number>();
  let fallbackPort = 3100;

  const summaries: ApiTestSummary[] = [];
  for (const app of apps) {
    let port = app.port;
    if (usedPorts.has(port)) {
      while (usedPorts.has(fallbackPort)) {
        fallbackPort += 1;
      }
      port = fallbackPort;
      fallbackPort += 1;
      console.log(
        `Port ${String(app.port)} already used. Using ${String(port)} for ${app.projectName}.`,
      );
    }
    usedPorts.add(port);
    const summary = await runGoldenAppTests({ ...app, port });
    if (summary) {
      summaries.push(summary);
    }
  }

  if (summaries.length < 2) {
    console.log(
      'Parity check skipped: fewer than two frameworks with api-test.sh present.',
    );
    return;
  }

  const baseline = summaries[0];
  const mismatches = summaries.filter(
    (summary) =>
      summary.passed !== baseline.passed || summary.failed !== baseline.failed,
  );

  console.log('\nAPI test parity summary:');
  for (const summary of summaries) {
    console.log(
      `- ${summary.appName}: passed=${String(summary.passed)} failed=${String(summary.failed)}`,
    );
  }

  if (mismatches.length > 0) {
    throw new Error(
      [
        'Framework parity mismatch detected.',
        `Baseline: ${baseline.appName} (passed=${String(baseline.passed)} failed=${String(baseline.failed)})`,
        ...mismatches.map(
          (summary) =>
            `Mismatch: ${summary.appName} (passed=${String(summary.passed)} failed=${String(summary.failed)})`,
        ),
      ].join('\n'),
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
