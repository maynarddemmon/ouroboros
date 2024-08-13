const orb = require('./orb.js'),
    
    {
        JS, 
        tym:{
            Eventable,
            AccessorSupport:{generateSetterName}
        }
    } = require('../../../lib/tym.js'),
    
    worldMap = require('./WorldMap.js'),
    {
        CommonEntityModelMixin,
        CommonCharacterModelMixin,
        entity:{FIELD_ID, FIELD_SPIRIT, FIELD_ZOMBIE, FIELD_ASTRAL_PROJECTED},
        character:{
            FIELD_NAME, FIELD_USER_ID, FIELD_IN_WORLD,
            FIELD_LOC, FIELD_MOVE_SPEED, FIELD_PERMISSIONS,
            FIELD_LOCK_MOVE, FIELD_LOCK_ACTION, FIELD_LOCK_FREE, FIELD_LOCK_REACT
        },
        permissions:{PERM_CREATOR},
        cell:{FIELD_COMPOSITION}
    } = require('../common/common.js'),
    {isValidLocArr} = require('../common/util.js'),
    
    FILENAME_CHARACTERS = 'characters',
    
    EntityModel = new JS.Class('EntityModel', Eventable, {
        include:[CommonEntityModelMixin],
        
        
        // Life Cycle //////////////////////////////////////////////////////////
        init: function(attrs) {
            attrs[FIELD_ID] ??= null;
            attrs[FIELD_SPIRIT] ??= false;
            attrs[FIELD_ZOMBIE] ??= false;
            attrs[FIELD_ASTRAL_PROJECTED] ??= false;
            
            this.callSuper(attrs);
        },
    }),
    
    Character = new JS.Class('Character', EntityModel, {
        include:[CommonCharacterModelMixin],
        
        
        // Life Cycle //////////////////////////////////////////////////////////
        init: function(attrs) {
            this._observedCells = [];
            
            attrs[FIELD_USER_ID] ??= null;
            attrs[FIELD_PERMISSIONS] ??= null;
            attrs[FIELD_NAME] ??= '';
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
        getMonitorDistance: () => 3,
        
        getCell: function() {
            const curLocArr = this[FIELD_LOC];
            return curLocArr ? worldMap.getCellByLocArr(curLocArr) : null;
        },
        
        [generateSetterName(FIELD_SPIRIT)]: function(v) {
            this.callSuper(v);
            orb.rules.doOnSpiritualChangeForCharacter(this);
        },
        
        [generateSetterName(FIELD_ASTRAL_PROJECTED)]: function(v) {
            this.callSuper(v);
            orb.rules.doOnSpiritualChangeForCharacter(this);
        },
        
        [generateSetterName(FIELD_LOC)]: function(v) {
            if (isValidLocArr(v)) {
                const curCell = this.getCell(),
                    newCell = worldMap.getCellByLocArr(v, true);
                
                orb.rules.doOnSpiritualChangeForCharacter(this, newCell);
                
                this.callSuper(v);
                
                if (curCell) curCell.removeEntity(this);
                newCell.addEntity(this);
                if (characterService.isReady) worldMap.updateListenersForCharacter(this, newCell);
            } else {
                console.error('Attempt to set invalid locArr on character: ', v, this);
            }
        },
        
        getFreeActionSpeed: function() {
            return 1;
        },
        
        // Methods /////////////////////////////////////////////////////////////
        getObservedCells: function() {return this._observedCells;},
        setObservedCells: function(v) {this._observedCells = v;},
        /*observeCell: function(cell) {
            if (cell) this._observedCells.push(cell);
        },
        unobserveCell: function(cellToForget) {
            const cells = this._observedCells,
                len = cells.length;
            while (i) {
                if (cells[--i] === cellToForget) {
                    splice(i, 1);
                    break;
                }
            }
        },*/
        
        getAsData: function() {
            // FIXME: need to iterate over a list of fields to save. This is
            // currently only safe to call during die.
            delete this.inited;
            delete this._observedCells;
            return this
        },
        
        /** Gets data that the provided character can see/hear/sense about this
            character. */
        getAsDataForCharacter: function(character) {
            const retval = {};
            for (const propName of [FIELD_NAME]) {
                retval[propName] = this.get(propName);
            }
            retval[FIELD_IN_WORLD] = this.isInWorld();
            retval[FIELD_ZOMBIE] = this.isZombie();
            retval[FIELD_SPIRIT] = this.isSpirit();
            retval[FIELD_ASTRAL_PROJECTED] = this.isAstralProjected();
            return retval;
        }
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
    
    live = (resolve, reject) => {
        console.log('Restoring Characters...');
        
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
        
        characterService.isReady = true;
        resolve();
    },
    
    die = (resolve, reject) => {
        console.log('Save Characters');
        
        // Force exit all in world characters
        for (const id in charactersById) {
            doCharacterExitWorld(charactersById[id]);
        }
        
        // Save Characters
        const characterData = [];
        for (const characterId in charactersById) {
            characterData.push(charactersById[characterId].getAsData());
        }
        orb.saveDataToFile(FILENAME_CHARACTERS, characterData);
        
        resolve();
    },
    
    characterService = module.exports = {
        lifeCycle: isBirth => new Promise((resolve, reject) => {
            if (isBirth) {
                live(resolve, reject);
            } else {
                die(resolve, reject);
            }
        }),
        
        isReady:false,
        
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