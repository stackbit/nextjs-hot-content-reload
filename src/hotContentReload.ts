import { createElement, ComponentType, FunctionComponent, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import ioClient from 'socket.io-client';
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
        const withSocket: FunctionComponent<T> = (props) => {
            if (disable) {
                return createElement(WrappedComponent, props, null);
            }

            const router = useRouter();
            const ref = useRef<() => void>();

            // update the ref.current with a new callback and new router data for every props change
            useEffect(() => {
                ref.current = () => {
                    router
                        .replace(router.pathname, router.asPath, {
                            scroll: false
                        })
                        .catch((error) => {
                            console.error(`withHotContentReload failed to replace path, error: ${error.message}`);
                        });
                };
            });

            // setup socket once, and use the callback stored in ref with updated router data
            useEffect(() => {
                // If the port is not defined, use the same port the page was loaded from.
                // This requires attaching socket.io to the same server that runs the site
                let portStr = process.env.NEXT_PUBLIC_HOT_RELOAD_CLIENT_PORT ?? String(port) ?? location.port;
                portStr = portStr ? ':' + portStr : '';
                namespace = process.env.NEXT_PUBLIC_HOT_RELOAD_PATH ?? namespace;
                eventName = process.env.NEXT_PUBLIC_HOT_RELOAD_EVENT_NAME ?? eventName;

                const socket = ioClient(`${location.protocol}//${location.hostname + portStr}${namespace}`);
                socket.on(eventName, () => {
                    ref.current?.();
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

        withSocket.displayName = `WithHotContentReload(${getDisplayName(WrappedComponent as ComponentType)})`;

        return withSocket;
    };
}
