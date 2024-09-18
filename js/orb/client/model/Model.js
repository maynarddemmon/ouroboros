(pkg => {
    let worldClockIntervalId,
        mapData,
        cellData;
    
    const JSClass = JS.Class,
        {Node, Eventable} = myt,
        
        {
            locArrToId,
            facing:{COMPASS_FIELDS},
            greek:{TYPE_MOVE},
            map:{CommonMapModel},
            entity:{
                CommonEntityModelMixin, CommonCharacterModelMixin,
                CORE_STAT_NAMES, ABILITY_NAMES, DERIVED_STAT_NAMES
            },
            cell:{CommonFaceModel, CommonCellModel},
            inventory:{Inventory},
            fixture:{CommonFixtureModel, clearFixtureCache},
            item:{Item, clearItemCache}
        } = urob,
        
        getMapData = () => mapData ??= {},
        getCellData = () => cellData ??= {},
        
        // Entity:start
        entityData = {},
        makeEntityFromData = entityDatum => {
            const entityId = entityDatum.id;
            let entity = model.getEntityById(entityId);
            if (!entity) {
                // Create
                entity = setEntity(entityId, new EntityModel());
            }
            entity.updateFromData(entityDatum);
            return entity;
        },
        setEntity = (entityId, entity) => entityData[entityId] = entity,
        removeEntity = entityId => delete entityData[entityId],
        // Entity:end
        
        characters = [],
        
        notifyForCellInventoryAction = (inventory, item) => {
            if (inventory.getOwner() === model.getCharacterInPlay()?.getCell()) pkg.gamePanel.updateCellInventory();
        },
        
        CellInventoryModel = new JSClass('CellInventoryModel', Inventory, {
            init: function(attrs) {
                // cell inventory on client side should not enforce any restrictions so max everything.
                attrs.maxCapacity = attrs.maxWeight = attrs.maxVolume = Number.MAX_SAFE_INTEGER;
                this.callSuper(attrs);
            },
            
            notifyForAdd: function(item) {notifyForCellInventoryAction(this, item);},
            notifyForUpdate: function(item) {notifyForCellInventoryAction(this, item);},
            notifyForRemove: function(item) {notifyForCellInventoryAction(this, item);}
        }),
        
        notifyForEntityInventoryAction = (inventory, item) => {
            if (inventory.getOwner() === model.getCharacterInPlay()) pkg.gamePanel.updateCharacterInventory();
        },
        
        EntityInventoryModel = new JSClass('EntityInventoryModel', Inventory, {
            notifyForAdd: function(item) {notifyForEntityInventoryAction(this, item);},
            notifyForUpdate: function(item) {notifyForEntityInventoryAction(this, item);},
            notifyForRemove: function(item) {notifyForEntityInventoryAction(this, item);}
        }),
        
        CellModel = new JSClass('CellModel', CommonCellModel, {
            init: function(attrs) {
                this.partsSeen = new Set();
                this.callSuper(attrs);
            },
            
            getAnotherCell: locId => model.getCell(locId),
            
            setEnt: function(v) {this.set('ent', v, true);},
            getEntities: function() {return this.ent;},
            
            setBeenSeen: function(v) {this.beenSeen = v;},
            hasBeenSeen: function() {return this.beenSeen;},
            partHasBeenSeen: function(part) {
                if (part && this.partsSeen.size > 0) {
                    for (const seenPart of this.partsSeen) {
                        if (seenPart === part) return true;
                    }
                }
                return false;
            },
            selfOrPartHasBeenSeen: function(part) {
                return this.hasBeenSeen() || this.partHasBeenSeen(part);
            },
            
            
            // Persistence and Serialization ///////////////////////////////////
            updateFromData: function(datum) {
                this.callSuper?.(datum);
                this.setEnt(datum.ent);
                return this;
            }
        }),
        
        EntityModel = new JSClass('EntityModel', Eventable, {
            include:[CommonEntityModelMixin],
            
            
            // Accessors ///////////////////////////////////////////////////////
            set: function(attrName, v, skipSetter) {
                const curValue = this[attrName],
                    retval = this.callSuper(attrName, v, skipSetter),
                    newValue = this[attrName];
                if (this.inited && curValue !== newValue) {
                    model?.fireEvent('entityChanged', {entity:this, attr:attrName, value:newValue});
                }
                return retval;
            },
            
            /** @overrides */
            getWorldClockNow: () => model.worldClockTime,
            
            getCell: function() {
                return model.getCellByLocArr(this.getLocArr());
            },
            
            
            // Persistence and Serialization ///////////////////////////////////
            updateFromData: function(datum) {
                for (const STAT_LIST of [CORE_STAT_NAMES, ABILITY_NAMES, DERIVED_STAT_NAMES]) {
                    for (const statName of STAT_LIST) {
                        const statValue = datum[statName];
                        if (statValue != null) this.set(statName, statValue);
                    }
                }
                
                return this.callSuper(datum);
            }
        }),
        
        CharacterModel = new JSClass('CharacterModel', EntityModel, {
            include:[CommonCharacterModelMixin],
            
            
            // Methods /////////////////////////////////////////////////////////
            doBasicMove: function(direction) {
                return this.doMove(TYPE_MOVE, {direction:direction});
            },
            
            doMove: function(type, params) {
                if (this.canMove()) {
                    // Pre-emptive indefinite lock. Will be updated once the server handles the 
                    // character's movement.
                    this.lockMove = Number.MAX_SAFE_INTEGER;
                    
                    pkg.websocket.sendTypedMessage(type, {id:this.id, clientLockType:'lockMove', ...params});
                    return true;
                }
                return false;
            },
            
            doAction: function(type, params) {
                if (this.canAct()) {
                    // Pre-emptive indefinite lock. Will be updated once the server handles the 
                    // character's action.
                    this.lockAct = Number.MAX_SAFE_INTEGER;
                    
                    pkg.websocket.sendTypedMessage(type, {id:this.id, clientLockType:'lockAct', ...params});
                    return true;
                }
                return false;
            },
            
            doFree: function(type, params) {
                if (this.canFree()) {
                    // Pre-emptive indefinite lock. Will be updated once the server handles the 
                    // character's action.
                    this.lockFree = Number.MAX_SAFE_INTEGER;
                    
                    pkg.websocket.sendTypedMessage(type, {id:this.id, clientLockType:'lockFree', ...params});
                    return true;
                }
                return false;
            }
        }),
        
        model = pkg.model = new JS.Singleton('Model', Node, {
            // Entity:start
            getEntityById: entityId => entityData[entityId],
            // Entity:end
            
            // Characters:start
            setMaxCharacters: v => {model.set('maxCharacters', v, true);},
            getCharacters: () => characters,
            setCharacterInPlay: v => {model.set('characterInPlay', v, true);},
            getCharacterInPlay: () => model.characterInPlay,
            
            getCharacterById: id => {
                let i = characters.length;
                while (i) {
                    const character = characters[--i];
                    if (character.id === id) return character;
                }
            },
            
            setCharactersFromData: data => {
                if (Array.isArray(data)) {
                    for (const datum of data) {
                        if (!model.updateCharacterFromData(datum)) {
                            model.addCharacterFromData(datum, true);
                        }
                    }
                }
                model.fireEvent('characters', characters);
            },
            addCharacterFromData: (datum, noEvent) => {
                const character = new CharacterModel();
                if (character) {
                    character.updateFromData(datum);
                    characters.push(character);
                    setEntity(character.getId(), character);
                    if (!noEvent) model.fireEvent('characters', characters);
                }
            },
            updateCharacterFromData: datum => model.getCharacterById(datum.id)?.updateFromData(datum),
            
            removeCharacterById: id => {
                let i = characters.length;
                while (i) {
                    if (characters[--i].id === id) {
                        characters.splice(i, 1);
                        removeEntity(id);
                        model.fireEvent('characters', characters);
                        return true;
                    }
                }
                return false;
            },
            // Characters:end
            
            // Time:start
            setWorldClockTick: v => {model.set('worldClockTick', v, true);},
            setWorldClockTime: v => {model.set('worldClockTime', v, true);},
            updateWorldClockTime: v => {
                if (worldClockIntervalId) clearInterval(worldClockIntervalId);
                model.setWorldClockTime(v);
                worldClockIntervalId = setInterval(() => {
                    model.setWorldClockTime(model.worldClockTime + 1);
                }, model.worldClockTick);
            },
            // Time:end
            
            // Map:start
            getMap: mapId => mapData[mapId],
            storeMapData: data => {
                const mapData = getMapData();
                for (const mapId in data) {
                    mapData[mapId] = (new CommonMapModel()).updateFromData(data[mapId]);
                }
                model.fireEvent('mapsChanged');
            },
            // Map:end
            
            // Cell:start
            makeUnknownCell: locId => (new CellModel()).updateFromData({locId:locId, c:'unk'}),
            getCell: locId => cellData[locId],
            getCellByLocArr: locArr => cellData[locArrToId(locArr)],
            storeCellData: data => {
                const cellData = getCellData();
                for (const locId in data) {
                    // Fixup cellDatum into an Object ready to be used as attrs to a new or existing
                    // Cell. A big part of this is converting all entityDatum to EntityModels.
                    const cellDatum = data[locId],
                        entities = cellDatum.ent;
                    if (entities) {
                        let i = entities.length;
                        while (i--) entities[i] = makeEntityFromData(entities[i]);
                    } else {
                        cellDatum.ent = null;
                    }
                    
                    for (const attrName of COMPASS_FIELDS) cellDatum[attrName] ??= null;
                    
                    // Create/Update the CellModel
                    const cell = model.getCell(locId) ?? (cellData[locId] = new CellModel());
                    cell.setLocId(locId);
                    cell.updateFromData(cellDatum);
                }
                model.fireEvent('cellsChanged');
            },
            // Cell:end
            
            
            // Methods /////////////////////////////////////////////////////////
            wipeClean: () => {
                model.maxCharacters = 0;
                characters.length = 0;
                model.cleanupOnExitWorld();
            },
            
            cleanupOnExitWorld: () => {
                mapData = {};
                model.fireEvent('mapsChanged');
                cellData = {};
                clearFixtureCache();
                clearItemCache();
                // Purge non-Characters.
                for (const entityId in entityData) {
                    const entity = entityData[entityId];
                    if (!entity.isA(CharacterModel)) {
                        delete entityData[entityId];
                    }
                }
                model.fireEvent('cellsChanged');
            }
        });
    
    CommonCellModel.FACE_MODEL_CLASS = CommonFaceModel;
    CommonCellModel.INVENTORY_MODEL_CLASS = CellInventoryModel;
    CommonCellModel.FIXTURE_MODEL_CLASS = CommonFixtureModel;
    CommonEntityModelMixin.INVENTORY_MODEL_CLASS = EntityInventoryModel;
    Inventory.ITEM_MODEL_CLASS = Item;
})(orb);
