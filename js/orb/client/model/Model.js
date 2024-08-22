(pkg => {
    let worldClockIntervalId,
        mapData,
        cellData;
    
    const {
            Node, Eventable,
            AccessorSupport:{generateSetterName}
        } = myt,
        
        {
            CommonEntityModelMixin,
            CommonCharacterModelMixin,
            greek:{TYPE_MOVE},
            entity:{FIELD_ID},
            character:{
                FIELD_LOCK_MOVE, FIELD_LOCK_ACTION, FIELD_LOCK_REACT, FIELD_LOCK_FREE
            },
            cell:{FIELD_COMPOSITION, FIELD_ENTITIES},
            composition,
            permissions:{
                PERM_CREATOR
            }
        } = common
        
        getMapData = () => mapData ?? (mapData = {}),
        getCellData = () => cellData ?? (cellData = {}),
        
        entityData = {},
        characters = [],
        
        EntityModel = new JS.Class('EntityModel', Eventable, {
            include:[CommonEntityModelMixin],
            
            set: function(attrName, v, skipSetter) {
                const curValue = this[attrName],
                    retval = this.callSuper(attrName, v, skipSetter),
                    newValue = this[attrName];
                if (this.inited && curValue !== newValue) {
                    model?.fireEvent('entityChanged', {entity:this, attr:attrName, value:newValue});
                }
                return retval;
            }
        }),
        
        CharacterModel = new JS.Class('CharacterModel', EntityModel, {
            include:[CommonCharacterModelMixin],
            
            
            // Methods /////////////////////////////////////////////////////////
            canMove: function() {
                return this[FIELD_LOCK_MOVE] == null || this[FIELD_LOCK_MOVE] <= model.worldClockTime;
            },
            
            doMove: function(direction) {
                if (this.canMove()) {
                    // Pre-emptive indefinite lock. Will be updated once the
                    // server handles the character's movement.
                    this[FIELD_LOCK_MOVE] = Number.MAX_SAFE_INTEGER;
                    
                    pkg.websocket.sendTypedMessage(TYPE_MOVE, {id:this.id, direction:direction});
                    return true;
                }
                return false;
            },
            
            canAct: function() {
                return this[FIELD_LOCK_ACTION] == null || this[FIELD_LOCK_ACTION] <= model.worldClockTime;
            },
            
            doAction: function(type, params) {
                if (this.canAct()) {
                    // Pre-emptive indefinite lock. Will be updated once the
                    // server handles the character's action.
                    this[FIELD_LOCK_ACTION] = Number.MAX_SAFE_INTEGER;
                    
                    pkg.websocket.sendTypedMessage(type, {id:this.id, ...params});
                    return true;
                }
                return false;
            },
            
            canFree: function() {
                return this[FIELD_LOCK_FREE] == null || this[FIELD_LOCK_FREE] <= model.worldClockTime;
            },
            
            doFree: function(type, params) {
                if (this.canFree()) {
                    // Pre-emptive indefinite lock. Will be updated once the
                    // server handles the character's action.
                    this[FIELD_LOCK_FREE] = Number.MAX_SAFE_INTEGER;
                    
                    pkg.websocket.sendTypedMessage(type, {id:this.id, ...params});
                    return true;
                }
                return false;
            }
        }),
        
        model = pkg.model = new JS.Singleton('Model', Node, {
            // Entity:start
            getEntityById: entityId => entityData[entityId],
            setEntity: (entityId, entity) => entityData[entityId] = entity,
            removeEntity: entityId => delete entityData[entityId],
            makeEntityFromData: entityDatum => {
                const entityId = entityDatum[FIELD_ID];
                let entity = model.getEntityById(entityId);
                if (entity) {
                    // Update
                    entity.callSetters(entityDatum);
                } else {
                    // Create
                    entity = model.setEntity(entityId, new EntityModel(entityDatum));
                }
                return entity;
            },
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
                        const existingCharacter = model.getCharacterById(datum[FIELD_ID]);
                        if (existingCharacter) {
                            existingCharacter.callSetters(datum);
                        } else {
                            const character = new CharacterModel(datum);
                            if (character) {
                                characters.push(character);
                                model.setEntity(character.getId(), character);
                            }
                        }
                    }
                }
                model.fireEvent('characters', characters);
            },
            addCharacterFromData: datum => {
                const character = new CharacterModel(datum);
                if (character) {
                    characters.push(character);
                    model.setEntity(character.getId(), character);
                    model.fireEvent('characters', characters);
                }
            },
            
            updateCharacterFromData: datum => {
                const existingCharacter = model.getCharacterById(datum[FIELD_ID]);
                if (existingCharacter) {
                    existingCharacter.callSetters(datum);
                    return existingCharacter;
                }
                return null;
            },
            
            removeCharacterById: id => {
                let i = characters.length;
                while (i) {
                    if (characters[--i].id === id) {
                        characters.splice(i, 1);
                        model.removeEntity(id);
                        model.fireEvent('characters', characters);
                        return true;
                    }
                }
                return false;
            },
            // Characters:end
            
            // Time:start
            setWorldClockTick: v => {
                model.set('worldClockTick', v, true);
            },
            
            setWorldClockTime: v => {
                model.set('worldClockTime', v, true);
            },
            
            updateWorldClockTime: v => {
                if (worldClockIntervalId) clearInterval(worldClockIntervalId);
                model.setWorldClockTime(v);
                worldClockIntervalId = setInterval(() => {
                    model.setWorldClockTime(model.worldClockTime + 1);
                }, model.worldClockTick);
            },
            // Time:end
            
            // Map and Cell
            clearMapAndCellData: () => {
                mapData = {};
                model.fireEvent('mapsChanged');
                cellData = {};
                model.fireEvent('cellsChanged');
            },
            
            // Map:start
            getMapDatum: mapId => mapData[mapId],
            storeMapData: data => {
                const mapData = getMapData();
                for (const key in data) mapData[key] = data[key];
                model.fireEvent('mapsChanged');
            },
            // Map:end
            
            // Cell:start
            getCellDatum: locId => cellData[locId],
            getCellComposition: locId => {
                const cellDatum = model.getCellDatum(locId);
                if (cellDatum) return composition[cellDatum[FIELD_COMPOSITION]];
            },
            storeCellData: data => {
                const cellData = getCellData();
                for (const locId in data) {
                    const cellDatum = data[locId],
                        existingDatum = model.getCellDatum(locId);
                    
                    // Convert all entityDatum to EntityModels
                    const entities = cellDatum[FIELD_ENTITIES];
                    let i = entities?.length ?? 0;
                    while (i--) entities[i] = model.makeEntityFromData(entities[i]);
                    
                    if (existingDatum) {
                        existingDatum[FIELD_COMPOSITION] = cellDatum[FIELD_COMPOSITION];
                        existingDatum[FIELD_ENTITIES] = cellDatum[FIELD_ENTITIES] || null;
                    } else {
                        cellDatum.locId = locId;
                        cellData[locId] = cellDatum;
                    }
                }
                model.fireEvent('cellsChanged');
            },
            // Cell:end
            
            // Methods /////////////////////////////////////////////////////////
            wipeClean: () => {
                model.maxCharacters = 0;
                characters = [];
                model.clearMapAndCellData();
            }
        });
})(orb);
