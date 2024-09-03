let accountService,
    worldMap;

const orb = global.orb,
    
    {
        JS:{Class:JSClass}, 
        tym:{Eventable}
    } = require('../../../lib/tym.js'),
    
    {getNow} = require('./WorldClock.js'),
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
    
    {min:mathMin, max:mathMax, floor:mathFloor, sqrt:mathSqrt} = Math,
    
    getAccountService = () => accountService ??= require('./AccountService.js'),
    getWorldMap = () => worldMap ??= require('./WorldMap.js'),
    
    FILENAME_CHARACTERS = 'characters',
    
    /** A stat on an object. Enforces min and max values and provides a way to temporarily
        adjust the effective value. */
    StatModel = new JSClass('StatModel', Eventable, {
        // FIXME: adjustements to min, max, value
        
        init: function(attrs) {
            const {parentObj, attrName, absMin, absMax, min, max, value} = attrs;
            delete attrs.parentObj;
            delete attrs.attrName;
            delete attrs.absMin;
            delete attrs.absMax;
            delete attrs.min;
            delete attrs.max;
            delete attrs.value;
            
            // Need to set attrs in an exact order
            this.parentObj = parentObj;
            this.attrName = attrName;
            
            this.setAbsMin(absMin ?? Number. MIN_SAFE_INTEGER);
            this.setAbsMax(absMax ?? Number. MAX_SAFE_INTEGER);
            this.setMin(min ?? this.absMin);
            this.setMax(max ?? this.absMax);
            this.setValue(value ?? this.min);
            
            this.callSuper(attrs);
        },
        
        /* The absolute minimum for the stat in the game. This value will never change once set. */
        setAbsMin: function(v) {
            if (this.absMin == null) this.set('absMin', v, true);
        },
        getAbsMin: function() {return this.absMin;},
        
        /* The absolute maximum for the stat in the game. This value will never change once set. */
        setAbsMax: function(v) {
            if (this.absMax == null) this.set('absMax', v, true);
        },
        getAbsMax: function() {return this.absMax;},
        
        /* The minimum value for the stat for the object it is attached to. */
        setMin: function(v) {
            const curMin = this.min,
                newMin = mathMax(this.getAbsMin(), v);
            if (curMin !== newMin) {
                this.set('min', newMin, true);
                if (this.value < this.min && this.setValue(this.min)) return true;
                if (this.inited) this.notifyCharacter();
                return true;
            }
            return false;
        },
        getMin: function() {return this.min;},
        
        /* The minimum value for the stat for the object it is attached to. */
        setMax: function(v) {
            const curMax = this.max,
                newMax = mathMin(this.getAbsMax(), v);
            if (curMax !== newMax) {
                this.set('max', newMax, true);
                if (this.value > this.max && this.setValue(this.max)) return true;
                if (this.inited) this.notifyCharacter();
                return true;
            }
            return false;
        },
        getMax: function() {return this.max;},
        
        /* The minimum value for the stat for the object it is attached to. */
        setValue: function(v) {
            const curValue = this.value,
                newValue = mathMin(mathMax(v, this.getMin()), this.getMax());
            if (curValue !== newValue) {
                this.set('value', newValue, true);
                if (this.inited) this.notifyCharacter();
                return true;
            }
            return false;
        },
        getValue: function() {return this.value;},
        
        getAsData: function() {
            return {
                min:this.min,
                max:this.max,
                value:this.value
            };
        },
        setFromData: function(datum) {
            this.setMin(datum?.min ?? this.absMin);
            this.setMax(datum?.max ?? this.absMax);
            this.setValue(datum?.value ?? this.min);
        },
        
        notifyCharacter: function() {
            const character = this.parentObj,
                userId = character.getUserId?.();
            if (userId && character.isInWorld()) {
                getAccountService().addMessageToUser(userId, {type:TYPE_ALTER_CHARACTER, msg:{
                    id:character.getId(), p:this.attrName, v:this.getAsData()
                }});
            }
        }
    }),
    
    /** A stat that gets its max value from other StatModels. */
    DerivedStatModel = new JSClass('DerivedStatModel', StatModel, {
        init: function(attrs) {
            const watch = attrs.watch;
            delete attrs.watch;
            
            this.callSuper(attrs);
            
            this.setValuesToWatch(watch);
        },
        
        setValuesToWatch: function(observables) {
            this.releaseConstraint('updateMax');
            this.constrain('updateMax', observables);
        },
        
        updateMax: function(ignoreEvent) {
            this.setMax(this.calculateMax());
        },
        
        calculateMax: () => {/* Subclasses must implement. */},
        
        getAsData: function() {
            return {
                min:this.min,
                value:this.value
            };
        },
        setFromData: function(datum) {
            this.setMin(datum?.min ?? this.absMin);
            this.setValue(datum?.value ?? this.min);
        }
    }),
    
    ATTRS_TO_NOTIFY_FOR = ['facing','spirit','zombie','astral','inWorld'],
    
    BASE_EXP_PER_LVL = 1000,
    experienceToLevel = exp => mathFloor((-1 + mathSqrt(1 + 8*exp/BASE_EXP_PER_LVL)) / 2),
    BASE_QUINTESSENCE = 5,
    levelToQuintessence = lvl => BASE_QUINTESSENCE + 3*lvl,
    
    CORE_STAT_NAMES = ['exp','lvl','qui'],
    ABILITY_NAMES = ['str','agl','dex','con','wil','per','wis','int'],
    DERIVED_STAT_NAMES = ['soma','end','endRec','hp','hpRec','pneuma','magos','magosRec','psyche','psycheRec'],
    
    EntityModel = new JSClass('EntityModel', Eventable, {
        include:[CommonEntityModelMixin],
        
        
        // Life Cycle //////////////////////////////////////////////////////////
        init: function(attrs) {
            const self = this;
            
            self.exp = new StatModel({parentObj:self, attrName:'exp', absMin:0});
            self.lvl = new StatModel({parentObj:self, attrName:'lvl', absMin:0});
            self.qui = new StatModel({parentObj:self, attrName:'qui', absMin:0});
            
            self.str = new StatModel({parentObj:self, attrName:'str', absMin:0, absMax:100});
            self.agl = new StatModel({parentObj:self, attrName:'agl', absMin:0, absMax:100});
            self.dex = new StatModel({parentObj:self, attrName:'dex', absMin:0, absMax:100});
            self.con = new StatModel({parentObj:self, attrName:'con', absMin:0, absMax:100});
            self.wil = new StatModel({parentObj:self, attrName:'wil', absMin:0, absMax:100});
            self.per = new StatModel({parentObj:self, attrName:'per', absMin:0, absMax:100});
            self.wis = new StatModel({parentObj:self, attrName:'wis', absMin:0, absMax:100});
            self.int = new StatModel({parentObj:self, attrName:'int', absMin:0, absMax:100});
            
            self.soma = new DerivedStatModel({
                parentObj:self, absMin:0, attrName:'soma', watch:[self.str, 'value', self.agl, 'value', self.con, 'value', self.dex, 'value']
            }, [{
                calculateMax: () => self.str.getValue() + self.agl.getValue() + self.con.getValue() + self.dex.getValue()
            }]);
            self.end = new DerivedStatModel({
                parentObj:self, absMin:0, attrName:'end', watch:[self.str, 'value', self.agl, 'value', self.con, 'value']
            }, [{
                calculateMax: () => self.con.getValue() + mathFloor((self.str.getValue() + self.agl.getValue()) / 2)
            }]);
            self.endRec = new DerivedStatModel({
                parentObj:self, absMin:0, attrName:'endRec', watch:[self.con, 'value']
            }, [{
                calculateMax: () => self.con.getValue()
            }]);
            self.hp = new DerivedStatModel({
                parentObj:self, absMin:0, attrName:'hp', watch:[self.str, 'value', self.con, 'value']
            }, [{
                calculateMax: () => self.str.getValue() + self.con.getValue()
            }]);
            self.hpRec = new DerivedStatModel({
                parentObj:self, absMin:0, attrName:'hpRec', watch:[self.con, 'value']
            }, [{
                calculateMax: () => self.con.getValue()
            }]);
            self.pneuma = new DerivedStatModel({
                parentObj:self, absMin:0, attrName:'pneuma', watch:[self.int, 'value', self.wis, 'value', self.wil, 'value', self.per, 'value']
            }, [{
                calculateMax: () => self.int.getValue() + self.wis.getValue() + self.wil.getValue() + self.per.getValue()
            }]);
            self.magos = new DerivedStatModel({
                parentObj:self, absMin:0, attrName:'magos', watch:[self.int, 'value', self.wil, 'value']
            }, [{
                calculateMax: () => self.int.getValue() + self.wil.getValue()
            }]);
            self.magosRec = new DerivedStatModel({
                parentObj:self, absMin:0, attrName:'magosRec', watch:[self.wil, 'value']
            }, [{
                calculateMax: () => self.wil.getValue()
            }]);
            self.psyche = new DerivedStatModel({
                parentObj:self, absMin:0, attrName:'psyche', watch:[self.wis, 'value', self.wil, 'value']
            }, [{
                calculateMax: () => self.wis.getValue() + self.wil.getValue()
            }]);
            self.psycheRec = new DerivedStatModel({
                parentObj:self, absMin:0, attrName:'psycheRec', watch:[self.wil, 'value']
            }, [{
                calculateMax: () => self.wil.getValue()
            }]);
            
            attrs.id ??= null;
            attrs.name ??= '';
            attrs.loc ??= [0,0,0,0];
            attrs.facing ??= NORTH;
            attrs.moveSpeed ??= 3;
            
            for (const attrName of CORE_STAT_NAMES) {
                self[attrName].setFromData(attrs[attrName] ?? {value:0});
                delete attrs[attrName];
            }
            
            for (const attrName of ABILITY_NAMES) {
                self[attrName].setFromData(attrs[attrName] ?? {value:8});
                delete attrs[attrName];
            }
            
            for (const attrName of DERIVED_STAT_NAMES) {
                self[attrName].setFromData(attrs[attrName]);
                delete attrs[attrName];
            }
            
            self.callSuper(attrs);
            self.refreshStats();
            
            orb.rules.doOnSpiritualChangeForEntity(self);
        },
        
        
        // Accessors ///////////////////////////////////////////////////////////
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
        
        /** @overrides */
        getWorldClockNow: () => getNow(),
        
        setSpirit: function(v) {
            this.callSuper(v);
            if (this.inited) orb.rules.doOnSpiritualChangeForEntity(this);
        },
        
        setAstral: function(v) {
            this.callSuper(v);
            if (this.inited) orb.rules.doOnSpiritualChangeForEntity(this);
        },
        
        setFacing: function(v) {
            if (this.facing !== v) {
                this.set('facing', v, true);
                return true;
            } else {
                return false;
            }
        },
        
        setLoc: function(v) {
            if (isValidLocArr(v)) {
                const curCell = this.getCell(),
                    newCell = getWorldMap().getCellByLocArr(v, true);
                
                if (this.inited) orb.rules.doOnSpiritualChangeForEntity(this, newCell);
                
                this.callSuper(v);
                
                if (curCell) curCell.removeEntity(this);
                newCell.addEntity(this);
                return true;
            } else {
                console.error('Attempt to set invalid location array on entity: ', v, this);
                return false;
            }
        },
        
        getCell: function() {
            const curLocArr = this.loc;
            return curLocArr ? getWorldMap().getCellByLocArr(curLocArr) : null;
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
        
        // Core Attributes
        setExp: function(v) {
            if (this.exp.setValue(v)) {
                if (this.inited) this.applyExperience();
            }
        },
        getExp: function() {return this.exp.getValue();},
        
        setLvl: function(v) {
            if (this.lvl.setValue(v)) {
                if (this.inited) this.applyLevel();
            }
        },
        getLvl: function() {return this.lvl.getValue();},
        
        setQui: function(v) {
            if (this.qui.setValue(v)) {
                if (this.inited) this.applyQuintessence();
            }
        },
        getQui: function() {return this.qui.getValue();},
        
        // Abilities
        setStr: function(v) {this.str.setValue(v);},
        getStr: function() {return this.str.getValue();},
        setAgl: function(v) {this.agl.setValue(v);},
        getAgl: function() {return this.agl.getValue();},
        setDex: function(v) {this.dex.setValue(v);},
        getDex: function() {return this.dex.getValue();},
        setCon: function(v) {this.con.setValue(v);},
        getCon: function() {return this.con.getValue();},
        setWil: function(v) {this.wil.setValue(v);},
        getWil: function() {return this.wil.getValue();},
        setPer: function(v) {this.per.setValue(v);},
        getPer: function() {return this.per.getValue();},
        setWis: function(v) {this.wis.setValue(v);},
        getWis: function() {return this.wis.getValue();},
        setInt: function(v) {this.int.setValue(v);},
        getInt: function() {return this.int.getValue();},
        
        // Derived Stats
        getSoma: function() {return this.soma.getValue();},
        getEnd: function() {return this.end.getValue();},
        getEndRec: function() {return this.endRec.getValue();},
        getHp: function() {return this.hp.getValue();},
        getHpRec: function() {return this.hpRec.getValue();},
        
        getPneuma: function() {return this.pneuma.getValue();},
        getMagos: function() {return this.magos.getValue();},
        getMagosRec: function() {return this.magosRec.getValue();},
        getPsyche: function() {return this.psyche.getValue();},
        getPsycheRec: function() {return this.psycheRec.getValue();},
        
        // Refresh Stats
        refreshStats: function() {this.applyExperience();},
        applyExperience: function() {this.setLvl(experienceToLevel(this.getExp()));},
        applyLevel: function() {this.setQui(levelToQuintessence(this.getLvl()));},
        applyQuintessence: function() {
            //console.log(this);
            // FIXME Quintessence Adjustment
        },
        
        
        // Methods /////////////////////////////////////////////////////////////
        getAsData: function() {
            return {
                id:this.id,
                name:this.name,
                
                spirit:this.spirit,
                zombie:this.zombie,
                astral:this.astral,
                
                facing:this.facing,
                loc:this.loc,
                
                moveSpeed:this.moveSpeed,
                
                lockMove:this.lockMove,
                lockAct:this.lockAct,
                lockReact:this.lockReact,
                lockFree:this.lockFree,
                
                exp:this.exp.getAsData(),
                lvl:this.lvl.getAsData(),
                qui:this.qui.getAsData(),
                
                str:this.str.getAsData(),
                agl:this.agl.getAsData(),
                dex:this.dex.getAsData(),
                con:this.con.getAsData(),
                wil:this.wil.getAsData(),
                per:this.per.getAsData(),
                wis:this.wis.getAsData(),
                int:this.int.getAsData(),
                
                soma:this.soma.getAsData(),
                end:this.end.getAsData(),
                endRec:this.endRec.getAsData(),
                hp:this.hp.getAsData(),
                hpRec:this.hpRec.getAsData(),
                pneuma:this.pneuma.getAsData(),
                magos:this.magos.getAsData(),
                magosRec:this.magosRec.getAsData(),
                psyche:this.psyche.getAsData(),
                psycheRec:this.psycheRec.getAsData()
            };
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
        
        doMove: function(locArrOrId, direction, moveSoundTypeBefore, moveSoundTypeAfter, callbackBefore, callbackAfter) {
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
            const cell = getWorldMap().getCell(locId, true),
                username = this.isA(Character) ? this.getUserId() : null;
            if (cell.mayMoveInto(this, direction)) {
                // Generate movement sound before
                if (moveSoundTypeBefore) orb.rules.generateSoundForEntityAction(this, this.getCell(), moveSoundTypeBefore);
                
                callbackBefore?.();
                
                this.setLoc(locArr);
                
                callbackAfter?.();
                
// FIXME: remove after testing
this.setExp(this.getExp() + 150);
                
                // Send movement change
                if (username) {
                    getAccountService().addMessageToUser(username, {type:TYPE_ALTER_CHARACTER, msg:{
                        id:this.id, p:'loc', v:locArr
                    }});
                }
                
                // Generate movement sound after
                if (moveSoundTypeAfter) orb.rules.generateSoundForEntityAction(this, this.getCell(), moveSoundTypeAfter);
                return true;
            } else {
                if (username) {
                    getAccountService().addMessageToUser(username, {type:TYPE_MOVE_FAILED, code:MOVE_ERROR_CODES.LOCATION_NOT_ALLOWED});
                }
                return false;
            }
        },
        
        sendExposition: function(message, medium) {
            getWorldMap().sendExpositionToCharacter(this, message, medium);
        }
    }),
    
    Character = new JSClass('Character', EntityModel, {
        include:[CommonCharacterModelMixin],
        
        
        // Life Cycle //////////////////////////////////////////////////////////
        init: function(attrs) {
            this._visualObservedCells = [];
            this._auditoryObservedCells = [];
            
            this.callSuper(attrs);
        },
        
        
        // Accessors ///////////////////////////////////////////////////////////
        setFacing: function(v) {
            const success = this.callSuper(v);
            if (success && characterService.isReady) getWorldMap().updateVisualListenersForCharacter(this, this.getCell());
            return success;
        },
        
        setLoc: function(v) {
            const success = this.callSuper(v);
            if (success && characterService.isReady) getWorldMap().updateListenersForCharacter(this, this.getCell());
            return success;
        },
        
        
        // Methods /////////////////////////////////////////////////////////////
        getVisualObservedCells: function() {return this._visualObservedCells;},
        setVisualObservedCells: function(v) {this._visualObservedCells = v;},
        getAuditoryObservedCells: function() {return this._auditoryObservedCells;},
        setAuditoryObservedCells: function(v) {this._auditoryObservedCells = v;},
        
        getAsData: function() {
            const retval = this.callSuper();
            retval.uid = this.uid;
            retval.perms = this.perms;
            retval.inWorld = this.inWorld;
            return retval;
        },
        
        /** Gets data that the provided character can see/hear/sense about this character. */
        getAsDataForCharacter: function(character) {
            const retval = this.callSuper(character);
            retval.inWorld = this.get('inWorld');
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