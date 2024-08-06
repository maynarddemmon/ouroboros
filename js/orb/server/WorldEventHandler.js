const orb = require('./orb.js'),
    {getAccountByUsername, addMessageToUser} = require('./AccountService.js'),
    {getCharactersByUserId, getCharacterById, doCharacterExitWorld} = require('./CharacterService.js'),
    {getCellDataForCharacter, getMapDataForCharacter} = require('./WorldMap.js'),
    {
        TYPE_WARNING, TYPE_ERROR, TYPE_ENTER_WORLD, TYPE_EXIT_WORLD,
        TYPE_MAP_DATA, TYPE_CELL_DATA,
        TYPE_ACTION_MOVE, TYPE_RESULT_MOVE,
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
                            //warningMessageToUser(username, 'Character already in world ', characterId);
                        } else {
                            usersCharacter.isInWorld = true;
                        }
                        character = usersCharacter;
                    } else {
                        usersCharacter.isInWorld = false;
                    }
                }
                
                if (character) {
                    const now = event[ATTR_TIME];
                    addMessageToUser(username, {type:TYPE_ENTER_WORLD, msg:{character:character}, [ATTR_TIME]:now});
                    addMessageToUser(username, {type:TYPE_MAP_DATA, msg:getMapDataForCharacter(character), [ATTR_TIME]:now});
                    addMessageToUser(username, {type:TYPE_CELL_DATA, msg:getCellDataForCharacter(character), [ATTR_TIME]:now});
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
        
        [TYPE_ACTION_MOVE]:event => {
            const username = event._uid,
                account = getAccountByUsername(username);
            if (account) {
                const characterId = event.msg.id,
                    character = getCharacterById(characterId);
                if (character) {
                    if (character.userId === username) {
                        const now = event[ATTR_TIME],
                            loc = character.loc;
                        character.lockMovement = now + character.movementSpeed;
                        
                        // FIXME: need character facing to calculate move correctly
                        switch (event.msg.direction) {
                            case 'forward':
                                loc[2] -= 1;
                                break;
                            case 'back':
                                loc[2] += 1;
                                break;
                            case 'left':
                                loc[1] -= 1;
                                break;
                            case 'right':
                                loc[1] += 1;
                                break;
                        }
                        
                        // Send movement change
                        addMessageToUser(username, {type:TYPE_RESULT_MOVE, msg:{
                            id:character.id,
                            newLoc:character.loc,
                            lockMovement:character.lockMovement
                        }, [ATTR_TIME]:now});
                        
                        // Send new cell data
                        addMessageToUser(username, {type:TYPE_CELL_DATA, msg:getCellDataForCharacter(character), [ATTR_TIME]:now});
                        
                        // FIXME: how to notify all other characters that can sense this character
                    } else {
                        warningMessageToUser(username, 'Character not found in your account ', characterId);
                    }
                } else {
                    warningMessageToUser(username, 'Character not found for ', characterId);
                }
            } else {
                errorMessageToUser(username, 'Account not found for ', username);
            }
        },
    };