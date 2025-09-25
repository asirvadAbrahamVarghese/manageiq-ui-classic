const merge = require('webpack-merge');

const { env, publicPath } = require('./configuration.js');
const babelrc = require('../../.babelrc.js');
const nodeModules = '../../node_modules';
const appBasePath = (env.NODE_ENV === 'production') ? '/packs/' : '../../assets/images/layout/';// Need different paths for developement and prod envs.

let babelOptions = merge(babelrc, {
  babelrc: false,
  compact: false,
  cacheDirectory: env.BABEL_CACHE_DIR || true, // defaults to node_modules/.cache/babel-loader
});

// set WEBPACK_VERBOSE=1 to get more warnings
if (env.WEBPACK_VERBOSE) {
  // don't drop any whitespace from the bundle, prevents warnings about filesize over the limit
  delete babelOptions.compact;
}

module.exports = [
  {
    test: /\.(js|jsx)$/,
    use: [{
      loader: 'babel-loader',
      options: babelOptions,
    }],
    exclude: /node_modules/,
  },

  // FIXME: pdated imports-loader and then replacing query string syntax with modern object syntax
  // {
  //   test: require.resolve('bootstrap-datepicker'),
  //   use: 'imports-loader?exports=>undefined,define=>undefined',
  // },
  {
    test: require.resolve('bootstrap-datepicker'),
    use: {
      loader: 'imports-loader',
      options: {
        additionalCode: 'var exports = undefined; var define = undefined;',
      },
    },
  },
  // {
  //   test: require.resolve('bootstrap-select'),
  //   use: 'imports-loader?module=>undefined,define=>undefined,this=>window',
  // },
  {
    test: require.resolve('bootstrap-select'),
    use: {
      loader: 'imports-loader',
      options: {
        additionalCode: `
        var module = undefined;
        var define = undefined;
        (function() { this.window = window; }).call(window);
      `,
      },
    },
  },
  // {
  //   // matches both the actual path and the aliased one
  //   test: /gettext_i18n_rails_js.*jed\.js/,
  //   use: 'imports-loader?exports=>undefined,define=>undefined,this=>window',
  // },
  {
    test: /gettext_i18n_rails_js.*jed\.js/,
    use: {
      loader: 'imports-loader',
      options: {
        additionalCode: `
        var exports = undefined;
        var define = undefined;
        (function() { this.window = window; }).call(window);
      `,
      },
    },
  },
  {
    test: /\.(jpg|jpeg|png|gif|svg|eot|ttf|woff|woff2)$/i,
    use: [{
      loader: 'file-loader',
      options: {
        publicPath,
        name: '[name]-[hash].[ext]',
      },
    }],
  },

  // FIXME: Spliting loader rules since css doesnot support Sass code injections($img-base-path: '${appBasePath})
  // will throw "Sass variables aren't allowed in plain CSS"
  {
    test: /\.(scss|sass)$/i,
    use: [
      'style-loader',
      {
        loader: 'css-loader',
        options: {
          sourceMap: true,
          importLoaders: 2,
          // esModule: false,
        },
      },
      {
        loader: 'postcss-loader',
        options: {
          sourceMap: true, // plugins are configured in .postcssrc.yml so no need of postcssOptions
          // postcssOptions: {
          //   plugins: [
          //     require('postcss-import'), // Add this!
          //     require('autoprefixer'),
          //   ],
          // },
        },
      },
      'resolve-url-loader',
      {
        loader: 'sass-loader',
        options: {
          sourceMap: true,
          // FIXME: latest sass-loader replaced prependData with additionalData
          additionalData: () => {
            return `$img-base-path: '${appBasePath}';`; // Path variable for login and about modal images.
          },
          sassOptions: {
            sourceMap: true,
            includePaths: [
              `${nodeModules}/bootstrap-sass/assets/stylesheets`,
              `${nodeModules}/bootstrap/scss`,
              `${nodeModules}/patternfly/dist/sass/patternfly`,
              `${nodeModules}/font-awesome/scss`,
              `${nodeModules}/@manageiq/font-fabulous/assets/stylesheets`,
            ],
            implementation: require('sass').default,
          },
        },
      },
    ],
  },
  {
    test: /\.css$/i,
    use: [
      'style-loader',
      {
        loader: 'css-loader',
        options: {
          sourceMap: true,
          importLoaders: 1,
          // esModule: false,
        },
      },
      {
        loader: 'postcss-loader',
        options: {
          sourceMap: true,
          // postcssOptions: {
          //   plugins: [
          //     require('postcss-import'), // Add this!
          //     require('autoprefixer'),
          //   ],
          // },
        },
      },
    ],
  },
];
