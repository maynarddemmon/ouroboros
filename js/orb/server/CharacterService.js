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
        const {id, name, userId} = character,
            existingCharacters = getCharactersByUserId(userId);
        
        if (existingCharacters.length + 1 > orb.maxCharactersPerUser) {
            console.warn('Max character limit exceeded for user:', userId);
            return false;
        }
        
        charactersById[id] = charactersByName[name] = character;
        existingCharacters.push(character);
        return true;
    },
    
    /** Makes an empty character object with nulls and/or default values. */
    makeEmptyCharacter = () => {
        return {
            id:null,
            userId:null,
            name:''
        };
    },
    
    makeCharacterObject = (id, userId, data, retval) => {
        const character = makeEmptyCharacter(),
            name = data.name;
        character.id = id;
        character.userId = userId;
        character.name = name;
        
        if (storeCharacterInRepo(character)) {
            return character;
        } else {
            retval.message = 'Character creation failed because account limit would be exceeded.';
            return null;
        }
    },
    
    getCharacterById = id => charactersById[id],
    getCharacterByName = name => charactersByName[name],
    getCharactersByUserId = userId => {
        // Accept account objects as well.
        if (typeof userId === 'object') userId = userId.username;
        
        return charactersByUserId[userId] || (charactersByUserId[userId] = []);
    },
    
    saveCharactersOnShutdown = () => {
        orb.saveDataToFile(FILENAME_CHARACTERS, Object.values(charactersById));
    },
    
    restoreCharactersOnStartup = () => {
        const jsonData = orb.readDataFile(FILENAME_CHARACTERS);
        if (jsonData) {
            let count = 0;
            for (const datum of jsonData) {
                const {id, userId, name} = datum;
                if (id && userId && name) {
                    const character = makeEmptyCharacter();
                    character.id = id;
                    character.userId = userId;
                    character.name = name;
                    if (storeCharacterInRepo(character)) count++;
                } else {
                    console.error('  Failed to restore character: ', datum);
                }
            }
            console.log('  Restored ' + count + ' character(s).');
        }
    };

module.exports = {
    getCharacterById:getCharacterById,
    getCharacterByName:getCharacterByName,
    getCharactersByUserId:getCharactersByUserId,
    
    createCharacter: (id, userId, data) => {
        const retval = {success:false};
        if (!id) {
            retval.message = 'No id provided.';
        } else if (!userId) {
            retval.message = 'No userId provided.';
        } else if (getCharacterById(id)) {
            retval.message = 'Character already exists.';
        } else if (getCharacterByName(data.name)) {
            retval.message = 'Character name already exists.';
        } else {
            const character = makeCharacterObject(id, userId, data, retval);
            if (character) {
                retval.message = 'Character created successfully.';
                retval.success = true;
            }
        }
        return retval;
    },
    
    startup: callback => {
        console.log('Restoring Characters...');
        restoreCharactersOnStartup();
        callback?.(true);
    },
    
    shutdown: callback => {
        console.log('Save Characters');
        saveCharactersOnShutdown();
        callback?.(true);
    }
};