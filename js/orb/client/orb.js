(global.BABEL = myt.I18N).setDictionary(LOCALE_JSON, LOCALE);

orb = (() => {
    const I18N = BABEL.get,
        
        {
            FontAwesome, Validator, NumericRangeValidator, RegexValidator,
            global:{
                validators:{
                    register:registerValidator
                }
            }
        } = myt,
        makeTagFunc = FontAwesome.makeTag.bind(FontAwesome),
        
        pkg = {
            authenticated:false,
            username:null,
            socketToken:null,
            socketUrl:null,
            
            PANEL_ID_GAME:'game',
            PANEL_ID_AUTH:'auth',
            PANEL_ID_REG:'reg',
            
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
                padding:10,
                spacing:4,
                cornerRadius:3,
                
                headerHeight:48,
                footerHeight:48,
                
                inputHeight:28,
                
                fontSizeSmall:'12px',
                
                colorFgError:'#c00',
                colorFgWarning:'#f80',
                colorFgSuccess:'#090',
                
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
