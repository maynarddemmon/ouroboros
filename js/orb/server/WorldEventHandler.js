const orb = require('./orb.js'),
    {getAccountByUsername, addMessageToUser} = require('./AccountService.js'),
    {getCharactersByUserId, doCharacterExitWorld} = require('./CharacterService.js'),
    {getCellDataForCharacter, getMapDataForCharacter} = require('./WorldMap.js'),
    {
        TYPE_WARNING, TYPE_ERROR, TYPE_ENTER_WORLD, TYPE_EXIT_WORLD,
        TYPE_MAP_DATA, TYPE_CELL_DATA,
        ATTR_TIME
    } = require('../common/SocketProtocol.js');
    
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
                    const time = event[ATTR_TIME];
                    addMessageToUser(username, {type:TYPE_ENTER_WORLD, msg:{character:character}, [ATTR_TIME]:time});
                    addMessageToUser(username, {type:TYPE_MAP_DATA, msg:getMapDataForCharacter(character), [ATTR_TIME]:time});
                    addMessageToUser(username, {type:TYPE_CELL_DATA, msg:getCellDataForCharacter(character), [ATTR_TIME]:time});
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
                        if (!doCharacterExitWorld(usersCharacter)) {
                            warningMessageToUser(username, 'Character already not in world ', characterId);
                        }
                        character = usersCharacter;
                        break;
                    }
                }
                
                if (character) {
                    addMessageToUser(username, {type:TYPE_EXIT_WORLD, msg:{character:character}, [ATTR_TIME]:event[ATTR_TIME]});
                } else {
                    warningMessageToUser(username, 'Character not found for ', characterId);
                }
            } else {
                errorMessageToUser(username, 'Account not found for ', username);
            }
        },
    };