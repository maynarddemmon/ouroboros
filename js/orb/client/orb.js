(global.BABEL = myt.I18N).setDictionary(LOCALE_JSON, LOCALE);

orb = (() => {
    let growlManager;
    
    const I18N = BABEL.get,
        
        M = myt,
        {
            View, Text, Dialog, ModalPanel, FontAwesome, 
            Validator, NumericRangeValidator, RegexValidator,
            memoize,
            global:{
                validators:{register:registerValidator}
            }
        } = M,
        makeTagFunc = FontAwesome.makeTag.bind(FontAwesome),
        
        pkg = {
            // Convienent References
            app:null,
            websocket:null,
            model:null,
            gamePanel:null,
            gameMap:null,
            
            authenticated:false,
            username:null,
            socketToken:null,
            socketUrl:null,
            
            // Growls
            growl: (type, title, msg) => {
                growlManager ??= new M.GrowlManager();
                
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
                        attrs.showCopyButton = true;
                        attrs.closeOnly = true;
                        break;
                    case 'warning':
                        attrs.textColor = THEME.colorFgWarning;
                        attrs.icon = pkg.FA_WARNING;
                        attrs.showCloseButton = true;
                        attrs.showCopyButton = true;
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
                            case 'confirmBtn': confirmFunc?.(); break;
                            case 'cancelBtn': cancelFunc?.(); break;
                            case 'closeBtn': closeFunc?.(); break;
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
            FA_CLOCK:              makeTagFunc(['clock']),
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
            FA_LOCATION:           makeTagFunc(['location-arrow']),
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
            
            FA_MOVE:               makeTagFunc(['walking']),
            FA_ACTION:             makeTagFunc(['fist-raised']),
            FA_REACT:              makeTagFunc(['sync']),
            FA_FREE_ACTION:        makeTagFunc(['comment']),
            FA_CHARACTER:          makeTagFunc(['user']),
            FA_INVENTORY:          makeTagFunc(['briefcase']),
            
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
                colorBgPanel:'#fff',
                colorBgMiddleComp:'#eee',
                colorBgInput:'#fff',
                colorBgF:'#fff',
                
                colorBgError:'#fcc',
                
                borderInput:[1, 'solid', '#ccc']
            },
            
            cfg:{
                // Map
                mapRangeOffset:9,
                cellSize:40,
                entitySizeM:15
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
