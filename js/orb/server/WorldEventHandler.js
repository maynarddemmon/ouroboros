const orb = require('./orb.js'),
    {getAccountByUsername, addMessageToUser} = require('./AccountService.js'),
    {getCharactersByUserId, doCharacterExitWorld} = require('./CharacterService.js'),
    greek = require('../common/SocketProtocol.js'),
    
    {
        TYPE_WARNING, TYPE_ERROR, TYPE_ENTER_WORLD, TYPE_EXIT_WORLD
    } = greek;
    
    warningMessageToUser = (username, msg) => {
        console.warn(msg);
        addMessageToUser(username, {type:TYPE_WARNING, msg:msg});
    },
    
    errorMessageToUser = (username, msg) => {
        console.warn(msg);
        addMessageToUser(username, {type:TYPE_ERROR, msg:msg});
    },
    
    worldEventHandler = module.exports = {
        /** Find the character for the user and mark it as "isInWorld". Mark all other characters
            for the user as not "isInWorld". */
        [TYPE_ENTER_WORLD]:event => {
            const username = event._uid,
                account = getAccountByUsername(username);
            if (account) {
                const characterId = event.msg.id,
                    usersCharacters = getCharactersByUserId(username);
                let character,
                    i = usersCharacters.length;
                while (i) {
                    const usersCharacter = usersCharacters[--i];
                    if (usersCharacter.id === characterId) {
                        if (usersCharacter.isInWorld) {
                            warningMessageToUser(username, 'Character already in world ', characterId);
                        } else {
                            usersCharacter.isInWorld = true;
                        }
                        character = usersCharacter;
                    } else {
                        usersCharacter.isInWorld = false;
                    }
                }
                
                if (character) {
                    addMessageToUser(username, {type:TYPE_ENTER_WORLD, msg:{character:character}, _tt:event._tt});
                } else {
                    warningMessageToUser(username, 'Character not found for ', characterId);
                }
            } else {
                errorMessageToUser(username, 'Account not found for ', username);
            }
        },
        
        [TYPE_EXIT_WORLD]:event => {
            const username = event._uid,
                account = getAccountByUsername(username);
            if (account) {
                const characterId = event.msg.id,
                    usersCharacters = getCharactersByUserId(username);
                let character,
                    i = usersCharacters.length;
                while (i) {
                    const usersCharacter = usersCharacters[--i];
                    if (usersCharacter.id === characterId) {
                        if (!characterService.doCharacterExitWorld(usersCharacter)) {
                            warningMessageToUser(username, 'Character already not in world ', characterId);
                        }
                        character = usersCharacter;
                        break;
                    }
                }
                
                if (character) {
                    addMessageToUser(username, {type:TYPE_EXIT_WORLD, msg:{character:character}, _tt:event._tt});
                } else {
                    warningMessageToUser(username, 'Character not found for ', characterId);
                }
            } else {
                errorMessageToUser(username, 'Account not found for ', username);
            }
        },
    };