(global.BABEL = myt.I18N).setDictionary(LOCALE_JSON, LOCALE);

orb = (() => {
    let socketConnectedTxt,
        worldClockView;
    
    const I18N = BABEL.get,
        
        {
            View, Text, Dialog, ModalPanel, FontAwesome, Validator, NumericRangeValidator, RegexValidator,
            memoize,
            global:{
                validators:{
                    register:registerValidator
                }
            }
        } = myt,
        makeTagFunc = FontAwesome.makeTag.bind(FontAwesome),
        
        {
            util:{worldTimeToParts},
            greek:{
                TYPE_WARNING, TYPE_ERROR, TYPE_SERVERINFO,
                TYPE_LOBBY, TYPE_CREATE_CHARACTER, TYPE_DELETE_CHARACTER,
                TYPE_ENTER_WORLD, TYPE_EXIT_WORLD,
                TYPE_MAP_DATA, TYPE_CELL_DATA,
                TYPE_RESULT_MOVE,
                ATTR_TIME
            }
        } = common,
        
        pkg = {
            app:null,
            websocket:null,
            model:null,
            growlManager:null,
            gamePanel:null,
            gameMap:null,
            
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
                            if (this.status === 'open') websocket.sendTypedMessage(TYPE_LOBBY);
                        }
                    }]);
                    
                    websocket.registerListener(response => {
                        const model = pkg.model,
                            msg = response.msg;
                        model.setWorldClockTick(msg.worldClockTick);
                        model.setMaxCharacters(msg.maxCharacters);
                        model.setCharactersFromData(msg.characters);
                        model.updateWorldClockTime(response[ATTR_TIME]);
                    }, TYPE_LOBBY);
                    
                    websocket.registerListener(response => {
                        const model = pkg.model,
                            {success, message, character} = response.msg;
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
                        const model = pkg.model,
                            {success, message, id} = response.msg;
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
                        const model = pkg.model,
                            {character} = response.msg;
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
                        const model = pkg.model,
                            {character} = response.msg;
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
                        pkg.model.storeMapData(response.msg);
                    }, TYPE_MAP_DATA);
                    
                    websocket.registerListener(response => {
                        pkg.model.storeCellData(response.msg);
                    }, TYPE_CELL_DATA);
                    
                    websocket.registerListener(response => {
                        const model = pkg.model,
                            {id, lockMovement, newLoc} = response.msg,
                            characterInPlay = model.getCharacterInPlay();
                        if (characterInPlay) {
                            characterInPlay.setLockMovement(lockMovement);
                            characterInPlay.setLoc(newLoc);
                            pkg.gameMap.refreshMap();
                        }
                    }, TYPE_RESULT_MOVE);
                }
                
                // Open Socket Connection
                if (websocket.status === 'closed') websocket.connect();
            },
            
            cleanUpForDeauth: () => {
                // Wipe Model
                pkg.model.wipeClean();
                
                // Close WebSocket if necessary
                const websocket = pkg.websocket;
                if (websocket && websocket.status !== 'closed') websocket.close();
                
                pkg.authenticated = false;
                pkg.username = null;
                pkg.socketToken = null;
                pkg.socketUrl = null;
            },
            
            doDeathRequest: () => {
                pkg.app.doDeauthRequest({username:pkg.username}, (success, dataOrError) => {
                    if (success) {
                        pkg.cleanUpForDeauth();
                        pkg.app.selectPanel(pkg.PANEL_ID_AUTH);
                    } else {
                        pkg.growl('failure', 'Logout Failed', dataOrError.message);
                    }
                });
            },
            
            /** Moves the socketStatusIndicator to the provided View. Lazy
                instantiates it as well. */
            reparenSocketStatusIndicator: parent => {
                if (socketConnectedTxt) {
                    socketConnectedTxt.setParent(parent);
                } else {
                    socketConnectedTxt = new Text(parent, {valign:'middle', text:pkg.FA_PLUG, fontSize:'18px'}, [{
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
                    socketConnectedTxt.syncTo(pkg.websocket, 'onWebsocketStatus', 'status');
                }
            },
            
            reparentWorldClockView: parent => {
                if (worldClockView) {
                    worldClockView.setParent(parent);
                } else {
                    worldClockView = new Text(parent, {valign:'middle', fontFamily:'monospace'}, [{
                        onWorldClockTime: function(event) {
                            this.setText(worldTimeToParts(event.value, true));
                        }
                    }]);
                    worldClockView.syncTo(pkg.model, 'onWorldClockTime', 'worldClockTime');
                }
            },
            
            // Growls
            growl: (type, title, msg) => {
                const growlManager = pkg.growlManager ?? (pkg.growlManager = new myt.GrowlManager());
                
                const attrs = {},
                    THEME = pkg.theme;
                switch (type) {
                    case 'success':
                        attrs.textColor = THEME.colorFgSuccess;
                        attrs.icon = pkg.FA_SUCCESS;
                        attrs.initialKeepDuration = 2000;
                        break;
                    case 'failure':
                        attrs.textColor = THEME.colorFgError;
                        attrs.icon = pkg.FA_ERROR;
                        attrs.showCloseButton = true;
                        attrs.closeOnly = true;
                        break;
                    case 'warning':
                        attrs.textColor = THEME.colorFgWarning;
                        attrs.icon = pkg.FA_WARNING;
                        attrs.showCloseButton = true;
                        attrs.closeOnly = true;
                        break;
                    case 'info':
                        break;
                }
                growlManager.addSimpleGrowl('<b>' + (title || '') + '</b><br>' + (msg || ''), attrs);
            },
            
            // Dialogs
            getDialog: memoize(() => {
                const dialog = new Dialog(pkg.app);
                dialog.content.setOverflow('hidden');
                return dialog;
            }),
            showConfirmDialog: (msg, title, confirmTxt, confirmFunc, cancelFunc, closeFunc) => {
                pkg.getDialog().showConfirm(
                    msg,
                    action => {
                        switch (action) {
                            case 'confirmBtn':
                                confirmFunc?.();
                                break;
                            case 'cancelBtn':
                                cancelFunc?.();
                                break;
                            case 'closeBtn':
                                closeFunc?.();
                                break;
                        }
                    },{
                        width:350,
                        titleText:title || ' ',
                        confirmTxt:confirmTxt
                    }
                );
            },
            showDeleteDialog: (msg, title, confirmFunc, cancelFunc, closeFunc) => {
                pkg.showConfirmDialog(msg, title, I18N('delete'), confirmFunc, cancelFunc, closeFunc);
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
            FA_GLOBE:              makeTagFunc(['globe']),
            FA_HELP:               makeTagFunc(['question-circle']),
            FA_LOGIN:              makeTagFunc(['sign-in-alt']),
            FA_LOGOUT:             makeTagFunc(['sign-out-alt']),
            FA_MINUS:              makeTagFunc(['minus']),
            FA_MINUS_SQUARE:       makeTagFunc(['minus-square']),
            FA_PLUG:               makeTagFunc(['plug']),
            FA_PLUS:               makeTagFunc(['plus']),
            FA_PLUS_SQUARE:        makeTagFunc(['plus-square']),
            FA_READY:              makeTagFunc(['thumbs-up']),
            FA_SAVE:               makeTagFunc(['save']),
            FA_SEARCH:             makeTagFunc(['search']),
            FA_SUCCESS:            makeTagFunc(['smile']),
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
                colorBgF:'#fff',
                
                colorBgError:'#fcc',
                
                borderInput:[1, 'solid', '#ccc']
            },
            
            cfg:{
                
            },
            
            elements:{
                
            }
        };
    
    registerValidator(new RegexValidator('passwordStrength', '(?=^.{7,}$)', I18N('err-passwordStrength')));
    
    // Fixup look of default myt dialogs
    const THEME = pkg.theme;
    Dialog.RADIUS = THEME.cornerRadius;
    Dialog.BGCOLOR = THEME.colorBgF;
    Dialog.BORDER = null;
    
    ModalPanel.PADDING_Y = ModalPanel.MARGIN_LEFT = ModalPanel.MARGIN_TOP = THEME.padding;
    
    return pkg;
})();
