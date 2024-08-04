const {maxCharactersPerUser} = require('./orb.js'),
    characterService = require('./CharacterService.js'),
    worldClock = require('./WorldClock.js'),
    greek = require('../common/SocketProtocol.js'),
    
    {
        TYPE_LOBBY, TYPE_CREATE_CHARACTER, TYPE_DELETE_CHARACTER,
        TYPE_ENTER_WORLD, TYPE_EXIT_WORLD
    } = greek,
    
    HANDLERS = {
        [TYPE_LOBBY]: (username, msg) => {
            const msgObj = {
                characters:characterService.getCharactersByUserId(username),
                maxCharacters:maxCharactersPerUser,
                worldClockTick:worldClock.getTick()
            };
            return {type:TYPE_LOBBY, msg:msgObj};
        },
        
        [TYPE_CREATE_CHARACTER]: (username, msg) => {
            const {success, message, character} = characterService.createCharacter(username, msg),
                msgObj = {success:success, message:message};
            if (success) msgObj.character = character;
            return {type:TYPE_CREATE_CHARACTER, msg:msgObj};
        },
        
        [TYPE_DELETE_CHARACTER]: (username, msg) => {
            const {success, message, id} = characterService.deleteCharacter(username, msg.id),
                msgObj = {success:success, message:message};
            if (success) msgObj.id = id;
            return {type:TYPE_DELETE_CHARACTER, msg:msgObj};
        }
    };

module.exports = {
    handleMessage: scope => {
        const {
                account:{username, websocket}, 
                data:{time, type, msg}
            } = scope,
            response = HANDLERS[type](username, msg);
        
        if (response) {
            try {
                websocket.send(JSON.stringify(response));
            } catch (err) {
                console.error('Failed to send response', type, response, err);
            }
        }
    }
};