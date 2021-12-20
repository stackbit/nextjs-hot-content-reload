import http from 'http';
import { Server } from 'socket.io';
import { HOT_RELOAD_PORT, HOT_RELOAD_NAMESPACE, HOT_RELOAD_EVENT_NAME } from './consts';

export interface HotContentReloadSocketServerOptions {
    port?: number;
    namespace?: string;
    eventName?: string;
}

// Please do not change the default values if you plan to run your site's preview in Stackbit
export function startHotContentReloadSocketServer({
    port = HOT_RELOAD_PORT,
    namespace = HOT_RELOAD_NAMESPACE,
    eventName = HOT_RELOAD_EVENT_NAME
}: HotContentReloadSocketServerOptions = {}): { notifyPropsChanged: () => void } {
    if (process.env.NEXT_PUBLIC_HOT_RELOAD_SERVER_PORT) {
        port = Number(process.env.NEXT_PUBLIC_HOT_RELOAD_SERVER_PORT);
    }
    namespace = process.env.NEXT_PUBLIC_HOT_RELOAD_PATH ?? namespace;
    eventName = process.env.NEXT_PUBLIC_HOT_RELOAD_EVENT_NAME ?? eventName;

    console.log(`[HotContentReloadSocket] create a websocket on port ${port} with namespace ${namespace}`);
    const httpServer = http.createServer();
    const io = new Server(httpServer, {
        allowEIO3: true,
        cors: {
            origin: true
        }
    });
    httpServer.on('error', (err) => {
        console.error('[HotContentReloadSocket] error:' + err.message);
    });
    httpServer.listen(port);
    const liveUpdatesIO = io.of(namespace);
    liveUpdatesIO.on('connection', (socket) => {
        socket.on('disconnect', () => {
            console.log(`[HotContentReloadSocket] websocket disconnected, socket.id: '${socket.id}'`);
        });

        socket.on('hello', () => {
            console.log(`[HotContentReloadSocket] websocket received 'hello', send 'hello' back, socket.id: '${socket.id}'`);
            socket.emit('hello');
        });

        console.log(`[HotContentReloadSocket] websocket connected, socket.id: '${socket.id}'`);
    });
    return {
        notifyPropsChanged: () => {
            console.log(`[HotContentReloadSocket] got ${eventName} event, notify sockets`);
            liveUpdatesIO.emit(eventName);
        }
    };
}
