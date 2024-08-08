const orb = require('./orb.js'),
    {getAccountByUsername, addMessageToUser} = require('./AccountService.js'),
    {getCharactersByUserId, getCharacterById, doCharacterExitWorld} = require('./CharacterService.js'),
    {
        getCellData, makeEmptyCell, setCellDatum, 
        getCellDataForCharacter, getMapDataForCharacter
    } = require('./WorldMap.js'),
    {
        TYPE_WARNING, TYPE_ERROR, TYPE_ENTER_WORLD, TYPE_EXIT_WORLD,
        TYPE_MAP_DATA, TYPE_CELL_DATA,
        TYPE_ACTION_MOVE, TYPE_RESULT_MOVE,
        TYPE_ALTER_CELL, TYPE_RESULT_ALTER_CELL, TYPE_ALTER_CHARACTER,
        ATTR_TIME
    } = require('../common/SocketProtocol.js'),
    {
        character:{
            FIELD_IS_IN_WORLD, FIELD_LOCK_MOVEMENT, FIELD_PERMISSIONS,
            FIELD_LOCK_ACTION
        }
    } = require('../common/common.js'),
    
    {locArrToId} = require('../common/util.js'),
    
    warningMessageToUser = (username, msg) => {
        console.warn(msg);
        addMessageToUser(username, {type:TYPE_WARNING, msg:msg});
    },
    
    errorMessageToUser = (username, msg) => {
        console.warn(msg);
        addMessageToUser(username, {type:TYPE_ERROR, msg:msg});
    },
    
    verifyUserIdHasAccount = event => {
        const userId = event._uid,
            account = getAccountByUsername(userId);
        if (account) {
            return userId;
        } else {
            errorMessageToUser(userId, 'Account not found for ', userId);
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
                    const now = event[ATTR_TIME],
                        curLockValue = character.get(lockProperty);
                    if (now >= curLockValue) { // FIXME: remove -5
                        const cooldown = character[cooldownFuncName](),
                            newLockAction = now + cooldown;
                        character.set(lockProperty, newLockAction);
                        actionFunc(username, character, now, newLockAction);
                    } else {
                        // Send the cooldown to the user since their's may be wrong.
                        addMessageToUser(username, {type:TYPE_ALTER_CHARACTER, msg:{
                            id:character.id, p:lockProperty, v:curLockValue
                        }, [ATTR_TIME]:now});
                    }
                } else {
                    warningMessageToUser(username, 'Character not found in your account ', characterId);
                }
            } else {
                warningMessageToUser(username, 'Character not found for ', characterId);
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
                            //warningMessageToUser(username, 'Character already in world ', characterId);
                        } else {
                            usersCharacter.set(FIELD_IS_IN_WORLD, true);
                        }
                        character = usersCharacter;
                    } else {
                        usersCharacter.set(FIELD_IS_IN_WORLD, false);
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
            }
        },
        
        [TYPE_ACTION_MOVE]:event => {
            performAction(
                event, FIELD_LOCK_MOVEMENT, 'getMovementSpeed', 
                (username, character, now, newLockAction) => {
                    const locArr = character.getLocArr();
                    
                    // FIXME: need character facing to calculate move correctly
                    switch (event.msg.direction) {
                        case 'forward': locArr[2] -= 1; break;
                        case 'back': locArr[2] += 1; break;
                        case 'left': locArr[1] -= 1; break;
                        case 'right': locArr[1] += 1; break;
                    }
                    
                    // Send movement change
                    addMessageToUser(username, {type:TYPE_RESULT_MOVE, msg:{
                        id:character.id,
                        newLoc:locArr,
                        [FIELD_LOCK_MOVEMENT]:newLockAction
                    }, [ATTR_TIME]:now});
                    
                    // Send new cell data
                    addMessageToUser(username, {type:TYPE_CELL_DATA, msg:getCellDataForCharacter(character), [ATTR_TIME]:now});
                    
                    // FIXME: how to notify all other characters that can sense this character
                }
            );
        },
        
        [TYPE_ALTER_CELL]:event => {
            performAction(
                event, FIELD_LOCK_ACTION, 'getFreeActionSpeed', // FIXME: lock free action
                (username, character, now, newLockAction) => {
                    const locArr = character.getLocArr(); // FIXME: get copy
                    
                    // FIXME: need character facing to calculate move correctly
                    switch (event.msg.direction) {
                        case 'here':
                            break;
                    }
                    
                    // Get Cell and alter it
                    const locId = locArrToId(locArr),
                        cell = getCellData(locId),
                        {prop, value} = event.msg;
                    if (cell) {
                        cell[prop] = value;
                    } else {
                        const newCell = makeEmptyCell();
                        newCell[prop] = value;
                        setCellDatum(locId, newCell);
                    }
                    
                    // Send Result
                    addMessageToUser(username, {type:TYPE_RESULT_ALTER_CELL, msg:{
                        id:character.id,
                        [FIELD_LOCK_ACTION]:newLockAction
                    }, [ATTR_TIME]:now});
                    
                    // Send new cell data
                    addMessageToUser(username, {type:TYPE_CELL_DATA, msg:getCellDataForCharacter(character), [ATTR_TIME]:now});
                    
                    // FIXME: how to notify all other characters that can sense this character
                }
            );
        },
    };