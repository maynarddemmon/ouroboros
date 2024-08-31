const orb = require('./orb.js'),
    
    {
        JS, 
        tym:{Eventable}
    } = require('../../../lib/tym.js'),
    
    worldMap = require('./WorldMap.js'),
    accountService = require('./AccountService.js'),
    {
        CommonEntityModelMixin, CommonCharacterModelMixin,
        facings:{NORTH},
        permissions:{PERM_CREATOR},
        isValidLocArr, locArrToId, locIdToArr
    } = require('../common/common.js'),
    {
        TYPE_ALTER_ENTITY, TYPE_SOUND,
        TYPE_ALTER_CHARACTER, TYPE_MOVE_FAILED, MOVE_ERROR_CODES
    } = require('../common/SocketProtocol.js'),
    
    FILENAME_CHARACTERS = 'characters',
    
    ATTRS_TO_NOTIFY_FOR = ['facing','spirit','zombie','astral','inWorld'],
    
    EntityModel = new JS.Class('EntityModel', Eventable, {
        include:[CommonEntityModelMixin],
        
        
        // Life Cycle //////////////////////////////////////////////////////////
        init: function(attrs) {
            attrs.id ??= null;
            attrs.name ??= '';
            attrs.spirit ??= false;
            attrs.zombie ??= false;
            attrs.astral ??= false;
            attrs.loc ??= [0,0,0,0];
            attrs.facing ??= NORTH;
            
            this.callSuper(attrs);
        },
        
        set: function(attrName, v, skipSetter) {
            const self = this,
                curValue = self[attrName],
                retval = self.callSuper(attrName, v, skipSetter),
                newValue = self[attrName];
            if (self.inited && curValue !== newValue) {
                if (ATTRS_TO_NOTIFY_FOR.includes(attrName)) {
                    self.getCell()?.notifyAllVisualChangeListeners(TYPE_ALTER_ENTITY, {
                        id:self.getId(), p:attrName, v:newValue
                    }, false);
                }
            }
            return retval;
        },
        
        getCell: function() {
            const curLocArr = this.loc;
            return curLocArr ? worldMap.getCellByLocArr(curLocArr) : null;
        },
        
        /** Gets data that the provided character can see/hear/sense about this entity. */
        getAsDataForCharacter: function(character) {
            return {
                id: this.getId(),
                name: this.getName(),
                spirit: this.isSpirit(),
                zombie: this.isZombie(),
                astral: this.isAstralProjected(),
                facing: this.getFacing()
            };
        },
        
        doVocalize: function(volume, message) {
            const self = this;
            self.getCell()?.notifyAllAuditoryChangeListeners(TYPE_SOUND, {
                from:self.getId(), type:'vocalize', volume:volume, message:message
            }, true);
        },
        
        doMove: function(locArrOrId, direction, moveSoundTypeBefore, moveSoundTypeAfter) {
            let locArr,
                locId;
            if (typeof locArrOrId === 'string') {
                locId = locArrOrId;
                locArr = locIdToArr(locArrOrId);
            } else {
                locId = locArrToId(locArrOrId);
                locArr = locArrOrId;
            }
            
            // Determine if the new location will allow the character
            const cell = worldMap.getCell(locId, true),
                username = this.isA(Character) ? this.getUserId() : null;
            if (cell.mayMoveInto(this, direction)) {
                // Generate movement sound before
                if (moveSoundTypeBefore) orb.rules.generateSoundForEntityAction(this, this.getCell(), moveSoundTypeBefore);
                
                this.setLoc(locArr);
                
                // Send movement change
                if (username) {
                    accountService.addMessageToUser(username, {type:TYPE_ALTER_CHARACTER, msg:{
                        id:this.id, p:'loc', v:locArr
                    }});
                }
                
                // Generate movement sound after
                if (moveSoundTypeAfter) orb.rules.generateSoundForEntityAction(this, this.getCell(), moveSoundTypeAfter);
                return true;
            } else {
                if (username) {
                    accountService.addMessageToUser(username, {type:TYPE_MOVE_FAILED, code:MOVE_ERROR_CODES.LOCATION_NOT_ALLOWED});
                }
                return false;
            }
        }
    }),
    
    Character = new JS.Class('Character', EntityModel, {
        include:[CommonCharacterModelMixin],
        
        
        // Life Cycle //////////////////////////////////////////////////////////
        init: function(attrs) {
            this._visualObservedCells = [];
            this._auditoryObservedCells = [];
            
            attrs.uid ??= null;
            attrs.perms ??= null;
            attrs.inWorld ??= false;
            attrs.moveSpeed ??= 3;
            attrs.lockMove ??= 0;
            attrs.lockAct ??= 0;
            attrs.lockReact ??= 0;
            attrs.lockFree ??= 0;
            
            this.callSuper(attrs);
        },
        
        
        // Accessors ///////////////////////////////////////////////////////////
        setSpirit: function(v) {
            this.callSuper(v);
            orb.rules.doOnSpiritualChangeForCharacter(this);
        },
        
        setAstral: function(v) {
            this.callSuper(v);
            orb.rules.doOnSpiritualChangeForCharacter(this);
        },
        
        setFacing: function(v) {
            this.callSuper(v);
            if (characterService.isReady) worldMap.updateVisualListenersForCharacter(this, this.getCell());
        },
        
        setLoc: function(v) {
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
        
        getMoveSpeed: function(context) {
            let mv = this.callSuper();
            // Movement in a direction other than the one the character is facing costs extra time.
            if (context) {
                const direction = context.direction;
                if (direction && direction !== this.getFacing()) mv *= 1.25;
            } 
            return mv;
        },
        
        // Methods /////////////////////////////////////////////////////////////
        getVisualObservedCells: function() {return this._visualObservedCells;},
        setVisualObservedCells: function(v) {this._visualObservedCells = v;},
        
        getAuditoryObservedCells: function() {return this._auditoryObservedCells;},
        setAuditoryObservedCells: function(v) {this._auditoryObservedCells = v;},
        
        getAsData: function() {
            const retval = {...this};
            delete retval.inited;
            delete retval._visualObservedCells;
            delete retval._auditoryObservedCells;
            return retval;
        },
        
        /** Gets data that the provided character can see/hear/sense about this
            character. */
        getAsDataForCharacter: function(character) {
            const retval = this.callSuper(character);
            for (const propName of ['inWorld']) {
                retval[propName] = this.get(propName);
            }
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
        
        // Remove character from Cell if necessary
        character?.getCell()?.removeEntity(character);
        
        delete charactersById[id];
        delete charactersByName[character.getName()];
        return true;
    },
    
    getCharacterById = id => charactersById[id],
    getCharacterByName = name => charactersByName[name],
    getCharactersByUserId = (userId, asData) => {
        // Accept account objects as well.
        if (typeof userId === 'object') userId = userId.username;
        
        if (asData) {
            // Generally used for sending data back to the client.
            const retval = [],
                characters = charactersByUserId[userId];
            if (characters) {
                for (const character of characters) retval.push(character.getAsData());
            }
            return retval;
        } else {
            return charactersByUserId[userId] || (charactersByUserId[userId] = []);
        }
    },
    
    doCharacterExitWorld = character => {
        if (character.isInWorld()) {
            character.setInWorld(false);
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
                if (datum.id && datum.uid && datum.name) {
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
            const name = data.name,
                retval = {success:false};
            if (!userId) {
                retval.message = 'No userId provided.';
            } else if (getCharacterByName(name)) {
                retval.message = 'Character name already exists.';
            } else {
                const character = new Character({
                    id:orb.getCharacterGuid(),
                    uid:userId,
                    name:name,
                    loc:[0,2,2,0]
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
            while (i) existingCharacters[--i].setZombie(true);
            return true;
        }
    };