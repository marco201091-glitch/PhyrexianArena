import { execSync } from 'node:child_process';

function getPidsOnPort(port) {
  try {
    const output = execSync(`netstat -ano | findstr ":${port}"`, { encoding: 'utf8' });
    const pids = new Set();

    for (const line of output.split(/\r?\n/)) {
      if (!line.includes('LISTENING')) continue;
      const pid = Number(line.trim().split(/\s+/).at(-1));
      if (Number.isFinite(pid) && pid > 0) pids.add(pid);
    }

    return [...pids];
  } catch {
    return [];
  }
}

const ports = [3000, 3001];
const pids = new Set(ports.flatMap(getPidsOnPort));

if (pids.size === 0) {
  console.log('No dev server found on ports 3000/3001.');
  process.exit(0);
}

for (const pid of pids) {
  try {
    execSync(`taskkill /PID ${pid} /F`, { stdio: 'inherit' });
    console.log(`Stopped process ${pid}.`);
  } catch {
    console.warn(`Could not stop process ${pid}.`);
  }
}