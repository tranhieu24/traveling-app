// metro.config.js
// Workaround for Node.js v22+ / v24 incompatibility with Metro's jest-worker
// child_process.fork() which causes EPERM (errno -4048) on Windows.
// Setting maxWorkers: 1 and minWorkers: 1 forces Metro to run transforms
// in a single process (the main Node process), avoiding the fork() call entirely.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Force single-threaded bundling — no worker fork() calls.
// Safe for development; production builds are unaffected.
config.maxWorkers = 1;

module.exports = config;
