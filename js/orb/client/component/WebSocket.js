(pkg => {
    const JSClass = JS.Class,
        
        M = myt,
        
        {
            greek:{
                TYPE_WARNING, TYPE_ERROR, TYPE_SERVERINFO,
                TYPE_LOBBY, TYPE_CREATE_CHARACTER, TYPE_DELETE_CHARACTER,
                TYPE_ENTER_WORLD, TYPE_EXIT_WORLD,
                TYPE_MAP_DATA, TYPE_CELL_DATA,
                TYPE_RESULT_MOVE, TYPE_RESULT_ALTER_CELL, TYPE_ALTER_CHARACTER,
                ATTR_TIME
            },
            character:{
                FIELD_LOC, 
                FIELD_LOCK_MOVE, FIELD_LOCK_ACTION, FIELD_LOCK_REACT, FIELD_LOCK_FREE
            }
        } = common,
        
        consoleError = console.error,
        
        CLOSE_NORMAL = 1000,
        
        /** Provides WebSocket functionality.
            
            @class */
        WebSocketClass = pkg.WebSocket = new JSClass('WebSocket', M.Eventable, {
            // Life Cycle //////////////////////////////////////////////////////
            init: function(attrs) {
                this.status = 'closed';
                this.useJSON = true;
                this.callSuper(attrs);
            },
            
            destroy: function() {
                this.close(CLOSE_NORMAL, 'destroyed');
                this.callSuper();
            },
            
            
            // Accessors ///////////////////////////////////////////////////////
            setUseJSON: function(v) {
                if (this.useJSON !== v) {
                    this.useJSON = v;
                    if (this.inited) this.fireEvent('useJSON', v);
                }
            },
            
            setStatus: function(v) {
                if (this.status !== v) {
                    this.status = v;
                    if (this.inited) this.fireEvent('status', v);
                }
            },
            
            setUrl: function(v) {
                this.url = v;
            },
            
            setProtocols: function(v) {
                this.protocols = v;
            },
            
            
            // Methods /////////////////////////////////////////////////////////
            /** Connects the WebSocket to the currently configured URL.
                @param {?Function} [afterOpenCallback] - This callback will be executed once after 
                    the connection is established and the onOpen method has been called.
                @returns {undefined} */
            connect: function(afterOpenCallback) {
                if (!this._ws && this.url) {
                    try {
                        const ws = this._ws = new WebSocket(this.url, this.protocols);
                        
                        const openFunc = this.onOpen.bind(this);
                        if (afterOpenCallback) {
                            // Execute an afterOpenCallback one time
                            ws.onopen = event => {
                                openFunc(event);
                                afterOpenCallback(event);
                                
                                // Reassign handler
                                ws.onopen = openFunc;
                            };
                        } else {
                            ws.onopen = openFunc;
                        }
                        
                        ws.onerror = this.onError.bind(this);
                        ws.onmessage = this.onMessage.bind(this);
                        ws.onclose = this.onClose.bind(this);
                    } catch (ex) {
                        this.onError(ex);
                    }
                }
            },
            
            /** Sends a message over the WebSocket.
                @param {*} msg - The message to send.
                @param {boolean} [doNotTryToConnect] - If falsy an attempt will be made to connect 
                    if the WebSocket is not currently connected before sending the message.
                @returns {boolean|undefined} Indicating if the message was sent or not. Undefined 
                    is returned when the connection has to be opened before sending. */
            send: function(msg, doNotTryToConnect) {
                const self = this,
                    ws = self._ws;
                if (ws && self.status === 'open') {
                    if (self.useJSON) {
                        try {
                            msg = JSON.stringify(msg);
                        } catch (ex) {
                            self.onError(ex);
                        }
                    }
                    ws.send(msg);
                    return true;
                } else if (!doNotTryToConnect) {
                    // Try to connect first and then send
                    self.connect(event => {self.send(msg, true);});
                } else {
                    return false;
                }
            },
            
            /** Attempts to close the connection.
                @param code:number (optional) Should be a WebSocket CloseEvent.code value. Defaults 
                    to 1000 CLOSE_NORMAL.
                @param reason:string (optional) An explanation of why the close is occurring. 
                    Defaults to "close".
                @returns {undefined} */
            close: function(code, reason) {
                if (this._ws) this._ws.close(code ?? CLOSE_NORMAL, reason ?? 'close');
            },
            
            /** Invoked when after the WebSocket is opened.
                @param {!Object} event -  The open event fired by the WebSocket.
                @returns {undefined} */
            onOpen: function(event) {
                this.setStatus('open');
            },
            
            /** Invoked when an error occurs in the WebSocket.
                @param {!Object} event - The error event fired by the WebSocket.
                @returns {undefined} */
            onError: function(event) {
                consoleError(event);
                
                if (this._ws && this._ws.readyState !== WebSocket.OPEN) this.close();
            },
            
            /** Invoked when a message is received over the WebSocket.
                @param {!Object} event - The message event fired by the WebSocket.
                @returns msg:* The message received. */
            onMessage: function(event) {
                let msg = event.data;
                
                if (this.useJSON) {
                    try {
                        msg = JSON.parse(msg);
                    } catch (ex) {
                        this.onError(ex);
                    }
                }
                
                return msg; // Useful for subclassing
            },
            
            /** Invoked when the WebSocket is closed.
                @param {!Object} event - The close event fired by the WebSocket.
                @returns {undefined} */
            onClose: function(event) {
                if (this._ws) delete this._ws;
                this.setStatus('closed');
            }
        }),
        
        matcherFunctionsByKey = {},
        
        /*  @param {string|?Function} matcher
            @return {?Function} */
        makeMatcherFunction = matcher => {
            let matcherFunc;
            if (typeof matcher === 'string') {
                // Use the provided string as an exact match function. We must generate a unique 
                // function for each string key (and reuse it) so that the === tests will work in 
                // the registerListener and unregisterListener functions.
                matcherFunc = matcherFunctionsByKey[matcher] ??= type => type === matcher;
            } else if (typeof matcher === 'function') {
                matcherFunc = matcher;
            } else if (matcher == null) {
                // Use a unique match anything function
                matcherFunc = type => true;
            } else {
                // Invalid matcherFunc
            }
            return matcherFunc;
        },
        
        notifyListenersForTypedMessage = (websocket, msg) => {
            const type = msg?.type;
            if (type) {
                websocket._listeners.forEach(listenerInfo => {
                    listenerInfo.patternMatchers.every(patternMatcher => {
                        if (patternMatcher(type)) {
                            listenerInfo.func(msg);
                            return false;
                        }
                        return true;
                    });
                });
            };
        };
    
    /** A WebSocket where messages are JSON objects with the following structure:
            type:string The type of the message. This will allow registered listeners to be 
                notified when a message they are interested in arrives.
            msg:json The message payload.
            date:number The time in milliseconds when the message was sent.
        
        @class */
    pkg.MessageTypeWebSocket = new JSClass('MessageTypeWebSocket', WebSocketClass, {
        // Life Cycle //////////////////////////////////////////////////////////
        /** @overrides */
        init: function(attrs) {
            this._listeners = [];
            attrs.protocols ??= 'typedMessage';
            this.callSuper(attrs);
        },
        
        
        // Methods /////////////////////////////////////////////////////////////
        /** Registers a listener function that will get called for messages with a type that is 
            matched by the provided matcher.
            @param {?Function} listenerFunc The function that will get invoked. The message is 
                provided as the sole argument to the function.
            @param {string|?Function} matcher (optional) A matcher function that takes the type as 
                the sole argument and must return true or false indicating if the type is matched 
                or not. If a string is provided it will be converted into an exact match function. 
                If not provided (or something falsy) is provided a promiscuous matcher function 
                will be used.
            @returns {undefined} */
        registerListener: function(listenerFunc, matcher) {
            if (listenerFunc) {
                const matcherFunc = makeMatcherFunction(matcher);
                if (matcherFunc) {
                    // Register for existing listenr
                    const listeners = this._listeners;
                    let i = listeners.length;
                    while (i) {
                        const listenerInfo = listeners[--i];
                        if (listenerInfo.func === listenerFunc) {
                            const patternMatchers = listenerInfo.patternMatchers; 
                            let j = patternMatchers.length;
                            while (j) {
                                // Abort since the patternMatcher is 
                                // already registered
                                if (patternMatchers[--j] === matcherFunc) return;
                            }
                            patternMatchers.push(matcherFunc);
                            
                            // Prevent fall through to "add" below since we found a listener.
                            return;
                        }
                    }
                    
                    // Add a new listenerFunc
                    listeners.push({
                        func:listenerFunc,
                        patternMatchers:[matcherFunc]
                    });
                }
            }
        },
        
        /** Removed the provided listener function and matcher.
            @param {!Function} listenerFunc
            @param {string|?Function} matcher
            @returns {undefined} */
        unregisterListener: function(listenerFunc, matcher) {
            if (listenerFunc) {
                const matcherFunc = makeMatcherFunction(matcher);
                if (matcherFunc) {
                    const listeners = this._listeners;
                    let i = listeners.length;
                    while (i) {
                        const listenerInfo = listeners[--i];
                        if (listenerInfo.func === listenerFunc) {
                            // Try to remove the matcherFunc
                            const patternMatchers = listenerInfo.patternMatchers;
                            let j = patternMatchers.length;
                            while (j) {
                                if (patternMatchers[--j] === matcherFunc) {
                                    patternMatchers.splice(j, 1);
                                    break;
                                }
                            }
                            
                            // Remove entire entry if there are no more matchers
                            if (patternMatchers.length === 0) listeners.splice(i, 1);
                            break;
                        }
                    }
                }
            }
        },
        
        /** Sends a message with a type. Use this method instead of send.
            @param {string} type The type of the message to send.
            @param {*} msg The message value. Must be convertible to JSON.
            @param {boolean} doNotTryToConnect
            @returns {undefined} The sent message. */
        sendTypedMessage: function(type, msg, doNotTryToConnect) {
            msg = this.createMessage(type, msg);
            if (msg) return this.send(msg, doNotTryToConnect);
        },
        
        /** Creates a new message to be sent. May be overridden by subclasses, but should not be 
            used externally.
            @param type:string The type of the message to send.
            @param msg:* The message value. Must be convertible to JSON.
            @returns string The message to be sent or undefined if an exception occurs during 
                JSON.stringify. */
        createMessage: (type, msg) => {
            return {
                token:pkg.socketToken,
                time:Date.now(),
                type:type ?? '',
                msg:msg
            };
        },
        
        /** @overrides */
        onMessage: function(event) {
            const msg = this.callSuper(event);
            if (Array.isArray(msg)) {
                // Process multiple typed messages bundled into an array
                const len = msg.length;
                for (let i = 0; i < len; i++) notifyListenersForTypedMessage(this, msg[i]);
            } else {
                notifyListenersForTypedMessage(this, msg);
            }
            return msg;
        }
    });
    
    pkg.websocketUtil = {
        connectToWebsocket: () => {
            const websocket = pkg.websocket ??= pkg.websocketUtil.makeWebSocket(pkg.socketUrl);
            if (websocket.status === 'closed') websocket.connect();
            return websocket;
        },
        
        makeWebSocket: url => {
            const model = pkg.model,
                websocket = new pkg.MessageTypeWebSocket({url:url}, [{
                    setStatus:function(v) {
                        this.callSuper(v);
                        if (this.status === 'open') this.sendTypedMessage(TYPE_LOBBY);
                    }
                }]);
            
            // Setup listeners
            websocket.registerListener(response => {
                const msg = response.msg;
                model.setWorldClockTick(msg.worldClockTick);
                model.setMaxCharacters(msg.maxCharacters);
                model.setCharactersFromData(msg.characters);
                model.updateWorldClockTime(response[ATTR_TIME]);
            }, TYPE_LOBBY);
            
            websocket.registerListener(response => {
                const {success, message, character} = response.msg;
                if (success) {
                    model.addCharacterFromData(character);
                    model.updateWorldClockTime(response[ATTR_TIME]);
                    pkg.growl('success', 'Character Created', message);
                } else {
                    pkg.growl('failure', 'Character Creation Failed', message);
                }
                pkg.app.unlockUI();
            }, TYPE_CREATE_CHARACTER);
            
            websocket.registerListener(response => {
                const {success, message, id} = response.msg;
                if (success) {
                    model.removeCharacterById(id);
                    model.updateWorldClockTime(response[ATTR_TIME]);
                    pkg.growl('success', 'Character Deleted', message);
                } else {
                    pkg.growl('failure', 'Character Deletion Failed', message);
                }
                pkg.app.unlockUI();
            }, TYPE_DELETE_CHARACTER);
            
            websocket.registerListener(response => {
                pkg.growl('warning', 'Server Warning', response.msg);
                pkg.app.unlockUI();
            }, TYPE_WARNING);
            
            websocket.registerListener(response => {
                pkg.growl('failure', 'Server Warning', response.msg);
                pkg.app.unlockUI();
            }, TYPE_ERROR);
            
            websocket.registerListener(response => {
                pkg.growl('info', 'Server Info', response.msg);
                pkg.app.unlockUI();
            }, TYPE_SERVERINFO);
            
            websocket.registerListener(response => {
                const {character} = response.msg;
                model.updateWorldClockTime(response[ATTR_TIME]);
                if (character) {
                    const characterModel = model.replaceCharacterFromData(character);
                    if (characterModel) {
                        model.setCharacterInPlay(characterModel);
                        pkg.app.selectPanel(pkg.PANEL_ID_GAME);
                    } else {
                        pkg.growl('failure', 'Character Not Found', 'The chracter sent back by the server was not found locally.');
                    }
                }
                pkg.app.unlockUI();
            }, TYPE_ENTER_WORLD);
            
            websocket.registerListener(response => {
                const {character} = response.msg;
                model.updateWorldClockTime(response[ATTR_TIME]);
                if (character) {
                    if (model.replaceCharacterFromData(character)) {
                        model.setCharacterInPlay();
                        pkg.model.clearMapAndCellData();
                        pkg.app.selectPanel(pkg.PANEL_ID_LOBBY);
                    } else {
                        pkg.growl('failure', 'Character Not Found', 'The chracter sent back by the server was not found locally.');
                    }
                }
                pkg.app.unlockUI();
            }, TYPE_EXIT_WORLD);
            
            websocket.registerListener(response => {
                model.updateWorldClockTime(response[ATTR_TIME]);
                model.storeMapData(response.msg);
            }, TYPE_MAP_DATA);
            
            websocket.registerListener(response => {
                model.updateWorldClockTime(response[ATTR_TIME]);
                model.storeCellData(response.msg);
            }, TYPE_CELL_DATA);
            
            websocket.registerListener(response => {
                const msg = response.msg,
                    characterInPlay = model.getCharacterInPlay();
                model.updateWorldClockTime(response[ATTR_TIME]);
                if (characterInPlay) {
                    characterInPlay.set(FIELD_LOCK_MOVE, msg[FIELD_LOCK_MOVE]);
                    characterInPlay.set(FIELD_LOC, msg.newLoc);
                    pkg.gameMap.refreshMap();
                }
            }, TYPE_RESULT_MOVE);
            
            websocket.registerListener(response => {
                const msg = response.msg,
                    characterInPlay = model.getCharacterInPlay();
                model.updateWorldClockTime(response[ATTR_TIME]);
                if (characterInPlay) {
                    characterInPlay.set(FIELD_LOCK_FREE, msg[FIELD_LOCK_FREE]);
                    pkg.gameMap.refreshMap();
                }
            }, TYPE_RESULT_ALTER_CELL);
            
            websocket.registerListener(response => {
                const msg = response.msg,
                    newNow = response[ATTR_TIME],
                    character = model.getCharacterById(msg.id);
                if (newNow) model.updateWorldClockTime(newNow);
                if (character) character.set(msg.p, msg.v);
            }, TYPE_ALTER_CHARACTER);
            
            return websocket;
        }
    }
})(orb);
