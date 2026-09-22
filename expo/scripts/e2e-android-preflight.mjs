import { spawnSync } from 'node:child_process';

function command(name, args) {
  const result = spawnSync(name, args, { encoding: 'utf8', windowsHide: true });
  if (result.error) throw new Error(`${name} is required: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${name} failed: ${result.stderr.trim() || result.stdout.trim()}`);
  return result.stdout;
}

command('maestro', ['--version']);
const devices = command('adb', ['devices']);
const connected = devices.split(/\r?\n/).some((line) => /\tdevice$/.test(line));
if (!connected) throw new Error('Connect an unlocked Android device or emulator before running the device smoke test.');

console.log('Android device E2E preflight OK.');
