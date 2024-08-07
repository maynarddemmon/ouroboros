const orb = require('./orb.js'),
    {
        character:{
            FIELD_ID, FIELD_NAME, FIELD_USER_ID, FIELD_IS_IN_WORLD, FIELD_IS_ZOMBIE, FIELD_LOCK_MOVEMENT, 
            FIELD_LOC, FIELD_MOVEMENT_SPEED
        }
    } = require('../common/common.js'),
    
    FILENAME_CHARACTERS = 'characters',
    
    // An object holding all characters by object id
    charactersById = {},
    
    // An object holding all characters by character name. Useful to verify a character name is
    // available. We could use charactersById but we might want to rename a character under some
    // circumstance and this makes that possible.
    charactersByName = {},
    
    // An object of arrays of characters by userId. Useful to quickly manage characters for
    // a single user.
    charactersByUserId = {},
    
    storeCharacterInRepo = character => {
        // Zombie characters are no longer managed by the User with their userId.
        if (!character[FIELD_IS_ZOMBIE]) {
            const userId = character[FIELD_USER_ID],
                existingCharacters = getCharactersByUserId(userId);
            if (existingCharacters.length + 1 > orb.maxCharactersPerUser) {
                console.warn('Max character limit exceeded for user:', userId);
                return false;
            }
            existingCharacters.push(character);
        }
        
        charactersById[character[FIELD_ID]] = charactersByName[character[FIELD_NAME]] = character;
        return true;
    },
    
    removeCharacterFromRepo = character => {
        const id = character[FIELD_ID],
            existingCharacters = getCharactersByUserId(character[FIELD_USER_ID]);
        let i = existingCharacters.length;
        while (i) {
            const existingCharacter = existingCharacters[--i];
            if (existingCharacter[FIELD_ID] === id) {
                existingCharacters.splice(i, 1);
                break;
            }
        }
        delete charactersById[id];
        delete charactersByName[character[FIELD_NAME]];
        return true;
    },
    
    /** Makes an empty character object with nulls and/or default values. */
    makeEmptyCharacter = () => {
        return {
            [FIELD_ID]:null,
            [FIELD_USER_ID]:null,
            [FIELD_NAME]:'',
            [FIELD_IS_ZOMBIE]:false,
            [FIELD_IS_IN_WORLD]:false,
            [FIELD_LOC]:[0,0,0,0],
            [FIELD_LOCK_MOVEMENT]:0,
            [FIELD_MOVEMENT_SPEED]:3
        };
    },
    
    getCharacterById = id => charactersById[id],
    getCharacterByName = name => charactersByName[name],
    getCharactersByUserId = userId => {
        // Accept account objects as well.
        if (typeof userId === 'object') userId = userId.username;
        
        return charactersByUserId[userId] || (charactersByUserId[userId] = []);
    },
    
    doCharacterExitWorld = character => {
        if (character[FIELD_IS_IN_WORLD]) {
            character[FIELD_IS_IN_WORLD] = false;
            return true;
        } else {
            return false;
        }
    },
    
    saveCharactersOnShutdown = () => {
        orb.saveDataToFile(FILENAME_CHARACTERS, Object.values(charactersById));
    },
    
    restoreCharactersOnStartup = () => {
        const jsonData = orb.readDataFile(FILENAME_CHARACTERS);
        if (jsonData) {
            let count = 0;
            for (const datum of jsonData) {
                const userId = datum[FIELD_USER_ID],
                    name = datum[FIELD_NAME],
                    id = datum[FIELD_ID];
                if (id && userId && name) {
                    const character = makeEmptyCharacter();
                    character[FIELD_ID] = id;
                    character[FIELD_USER_ID] = userId;
                    character[FIELD_NAME] = name;
                    character[FIELD_IS_ZOMBIE] = datum[FIELD_IS_ZOMBIE] || false;
                    character[FIELD_IS_IN_WORLD] = datum[FIELD_IS_IN_WORLD] || false;
                    character[FIELD_LOC] = datum[FIELD_LOC];
                    character[FIELD_LOCK_MOVEMENT] = datum[FIELD_LOCK_MOVEMENT] ?? 0;
                    character[FIELD_MOVEMENT_SPEED] = datum[FIELD_MOVEMENT_SPEED] ?? 3;
                    if (storeCharacterInRepo(character)) count++;
                } else {
                    console.error('  Failed to restore character: ', datum);
                }
            }
            console.log('  Restored ' + count + ' character(s).');
        }
    },
    
    live = (resolve, reject) => {
        console.log('Restoring Characters...');
        restoreCharactersOnStartup();
        resolve();
    },
    
    die = (resolve, reject) => {
        console.log('Save Characters');
        
        // Force exit all in world characters
        for (const id in charactersById) {
            doCharacterExitWorld(charactersById[id]);
        }
        
        saveCharactersOnShutdown();
        resolve();
    };

module.exports = {
    lifeCycle: isBirth => new Promise((resolve, reject) => {
        if (isBirth) {
            live(resolve, reject);
        } else {
            die(resolve, reject);
        }
    }),
    
    getCharacterById:getCharacterById,
    getCharacterByName:getCharacterByName,
    getCharactersByUserId:getCharactersByUserId,
    
    doCharacterExitWorld:doCharacterExitWorld,
    
    createCharacter: (userId, data) => {
        const name = data[FIELD_NAME],
            retval = {success:false};
        if (!userId) {
            retval.message = 'No userId provided.';
        } else if (getCharacterByName(name)) {
            retval.message = 'Character name already exists.';
        } else {
            const character = makeEmptyCharacter();
            character[FIELD_ID] = orb.getGuidString('c');
            character[FIELD_USER_ID] = userId;
            character[FIELD_NAME] = name;
            character[FIELD_LOC] = [0,2,2,0];
            
            if (storeCharacterInRepo(character)) {
                retval.message = 'Character created successfully.';
                retval.character = character;
                retval.success = true;
            } else {
                retval.message = 'Character creation failed because account limit would be exceeded.';
            }
        }
        return retval;
    },
    
    deleteCharacter: (userId, id) => {
        const retval = {success:false};
        if (!userId) {
            retval.message = 'No userId provided.';
        } else if (!id) {
            retval.message = 'No id provided.';
        } else {
            const character = getCharacterById(id);
            if (character) {
                if (character[FIELD_USER_ID] === userId) {
                    if (removeCharacterFromRepo(character)) {
                        retval.message = 'Character removed successfully.';
                        retval[FIELD_ID] = id;
                        retval.success = true;
                    } else {
                        retval.message = 'Character deletion failed.';
                    }
                } else {
                    retval.message = 'Character does not belong to the user.';
                }
            } else {
                retval.message = 'Character not found.';
            }
        }
        return retval;
    },
    
    convertAllCharactersToZombiesForAccount: userId => {
        const existingCharacters = getCharactersByUserId(userId);
        let i = existingCharacters.length;
        while (i) existingCharacters[--i][FIELD_IS_ZOMBIE] = true;
        return true;
    }
};