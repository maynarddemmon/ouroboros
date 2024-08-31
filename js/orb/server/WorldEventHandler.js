const orb = require('./orb.js'),
    
    {
        tym:{getRandom}
    } = require('../../../lib/tym.js'),
    
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
        TYPE_CHANGE_FACING, TYPE_VOCALIZE, TYPE_ALTER_CELL, TYPE_FREE_FAILED, FREE_ERROR_CODES,
        TYPE_ALTER_CHARACTER,
        TYPE_INTERACT_WITH_FIXTURE
    } = require('../common/SocketProtocol.js'),
    {
        facings:{NORTH, SOUTH, EAST, WEST, UP, DOWN, SELF},
        permissions:{PERM_CREATOR},
        locArrToId, locIdToArr, isValidLocArr
    } = require('../common/common.js'),
    
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
    
    performAction = (event, lockProperty, cooldownContext, actionFunc) => {
        const username = verifyUserIdHasAccount(event);
        if (username) {
            const characterId = event.msg.id,
                character = characterService.getCharacterById(characterId);
            if (character) {
                if (character.getUserId() === username) {
                    const now = event[ATTR_TIME];
                    
                    // lockProperty can be a function. If so, invoke it to determine the kind of lock.
                    lockProperty = typeof lockProperty === 'function' ? lockProperty(username, character, now) : lockProperty;
                    if (!lockProperty) return;
                    
                    let curLockValue = character.get(lockProperty);
                    if (now >= curLockValue) {
                        let cooldownFuncName;
                        switch (lockProperty) {
                            case 'lockAct': cooldownFuncName = 'getActionSpeed'; break;
                            case 'lockMove': cooldownFuncName = 'getMoveSpeed'; break;
                            case 'lockReact': cooldownFuncName = 'getReactSpeed'; break;
                            case 'lockFree': cooldownFuncName = 'getFreeActionSpeed'; break;
                        }
                        
                        const cooldownAmount = character[cooldownFuncName](cooldownContext),
                            fixedAmount = Math.floor(cooldownAmount),
                            randomChance = cooldownAmount - fixedAmount,
                            randomAmount = (randomChance > 0 && getRandom() < randomChance) ? 1 : 0;
                        curLockValue = now + fixedAmount + randomAmount;
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
                            usersCharacter.setInWorld(true);
                        }
                        character = usersCharacter;
                    } else {
                        usersCharacter.setInWorld(false);
                    }
                }
                
                if (character) {
                    accountService.addMessageToUser(username, {type:TYPE_ENTER_WORLD, msg:{character:character.getAsData()}});
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
                    accountService.addMessageToUser(username, {type:TYPE_EXIT_WORLD, msg:{character:character.getAsData()}});
                } else {
                    warningMessageToUser(username, 'Character not found for ' + characterId);
                }
            }
        },
        
        [TYPE_MOVE]:event => {
            const direction = event.msg.direction;
            performAction(
                event, 'lockMove', {direction:direction}, 
                (username, character, now) => {
                    let locArr = character.getLocArr(true);
                    switch (direction) {
                        case NORTH: locArr[2] -= 1; break;
                        case SOUTH: locArr[2] += 1; break;
                        case EAST: locArr[1] += 1; break;
                        case WEST: locArr[1] -= 1; break;
                        case UP: locArr[3] -= 1; break;
                        case DOWN: locArr[3] -= 1; break;
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
                    
                    character.doMove(locArr, direction);
                }
            );
        },
        
        [TYPE_ALTER_CELL]:event => {
            performAction(
                event, 'lockFree', null, 
                (username, character, now) => {
                    if (character.hasPermission(PERM_CREATOR)) {
                        const locArr = character.getLocArr(true),
                            {prop, value/*, direction*/} = event.msg,
                            cell = worldMap.getCell(locArrToId(locArr), true);
                        switch (prop) {
                            case SELF: 
                                cell.setC(value);
                                break;
                            case NORTH: case SOUTH: case EAST: case WEST: case UP: case DOWN:
                                if (value === 'unk') {
                                    // Clear the face
                                    cell.set(prop, null);
                                } else {
                                    const face = cell.get(prop);
                                    if (face) {
                                        // Update existing face
                                        face.setC(value);
                                    } else {
                                        // Make a new face
                                        cell.set(prop, {c:value});
                                    }
                                }
                                break;
                        }
                    } else {
                        accountService.addMessageToUser(username, {type:TYPE_FREE_FAILED, code:FREE_ERROR_CODES.FREE_NOT_ALLOWED});
                    }
                }
            );
        },
        
        [TYPE_CHANGE_FACING]:event => {
            performAction(
                event, 'lockFree', null, 
                (username, character, now) => {
                    const compassDirection = event.msg[ATTR_DIRECTION];
                    if (compassDirection) {
                        character.setFacing(compassDirection);
                    } else {
                        accountService.addMessageToUser(username, {type:TYPE_FREE_FAILED, code:FREE_ERROR_CODES.INVALID_VALUE});
                    }
                }
            );
        },
        
        [TYPE_VOCALIZE]:event => {
            performAction(
                event, 'lockFree', null, 
                (username, character, now) => {
                    const {volume, message} = event.msg;
                    if (volume && message) {
                        character.doVocalize(volume, message);
                    } else {
                        accountService.addMessageToUser(username, {type:TYPE_FREE_FAILED, code:FREE_ERROR_CODES.INVALID_VALUE});
                    }
                }
            );
        },
        
        [TYPE_INTERACT_WITH_FIXTURE]:event => {
            const {fixtureId, interactionName} = event.msg;
            let fixture,
                matchedInteractionName;
            performAction(
                event, 
                (username, character, now) => {
                    if (fixtureId && interactionName) {
                        // Get the interactions on the server side and lookup the requested
                        // fixtureId and interactionName within it.
                        const interactions = character.getCell().getInteractions(character);
                        for (const fixtureContainerKey in interactions) {
                            const fixtureContainerData = interactions[fixtureContainerKey];
                            if (fixtureContainerData) {
                                const interactionsArray = fixtureContainerData[fixtureId];
                                if (interactionsArray) {
                                    fixture = worldMap.getFixtureById(fixtureId);
                                    for (const iaName of interactionsArray) {
                                        if (iaName === interactionName) {
                                            matchedInteractionName = true;
                                            break;
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                        
                        if (fixture && matchedInteractionName) {
                            return fixture.getLockPropertyForInteraction(character, interactionName) ?? 'lockAct';
                        } else {
                            accountService.addMessageToUser(username, {type:TYPE_ACTION_FAILED, code:ACTION_ERROR_CODES.ACTION_NOT_ALLOWED});
                        }
                    } else {
                        accountService.addMessageToUser(username, {type:TYPE_ACTION_FAILED, code:ACTION_ERROR_CODES.INVALID_VALUE});
                    }
                }, 
                null, 
                (username, character, now) => {
                    const failureMsg = fixture.doInteractionForCharacter(character, interactionName);
                    if (failureMsg) accountService.addMessageToUser(username, {type:TYPE_ACTION_FAILED, msg:failureMsg});
                }
            );
        },
    };