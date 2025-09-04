const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enhanced resolver configuration
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, 'cjs'],
  assetExts: config.resolver.assetExts.filter(ext => ext !== 'svg'),
  alias: {
    '@': __dirname,
  },
};

// Enhanced transformer configuration
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Production optimizations
if (process.env.NODE_ENV === 'production') {
  config.transformer.minifierConfig = {
    keep_fnames: false,
    mangle: {
      toplevel: true,
      eval: true,
      properties: {
        regex: /^_/,
      },
    },
    compress: {
      drop_console: true,
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.warn', 'console.info', 'console.error', 'console.debug'],
      dead_code: true,
      conditionals: true,
      evaluate: true,
      booleans: true,
      loops: true,
      unused: true,
      hoist_funs: true,
      if_return: true,
      join_vars: true,
      cascade: true,
      side_effects: false,
      passes: 3,
      global_defs: {
        __DEV__: false,
      },
    },
    output: {
      comments: false,
      beautify: false,
      ascii_only: true,
    },
  };

  // Asset optimization
  config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];
}

// Cache configuration for faster builds - removed custom cacheStores to fix --clear flag
// config.cacheStores = [
//   {
//     name: 'vidgro-cache',
//     maxSize: 1024 * 1024 * 1024, // 1GB
//   },
// ];

module.exports = config;