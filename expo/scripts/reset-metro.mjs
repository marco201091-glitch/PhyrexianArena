import { execSync } from 'node:child_process';

const port = 8081;

try {
  const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
  const pids = new Set();

  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/LISTENING\s+(\d+)/);
    if (match) pids.add(match[1]);
  }

  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
      console.log(`Stopped process ${pid} on port ${port}`);
    } catch {
      // already gone
    }
  }
} catch {
  console.log(`Port ${port} is free`);
}