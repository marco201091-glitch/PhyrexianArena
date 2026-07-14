const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// On Windows, jest-worker child processes open a CMD window per node.exe.
// Single worker + worker threads avoids the console spam.
if (process.platform === 'win32') {
  config.maxWorkers = 1;
  config.transformer = {
    ...config.transformer,
    unstable_workerThreads: true,
  };
  config.watcher = {
    ...config.watcher,
    unstable_workerThreads: true,
  };
}

module.exports = config;