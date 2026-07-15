import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const METRO_URL = 'http://127.0.0.1:8081/status';
const PROJECT_URL = 'exp://127.0.0.1:8081';
const EXPO_GO_PACKAGE = 'host.exp.exponent';
const STARTUP_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 500;

const adb = process.platform === 'win32' ? 'adb.exe' : 'adb';
const expoCli = fileURLToPath(new URL('../node_modules/expo/bin/cli', import.meta.url));

const metro = spawn(process.execPath, [expoCli, 'start', '--localhost'], {
  stdio: 'inherit',
  windowsHide: true,
});

let metroExited = false;

metro.on('exit', (code) => {
  metroExited = true;
  process.exitCode = code ?? 1;
});

metro.on('error', (error) => {
  metroExited = true;
  console.error(`Could not start Metro: ${error.message}`);
  process.exitCode = 1;
});

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForMetro() {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;

  while (!metroExited && Date.now() < deadline) {
    try {
      const response = await fetch(METRO_URL);
      const status = await response.text();
      if (response.ok && status.includes('packager-status:running')) return;
    } catch {
      // Metro is still starting.
    }

    await delay(POLL_INTERVAL_MS);
  }

  throw new Error('Metro did not become ready within 60 seconds');
}

async function openProject() {
  await waitForMetro();

  // Opening Expo Go through its launcher can restore a stale experience whose
  // cached bundle path is empty. A direct VIEW intent always supplies Metro's
  // project URL and avoids JSBigFileString::fromPath failures.
  spawnSync(adb, ['shell', 'am', 'force-stop', EXPO_GO_PACKAGE], {
    stdio: 'ignore',
    windowsHide: true,
  });

  const result = spawnSync(
    adb,
    [
      'shell',
      'am',
      'start',
      '-a',
      'android.intent.action.VIEW',
      '-d',
      PROJECT_URL,
      EXPO_GO_PACKAGE,
    ],
    { stdio: 'inherit', windowsHide: true },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Could not open Expo Go (adb exit ${result.status ?? 'unknown'})`);
  }

  console.log(`Opened Phyrexian Arena at ${PROJECT_URL}`);
}

openProject().catch((error) => {
  if (!metroExited) console.error(error.message);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (!metroExited) metro.kill(signal);
  });
}
