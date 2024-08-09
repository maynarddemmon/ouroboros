const orb = require('./orb.js'),
    
    {
        JS, 
        tym:{
            Eventable,
            AccessorSupport:{generateSetterName}
        }
    } = require('../../../lib/tym.js'),
    
    {
        character:{
            FIELD_ID, FIELD_NAME, FIELD_USER_ID, FIELD_IN_WORLD, FIELD_ZOMBIE, 
            FIELD_LOC, FIELD_MOVE_SPEED, FIELD_PERMISSIONS,
            FIELD_LOCK_MOVE, FIELD_LOCK_ACTION, FIELD_LOCK_FREE, FIELD_LOCK_REACT
        }
    } = require('../common/common.js'),
    
    FILENAME_CHARACTERS = 'characters',
    
    Character = new JS.Class('Character', Eventable, {
        // Life Cycle //////////////////////////////////////////////////////////
        init: function(attrs) {
            attrs[FIELD_ID] ??= null;
            attrs[FIELD_USER_ID] ??= null;
            attrs[FIELD_PERMISSIONS] ??= null;
            attrs[FIELD_NAME] ??= '';
            attrs[FIELD_ZOMBIE] ??= false;
            attrs[FIELD_IN_WORLD] ??= false;
            attrs[FIELD_LOC] ??= [0,0,0,0];
            attrs[FIELD_MOVE_SPEED] ??= 3;
            attrs[FIELD_LOCK_MOVE] ??= 0;
            attrs[FIELD_LOCK_ACTION] ??= 0;
            attrs[FIELD_LOCK_REACT] ??= 0;
            attrs[FIELD_LOCK_FREE] ??= 0;
            
            this.callSuper(attrs);
        },
        
        
        // Accessors ///////////////////////////////////////////////////////////
        [generateSetterName(FIELD_ID)]: function(v) {this.set(FIELD_ID, v, true);},
        getId: function() {return this[FIELD_ID];},
        [generateSetterName(FIELD_USER_ID)]: function(v) {this.set(FIELD_USER_ID, v, true);},
        getUserId: function() {return this[FIELD_USER_ID];},
        [generateSetterName(FIELD_NAME)]: function(v) {this.set(FIELD_NAME, v, true);},
        getName: function() {return this[FIELD_NAME];},
        [generateSetterName(FIELD_ZOMBIE)]: function(v) {this.set(FIELD_ZOMBIE, v, true);},
        isZombie: function() {return this[FIELD_ZOMBIE];},
        [generateSetterName(FIELD_IN_WORLD)]: function(v) {this.set(FIELD_IN_WORLD, v, true);},
        isInWorld: function() {return this[FIELD_IN_WORLD];},
        [generateSetterName(FIELD_LOC)]: function(v) {this.set(FIELD_LOC, v, true);},
        getLocArr: function(asCopy) {
            const locArr = this[FIELD_LOC];
            return asCopy ? locArr.slice() : locArr;
        },
        [generateSetterName(FIELD_LOCK_MOVE)]: function(v) {this.set(FIELD_LOCK_MOVE, v, true);},
        getLockMove: function() {return this[FIELD_LOCK_MOVE];},
        [generateSetterName(FIELD_MOVE_SPEED)]: function(v) {this.set(FIELD_MOVE_SPEED, v, true);},
        getMoveSpeed: function() {return this[FIELD_MOVE_SPEED];},
        [generateSetterName(FIELD_LOCK_ACTION)]: function(v) {this.set(FIELD_LOCK_ACTION, v, true);},
        getLockAction: function() {return this[FIELD_LOCK_ACTION];},
        [generateSetterName(FIELD_LOCK_FREE)]: function(v) {this.set(FIELD_LOCK_FREE, v, true);},
        getLockFree: function() {return this[FIELD_LOCK_FREE];},
        [generateSetterName(FIELD_LOCK_REACT)]: function(v) {this.set(FIELD_LOCK_REACT, v, true);},
        getLockReact: function() {return this[FIELD_LOCK_REACT];},
        
        [generateSetterName(FIELD_PERMISSIONS)]: function(v) {this.set(FIELD_PERMISSIONS, v, true);},
        
        getFreeActionSpeed: function() {
            return 1;
        },
        
        // Methods /////////////////////////////////////////////////////////////
    }),
    
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
        if (!character.isZombie()) {
            const userId = character.getUserId(),
                existingCharacters = getCharactersByUserId(userId);
            if (existingCharacters.length + 1 > orb.maxCharactersPerUser) {
                console.warn('Max character limit exceeded for user:', userId);
                return false;
            }
            existingCharacters.push(character);
        }
        
        charactersById[character.getId()] = charactersByName[character.getName()] = character;
        return true;
    },
    
    removeCharacterFromRepo = character => {
        const id = character.getId(),
            existingCharacters = getCharactersByUserId(character.getUserId());
        let i = existingCharacters.length;
        while (i) {
            const existingCharacter = existingCharacters[--i];
            if (existingCharacter.getId() === id) {
                existingCharacters.splice(i, 1);
                break;
            }
        }
        delete charactersById[id];
        delete charactersByName[character.getName()];
        return true;
    },
    
    getCharacterById = id => charactersById[id],
    getCharacterByName = name => charactersByName[name],
    getCharactersByUserId = userId => {
        // Accept account objects as well.
        if (typeof userId === 'object') userId = userId.username;
        
        return charactersByUserId[userId] || (charactersByUserId[userId] = []);
    },
    
    doCharacterExitWorld = character => {
        if (character.isInWorld()) {
            character.set(FIELD_IN_WORLD, false);
            return true;
        } else {
            return false;
        }
    },
    
    restoreCharactersOnStartup = () => {
        const jsonData = orb.readDataFile(FILENAME_CHARACTERS);
        if (jsonData) {
            let count = 0;
            for (const datum of jsonData) {
                if (datum[FIELD_ID] && datum[FIELD_USER_ID] && datum[FIELD_NAME]) {
                    const character = new Character(datum);
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
        
        // Save Characters
        const data = Object.values(charactersById);
        for (const datum of data) {
            delete datum.inited;
        }
        orb.saveDataToFile(FILENAME_CHARACTERS, data);
        
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
            const character = new Character({
                [FIELD_ID]:orb.getGuidString('c'),
                [FIELD_USER_ID]:userId,
                [FIELD_NAME]:name,
                [FIELD_LOC]:[0,2,2,0]
            });
            
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
                if (character.getUserId() === userId) {
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
        while (i) existingCharacters[--i].set(FIELD_ZOMBIE, true);
        return true;
    }
};