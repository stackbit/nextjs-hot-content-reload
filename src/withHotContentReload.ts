import React, { Component, ComponentType, FunctionComponent, useEffect } from 'react';
import { withRouter } from 'next/router';
import ioClient from 'socket.io-client';
import { WithRouterProps } from 'next/dist/client/with-router';
import { HOT_RELOAD_PORT, HOT_RELOAD_NAMESPACE, HOT_RELOAD_EVENT_NAME } from './consts';

export interface WithHotContentReloadOptions {
    port?: number;
    namespace?: string;
    eventName?: string;
}

export interface WithHotContentReloadOptionsProps {
    disableHotContentReload?: boolean;
}

// Please do not change the default values if you plan to run your site's preview in Stackbit
export function withHotContentReload<T>({
    port = HOT_RELOAD_PORT,
    namespace = HOT_RELOAD_NAMESPACE,
    eventName = HOT_RELOAD_EVENT_NAME
}: WithHotContentReloadOptions = {}) {
    return function <T extends WithHotContentReloadOptionsProps>(WrappedComponent: ComponentType<T>) {
        const withSocket: FunctionComponent<T & WithRouterProps> = (props) => {
            useEffect(() => {
                if (props.disableHotContentReload) {
                    return;
                }

                // If the port is null, use the same port the page was loaded from.
                // This requires attaching socket.io to the same server that runs the site
                let portStr = String(port) || location.port;
                portStr = portStr ? ':' + portStr : '';

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

            return React.createElement(WrappedComponent, props, null);
        };

        function getDisplayName(WrappedComponent: ComponentType) {
            return WrappedComponent.displayName || WrappedComponent.name || 'Component';
        }

        withSocket.displayName = `WithRemoteDataUpdates(${getDisplayName(WrappedComponent as ComponentType)})`;

        return withRouter(withSocket);
    };
}
