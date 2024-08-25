(pkg => {
    let worldClockIntervalId,
        mapData,
        cellData;
    
    const JSClass = JS.Class,
        {
            Node, Eventable,
            AccessorSupport:{generateSetterName}
        } = myt,
        
        {
            CommonMapModelMixin, CommonCompositionModelMixin, CommonFaceModelMixin, CommonCellModelMixin, 
            CommonEntityModelMixin, CommonCharacterModelMixin,
            CommonFixtureTemplateModelMixin, CommonFixtureModelMixin,
            greek:{TYPE_MOVE},
            composition:{compositions},
            fixture:{templates:fixtureTemplates},
            permissions:{
                PERM_CREATOR
            },
            util:{locArrToId, locIdToArr},
        } = common,
        
        COMPASS_FIELDS = ['n', 's', 'e', 'w', 't', 'b'],
        
        getMapData = () => mapData ??= {},
        getCellData = () => cellData ??= {},
        
        entityData = {},
        characters = [],
        
        fixtureTemplatesById = {},
        compositionsByCompId = {},
        
        MapModel = new JSClass('MapModel', Eventable, {
            include:[CommonMapModelMixin]
        }),
        
        CompositionModel = new JSClass('CompositionModel', Eventable, {
            include:[CommonCompositionModelMixin]
        }),
        
        FixtureTemplate = new JSClass('FixtureTemplate', Eventable, {
            include:[CommonFixtureTemplateModelMixin]
        }),
        
        FixtureModel = new JSClass('FixtureModel', Eventable, {
            include:[CommonFixtureModelMixin],
            
            getTemplateObject: () => {return fixtureTemplatesById[this.getTemplate()];},
        }),
        
        FaceModel = new JSClass('FaceModel', Eventable, {
            include:[CommonFaceModelMixin],
            
            getCompositionObject: function() {return compositionsByCompId[this.getComposition()];},
            
            // Fixtures //
            makeFixtureFromDatum: datum => new FixtureModel(datum),
        }),
        
        CellModel = new JSClass('CellModel', Eventable, {
            include:[CommonCellModelMixin],
            
            init: function(attrs) {
                this.partsSeen = new Set();
                this.callSuper(attrs);
            },
            
            setEnt: function(v) {this.set('ent', v, true);},
            getEntities: function() {return this.ent;},
            
            setBeenSeen: function(v) {this.beenSeen = v;},
            hasBeenSeen: function() {return this.beenSeen;},
            
            setLocId: function(v) {
                if (this.locId !== v) {
                    this.locId = v;
                    this.locArr = null;
                }
            },
            getLocArr: function() {return this.locArr ??= locIdToArr(this.locId);},
            getCompositionObject: function() {return compositionsByCompId[this.getComposition()];},
            
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
            makeFixtureFromDatum: datum => new FixtureModel(datum),
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
            // Entity:start
            getEntityById: entityId => entityData[entityId],
            setEntity: (entityId, entity) => entityData[entityId] = entity,
            removeEntity: entityId => delete entityData[entityId],
            makeEntityFromData: entityDatum => {
                const entityId = entityDatum.id;
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
                        const existingCharacter = model.getCharacterById(datum.id);
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
                for (const key in data) mapData[key] = new MapModel(data[key]);
                model.fireEvent('mapsChanged');
            },
            // Map:end
            
            // Fixtures:start
            getFixtureTemplate: id => fixtureTemplatesById[id],
            // Fixtures:end
            
            // Cell:start
            makeUnknownCell: locId => new CellModel({locId:locId, c:'unk'}),
            getCell: locId => cellData[locId],
            getCellByLocArr: locArr => cellData[locArrToId(locArr)],
            getCellComposition: locId => {
                const cell = model.getCell(locId);
                if (cell) return cell.getCompositionObject();
            },
            getComposition: compId => compositionsByCompId[compId],
            storeCellData: data => {
                const cellData = getCellData();
                for (const locId in data) {
                    // Fixup cellDatum into an Object ready to be used as attrs to a new or existing
                    // Cell. A big part of this is converting all entityDatum to EntityModels.
                    const cellDatum = data[locId],
                        entities = cellDatum.ent;
                    if (entities) {
                        let i = entities.length;
                        while (i--) entities[i] = model.makeEntityFromData(entities[i]);
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
            
            // Methods /////////////////////////////////////////////////////////
            wipeClean: () => {
                model.maxCharacters = 0;
                characters.length = 0;
                model.clearMapAndCellData();
            }
        });
    
    for (const compId in compositions) {
        compositionsByCompId[compId] = new CompositionModel(compositions[compId]);
    }
    for (const id in fixtureTemplates) {
        fixtureTemplatesById[id] = new FixtureTemplate(fixtureTemplates[id]);
    }
})(orb);
