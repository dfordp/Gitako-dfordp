import type { Configuration } from 'webpack'
const webpack = require('webpack')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const path = require('path')
const Dotenv = require('dotenv-webpack')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const srcPath = path.resolve(__dirname, 'src')

function resolvePathInput(input: string) {
  return path.isAbsolute(input) ? input : path.resolve(process.cwd(), input)
}

const buildTarget = process.env.TARGET
const buildTargetOutputMap = {
  safari: 'Safari/Gitako/Gitako Extension/Resources',
}
const envOutputDir =
  process.env.OUTPUT_DIR ||
  (buildTarget &&
    buildTarget in buildTargetOutputMap &&
    buildTargetOutputMap[buildTarget as keyof typeof buildTargetOutputMap])
const outputPath = envOutputDir ? resolvePathInput(envOutputDir) : path.resolve(__dirname, 'dist')

const IN_PRODUCTION_MODE = process.env.NODE_ENV === 'production'
const plugins = [
  new CopyWebpackPlugin([
    {
      from: './src/manifest.json',
      to: 'manifest.json',
      transform(content: string) {
        const { version, description, author, homepage: homepage_url } = require('./package.json')
        const manifest = JSON.parse(content)
        Object.assign(manifest, {
          version,
          description,
          author,
          homepage_url,
        })

        // Disable custom domains for Safari
        if (buildTarget === 'safari') {
          Reflect.deleteProperty(manifest, 'optional_permissions')
          Reflect.deleteProperty(manifest, 'background')
        }

        if (!IN_PRODUCTION_MODE) {
          // enable source mapping while developing
          Object.assign(manifest, {
            web_accessible_resources: manifest.web_accessible_resources.concat({
              resources: ['*.map'],
              matches: ['*://*/*'],
            }),
          })
        }
        return JSON.stringify(manifest)
      },
    },
    {
      from: './src/assets/icons/*',
      to: 'icons/[name].[ext]',
    },
    {
      from: './vscode-icons/icons/*',
      to: 'icons/vscode/[name].[ext]',
    },
    {
      from: 'node_modules/webextension-polyfill/dist/browser-polyfill.js',
      to: 'browser-polyfill.js',
    },
    {
      from: './src/firefox-shim.js',
      to: 'firefox-shim.js',
    },
  ]),
  new ForkTsCheckerWebpackPlugin(),
  new Dotenv(),
  new MiniCssExtractPlugin(),
]

const analyze = process.env.ANALYZE !== undefined
if (analyze) {
  plugins.push(new BundleAnalyzerPlugin())
  console.log(`BundleAnalyzerPlugin added`)
}

plugins.push(
  new webpack.DefinePlugin({
    'process.env.VERSION': JSON.stringify(process.env.VERSION),
  }),
)

const webpackConfig: Configuration = {
  entry: {
    content: './src/content.tsx',
    background: './src/background.ts',
  },
  devtool: IN_PRODUCTION_MODE ? 'source-map' : 'inline-source-map',
  mode: IN_PRODUCTION_MODE ? 'production' : 'development',
  output: {
    path: outputPath,
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    modules: [srcPath, 'node_modules'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'babel-loader',
        include: [srcPath],
        exclude: /node_modules/,
        sideEffects: false,
      },
      {
        test: /\.[cm]?js$/,
        loader: 'babel-loader',
        // Transpile as least files under node_modules
        include: /node_modules\/(webext-.*|superstruct)\/.*\.[cm]?js$/,
        options: {
          cacheDirectory: true,
        },
      },
      {
        test: /\.scss$/,
        loader: MiniCssExtractPlugin.loader,
        include: [srcPath],
      },
      {
        test: /\.scss$/,
        loader: 'css-loader',
        include: [srcPath],
      },
      {
        test: /\.scss$/,
        loader: 'sass-loader',
        include: [srcPath],
      },
      {
        test: /\.svg$/,
        resourceQuery: /inline/,
        loader: 'url-loader',
      },
      {
        test: /\.csv$/,
        loader: 'raw-loader',
      },
      {
        test: /\.json$/,
        loader: 'json-loader',
        include: [srcPath],
      },
      {
        test: /\.png$/,
        loader: 'url-loader',
        include: [srcPath],
      },
    ],
  },
  plugins,
}

module.exports = webpackConfig
