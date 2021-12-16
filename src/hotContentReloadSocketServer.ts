import http from 'http';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';
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
    console.log(`[HotContentReloadSocket] create a websocket on port ${port} with namespace ${namespace}`);
    const httpServer = http.createServer();
    const io = new Server();
    io.attach(httpServer, {
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

async function updateContentVersionFile() {
    const filePath = path.join(__dirname, 'content-version.js');

    let contentVersion = 0;
    try {
        const contentVersionData = await readFile(filePath, 'utf8');
        const contentVersionMatch = contentVersionData.toString().match(/:\s*(\d+)/);
        contentVersion = (contentVersionMatch && parseInt(contentVersionMatch[1]!)) || 0;
    } catch (e) {
        // pass
    }

    await writeFile(filePath, `module.exports = {\n  contentVersion: ${contentVersion + 1},\n}\n`);
}
