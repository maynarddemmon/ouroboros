const orb = require('./orb.js'),
    
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
        const {id, name, userId, isZombie} = character;
        
        // Zombie characters are no longer managed by the User with their userId.
        if (!isZombie) {
            const existingCharacters = getCharactersByUserId(userId);
            if (existingCharacters.length + 1 > orb.maxCharactersPerUser) {
                console.warn('Max character limit exceeded for user:', userId);
                return false;
            }
            existingCharacters.push(character);
        }
        
        charactersById[id] = charactersByName[name] = character;
        return true;
    },
    
    removeCharacterFromRepo = character => {
        const {id, name, userId} = character,
            existingCharacters = getCharactersByUserId(userId);
        let i = existingCharacters.length;
        while (i) {
            const existingCharacter = existingCharacters[--i];
            if (existingCharacter.id === id) {
                existingCharacters.splice(i, 1);
                break;
            }
        }
        delete charactersById[id];
        delete charactersByName[name];
        return true;
    },
    
    /** Makes an empty character object with nulls and/or default values. */
    makeEmptyCharacter = () => {
        return {
            id:null,
            userId:null,
            name:'',
            isZombie:false,
            isInWorld:false
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
        if (character.isInWorld) {
            character.isInWorld = false;
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
                const {id, userId, name, isZombie, isInWorld} = datum;
                if (id && userId && name) {
                    const character = makeEmptyCharacter();
                    character.id = id;
                    character.userId = userId;
                    character.name = name;
                    character.isZombie = isZombie || false;
                    character.isInWorld = isInWorld || false;
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
        const name = data.name,
            retval = {success:false};
        if (!userId) {
            retval.message = 'No userId provided.';
        } else if (getCharacterByName(name)) {
            retval.message = 'Character name already exists.';
        } else {
            const character = makeEmptyCharacter();
            character.id = orb.getGuidString('c');
            character.userId = userId;
            character.name = name;
            
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
                if (character.userId === userId) {
                    if (removeCharacterFromRepo(character)) {
                        retval.message = 'Character removed successfully.';
                        retval.id = id;
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
        while (i) existingCharacters[--i].isZombie = true;
        return true;
    }
};