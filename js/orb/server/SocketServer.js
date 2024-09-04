let socketServer;

const 
    live = (resolve, reject) => {
        const ws = require('ws'),
            {maxCharactersPerUser, socketPort} = global.orb,
            accountService = require('./AccountService.js'),
            characterService = require('./CharacterService.js'),
            {doEventNext, doEventNow, getTick, getNow} = require('./WorldClock.js'),
            accessLog = require('./LoggingService.js').getAccessLog(),
            SocketProtocol = require('../common/SocketProtocol.js'),
            ATTR_TIME = SocketProtocol.ATTR_TIME,
            
            doEventNextHandler = (username, type, msg) => {
                doEventNext({_uid:username, type:type, msg:msg});
            },
            
            doEventNowHandler = (username, type, msg) => {
                doEventNow({_uid:username, type:type, msg:msg});
            },
            
            HANDLERS = {
                [SocketProtocol.TYPE_LOBBY]: (username, type, msg) => {
                    return {
                        type:type, 
                        msg:{
                            characters:characterService.getCharactersByUserId(username, true),
                            maxCharacters:maxCharactersPerUser,
                            worldClockTick:getTick()
                        }, 
                        [ATTR_TIME]:getNow()
                    };
                },
                
                [SocketProtocol.TYPE_CREATE_CHARACTER]: (username, type, msg) => {
                    const {success, message, character} = characterService.createCharacter(username, msg),
                        msgObj = {success:success, message:message};
                    if (success) msgObj.character = character.getAsData();
                    return {type:type, msg:msgObj, [ATTR_TIME]:getNow()};
                },
                
                [SocketProtocol.TYPE_DELETE_CHARACTER]: (username, type, msg) => {
                    const {success, message, id} = characterService.deleteCharacter(username, msg.id),
                        msgObj = {success:success, message:message};
                    if (success) msgObj.id = id;
                    return {type:type, msg:msgObj, [ATTR_TIME]:getNow()};
                },
                
                [SocketProtocol.TYPE_ENTER_WORLD]:doEventNextHandler,
                [SocketProtocol.TYPE_EXIT_WORLD]:doEventNextHandler,
                
                [SocketProtocol.TYPE_MOVE]:doEventNowHandler,
                [SocketProtocol.TYPE_ALTER_CELL]:doEventNowHandler,
                [SocketProtocol.TYPE_CHANGE_FACING]:doEventNowHandler,
                [SocketProtocol.TYPE_VOCALIZE]:doEventNowHandler,
                [SocketProtocol.TYPE_INTERACT_WITH_FIXTURE]:doEventNowHandler,
            };
        
        console.log('Socket Server Starting Up...');
        
        if (socketServer) {
            console.warn('Attempt to start socket server again.');
            reject();
            return;
        }
        
        socketServer = new ws.WebSocketServer({
            port:socketPort,
            maxPayload:1<<20 // Approx 1MB
        }, () => {
            console.log('  Ouroboros Socket Server listening on port: ' + socketPort);
            resolve();
        });
        
        socketServer.on('connection', (websocket, req) => {
            accessLog.info('Socket Opened for IP:' + req.socket.remoteAddress);
            
            websocket.on('error', console.error);
            websocket.on('message', data => {
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
                    const {token:socketToken, time, type, msg} = jsonData;
                    if (socketToken) {
                        const account = accountService.getAccountBySocketToken(socketToken);
                        if (account) {
                            account[urob.account.FIELD_WEBSOCKET] = websocket;
                            
                            const handler = HANDLERS[type];
                            if (handler) {
                                const response = handler(account.username, type, msg);
                                if (response) {
                                    try {
                                        account.websocket.send(JSON.stringify(response));
                                    } catch (err) {
                                        console.error('Failed to send response', type, response, err);
                                    }
                                }
                            } else {
                                console.warn('Unexpected socket message type: ' + type, msg);
                            }
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
    
    die = (resolve, reject) => {
        if (!socketServer) {
            console.warn('  No socket server to shutdown.');
            reject();
        } else {
            console.log('Closing Socket Server...');
            socketServer.close();
            socketServer.clients.forEach(websocket => {
                console.log('  Terminating WebSocket');
                websocket.close();
            });
            resolve();
        }
    };

module.exports = {
    lifeCycle: isBirth => new Promise((resolve, reject) => {
        if (isBirth) {
            live(resolve, reject);
        } else {
            die(resolve, reject);
        }
    })
};