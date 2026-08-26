import { spawn } from 'node:child_process';

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('npm_execpath is unavailable.');
const failures = [];

const run = (label, args) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [npmCli, ...args], {
      stdio: 'inherit',
    });
    child.on('error', (error) => {
      failures.push(`${label}: ${error.message}`);
      resolve(false);
    });
    child.on('exit', (code) => {
      if (code !== 0)
        failures.push(`${label}: exited ${code ?? 'without a code'}`);
      resolve(code === 0);
    });
  });

await run('Astro diagnostics', ['run', 'check']);
await run('ESLint', ['run', 'lint']);
await run('Formatting', ['run', 'format:check']);
const built = await run('Quality build', ['run', 'build:quality']);

if (built) {
  await run('Static audit', ['run', 'quality:static']);

  // Each renderer gets its own process and static-server lifecycle. A Firefox
  // renderer crash can therefore neither poison WebKit/Chromium state nor
  // prevent the later Lighthouse run. Every failure is still aggregated.
  const browserProjects = [
    'chrome',
    'edge',
    ...(process.platform === 'win32' ? [] : ['firefox']),
    'safari',
    'ios-safari',
  ];
  if (process.platform === 'win32') {
    process.stdout.write(
      'Firefox renderer qualification is isolated to the Linux CI job; the Windows Playwright subprocess cannot be terminated reliably.\n'
    );
  }
  for (const project of browserProjects) {
    await run(`Browser project ${project}`, [
      'run',
      'quality:browsers',
      '--',
      `--project=${project}`,
    ]);
  }

  await run('Lighthouse', ['run', 'quality:lighthouse']);
} else {
  failures.push(
    'Browser, static, and Lighthouse checks skipped: no fresh build.'
  );
}

if (failures.length > 0) {
  process.stderr.write(`\nQuality gate failed:\n- ${failures.join('\n- ')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('\nComplete website quality gate passed.\n');
}
