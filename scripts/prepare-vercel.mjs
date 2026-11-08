
import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const dist = resolve(root, 'dist');
const publicDir = resolve(root, 'public');

console.log('Building VeeraGym frontend...');

execFileSync(
  process.platform === 'win32' ? 'bun.exe' : 'bun',
  ['run', 'vite', 'build'],
  { cwd: root, stdio: 'inherit' }
);

console.log('Copying Vite build into Vercel public directory...');

await mkdir(publicDir, { recursive: true });

// Remove only previous generated frontend assets.
await rm(resolve(publicDir, 'assets'), {
  recursive: true,
  force: true,
});

await cp(dist, publicDir, {
  recursive: true,
  force: true,
});

console.log('VeeraGym frontend is ready for Vercel.');
