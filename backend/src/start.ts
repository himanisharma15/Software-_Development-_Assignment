import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const children = new Set<ChildProcess>();
let shuttingDown = false;
let exitCode = 0;

function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill(signal);
    }
  }
}

for (const service of ['server', 'worker']) {
  const child = spawn(
    process.execPath,
    [fileURLToPath(new URL(`./${service}.js`, import.meta.url))],
    { stdio: 'inherit' }
  );

  children.add(child);
  child.on('error', (error) => {
    console.error(`Failed to start ${service}:`, error);
    exitCode = 1;
    shutdown('SIGTERM');
  });
  child.on('close', (code) => {
    children.delete(child);
    if (!shuttingDown) {
      exitCode = code ?? 1;
      shutdown('SIGTERM');
    }
    if (children.size === 0) process.exitCode = exitCode;
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));