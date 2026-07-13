import { spawn } from 'node:child_process';

const TIMEOUT_MS = 8000;

function runAdbReverse(port) {
  return new Promise((resolve) => {
    const child = spawn('adb.exe', ['reverse', `tcp:${port}`, `tcp:${port}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let settled = false;
    const finish = (message) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (message) console.log(message);
      resolve();
    };

    const timer = setTimeout(() => {
      child.kill();
      finish(`adb reverse tcp:${port} timed out (emulator offline?)`);
    }, TIMEOUT_MS);

    child.on('error', (error) => {
      finish(`adb reverse skipped: ${error.message}`);
    });

    child.on('close', (code) => {
      if (code === 0) {
        finish(`adb reverse tcp:${port} tcp:${port}`);
        return;
      }
      finish(`adb reverse tcp:${port} failed (exit ${code ?? 'unknown'})`);
    });
  });
}

for (const port of [8081, 3000]) {
  await runAdbReverse(port);
}