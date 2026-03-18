const path = require('path');

const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === './wa-sqlite/wa-sqlite.wasm' &&
    context.originModulePath.endsWith(`${path.sep}expo-sqlite${path.sep}web${path.sep}worker.ts`)
  ) {
    return {
      type: 'assetFiles',
      filePaths: [path.resolve(path.dirname(context.originModulePath), moduleName)],
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    // Required for expo-sqlite web support via SharedArrayBuffer.
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return middleware(req, res, next);
  };
};

module.exports = config;
