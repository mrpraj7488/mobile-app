const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Production optimizations
if (process.env.NODE_ENV === 'production') {
  config.transformer = {
    ...config.transformer,
    minifierConfig: {
      ...config.transformer.minifierConfig,
      mangle: {
        toplevel: true,
        eval: true,
        keep_fnames: false,
        properties: {
          regex: /^_/,
        },
      },
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.warn', 'console.info', 'console.error'],
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
      },
      output: {
        comments: false,
        beautify: false,
      },
    },
  };

  // Bundle size optimization
  config.resolver = {
    ...config.resolver,
    alias: {
      'react-native-vector-icons': '@expo/vector-icons',
    },
  };

  // Asset optimization
  config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];
}

module.exports = config;