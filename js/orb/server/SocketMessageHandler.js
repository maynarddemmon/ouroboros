const {maxCharactersPerUser} = require('./orb.js'),
    characterService = require('./CharacterService.js'),
    worldClock = require('./WorldClock.js'),
    greek = require('../common/SocketProtocol.js'),
    
    {
        TYPE_LOBBY, TYPE_CREATE_CHARACTER, TYPE_DELETE_CHARACTER,
        TYPE_ENTER_WORLD, TYPE_EXIT_WORLD
    } = greek,
    
    doEventNextHandler = (username, type, msg) => {
        worldClock.doEventNext({_uid:username, type:type, msg:msg});
    },
    
    HANDLERS = {
        [TYPE_LOBBY]: (username, type, msg) => {
            const msgObj = {
                characters:characterService.getCharactersByUserId(username),
                maxCharacters:maxCharactersPerUser,
                worldClockTick:worldClock.getTick()
            };
            return {type:type, msg:msgObj};
        },
        
        [TYPE_CREATE_CHARACTER]: (username, type, msg) => {
            const {success, message, character} = characterService.createCharacter(username, msg),
                msgObj = {success:success, message:message};
            if (success) msgObj.character = character;
            return {type:type, msg:msgObj};
        },
        
        [TYPE_DELETE_CHARACTER]: (username, type, msg) => {
            const {success, message, id} = characterService.deleteCharacter(username, msg.id),
                msgObj = {success:success, message:message};
            if (success) msgObj.id = id;
            return {type:type, msg:msgObj};
        },
        
        [TYPE_ENTER_WORLD]:doEventNextHandler,
        [TYPE_EXIT_WORLD]:doEventNextHandler,
    };

module.exports = {
    handleMessage: scope => {
        const {account, data:{time, type, msg}} = scope,
            response = HANDLERS[type](account.username, type, msg);
        
        if (response) {
            try {
                account.websocket.send(JSON.stringify(response));
            } catch (err) {
                console.error('Failed to send response', type, response, err);
            }
        }
    }
};