let socketServer;

const ws = require('ws'),
    {socketPort} = require('./orb.js'),
    accountService = require('./AccountService.js'),
    accessLog = accountService.accessLog,
    socketMessageHandler = require('./SocketMessageHandler.js');

module.exports = {
    startup: callback => {
        if (socketServer) {
            console.warn('Attempt to start socket server again.');
            return;
        }
        
        socketServer = new ws.WebSocketServer({
            port:socketPort,
            maxPayload:1<<20 // Approx 1MB
        }, callback);
        
        socketServer.on('connection', (ws, req) => {
            accessLog.info('Socket Opened for IP:' + req.socket.remoteAddress);
            
            ws.on('error', console.error);
            ws.on('message', data => {
                const strData = data.toString();
                if (strData) {
                    let jsonData;
                    try {
                        jsonData = JSON.parse(strData);
                    } catch (err) {
                        console.error('Socket Message could not be parsed as JSON', err);
                        return;
                    }
                    
                    // Build a scope for further message processing.
                    const socketToken = jsonData.token;
                    if (socketToken) {
                        const account = accountService.getAccountBySocketToken(socketToken);
                        if (account) {
                            account.websocket = ws;
                            socketMessageHandler.handleMessage({account:account, data:jsonData});
                        } else {
                            console.warn('Socket Message without associated account');
                        }
                    } else {
                        console.warn('Socket Message without token');
                    }
                } else {
                    console.warn('Socket Message without string data');
                }
            });
        });
    },
    
    shutdown: callback => {
        if (!socketServer) {
            console.warn('No socket server to shutdown.');
            callback?.(false);
            return;
        }
        
        console.log('Closing Socket Server...');
        socketServer.close();
        socketServer.clients.forEach(ws => {
            console.log('  Terminating WebSocket');
            ws.close();
        });
        callback?.(true);
    }
};