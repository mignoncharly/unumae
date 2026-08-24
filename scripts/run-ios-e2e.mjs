#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const devices = [
  'iPhone SE (3rd generation)',
  'iPhone 16',
  'iPhone 16 Pro Max',
];
const appPath = process.env.IOS_E2E_APP_PATH;

if (process.platform !== 'darwin') {
  console.error('iOS simulator E2E requires macOS with Xcode and Maestro.');
  process.exit(2);
}

if (!appPath || !existsSync(appPath)) {
  console.error(
    'Set IOS_E2E_APP_PATH to a compiled .app for the iOS simulator.'
  );
  process.exit(2);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const listed = spawnSync(
  'xcrun',
  ['simctl', 'list', 'devices', 'available', '--json'],
  { encoding: 'utf8' }
);
if (listed.error || listed.status !== 0) {
  console.error('Could not list available iOS simulators.');
  process.exit(listed.status ?? 1);
}

const runtimes = JSON.parse(listed.stdout).devices;
const available = Object.values(runtimes).flat();

for (const name of devices) {
  const device = available.find((candidate) => candidate.name === name);
  if (!device) {
    console.error(`Required simulator is unavailable: ${name}`);
    process.exit(1);
  }

  console.log(`\nRunning release smoke test on ${name}`);
  if (device.state !== 'Booted') {
    run('xcrun', ['simctl', 'boot', device.udid]);
  }
  run('xcrun', ['simctl', 'bootstatus', device.udid, '-b']);
  run('xcrun', ['simctl', 'install', device.udid, appPath]);
  run('maestro', [
    '--device',
    device.udid,
    'test',
    '.maestro/release-smoke.yml',
  ]);
}

console.log('\nAll three iPhone release smoke tests passed.');
