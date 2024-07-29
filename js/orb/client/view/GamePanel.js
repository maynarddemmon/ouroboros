(pkg => {
    let websocket,
        socketConnectedTxt;
    
    const I18N = BABEL.get,
        M = myt,
        {
            View, Text, SpacedLayout, ResizeLayout, SizeToParent, 
            global:G
        } = M,
        
        {
            TextBtn,
            theme:{
                padding, spacing, colorFgSuccess, colorFgError
            }
        } = pkg;
    
    pkg.GamePanel = new JS.Class('GamePanel', pkg.BaseStackablePanel, {
        // Accessors ///////////////////////////////////////////////////////////
        setVisible: function(v) {
            this.callSuper(v);
            if (this.visible) {
                if (!websocket) {
                    websocket = new orb.MessageTypeWebSocket({url:pkg.socketUrl}, [{
                        setStatus:function(v) {
                            this.callSuper(v);
                            
                            switch (this.status) {
                                case 'open':
                                    socketConnectedTxt.setConnected(true);
                                    websocket.sendTypedMessage('enterLobby');
                                    break;
                                case 'closed':
                                    socketConnectedTxt.setConnected(false);
                                default:
                            }
                        }/*,
                        close: function() {
                            this.callSuper();
                        },
                        onOpen: function(event) {
                            this.callSuper(event);
                        },
                        onError: function(event) {
                            this.callSuper(event);
                        },
                        onClose: function(event) {
                            this.callSuper(event);
                        }*/
                    }]);
                    
                    websocket.registerListener(msg => {
                        console.log('Message', msg);
                    }, 'message');
                }
                
                // Open Socket Connection
                if (websocket.status === 'closed') websocket.connect();
            }
        },
        
        
        // Methods /////////////////////////////////////////////////////////////
        buildUI: function() {
            const self = this;
            self.buildHeader(self.header = new pkg.Header(self, {}));
            self.gameSpace = new View(self, {percentOfParentWidth:100, layoutHint:1}, [SizeToParent]);
            self.buildFooter(self.footer = new pkg.Footer(self, {}));
            new ResizeLayout(self, {axis:'y'});
        },
        
        buildHeader: header => {
            new View(header, {layoutHint:1});
            
            socketConnectedTxt = new Text(header, {valign:'middle', text:pkg.FA_PLUG, fontSize:'18px'}, [{
                setConnected: function(v) {
                    if (v) {
                        this.setOpacity(1);
                        this.setTooltip('Socket connected.');
                        this.setTextColor(colorFgSuccess);
                    } else {
                        this.setOpacity(0.25);
                        this.setTooltip('Socket not connected.');
                        this.setTextColor(colorFgError);
                    }
                }
            }]);
            M.FontAwesome.registerForNotification(socketConnectedTxt);
            socketConnectedTxt.setConnected(false);
            
            new TextBtn(header, {valign:'middle', text:pkg.FA_LOGOUT + ' ' + I18N('logout')}, [{
                doActivated: () => {
                    G.app.doDeauthRequest({username:pkg.username}, (success, dataOrError) => {
                        if (success) {
                            // Close WebSocket if necessary
                            if (websocket && websocket.status !== 'closed') websocket.close();
                            
                            pkg.authenticated = false;
                            pkg.username = null;
                            pkg.socketToken = null;
                            pkg.socketUrl = null;
                            G.app.selectPanel(pkg.PANEL_ID_AUTH);
                        } else {
                            // FIXME: Show error in UI somehow.
                        }
                    });
                }
            }]);
        },
        
        buildFooter: footer => {}
    });
})(orb);
