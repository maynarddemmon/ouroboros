const orb = require('./orb.js'),
    accountService = require('./AccountService.js'),
    characterService = require('./CharacterService.js'),
    worldMap = require('./WorldMap.js'),
    {
        ATTR_TIME, ATTR_DIRECTION,
        
        TYPE_WARNING, TYPE_ERROR, TYPE_SERVERINFO, TYPE_ENTER_WORLD, TYPE_EXIT_WORLD,
        TYPE_MAP_DATA,
        TYPE_MOVE, TYPE_MOVE_FAILED, MOVE_ERROR_CODES,
        TYPE_ACTION_FAILED, ACTION_ERROR_CODES,
        TYPE_REACT_FAILED, REACT_ERROR_CODES,
        TYPE_CHANGE_FACING, TYPE_ALTER_CELL, TYPE_FREE_FAILED, FREE_ERROR_CODES,
        TYPE_ALTER_CHARACTER
    } = require('../common/SocketProtocol.js'),
    {
        entity:{FIELD_FACING},
        character:{
            FIELD_IN_WORLD, FIELD_PERMISSIONS, FIELD_LOC,
            FIELD_LOCK_MOVE, FIELD_LOCK_ACTION, FIELD_LOCK_REACT, FIELD_LOCK_FREE
        },
        permissions:{PERM_CREATOR}
    } = require('../common/common.js'),
    
    {locArrToId, locIdToArr, isValidLocArr} = require('../common/util.js'),
    
    warningMessageToUser = (username, msg, extraInfo) => {
        console.warn(msg, extraInfo);
        accountService.addMessageToUser(username, {type:TYPE_WARNING, msg:msg});
    },
    
    errorMessageToUser = (username, msg) => {
        console.warn(msg);
        accountService.addMessageToUser(username, {type:TYPE_ERROR, msg:msg});
    },
    
    infoMessageToUser = (username, msg) => {
        accountService.addMessageToUser(username, {type:TYPE_SERVERINFO, msg:msg});
    },
    
    verifyUserIdHasAccount = event => {
        const userId = event._uid,
            account = accountService.getAccountByUsername(userId);
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
                character = characterService.getCharacterById(characterId);
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
                    accountService.addMessageToUser(username, {type:TYPE_ALTER_CHARACTER, msg:{
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
                    usersCharacters = characterService.getCharactersByUserId(username);
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
                    accountService.addMessageToUser(username, {type:TYPE_ENTER_WORLD, msg:{character:character}});
                    accountService.addMessageToUser(username, {type:TYPE_MAP_DATA, msg:worldMap.getMapDataForCharacter(character)});
                    
                    worldMap.clearListenersForCharacter(character);
                    const newCell = worldMap.getCellByLocArr(character.getLocArr());
                    if (newCell) {
                        worldMap.updateListenersForCharacter(character, newCell);
                    } else {
                        // FIXME: respawn?
                        warningMessageToUser(username, "You're nowhere, and that's not so great :(", character);
                    }
                } else {
                    warningMessageToUser(username, 'Character not found for ' + characterId);
                }
            }
        },
        
        [TYPE_EXIT_WORLD]:event => {
            const username = verifyUserIdHasAccount(event);
            if (username) {
                const characterId = event.msg.id,
                    usersCharacters = characterService.getCharactersByUserId(username);
                let character,
                    i = usersCharacters.length;
                while (i) {
                    const usersCharacter = usersCharacters[--i];
                    if (usersCharacter.id === characterId) {
                        if (!characterService.doCharacterExitWorld(usersCharacter)) {
                            warningMessageToUser(username, 'Character already not in world ' + characterId);
                        }
                        character = usersCharacter;
                        break;
                    }
                }
                
                if (character) {
                    worldMap.clearListenersForCharacter(character);
                    accountService.addMessageToUser(username, {type:TYPE_EXIT_WORLD, msg:{character:character}});
                } else {
                    warningMessageToUser(username, 'Character not found for ' + characterId);
                }
            }
        },
        
        [TYPE_MOVE]:event => {
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
                                    accountService.addMessageToUser(username, {type:TYPE_MOVE_FAILED, code:MOVE_ERROR_CODES.INVALID_LOCATION});
                                    return;
                                }
                            }
                    }
                    
                    // Determine if the new location will allow the character
                    const locId = locArrToId(locArr),
                        cell = worldMap.getCell(locId, true);
                    if (cell.mayMoveInto(character)) {
                        // Apply Change to Character
                        character.set(FIELD_LOC, locArr);
                        
                        // Send movement change
                        accountService.addMessageToUser(username, {type:TYPE_ALTER_CHARACTER, msg:{
                            id:character.id, p:FIELD_LOC, v:locArr
                        }});
                    } else {
                        accountService.addMessageToUser(username, {type:TYPE_MOVE_FAILED, code:MOVE_ERROR_CODES.LOCATION_NOT_ALLOWED});
                    }
                }
            );
        },
        
        [TYPE_ALTER_CELL]:event => {
            performAction(
                event, FIELD_LOCK_FREE, 'getFreeActionSpeed',
                (username, character, now) => {
                    if (character.hasPermission(PERM_CREATOR)) {
                        const locArr = character.getLocArr(true),
                            {prop, value, direction} = event.msg;
                        
                        // FIXME: need character facing to calculate direction correctly
                        /*switch (direction) {
                            case 'here': break;
                        }*/
                        
                        // Get Cell and alter it
                        worldMap.getCell(locArrToId(locArr), true).set(prop, value);
                    } else {
                        accountService.addMessageToUser(username, {type:TYPE_FREE_FAILED, code:FREE_ERROR_CODES.FREE_NOT_ALLOWED});
                    }
                }
            );
        },
        
        [TYPE_CHANGE_FACING]:event => {
            performAction(
                event, FIELD_LOCK_FREE, 'getFreeActionSpeed',
                (username, character, now) => {
                    const compassDirection = event.msg[ATTR_DIRECTION];
                    if (compassDirection) {
                        character.set(FIELD_FACING, compassDirection);
                        
                        // Send movement change
                        accountService.addMessageToUser(username, {type:TYPE_ALTER_CHARACTER, msg:{
                            id:character.id, p:FIELD_FACING, v:compassDirection
                        }});
                    } else {
                        accountService.addMessageToUser(username, {type:TYPE_FREE_FAILED, code:FREE_ERROR_CODES.INVALID_VALUE});
                    }
                }
            );
        },
    };