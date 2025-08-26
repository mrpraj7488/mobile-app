const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add obfuscation for production builds
if (process.env.NODE_ENV === 'production' && process.env.ENABLE_OBFUSCATION === 'true') {
  config.transformer = {
    ...config.transformer,
    minifierConfig: {
      ...config.transformer.minifierConfig,
      // Enhanced obfuscation settings
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
        pure_funcs: ['console.log', 'console.warn', 'console.info'],
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
      },
      output: {
        comments: false,
        beautify: false,
      },
    },
  };
}

module.exports = config;