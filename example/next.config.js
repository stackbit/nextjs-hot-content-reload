const path = require('path');
const chokidar = require('chokidar');
const { startHotContentReloadSocketServer } = require('../dist');

if (process.env.NODE_ENV === 'development') {
  const socketServer = startHotContentReloadSocketServer();

  function onContentChange(filePath) {
    console.log('file changed: ' + filePath);
    socketServer.notifyPropsChanged();
  }

  const watcher = chokidar.watch('content', {ignoreInitial: true});
  watcher.on('add', onContentChange);
  watcher.on('change', onContentChange);
  watcher.on('unlink', onContentChange);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    loader: 'custom'
  },
  webpack: (config) => {
    // In pages/index.js we are loading hotContentReload from a sibling folder with a different node_modules folder.
    // That node_modules folder has a different copy of react and next packages and we can't use them.
    // Otherwise react will throw the "You might have more than one copy of React in the same app" exception.
    // https://reactjs.org/warnings/invalid-hook-call-warning.html#duplicate-react
    // Therefore, we alias react and next dependencies and force them to be loaded from node_modules in this project.
    config.resolve.alias['react'] = path.resolve('./node_modules/react');
    config.resolve.alias['next'] = path.resolve('./node_modules/next');
    return config;
  }
}

module.exports = nextConfig
