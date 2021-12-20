# Next.js Hot Content Reload

The Hot Content Reload lets you "hot reload" the props driving your Next.js pages when working locally.

The idea is similar to Webpack's [Hot Module Replacement](https://webpack.js.org/concepts/hot-module-replacement/), but instead of watching for code changes and replacing the changed components in the browser, it allows you to configure your Next.js to watch for content changes made in API CMS, or in local files, and update the page with the new content without refreshing the browser.

## How to use

The Hot Content Reload consists of two parts:

1. A server with a websocket that exposes `notifyPropsChanged` function. When this function is called, it sends a websocket event.
2. A high order component that wraps a page component, listens to the websocket events sent by the server, and reloading the props when such events are received.

To create the server import and call the `startHotContentReloadSocketServer` function from the `@stackbit/nextjs-hot-content-reload` package. Then call the `socketServer.notifyPropsChanged()` method whenever the props driving your pages are changed.

```javascript
const { startHotContentReloadSocketServer } = require('@stackbit/nextjs-hot-content-reload');

// You can also provide optional options object with custom "port", "namespace" and "eventName"
// or leave it empty to use defaults that work with Stackbit preview.
const socketServer = startHotContentReloadSocketServer({
    // port: '...',
    // namespace: '...',
    // eventName: '...'
});

// call socketServer.notifyPropsChanged() when content is changed
function onContentChange() {
    socketServer.notifyPropsChanged();
}
```

Next, wrap your page components with `withHotContentReload` high-order-component to enable hot-content-reload in these pages:

```javascript
import { hotContentReload } from '@stackbit/nextjs-hot-content-reload';

export default function Page(props) {
    return (
        <main>{props.title}</main>
    );
}

// You can also provide optional options object with custom "port", "namespace" and "eventName"
// or leave it empty to use default values that work with Stackbit preview.
const withHotContentReload = hotContentReload({
    // port: '...',
    // namespace: '...',
    // eventName: '...'
});

export default withHotContentReload(Page);

export function getStaticProps() {
    // ...
}
```

### Examples

#### Hot reloading file-system content

Assuming your site's pages render data stored in markdown files, you can setup [chokidar](https://www.npmjs.com/package/chokidar) to listen for file changes and call for `notifyPropsChanged`:

```javascript
const { startHotContentReloadSocketServer } = require('@stackbit/nextjs-hot-content-reload');
const chokidar = require('chokidar');

const socketServer = startHotContentReloadSocketServer();

function notifyChange(filePath) {
    socketServer.notifyPropsChanged();
}

const watcher = chokidar.watch('content', { ignoreInitial: true });
watcher.on('add', notifyChange);
watcher.on('change', notifyChange);
watcher.on('unlink', notifyChange);
```

#### Contentful

If you use Contentful to drive your site content, then you may use the `@stackbit/contentful-listener` package to be notified for any content changes:

```javascript
const { startHotContentReloadSocketServer } = require('@stackbit/nextjs-hot-content-reload');
const { ContentfulListener } = require('@stackbit/contentful-listener');

const socketServer = startHotContentReloadSocketServer();

const contentfulListener = new ContentfulListener({
    spaceId: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_PREVIEW_API_KEY,
    environment: 'master',
    host: 'preview.contentful.com',
    pollingIntervalMs: 1000,
    callback: (result: CallbackResponse) => {
        socketServer.notifyPropsChanged();
    }
});
contentfulListener.start();
```

#### Sanity

If you use Sanity to drive your site content, then you may use the `@sanity/client` and its `listen` API to be notified for any content changes:

```javascript
const { startHotContentReloadSocketServer } = require('@stackbit/nextjs-hot-content-reload');
const sanityClient = require('@sanity/client');

const socketServer = startHotContentReloadSocketServer();
const client = sanityClient({
    projectId: 'your-project-id',
    dataset: 'dataset-name',
    apiVersion: '2021-03-25', // use current UTC date - see "specifying API version"!
    token: 'sanity-auth-token', // or leave blank for unauthenticated usage
    useCdn: false
});

const query = '*[!(_id in path("_.**"))]';
const params = {};

const subscription = client.listen(query, params).subscribe((update) => {
    socketServer.notifyPropsChanged();
});
```
