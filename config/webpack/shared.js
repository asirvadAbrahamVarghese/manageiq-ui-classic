// Note: You must restart bin/webpack-dev-server for changes to take effect

/* eslint global-require: 0 */
/* eslint import/no-dynamic-require: 0 */

const webpack = require('webpack');
const { basename, dirname, join, resolve } = require('path');
const { sync } = require('glob');
// FIXME: ManifestPlugin is no longer a constructor in latest webpack-manifest-plugin
//  replaced by WebpackManifestPlugin
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const extname = require('path-complete-extname');
const DuplicatePackageCheckerPlugin = require('duplicate-package-checker-webpack-plugin');
const { execSync } = require('child_process');

const { env, settings, i18n, output, engines } = require('./configuration.js');
const loaders = require('./loaders.js');
const RailsEnginesPlugin = require('./RailsEnginesPlugin');

const extensionGlob = `**/*{${settings.extensions.join(',')}}*`; // */
const entryPath = join(settings.source_path, settings.source_entry_path);
const moduleDir = engines['manageiq-ui-classic'].node_modules;

const gettextDir = i18n;

const sharedPackages = [
  '@carbon/icons-react',
  'angular',
  'carbon-components-react',
  'connected-react-router',
  'jquery',
  'lodash',
  'moment',
  'prop-types',
  'react',
  'react-bootstrap',
  'react-dom',
  'react-redux',
  'react-router',
  'react-router-dom',
  'redux',
];

let packPaths = {};

Object.keys(engines).forEach(function(k) {
  let root = engines[k].root;
  let glob = join(root, entryPath, extensionGlob);
  packPaths[k] = sync(glob);
});

const nodeModulesNotShims = (module) => {
  // FIXME: SplitChunksPlugin.checkTest is no longer available from webpack 5, so using regex instead
  const inNodeModules = /node_modules/.test(module.resource);
  const inShims = /shims/.test(module.resource);

  return inNodeModules && !inShims;
};
  // FIXME: SplitChunksPlugin.checkTest is no longer available from webpack 5, so using regex instead
const notShims = (module) => (!(/shims/.test(module.resource)));

let plugins = [
  new webpack.DefinePlugin({
    'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV || 'development'),
    'process.env.CYPRESS': JSON.stringify(env.CYPRESS),
  }),
// FIXME: ManifestPlugin is no longer a constructor in latest webpack-manifest-plugin
//  replaced by WebpackManifestPlugin
  new WebpackManifestPlugin({
    publicPath: output.publicPath,
    writeToFileEmit: true,
  }),

  // plugin to output timestamp after compilation (useful for --watch)
  {
    apply(compiler) {
      compiler.hooks.done.tap('done timestamp', () => {
        // setTimeout to append instead of prepend the date
        setTimeout(() => console.log('webpack: done', new Date()));
      });
    },
  },
];

if (env.WEBPACK_VERBOSE) {
  plugins.push(new DuplicatePackageCheckerPlugin({
    verbose: true,
    showHelp: false,
  }));
}

const resolveModule = (...name) => resolve(dirname(__filename), '../../node_modules', ...name);

module.exports = {
  entry: {
    ...Object.keys(packPaths).reduce(
      (map, pluginName) => {
        packPaths[pluginName].forEach(function(entry) {
          map[join(pluginName, basename(entry, extname(entry)))] = resolve(entry);
        });
        return map;
      }, {}
    ),
    'shims': [
      'es6-shim',
      'array-includes',
      'whatwg-fetch',
      'core-js/stable',
      'regenerator-runtime/runtime',
    ],
  },

  output: {
    filename: '[name]-[chunkhash].js',
    path: output.path,
    publicPath: output.publicPath,
  },

  module: {
    rules: loaders,
  },

  plugins,

  optimization: {
    runtimeChunk: 'single',
    splitChunks: {
      minChunks: 1,
      minSize: 0,
      cacheGroups: {
        vendor: {
          chunks: 'all',
          name: 'vendor',
          priority: -10,
          reuseExistingChunk: true,
          test: nodeModulesNotShims,
        },
        default: {
          chunks: 'all',
          minChunks: 2,
          // FIXME: removing name since that causing conflicts
          // name: 'vendor',
          priority: -20,
          reuseExistingChunk: true,
          test: notShims,
        },
      },
    },
  },

  resolve: {
    alias: {
      ...sharedPackages.reduce((acc, pkg) => ({ ...acc, [pkg]: resolveModule(pkg) }), {}),
      'bootstrap-select': '@pf3/select', // never use vanilla bootstrap-select
      '@patternfly/patternfly': resolveModule('NONEXISTENT'),
      '@patternfly/patternfly-next': resolveModule('NONEXISTENT'),
      '@@ddf': resolve(dirname(__filename), '../../app/javascript/forms/data-driven-form'),
      'gettext_i18n_rails_js': gettextDir,
      // FIXME: figure out following is required, seems not necessary
      // Add aliases for common missing dependencies
      // 'warning': resolveModule('warning'),
      // 'object-assign': resolveModule('object-assign'),
      // 'classnames': resolveModule('classnames'),
      // '@babel/runtime-corejs2': resolveModule('@babel/runtime-corejs3'),
      // // Add aliases for tilde imports in CSS
      // '~c3': resolveModule('c3'),
      // '~patternfly-bootstrap-treeview': resolveModule('patternfly-bootstrap-treeview'),
      // '~angular-patternfly': resolveModule('angular-patternfly'),
      // '~@manageiq/ui-components': resolveModule('@manageiq/ui-components'),
      // '~patternfly': resolveModule('patternfly'),
    },
    extensions: settings.extensions,
    // FIXME: modules: [] fails to locate plugins,
    // modules: [moduleDir] is not locating peer_dependency node_modules structure
    // modules: ['node_modules'] is a global pattern helps locate parent and peer node_modules
    modules: ['node_modules'],
    // modules: [],
    // modules: [moduleDir],
    plugins: [
      new RailsEnginesPlugin('module', 'resolve', engines, moduleDir),
    ],
    // FIXME: check if fallback is necessary seems not needed
    // fallback: {
    //   "path": false,
    //   "fs": false,
    //   "crypto": false
    // }
  },

  resolveLoader: {
    // only read loaders from ui-classic
    modules: [moduleDir],
  },

  watchOptions: {
    ignored: ['**/.*.sw[po]'],
  },
};
