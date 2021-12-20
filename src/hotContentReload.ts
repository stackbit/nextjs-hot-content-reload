import { createElement, ComponentType, FunctionComponent, useEffect } from 'react';
import { withRouter } from 'next/router';
import ioClient from 'socket.io-client';
import { WithRouterProps } from 'next/dist/client/with-router';
import { HOT_RELOAD_PORT, HOT_RELOAD_NAMESPACE, HOT_RELOAD_EVENT_NAME } from './consts';

export interface HotContentReloadOptions {
    disable?: boolean;
    port?: number;
    namespace?: string;
    eventName?: string;
}

export function hotContentReload({
    disable = false,
    port = HOT_RELOAD_PORT,
    namespace = HOT_RELOAD_NAMESPACE,
    eventName = HOT_RELOAD_EVENT_NAME
}: HotContentReloadOptions = {}) {
    return function withHotContentReload<T>(WrappedComponent: ComponentType<T>) {
        const withSocket: FunctionComponent<T & WithRouterProps> = (props) => {
            useEffect(() => {
                if (disable) {
                    return;
                }

                // If the port is not defined, use the same port the page was loaded from.
                // This requires attaching socket.io to the same server that runs the site
                let portStr = process.env.NEXT_PUBLIC_HOT_RELOAD_CLIENT_PORT ?? String(port) ?? location.port;
                portStr = portStr ? ':' + portStr : '';

                namespace = process.env.NEXT_PUBLIC_HOT_RELOAD_PATH ?? namespace;
                eventName = process.env.NEXT_PUBLIC_HOT_RELOAD_EVENT_NAME ?? eventName;

                const socket = ioClient(`${location.protocol}//${location.hostname + portStr}${namespace}`);
                socket.on(eventName, () => {
                    props.router
                        .replace(props.router.pathname, props.router.asPath, {
                            scroll: false
                        })
                        .catch(() => {
                            // pass
                        });
                });

                socket.on('connect', () => {
                    socket.emit('hello');
                });

                return () => {
                    socket.close();
                };
            }, []);

            return createElement(WrappedComponent, props, null);
        };

        function getDisplayName(WrappedComponent: ComponentType) {
            return WrappedComponent.displayName || WrappedComponent.name || 'Component';
        }

        withSocket.displayName = `WithRemoteDataUpdates(${getDisplayName(WrappedComponent as ComponentType)})`;

        return withRouter(withSocket);
    };
}
