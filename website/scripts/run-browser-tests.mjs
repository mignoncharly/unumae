import { spawn } from 'node:child_process';

const host = '127.0.0.1';
const port = 4321;
const origin = `http://${host}:${port}`;
const server = spawn(
  process.execPath,
  ['scripts/serve-dist.mjs', String(port)],
  {
    stdio: 'ignore',
  }
);

const waitForServer = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(origin)).ok) return;
    } catch {
      // Static server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Static server did not start for browser tests.');
};

const run = () =>
  new Promise((resolve, reject) => {
    const test = spawn(
      process.execPath,
      [
        'node_modules/@playwright/test/cli.js',
        'test',
        ...process.argv.slice(2),
      ],
      {
        stdio: 'inherit',
        env: { ...process.env, QUALITY_EXTERNAL_SERVER: '1' },
      }
    );
    test.on('error', reject);
    test.on('exit', (code) => resolve(code ?? 1));
  });

try {
  await waitForServer();
  process.exitCode = await run();
} finally {
  server.kill('SIGTERM');
}
