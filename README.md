# Next.js Hot Content Reload

The Hot Content Reload lets you reload page props of your Next.js pages without refreshing the page while working locally on your website. It is similar to Webpack's [Hot Module Replacement](https://webpack.js.org/concepts/hot-module-replacement/), but instead of watching for code changes and replacing the changed components in the browser, it allows you to configure your Next.js to watch for content changes made in API CMS and update the page in the browser with new content without refreshing the browser.

## How to use

To install the listener you need to import and call the `startHotContentReloadSocketServer` method. The returned object will include the `notifyPropsChanged` callback which you should call whenever your page props are changed.

Depending on where your data comes from, you can setup a listener for your data and when it changes call the `notifyPropsChanged` method. For example, if you are working with Contentful, you may use the `@stackbit/contentful-listener` package to notify you of any updates happening inside Contentful.

```javascript
const { ContentfulListener } = require('@stackbit/contentful-listener');
const { startHotContentReloadSocketServer } = require('@stackbit/nextjs-hot-content-reload');

const { notifyPropsChanged } = startHotContentReloadSocketServer(options);

const contentfulListener = new ContentfulListener({
    spaceId: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_PREVIEW_API_KEY,
    environment: 'master',
    host: 'preview.contentful.com',
    pollingIntervalMs: 1000,
    callback: (result: CallbackResponse) => {
        notifyPropsChanged();
    }
});
contentfulListener.start();
```

Next step, is to wrap your page components with `withHotContentReload` high-order-component to allow hot-content-reload in these pages:

```javascript
import { hotContentReload } from '@stackbit/nextjs-hot-content-reload';

export default function Page() {
    return (
        <main>...</main>
    );
}

const withHotContentReload = hotContentReload(options);

export default withHotContentReload(Page);

export function getServerSideProps() {
    // ...
}
```
