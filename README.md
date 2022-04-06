# Next.js Hot Content Reload

When working locally, the "Hot Content Reload" lets you "hot reload" the props returned by  Next.js `getStaticProps` and `getServerSideProps` methods.

The idea is similar to Webpack's [Hot Module Replacement](https://webpack.js.org/concepts/hot-module-replacement/). However, instead of watching for code changes and replacing the changed components in the browser, it lets you configure your Next.js site to watch for content changes made in Headless CMS or local files and update the page with the new content without refreshing the browser.

## How to use

The Hot Content Reload consists of two parts:

1. A server with a websocket exposing the `notifyPropsChanged` function. When you call this function, it sends a websocket event to the client, causing it to reload the props of the currently rendered page.
2. A high-order component that wraps the page component. It listens to the websocket events sent by the server and reloads the props when such events are received.

To create the websocket server import the `startHotContentReloadSocketServer` function from the `@stackbit/nextjs-hot-content-reload` package inside your `next.config.js`. Create the socket server by invoking the `startHotContentReloadSocketServer()` function. Make sure to do that when running next.js in development mode. Then call the `socketServer.notifyPropsChanged()` method whenever the props driving your pages are changed. See the following section for examples of when to call this method when working with different headless CMS.

`next.config.js`:
```javascript
const { startHotContentReloadSocketServer } = require('@stackbit/nextjs-hot-content-reload');

if (process.env.NODE_ENV === 'development') {
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
}

module.exports = {
    // ... next.js config goes here
};
```

Next, wrap your page components with `withHotContentReload` high-order-component to enable hot-content-reload in these pages. By default, `withHotContentReload` sets websocket listener when `process.env.NODE_ENV === 'development'`. If you need to customize the behavior of `withHotContentReload` high-order-component, import the `hotContentReload` factory method and pass it custom options to create your own `withHotContentReload` HOC.

```javascript
import { withHotContentReload } from '@stackbit/nextjs-hot-content-reload/hotContentReload';

function Page(props) {
    return (
        <main>{props.title}</main>
    );
}

export default withHotContentReload(Page);

export function getStaticProps() {
    // ...
}
```

## Examples

### Hot reloading file-system content

Assuming your site's pages render data stored in markdown files, you can use [chokidar](https://www.npmjs.com/package/chokidar) to listen for file changes and call `socketServer.notifyPropsChanged()`:

```javascript
const { startHotContentReloadSocketServer } = require('@stackbit/nextjs-hot-content-reload');
const chokidar = require('chokidar');

if (process.env.NODE_ENV === 'development') {
    const socketServer = startHotContentReloadSocketServer();

    function onContentChange(filePath) {
        socketServer.notifyPropsChanged();
    }

    const watcher = chokidar.watch('content', {ignoreInitial: true});
    watcher.on('add', onContentChange);
    watcher.on('change', onContentChange);
    watcher.on('unlink', onContentChange);
}
```

### Contentful

If your site uses Contentful as its headless CMS, you can use the `@stackbit/contentful-listener` package. Call the `socketServer.notifyPropsChanged()` when contentful-listener notifies you of a content change:

```javascript
const { startHotContentReloadSocketServer } = require('@stackbit/nextjs-hot-content-reload');
const { ContentfulListener } = require('@stackbit/contentful-listener');

if (process.env.NODE_ENV === 'development') {
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
}
```

### Sanity

If your site uses Sanity as its headless CMS, you  can use the `@sanity/client` package and its `listen` API and call the `socketServer.notifyPropsChanged()` when Sanity notifies you of change events:

```javascript
const { startHotContentReloadSocketServer } = require('@stackbit/nextjs-hot-content-reload');
const sanityClient = require('@sanity/client');

if (process.env.NODE_ENV === 'development') {
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
}
```

## Example Project

You can find an example Next.js starter project inside the [example](/example) folder.

There you will find [pages/index.js](example/pages/index.js) file that implements `getStaticProps` method. The `getStaticProps` method loads data from [content/index.yaml](example/content/index.yaml) and returns as props to be consumed by the `Home` component. It also wraps the `Home` component with `hotContentReload` high-order component to setup websocket listener on the client as described before.

```javascript
function Home(props) {
    // ...
}

const withHotContentReload = hotContentReload();

export default withHotContentReload(Home);

export function getStaticProps() {
    const yamlData = fs.readFileSync('content/index.yaml', 'utf-8')
    const props = yaml.load(yamlData)
    return {props}
}
```

And finally, [next.config.js](example/next.config.js) installs a websocket service and a file listener that calls `socketServer.notifyPropsChanged()` when the [content/index.yaml](example/content/index.yaml) file is changed.

To try it out:

- clone this repo
- run `npm install` in the root folder
- run `npm run build` in the root folder
- run `cd example`
- run `npm install`
- run `npm run dev`
- navigate to http://localhost:3000
- open the [content/index.yaml](example/content/index.yaml) file and change something
- the browser will instantly reflect the changes

