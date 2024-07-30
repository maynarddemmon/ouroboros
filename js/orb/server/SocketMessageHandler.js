const {JS, tym} = require('../../../lib/tym.js'),
    orb = require('./orb.js'),
    characterService = require('./CharacterService.js');

module.exports = {
    handleMessage: scope => {
        const {
            account, 
            data:{time, type, msg}
        } = scope;;
        
        let response;
        
        switch (type) {
            case 'lobby':
                response = {
                    type:'lobby', 
                    msg:{
                        characters:characterService.getCharactersByUserId(account),
                        maxCharacters:orb.maxCharactersPerUser
                    }
                };
                break;
            case 'createCharacter':
                break;
            case 'deleteCharacter':
                break;
        }
        
        if (response) {
            try {
                account.websocket.send(JSON.stringify(response));
            } catch (err) {
                console.error('Failed to send response', response, err);
            }
        }
    }
};