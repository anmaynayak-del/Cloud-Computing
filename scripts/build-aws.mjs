import { spawnSync } from 'node:child_process';
import { cpSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = new URL('../client/dist/', import.meta.url);
const publicDir = new URL('../server/public/', import.meta.url);
const npmCli = process.env.npm_execpath;

function npm(args, overrides = {}) {
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd: root,
    env: { ...process.env, FINSENSE_SAME_ORIGIN: 'true', ...overrides },
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.argv[2] === 'start') {
  npm(['--prefix', 'server', 'start', '--', ...process.argv.slice(3)]);
} else {
  npm(['--prefix', 'client', 'run', 'build:aws'], { VITE_API_URL: '' });

  // These paths are owned by the Vite build. Keep the server's other public files.
  rmSync(new URL('assets/', publicDir), { recursive: true, force: true });
  const outputs = readdirSync(dist).filter(name => name !== '_redirects');
  for (const name of outputs) {
    cpSync(new URL(name, dist), new URL(name, publicDir), { recursive: true });
  }

  if (!readFileSync(new URL('index.html', publicDir), 'utf8').includes('/assets/')) {
    throw new Error('Vite did not generate the expected frontend entry point.');
  }
  npm(['--prefix', 'server', 'run', 'build', '--', '--webpack']);
}
