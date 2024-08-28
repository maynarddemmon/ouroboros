(pkg => {
    let worldClockIntervalId,
        mapData,
        cellData,
        fixtureData;
    
    const JSClass = JS.Class,
        {
            Node, Eventable,
            AccessorSupport:{generateSetterName}
        } = myt,
        
        {
            CommonMapModel, CommonFaceModel, CommonCellModel, 
            CommonEntityModelMixin, CommonCharacterModelMixin,
            CommonFixtureTemplateModelMixin, CommonFixtureModel,
            greek:{TYPE_MOVE},
            fixture:{templates:fixtureTemplates},
            permissions:{
                PERM_CREATOR
            },
            locArrToId, locIdToArr,
        } = common,
        
        COMPASS_FIELDS = ['n', 's', 'e', 'w', 't', 'b'],
        
        getMapData = () => mapData ??= {},
        getCellData = () => cellData ??= {},
        
        // Fixture:start
        getFixtureData = () => fixtureData ??= {},
        makeFixtureFromDatum = datum => {
            const fixture = new CommonFixtureModel(datum);
            getFixtureData()[fixture.getId()] = fixture;
            return fixture;
        },
        // Fixture:end
        
        // Entity:start
        entityData = {},
        makeEntityFromData = entityDatum => {
            const entityId = entityDatum.id;
            let entity = model.getEntityById(entityId);
            if (entity) {
                // Update
                entity.callSetters(entityDatum);
            } else {
                // Create
                entity = setEntity(entityId, new EntityModel(entityDatum));
            }
            return entity;
        },
        setEntity = (entityId, entity) => entityData[entityId] = entity,
        removeEntity = entityId => delete entityData[entityId],
        // Entity:end
        
        characters = [],
        
        FaceModel = new JSClass('FaceModel', CommonFaceModel, {
            makeFixtureFromDatum:makeFixtureFromDatum,
        }),
        
        CellModel = new JSClass('CellModel', CommonCellModel, {
            init: function(attrs) {
                this.partsSeen = new Set();
                this.callSuper(attrs);
            },
            
            setEnt: function(v) {this.set('ent', v, true);},
            getEntities: function() {return this.ent;},
            
            setBeenSeen: function(v) {this.beenSeen = v;},
            hasBeenSeen: function() {return this.beenSeen;},
            
            setN: function(v) {
                if (v) {
                    v.cell = this;
                    this.callSuper(new FaceModel(v));
                } else {
                    this.callSuper(v);
                }
            },
            setS: function(v) {
                if (v) {
                    v.cell = this;
                    this.callSuper(new FaceModel(v));
                } else {
                    this.callSuper(v);
                }
            },
            setE: function(v) {
                if (v) {
                    v.cell = this;
                    this.callSuper(new FaceModel(v));
                } else {
                    this.callSuper(v);
                }
            },
            setW: function(v) {
                if (v) {
                    v.cell = this;
                    this.callSuper(new FaceModel(v));
                } else {
                    this.callSuper(v);
                }
            },
            setT: function(v) {
                if (v) {
                    v.cell = this;
                    this.callSuper(new FaceModel(v));
                } else {
                    this.callSuper(v);
                }
            },
            setB: function(v) {
                if (v) {
                    v.cell = this;
                    this.callSuper(new FaceModel(v));
                } else {
                    this.callSuper(v);
                }
            },
            
            // Fixtures //
            makeFixtureFromDatum:makeFixtureFromDatum
        }),
        
        EntityModel = new JSClass('EntityModel', Eventable, {
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
        
        CharacterModel = new JSClass('CharacterModel', EntityModel, {
            include:[CommonCharacterModelMixin],
            
            
            // Methods /////////////////////////////////////////////////////////
            canMove: function() {
                return this.lockMove == null || this.lockMove <= model.worldClockTime;
            },
            
            doMove: function(direction) {
                if (this.canMove()) {
                    // Pre-emptive indefinite lock. Will be updated once the
                    // server handles the character's movement.
                    this.lockMove = Number.MAX_SAFE_INTEGER;
                    
                    pkg.websocket.sendTypedMessage(TYPE_MOVE, {id:this.id, direction:direction});
                    return true;
                }
                return false;
            },
            
            canAct: function() {
                return this.lockAct == null || this.lockAct <= model.worldClockTime;
            },
            
            doAction: function(type, params) {
                if (this.canAct()) {
                    // Pre-emptive indefinite lock. Will be updated once the
                    // server handles the character's action.
                    this.lockAct = Number.MAX_SAFE_INTEGER;
                    
                    pkg.websocket.sendTypedMessage(type, {id:this.id, ...params});
                    return true;
                }
                return false;
            },
            
            canFree: function() {
                return this.lockFree == null || this.lockFree <= model.worldClockTime;
            },
            
            doFree: function(type, params) {
                if (this.canFree()) {
                    // Pre-emptive indefinite lock. Will be updated once the
                    // server handles the character's action.
                    this.lockFree = Number.MAX_SAFE_INTEGER;
                    
                    pkg.websocket.sendTypedMessage(type, {id:this.id, ...params});
                    return true;
                }
                return false;
            }
        }),
        
        model = pkg.model = new JS.Singleton('Model', Node, {
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
                        const existingCharacter = model.getCharacterById(datum.id);
                        if (existingCharacter) {
                            existingCharacter.callSetters(datum);
                        } else {
                            const character = new CharacterModel(datum);
                            if (character) {
                                characters.push(character);
                                setEntity(character.getId(), character);
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
                    setEntity(character.getId(), character);
                    model.fireEvent('characters', characters);
                }
            },
            
            updateCharacterFromData: datum => {
                const existingCharacter = model.getCharacterById(datum.id);
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
                for (const mapId in data) mapData[mapId] = new CommonMapModel(data[mapId]);
                model.fireEvent('mapsChanged');
            },
            // Map:end
            
            // Cell:start
            makeUnknownCell: locId => new CellModel({locId:locId, c:'unk'}),
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
                    
                    cellDatum.locId = locId;
                    for (const attrName of COMPASS_FIELDS) cellDatum[attrName] ??= null;
                    
                    // Create/Update the CellModel
                    const cell = model.getCell(locId) ?? (cellData[locId] = new CellModel());
                    cell.callSetters(cellDatum);
                }
                model.fireEvent('cellsChanged');
            },
            // Cell:end
            
            // Entity:start
            getEntityById: entityId => entityData[entityId],
            // Entity:end
            
            // Fixture:start
            getFixtureById: fixtureId => fixtureData[fixtureId],
            // Fixture:end
            
            
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
                fixtureData = {};
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
})(orb);
