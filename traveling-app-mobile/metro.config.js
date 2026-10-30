const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const config = getDefaultConfig(__dirname);
// Preserve the project's Windows worker limit.
config.maxWorkers = 1;
module.exports = withNativeWind(config, { input: './global.css' });
