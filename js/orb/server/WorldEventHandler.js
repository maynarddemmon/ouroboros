const orb = require('./orb.js'),
    {getAccountByUsername, addMessageToUser} = require('./AccountService.js'),
    {getCharactersByUserId, getCharacterById, doCharacterExitWorld} = require('./CharacterService.js'),
    {
        getCell, setCell, makeCell, 
        getCellDataForCharacter, getMapDataForCharacter
    } = require('./WorldMap.js'),
    {
        TYPE_WARNING, TYPE_ERROR, TYPE_SERVERINFO, TYPE_ENTER_WORLD, TYPE_EXIT_WORLD,
        TYPE_MAP_DATA, TYPE_CELL_DATA,
        TYPE_ACTION_MOVE,
        TYPE_ALTER_CELL, TYPE_ALTER_CHARACTER,
        ATTR_TIME
    } = require('../common/SocketProtocol.js'),
    {
        character:{
            FIELD_IN_WORLD, FIELD_PERMISSIONS, FIELD_LOC,
            FIELD_LOCK_MOVE, FIELD_LOCK_ACTION, FIELD_LOCK_REACT, FIELD_LOCK_FREE
        },
        permissions:{PERM_CREATOR}
    } = require('../common/common.js'),
    
    {locArrToId, locIdToArr, isValidLocArr} = require('../common/util.js'),
    
    warningMessageToUser = (username, msg) => {
        console.warn(msg);
        addMessageToUser(username, {type:TYPE_WARNING, msg:msg});
    },
    
    errorMessageToUser = (username, msg) => {
        console.warn(msg);
        addMessageToUser(username, {type:TYPE_ERROR, msg:msg});
    },
    
    infoMessageToUser = (username, msg) => {
        console.warn(msg);
        addMessageToUser(username, {type:TYPE_SERVERINFO, msg:msg});
    },
    
    verifyUserIdHasAccount = event => {
        const userId = event._uid,
            account = getAccountByUsername(userId);
        if (account) {
            return userId;
        } else {
            errorMessageToUser(userId, 'Account not found for ' + userId);
            return null;
        }
    },
    
    performAction = (event, lockProperty, cooldownFuncName, actionFunc) => {
        const username = verifyUserIdHasAccount(event);
        if (username) {
            const characterId = event.msg.id,
                character = getCharacterById(characterId);
            if (character) {
                if (character.getUserId() === username) {
                    const now = event[ATTR_TIME];
                    let curLockValue = character.get(lockProperty);
                    if (now >= curLockValue) {
                        curLockValue = now + character[cooldownFuncName]();
                        character.set(lockProperty, curLockValue);
                        actionFunc(username, character, now);
                    }
                    
                    // Always send the cooldown to the user since it has either
                    // been updated or the value the client had was stale.
                    addMessageToUser(username, {type:TYPE_ALTER_CHARACTER, msg:{
                        id:characterId, p:lockProperty, v:curLockValue
                    }});
                } else {
                    warningMessageToUser(username, 'Character not found in your account ' + characterId);
                }
            } else {
                warningMessageToUser(username, 'Character not found for ' + characterId);
            }
        }
    },
    
    worldEventHandler = module.exports = {
        /** Find the character for the user and mark it as "isInWorld". Mark all other characters
            for the user as not "isInWorld". */
        [TYPE_ENTER_WORLD]:event => {
            const username = verifyUserIdHasAccount(event);
            if (username) {
                const characterId = event.msg.id,
                    usersCharacters = getCharactersByUserId(username);
                let character,
                    i = usersCharacters.length;
                while (i) {
                    const usersCharacter = usersCharacters[--i];
                    if (usersCharacter.id === characterId) {
                        if (usersCharacter.isInWorld()) {
                            //warningMessageToUser(username, 'Character already in world ' + characterId);
                        } else {
                            usersCharacter.set(FIELD_IN_WORLD, true);
                        }
                        character = usersCharacter;
                    } else {
                        usersCharacter.set(FIELD_IN_WORLD, false);
                    }
                }
                
                if (character) {
                    addMessageToUser(username, {type:TYPE_ENTER_WORLD, msg:{character:character}});
                    addMessageToUser(username, {type:TYPE_MAP_DATA, msg:getMapDataForCharacter(character)});
                    addMessageToUser(username, {type:TYPE_CELL_DATA, msg:getCellDataForCharacter(character)});
                } else {
                    warningMessageToUser(username, 'Character not found for ' + characterId);
                }
            }
        },
        
        [TYPE_EXIT_WORLD]:event => {
            const username = verifyUserIdHasAccount(event);
            if (username) {
                const characterId = event.msg.id,
                    usersCharacters = getCharactersByUserId(username);
                let character,
                    i = usersCharacters.length;
                while (i) {
                    const usersCharacter = usersCharacters[--i];
                    if (usersCharacter.id === characterId) {
                        if (!doCharacterExitWorld(usersCharacter)) {
                            warningMessageToUser(username, 'Character already not in world ' + characterId);
                        }
                        character = usersCharacter;
                        break;
                    }
                }
                
                if (character) {
                    addMessageToUser(username, {type:TYPE_EXIT_WORLD, msg:{character:character}});
                } else {
                    warningMessageToUser(username, 'Character not found for ' + characterId);
                }
            }
        },
        
        [TYPE_ACTION_MOVE]:event => {
            performAction(
                event, FIELD_LOCK_MOVE, 'getMoveSpeed', 
                (username, character, now) => {
                    let locArr = character.getLocArr(true);
                    
                    // Calculate desired new location
                    // FIXME: need character facing to calculate move correctly
                    const direction = event.msg.direction;
                    switch (direction) {
                        case 'forward': locArr[2] -= 1; break;
                        case 'back': locArr[2] += 1; break;
                        case 'left': locArr[1] -= 1; break;
                        case 'right': locArr[1] += 1; break;
                        default:
                            // Treat the direction as a locId
                            if (character.hasPermission(PERM_CREATOR)) {
                                locArr = locIdToArr(direction);
                                if (!isValidLocArr(locArr)) {
                                    infoMessageToUser(username, 'Movement to invalid location not allowed.');
                                    return;
                                }
                            }
                    }
                    
                    // Determine if the new location will allow the character
                    const locId = locArrToId(locArr),
                        cell = getCell(locId, true);
                    if (cell.mayMoveInto(character)) {
                        // Apply Change to Character
                        character.set(FIELD_LOC, locArr);
                        
                        // Send movement change
                        addMessageToUser(username, {type:TYPE_ALTER_CHARACTER, msg:{
                            id:character.id, p:FIELD_LOC, v:locArr
                        }});
                        
                        // Send new cell data
                        addMessageToUser(username, {type:TYPE_CELL_DATA, msg:getCellDataForCharacter(character)});
                        
                        // FIXME: how to notify all other characters that can sense this character
                    } else {
                        infoMessageToUser(username, 'Movement to that location not allowed.');
                    }
                }
            );
        },
        
        [TYPE_ALTER_CELL]:event => {
            performAction(
                event, FIELD_LOCK_FREE, 'getFreeActionSpeed',
                (username, character, now) => {
                    const locArr = character.getLocArr(); // FIXME: get copy
                    
                    // FIXME: need character facing to calculate move correctly
                    switch (event.msg.direction) {
                        case 'here':
                            break;
                    }
                    
                    // Get Cell and alter it
                    const locId = locArrToId(locArr),
                        cell = getCell(locId, false),
                        {prop, value} = event.msg;
                    if (cell) {
                        cell.set(prop, value);
                    } else {
                        const newCell = makeCell();
                        newCell.set(prop, value);
                        setCell(locId, newCell);
                    }
                    
                    // Send new cell data
                    addMessageToUser(username, {type:TYPE_CELL_DATA, msg:getCellDataForCharacter(character)});
                    
                    // FIXME: how to notify all other characters that can sense this character
                }
            );
        },
    };