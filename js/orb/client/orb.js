(global.BABEL = myt.I18N).setDictionary(LOCALE_JSON, LOCALE);

orb = (() => {
    const I18N = BABEL.get,
        
        {
            Text, FontAwesome, Validator, NumericRangeValidator, RegexValidator,
            global:{
                validators:{
                    register:registerValidator
                }
            }
        } = myt,
        makeTagFunc = FontAwesome.makeTag.bind(FontAwesome),
        
        pkg = {
            app:null,
            websocket:null,
            model:null,
            
            authenticated:false,
            username:null,
            socketToken:null,
            socketUrl:null,
            
            connectToWebsocket: () => {
                let websocket = pkg.websocket;
                if (!websocket) {
                    websocket = pkg.websocket = new pkg.MessageTypeWebSocket({url:pkg.socketUrl}, [{
                        setStatus:function(v) {
                            this.callSuper(v);
                            if (this.status === 'open') websocket.sendTypedMessage('lobby');
                        }
                    }]);
                    
                    websocket.registerListener(response => {
                        const model = pkg.model,
                            msg = response.msg;
                        model.setMaxCharacters(msg.maxCharacters);
                        model.setCharacters(msg.characters);
                    }, 'lobby');
                    
                    websocket.registerListener(response => {
                        const model = pkg.model,
                            {success, message, character} = response.msg;
                        if (success) {
                            model.addCharacter(character);
                            // FIXME: notify UI of success
                        } else {
                            // FIXME: notify UI of error
                        }
                        pkg.app.unlockUI();
                    }, 'createCharacter');
                    
                    websocket.registerListener(response => {
                        const model = pkg.model,
                            {success, message, id} = response.msg;
                        if (success) {
                            model.removeCharacterById(id);
                            // FIXME: notify UI of success
                        } else {
                            // FIXME: notify UI of error
                        }
                        pkg.app.unlockUI();
                    }, 'deleteCharacter');
                }
                
                // Open Socket Connection
                if (websocket.status === 'closed') websocket.connect();
            },
            
            doDeathRequest: () => {
                pkg.app.doDeauthRequest({username:pkg.username}, (success, dataOrError) => {
                    if (success) {
                        // Wipe Model
                        pkg.model.wipeClean();
                        
                        // Close WebSocket if necessary
                        const websocket = pkg.websocket;
                        if (websocket && websocket.status !== 'closed') websocket.close();
                        
                        pkg.authenticated = false;
                        pkg.username = null;
                        pkg.socketToken = null;
                        pkg.socketUrl = null;
                        pkg.app.selectPanel(pkg.PANEL_ID_AUTH);
                    } else {
                        // FIXME: Show error in UI somehow.
                    }
                });
            },
            
            makeSocketStatusIndicator: parent => {
                const socketConnectedTxt = new Text(parent, {valign:'middle', text:pkg.FA_PLUG, fontSize:'18px'}, [{
                    onWebsocketStatus: function(event) {
                        const status = event.value;
                        
                        if (status === 'open') {
                            this.setOpacity(1);
                            this.setTooltip('Socket connected.');
                            this.setTextColor(pkg.theme.colorFgSuccess);
                        } else {
                            this.setOpacity(0.25);
                            this.setTooltip('Socket not connected.');
                            this.setTextColor(pkg.theme.colorFgError);
                        }
                    }
                }]);
                FontAwesome.registerForNotification(socketConnectedTxt);
                socketConnectedTxt.onWebsocketStatus({value:false});
                return socketConnectedTxt;
            },
            
            PANEL_ID_REG:'reg',
            PANEL_ID_AUTH:'auth',
            PANEL_ID_LOBBY:'lobby',
            PANEL_ID_GAME:'game',
            
            FA_ARROW_DOUBLE_DOWN:  makeTagFunc(['angle-double-down', 1]),
            FA_ARROW_DOUBLE_LEFT:  makeTagFunc(['angle-double-left', 1]),
            FA_ARROW_DOUBLE_RIGHT: makeTagFunc(['angle-double-right', 1]),
            FA_ARROW_DOUBLE_UP:    makeTagFunc(['angle-double-up', 1]),
            FA_ARROW_DOWN:         makeTagFunc(['arrow-down']),
            FA_ARROW_LEFT:         makeTagFunc(['arrow-left']),
            FA_ARROW_RIGHT:        makeTagFunc(['arrow-right']),
            FA_ARROW_UP:           makeTagFunc(['arrow-up']),
            FA_BACK:               makeTagFunc(['chevron-circle-left']),
            FA_BAN:                makeTagFunc(['ban']),
            FA_CHECKMARK:          makeTagFunc(['check']),
            FA_CHEVRON_DOWN:       makeTagFunc(['chevron-down']),
            FA_CHEVRON_LEFT:       makeTagFunc(['chevron-left']),
            FA_CHEVRON_RIGHT:      makeTagFunc(['chevron-right']),
            FA_CHEVRON_UP:         makeTagFunc(['chevron-up']),
            FA_CLOSE:              makeTagFunc(['times']),
            FA_EDIT:               makeTagFunc(['edit']),
            FA_ERROR:              makeTagFunc(['fa-exclamation-circle']),
            FA_EYE:                makeTagFunc(['eye']),
            FA_EYE_SLASH:          makeTagFunc(['eye-slash']),
            FA_FORWARD:            makeTagFunc(['chevron-circle-right']),
            FA_GEAR:               makeTagFunc(['cog']),
            FA_HELP:               makeTagFunc(['question-circle']),
            FA_LOGIN:              makeTagFunc(['sign-in-alt']),
            FA_LOGOUT:             makeTagFunc(['sign-out-alt']),
            FA_MINUS:              makeTagFunc(['minus']),
            FA_MINUS_SQUARE:       makeTagFunc(['minus-square']),
            FA_PLUG:               makeTagFunc(['plug']),
            FA_PLUS:               makeTagFunc(['plus']),
            FA_PLUS_SQUARE:        makeTagFunc(['plus-square']),
            FA_SAVE:               makeTagFunc(['save']),
            FA_SEARCH:             makeTagFunc(['search']),
            FA_WARNING:            makeTagFunc(['exclamation-triangle']),
            
            theme:{
                padding:12,
                spacing:6,
                cornerRadius:3,
                
                headerHeight:52,
                footerHeight:52,
                
                inputHeight:28,
                
                fontSizeSmall:'12px',
                fontSizeMedium:'14px',
                fontSizeLarge:'16px',
                fontSizeHuge:'20px',
                
                colorFgError:'#c00',
                colorFgWarning:'#f80',
                colorFgSuccess:'#090',
                
                colorBgRow:'#ddd',
                colorBgHeader:'#ccc',
                colorBgPanel:'#000',
                colorBgMiddleComp:'#eee',
                colorBgInput:'#fff',
                
                colorBgError:'#fcc',
                
                borderInput:[1, 'solid', '#ccc']
            },
            
            cfg:{
                
            },
            
            elements:{
                
            }
        };
    
    registerValidator(new RegexValidator('passwordStrength', '(?=^.{7,}$)', I18N('err-passwordStrength')));
    
    return pkg;
})();
