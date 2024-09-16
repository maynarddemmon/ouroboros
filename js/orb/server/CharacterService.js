let accountService,
    worldMap;

const orb = global.orb,
    
    {
        JS:{Class:JSClass, Module:JSModule}, 
        tym:{Eventable}
    } = require('../../../lib/tym.js'),
    
    {
        isValidLocArr, locIdToArr, locArrToId,
        greek:{
            TYPE_ALTER_ENTITY,
            TYPE_ALTER_CHARACTER, TYPE_ALTER_INVENTORY, TYPE_MOVE_FAILED, MOVE_ERROR_CODES
        },
        facing:{NORTH},
        stat:{StatModel, DerivedStatModelMixin, DerivedMaxStatModelMixin, RecoverableStatMixin},
        entity:{
            CommonEntityModelMixin, CommonCharacterModelMixin, experienceToLevel,
            CORE_STAT_NAMES, ABILITY_NAMES, DERIVED_STAT_NAMES
        },
        inventory:{Inventory},
        item:{Item}
    } = global.urob,
    
    {getNow} = require('./WorldClock.js'),
    
    {min:mathMin, max:mathMax, floor:mathFloor, ceil:mathCeil} = Math,
    
    getAccountService = () => accountService ??= require('./AccountService.js'),
    getWorldMap = () => worldMap ??= require('./WorldMap.js'),
    
    FILENAME_CHARACTERS = 'characters',
    
    /* The amount of endurance needed by an entity to do a move action. */
    END_MOVE_COST = -1,
    
    ATTRS_TO_NOTIFY_FOR = ['facing','spirit','zombie','astral','inWorld'],
    
    BASE_QUINTESSENCE = 5,
    levelToQuintessence = lvl => BASE_QUINTESSENCE + 3*lvl,
    
    averageValueFloor = (v1, v2) => mathFloor((v2 + v2)/2),
    dividedValueCeil = (v, divisor) => mathCeil(v / divisor),
    
    EntityStatModel = new JSClass('EntityStatModel', StatModel, {
        notifyForChange: function() {
            const character = this.parentObj,
                userId = character.getUserId?.();
            if (userId && character.isInWorld()) {
                getAccountService().addMessageToUser(userId, {type:TYPE_ALTER_CHARACTER, msg:{
                    id:character.getId(), p:this.attrName, v:this.getAsData()
                }});
            }
        }
    });
    DerivedEntityStatModel = new JSClass('DerivedEntityStatModel', EntityStatModel, {
        include:[DerivedStatModelMixin]
    }),
    DerivedEntityMaxStatModel = new JSClass('DerivedEntityMaxStatModel', EntityStatModel, {
        include:[DerivedMaxStatModelMixin]
    }),
    
    InventoryModel = new JSClass('InventoryModel', Inventory, {
        notifyForAdd: function(item) {
            const entity = this.getOwner(),
                username = entity.isA(Character) ? entity.getUserId() : null;
            if (username) {
                getAccountService().addMessageToUser(username, {type:TYPE_ALTER_INVENTORY, msg:{
                    inventoryType:'character',
                    action:'add',
                    id:entity.getId(), 
                    item:item.getAsData({character:entity})
                }});
            }
        },
        notifyForRemove: function(item) {
            const entity = this.getOwner(),
                username = entity.isA(Character) ? entity.getUserId() : null;
            if (username) {
                getAccountService().addMessageToUser(username, {type:TYPE_ALTER_INVENTORY, msg:{
                    inventoryType:'character',
                    action:'remove',
                    id:entity.getId(), 
                    item:item.getAsData({character:entity})
                }});
            }
        },
        
        getAsData: function(cfg) {
            const retval = this.callSuper(cfg);
            
            // When saving to disk, remove mw, mv and mc since those will all be calculated during 
            // updateFromData for Entitites and this Inventory is only for use with Entitites.
            if (cfg?.isSave) {
                delete retval.mw;
                delete retval.mv;
                delete retval.mc;
            }
            
            return retval;
        }
    }),
    
    ItemModel = new JSClass('ItemModel', Item, {
        updateFromData: function(datum) {
            datum.id ??= orb.getItemGuid();
            this.callSuper(datum);
        }
    }),
    
    EntityModel = new JSClass('EntityModel', Eventable, {
        include:[CommonEntityModelMixin],
        
        
        // Life Cycle //////////////////////////////////////////////////////////
        init: function(attrs) {
            const self = this;
            
            self.exp = new EntityStatModel({parentObj:self, attrName:'exp', absMin:0});
            self.lvl = new EntityStatModel({parentObj:self, attrName:'lvl', absMin:0});
            self.qui = new EntityStatModel({parentObj:self, attrName:'qui', absMin:0});
            
            self.str = new EntityStatModel({parentObj:self, attrName:'str', absMin:0, absMax:100});
            self.agl = new EntityStatModel({parentObj:self, attrName:'agl', absMin:0, absMax:100});
            self.dex = new EntityStatModel({parentObj:self, attrName:'dex', absMin:0, absMax:100});
            self.con = new EntityStatModel({parentObj:self, attrName:'con', absMin:0, absMax:100});
            self.wil = new EntityStatModel({parentObj:self, attrName:'wil', absMin:0, absMax:100});
            self.per = new EntityStatModel({parentObj:self, attrName:'per', absMin:0, absMax:100});
            self.wis = new EntityStatModel({parentObj:self, attrName:'wis', absMin:0, absMax:100});
            self.int = new EntityStatModel({parentObj:self, attrName:'int', absMin:0, absMax:100});
            
            self.soma = new DerivedEntityMaxStatModel({
                parentObj:self, attrName:'soma', absMin:0, watch:[self.str, 'value', self.agl, 'value', self.con, 'value', self.dex, 'value']
            }, [{
                calculateMax: () => (self.str.getValue() + averageValueFloor(self.agl.getValue(), self.dex.getValue())) * self.con.getValue()
            }]);
            self.end = new DerivedEntityMaxStatModel({
                parentObj:self, attrName:'end', absMin:0, watch:[self.str, 'value', self.agl, 'value', self.con, 'value']
            }, [RecoverableStatMixin, {
                calculateMax: () => self.con.getValue() + averageValueFloor(self.str.getValue(), self.agl.getValue())
            }]);
            self.endRec = new DerivedEntityStatModel({
                parentObj:self, attrName:'endRec', absMin:0, watch:[self.con, 'value']
            }, [{
                calculateValue: () => dividedValueCeil(self.con.getValue(), 4)
            }]);
            self.hp = new DerivedEntityMaxStatModel({
                parentObj:self, attrName:'hp', absMin:0, watch:[self.str, 'value', self.con, 'value']
            }, [RecoverableStatMixin, {
                calculateMax: () => self.str.getValue() + self.con.getValue()
            }]);
            self.hpRec = new DerivedEntityStatModel({
                parentObj:self, attrName:'hpRec', absMin:0, watch:[self.con, 'value']
            }, [{
                calculateValue: () => dividedValueCeil(self.con.getValue(), 8)
            }]);
            
            self.pneuma = new DerivedEntityMaxStatModel({
                parentObj:self, attrName:'pneuma', absMin:0, watch:[self.int, 'value', self.wis, 'value', self.wil, 'value', self.per, 'value']
            }, [{
                calculateMax: () => (self.int.getValue() + averageValueFloor(self.wis.getValue(), self.per.getValue())) * self.wil.getValue()
            }]);
            self.magos = new DerivedEntityMaxStatModel({
                parentObj:self, attrName:'magos', absMin:0, watch:[self.int, 'value', self.wil, 'value']
            }, [RecoverableStatMixin, {
                calculateMax: () => self.int.getValue() + self.wil.getValue()
            }]);
            self.magosRec = new DerivedEntityStatModel({
                parentObj:self, attrName:'magosRec', absMin:0, watch:[self.wil, 'value']
            }, [{
                calculateValue: () => dividedValueCeil(self.wil.getValue(), 8)
            }]);
            self.psyche = new DerivedEntityMaxStatModel({
                parentObj:self, attrName:'psyche', absMin:0, watch:[self.wis, 'value', self.wil, 'value']
            }, [RecoverableStatMixin, {
                calculateMax: () => self.wis.getValue() + self.wil.getValue()
            }]);
            self.psycheRec = new DerivedEntityStatModel({
                parentObj:self, attrName:'psycheRec', absMin:0, watch:[self.wil, 'value']
            }, [{
                calculateValue: () => dividedValueCeil(self.wil.getValue(), 8)
            }]);
            
            attrs.id ??= null;
            attrs.name ??= '';
            attrs.loc ??= null;
            attrs.facing ??= NORTH;
            attrs.moveSpeed ??= 3;
            
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
                if (this.inited) console.error('Attempt to set invalid location array on entity: ', v);
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
        refreshStats: function() {
            this.applyExperience();
            
            // Register Recoverable Stats
            this.end.registerForRecovery();
            this.hp.registerForRecovery();
            this.magos.registerForRecovery();
            this.psyche.registerForRecovery();
        },
        applyExperience: function() {this.setLvl(experienceToLevel(this.getExp()));},
        applyLevel: function() {this.setQui(levelToQuintessence(this.getLvl()));},
        applyQuintessence: function() {
            //console.log(this);
            // FIXME Quintessence Adjustment
        },
        
        
        // Methods /////////////////////////////////////////////////////////////
        topUpStats: function() {
            for (const statName of DERIVED_STAT_NAMES) {
                const statObj = this[statName];
                statObj.setValue(statObj.getMax());
            }
        },
        
        
        // Persistence and Serialization ///////////////////////////////////////
        getAsData: function(cfg) {
            const retval = this.callSuper(cfg);
            if (!cfg?.character) {
                for (const STAT_LIST of [CORE_STAT_NAMES, ABILITY_NAMES, DERIVED_STAT_NAMES]) {
                    for (const statName of STAT_LIST) {
                        retval[statName] = this[statName].getAsData(cfg);
                    }
                }
            }
            return retval;
        },
        
        updateFromData: function(datum) {
            for (const STAT_LIST of [CORE_STAT_NAMES, ABILITY_NAMES, DERIVED_STAT_NAMES]) {
                for (const statName of STAT_LIST) {
                    const statDatum = datum[statName];
                    if (statDatum != null) this[statName].updateFromData(statDatum);
                }
            }
            
            // Initialize Inventory Value
            const inventoryDatum = datum.inv ??= {};
            inventoryDatum.mc = 10;
            inventoryDatum.mw = this.str.getValue() * 8;
            inventoryDatum.mv = 100 * 100 * 100;
            
            return this.callSuper(datum);
        },
        
        
        // Methods /////////////////////////////////////////////////////////////
        doStatRecovery: function(statName) {
            const stat = this[statName],
                recStat = this[statName + 'Rec'];
            if (stat && recStat) {
                const valueToMax = stat.getValueToMax();
                if (valueToMax > 0) {
                    let coreStat;
                    switch (statName) {
                        case 'end': case 'hp': coreStat = this.soma; break;
                        case 'magos': case 'psyche': coreStat = this.pneuma; break;
                    }
                    if (coreStat) {
                        const recoveryAmount = mathMax(0, recStat.getValue()); // No "bleeding".
                        if (recoveryAmount > 0) {
                            // Use core state to recover "recoverable" stat.
                            const coreStatUsed = coreStat.adjValue(-mathMin(recoveryAmount, valueToMax));
                            stat.adjValue(-coreStatUsed);
                        }
                    }
                    
                    if (!stat.isAtMaxValue()) return false;
                }
            }
            return true;
        },
        
        doVocalize: function(volume, message) {
            getWorldMap().broadcastSound(this, 'vocalize', message, volume);
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
            if (
                orb.rules.characterMayMoveOutOfCell(this, direction) && 
                orb.rules.characterMayMoveIntoCell(this, direction, cell) && 
                this.end.adjValue(END_MOVE_COST, {allOrNothing:true}) === END_MOVE_COST
            ) {
                // Generate movement sound before
                if (moveSoundTypeBefore) getWorldMap().generateSoundForEntityAction(this, moveSoundTypeBefore);
                
                callbackBefore?.();
                
                this.setLoc(locArr);
                
                callbackAfter?.();
                
                // Send movement change
                if (username) {
                    getAccountService().addMessageToUser(username, {type:TYPE_ALTER_CHARACTER, msg:{
                        id:this.id, p:'loc', v:locArr
                    }});
                }
                
                // Generate movement sound after
                if (moveSoundTypeAfter) getWorldMap().generateSoundForEntityAction(this, moveSoundTypeAfter);
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
        setAuditoryObservedCells: function(v) {this._auditoryObservedCells = v;}
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
                    if (storeCharacterInRepo((new Character()).updateFromData(datum))) count++;
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
        for (const id in charactersById) doCharacterExitWorld(charactersById[id]);
        
        // Save Characters
        const characterData = [];
        for (const characterId in charactersById) {
            characterData.push(charactersById[characterId].getAsData({isSave:true}));
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
                const character = (new Character()).updateFromData({
                    id:orb.getCharacterGuid(),
                    uid:userId,
                    name:name,
                    loc:[0,2,2,0]
                });
                for (const attrName of CORE_STAT_NAMES) character.set(attrName, 0);
                for (const attrName of ABILITY_NAMES) character.set(attrName, 8);
                
                character.topUpStats();
                
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

CommonEntityModelMixin.INVENTORY_MODEL_CLASS = InventoryModel;
Inventory.ITEM_MODEL_CLASS = ItemModel;