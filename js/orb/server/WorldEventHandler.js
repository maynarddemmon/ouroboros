const orb = require('./orb.js'),
    accountService = require('./AccountService.js'),
    characterService = require('./CharacterService.js'),
    greek = require('../common/SocketProtocol.js'),
    
    {
        TYPE_ENTER_WORLD, TYPE_EXIT_WORLD
    } = greek;
    
    worldEventHandler = module.exports = {
        [TYPE_ENTER_WORLD]:event => {
            console.log('Handle Enter World', event);
            
            const username = event._uid,
                account = accountService.getAccountByUsername(username);
            if (account) {
                const characterId = event.msg.id,
                    usersCharacters = characterService.getCharactersByUserId(username);
                let character,
                    i = usersCharacters.length;
                while (i) {
                    const usersCharacter = usersCharacters[--i];
                    if (usersCharacter.id === characterId) {
                        if (usersCharacter.isInWorld) {
                            console.info('Character already in world ', characterId);
                        } else {
                            usersCharacter.isInWorld = true;
                        }
                        character = usersCharacter;
                    } else {
                        usersCharacter.isInWorld = false;
                    }
                }
                
                if (character) {
                    console.log('SUCCESS');
                    // FIXME: send success to the client.
                } else {
                    console.warn('Character not found for ', characterId);
                    // FIXME: send an error to the client.
                }
            } else {
                console.warn('Account not found for ', username);
                // FIXME: send an error to the client.
            }
        },
        
        [TYPE_EXIT_WORLD]:event => {
            console.log('Handle Exit World', event);
            // FIXME: implement
        },
    };