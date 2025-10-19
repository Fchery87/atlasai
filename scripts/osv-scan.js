#!/usr/bin/env node

/**
 * OSV scan helper for local environments.
 * Tries to run the official Docker image, otherwise prints guidance.
 */

import { spawn } from 'node:child_process';

function runDockerScan() {
  return new Promise((resolve) => {
    const args = ['run', '--rm', '-v', `${process.cwd()}:/repo`, 'ghcr.io/google/osv-scanner:latest', '-r', '/repo'];
    const p = spawn('docker', args, { stdio: 'inherit' });
    p.on('exit', (code) => resolve(code));
    p.on('error', () => resolve(127));
  });
}

const main = async () => {
  const code = await runDockerScan();
  if (code === 0) {
    process.exit(0);
  }
  console.log('\nOSV scanner is not available via npm. To run locally, use one of the following:\n');
  console.log('- Docker (recommended):');
  console.log('    docker run --rm -v "%cd%:/repo" ghcr.io/google/osv-scanner:latest -r /repo   (Windows)');
  console.log('    docker run --rm -v "$(pwd):/repo" ghcr.io/google/osv-scanner:latest -r /repo  (macOS/Linux)');
  console.log('- Or install a native binary from: https://github.com/google/osv-scanner/releases');
  console.log('- Or run the GitHub Action workflow: Security Audit Report (Actions tab).');
  process.exit(0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});