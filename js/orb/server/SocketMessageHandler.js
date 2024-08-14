const {maxCharactersPerUser} = require('./orb.js'),
    characterService = require('./CharacterService.js'),
    {doEventNext, doEventNow, getTick, getNow} = require('./WorldClock.js'),
    {
        TYPE_LOBBY, TYPE_CREATE_CHARACTER, TYPE_DELETE_CHARACTER,
        TYPE_ENTER_WORLD, TYPE_EXIT_WORLD,
        TYPE_MOVE, TYPE_ALTER_CELL,
        ATTR_TIME
    } = require('../common/SocketProtocol.js'),
    
    doEventNextHandler = (username, type, msg) => {
        doEventNext({_uid:username, type:type, msg:msg});
    },
    doEventNowHandler = (username, type, msg) => {
        doEventNow({_uid:username, type:type, msg:msg});
    },
    
    HANDLERS = {
        [TYPE_LOBBY]: (username, type, msg) => {
            const msgObj = {
                characters:characterService.getCharactersByUserId(username),
                maxCharacters:maxCharactersPerUser,
                worldClockTick:getTick()
            };
            return {type:type, msg:msgObj, [ATTR_TIME]:getNow()};
        },
        
        [TYPE_CREATE_CHARACTER]: (username, type, msg) => {
            const {success, message, character} = characterService.createCharacter(username, msg),
                msgObj = {success:success, message:message};
            if (success) msgObj.character = character;
            return {type:type, msg:msgObj, [ATTR_TIME]:getNow()};
        },
        
        [TYPE_DELETE_CHARACTER]: (username, type, msg) => {
            const {success, message, id} = characterService.deleteCharacter(username, msg.id),
                msgObj = {success:success, message:message};
            if (success) msgObj.id = id;
            return {type:type, msg:msgObj, [ATTR_TIME]:getNow()};
        },
        
        [TYPE_ENTER_WORLD]:doEventNextHandler,
        [TYPE_EXIT_WORLD]:doEventNextHandler,
        [TYPE_MOVE]:doEventNowHandler,
        [TYPE_ALTER_CELL]:doEventNowHandler,
    };

module.exports = {
    handleMessage: scope => {
        const {account, data:{time, type, msg}} = scope,
            handler = HANDLERS[type];
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
    }
};