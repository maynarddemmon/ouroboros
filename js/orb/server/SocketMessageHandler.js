const {JS, tym} = require('../../../lib/tym.js'),
    orb = require('./orb.js'),
    characterService = require('./CharacterService.js'),
    greek = require('../common/SocketProtocol.js'),
    
    lobby = (username, msg) => {
        return {
            type:'lobby', 
            msg:{
                characters:characterService.getCharactersByUserId(username),
                maxCharacters:orb.maxCharactersPerUser
            }
        };
    },
    
    createCharacter = (username, msg) => {
        const {success, message, character} = characterService.createCharacter(username, msg),
            response = {
                type:'createCharacter',
                msg:{
                    success:success,
                    message:message
                }
            };
        if (success) response.msg.character = character;
        return response;
    },
    
    deleteCharacter = (username, msg) => {
        const {success, message, id} = characterService.deleteCharacter(username, msg.id),
            response = {
                type:'deleteCharacter',
                msg:{
                    success:success,
                    message:message
                }
            };
        if (success) response.msg.id = id;
        return response;
    };

module.exports = {
    handleMessage: scope => {
        const {
                account:{username, websocket}, 
                data:{time, type, msg}
            } = scope;
        
        let response;
        switch (type) {
            case 'lobby':           response = lobby(username, msg); break;
            case 'createCharacter': response = createCharacter(username, msg); break;
            case 'deleteCharacter': response = deleteCharacter(username, msg); break;
        }
        
        if (response) {
            try {
                websocket.send(JSON.stringify(response));
            } catch (err) {
                console.error('Failed to send response', response, err);
            }
        }
    }
};