let isReady = false;

const orb = global.orb,
    
    objectKeys = Object.keys,
    
    {
        JS:{Class:JSClass}, 
        tym:{Eventable, getRandom, getRandomInt}
    } = require('../../../lib/tym.js'),
    
    {
        locArrToId, cellOffsetsByDistance, locIdToMapId,
        facing:{NORTH, SOUTH, EAST, WEST},
        composition:{MEL_LOOKUP},
        greek:{TYPE_CELL_DATA, TYPE_SOUND, TYPE_EXPOSITION},
        map:{CommonMapModel}
    } = global.urob,
    
    {
        CommonFaceModel, CommonCellModel, CommonFixtureModel
    } = require('../common/common.js'),
    {addMessageToUser} = require('./AccountService.js'),
    
    sendMsgToCharacter = (character, type, msg) => {
        addMessageToUser(character.getUserId(), {type:type, msg:msg});
    },
    
    sendCellDataMsgToCharacter = (character, msgAccum) => {
        if (objectKeys(msgAccum).length > 0) sendMsgToCharacter(character, TYPE_CELL_DATA, msgAccum);
    },
    
    FILENAME_MAPS = 'maps',
    FILENAME_CELLS = 'cells',
    
    maps = {},
    cells = {},
    fixtures = {},
    
    MapModel = new JSClass('MapModel', CommonMapModel, {
        // Methods /////////////////////////////////////////////////////////////
        getAsData: function() {
            return {
                name:this.name,
                description:this.description,
                elements:this.elements
            };
        },
        
        getMissingCellComposition: function() {
            const elements = this.getElements();
            
            let matter = getRandomInt(1,100),
                energy = getRandomInt(1,100),
                life = getRandomInt(1,100);
            
            if (matter <= elements.earth) {
                matter = 0;
            } else if (matter <= elements.earth + elements.air) {
                matter = 1;
            } else {
                matter = 2;
            }
            
            if (energy <= elements.fire) {
                energy = 0;
            } else if (energy <= elements.fire + elements.water) {
                energy = 1;
            } else {
                energy = 2;
            }
            
            if (life <= elements.light) {
                life = 0;
            } else if (life <= elements.light + elements.shadow) {
                life = 1;
            } else {
                life = 2;
            }
            
            return MEL_LOOKUP[matter][energy][life];
        }
    }),
    
    FixtureModel = new JSClass('FixtureModel', CommonFixtureModel, {
        init: function(attrs) {
            const id = attrs.id ??= orb.getFixtureGuid();
            this.callSuper(attrs);
            fixtures[id] = this;
        },
        
        getAsData: function() {
            return {
                template:this.template,
                state:this.state
            };
        },
        
        setStateByName: function(stateName, value) {
            this.callSuper(stateName, value);
            if (this.inited) {
                const cell = this.getCell() ?? this.getFace()?.getCell();
                cell?.notifyAllVisualChangeListenersThatCellChanged();
            }
        },
        
        doInteractionForCharacter: function(character, interactionName) {
            const template = this.getTemplateObject(),
                failureMsg = template.doInteraction(this, character, interactionName);
            
            // Make sound if successful
            if (!failureMsg) {
                const randomSounds = template.getSoundForInteraction(this, character, interactionName);
                if (randomSounds) {
                    let message,
                        volume;
                    if (Array.isArray(randomSounds)) {
                        const rand = getRandom();
                        for (const entry of randomSounds) {
                            if (rand < entry[0]) {
                                message = entry[1];
                                volume = entry[2];
                                break;
                            }
                        }
                    } else {
                        // Simple sound was generated
                        message = randomSounds;
                    }
                    
                    if (message) {
                        this.getParentCell()?.notifyAllAuditoryChangeListeners(TYPE_SOUND, {
                            from:this.getId(), type:'fixture', volume:volume ?? 2, message:message
                        }, true);
                    }
                }
            }
            
            return failureMsg;
        }
    }),
    
    FaceModel = new JSClass('FaceModel', CommonFaceModel, {
        init: function(attrs) {
            const cell = attrs.cell;
            if (cell) {
                this.setCell(cell);
                delete attrs.cell;
            }
            this.callSuper(attrs);
        },
        
        setC: function(v) {
            this.callSuper(v);
            if (this.inited) this.getCell()?.notifyAllVisualChangeListenersThatCellChanged();
        },
        
        makeFixtureFromDatum: datum => new FixtureModel(datum),
        
        getAsData: function() {
            const retval = {
                    c:this.c
                },
                fixturesData = this.getFixturesAsData();
            if (fixturesData) retval.fix = fixturesData;
            return retval;
        },
    }),
    
    CellModel = new JSClass('CellModel', CommonCellModel, {
        // Accessors ///////////////////////////////////////////////////////////
        getAnotherCell: locId => getCell(locId),
        
        setC: function(v) {
            this.callSuper(v);
            if (this.inited) this.notifyAllVisualChangeListenersThatCellChanged();
        },
        
        setN: function(v) {
            this.callSuper(v);
            if (this.inited) this.notifyAllVisualChangeListenersThatCellChanged();
        },
        setS: function(v) {
            this.callSuper(v);
            if (this.inited) this.notifyAllVisualChangeListenersThatCellChanged();
        },
        setE: function(v) {
            this.callSuper(v);
            if (this.inited) this.notifyAllVisualChangeListenersThatCellChanged();
        },
        setW: function(v) {
            this.callSuper(v);
            if (this.inited) this.notifyAllVisualChangeListenersThatCellChanged();
        },
        setT: function(v) {
            this.callSuper(v);
            if (this.inited) this.notifyAllVisualChangeListenersThatCellChanged();
        },
        setB: function(v) {
            this.callSuper(v);
            if (this.inited) this.notifyAllVisualChangeListenersThatCellChanged();
        },
        
        // Fixtures //
        makeFixtureFromDatum: datum => new FixtureModel(datum),
        
        // Entities //
        getEntitiesMap: function() {return this.entities ??= new Map();},
        addEntity: function(entity) {
            this.getEntitiesMap().set(entity.getId(), entity);
            if (this.inited) this.notifyAllVisualChangeListenersThatCellChanged();
        },
        removeEntity: function(entity) {return this.removeEntityById(entity.getId());},
        removeEntityById: function(entityId) {
            const entities = this.getEntitiesMap(),
                removedEntity = entities.get(entityId);
            if (removedEntity) {
                entities.delete(entityId);
                if (this.inited) this.notifyAllVisualChangeListenersThatCellChanged();
                return removedEntity;
            }
        },
        
        getSpiritEntityCount: function(atLeast) {return this.getEntityCount(entity => entity.isSpirit(), atLeast);},
        getAstralProjectedEntityCount: function(atLeast) {return this.getEntityCount(entity => entity.isAstralProjected(), atLeast);},
        getCorporealEntityCount: function(atLeast) {return this.getEntityCount(entity => !entity.isSpirit() && !entity.isAstralProjected(), atLeast);},
        getEntityCount: function(filterFunc, atLeast) {
            const entities = this.entities;
            if (filterFunc) {
                let count = 0;
                if (entities) {
                    for (const entity of entities.values()) {
                        if (filterFunc(entity)) {
                            count++;
                            if (atLeast && count >= atLeast) return true;
                        }
                    }
                }
                return atLeast ? false : count;
            } else {
                if (atLeast) {
                    return entities ? entities.size >= atLeast : false;
                } else {
                    return entities ? entities.size : 0;
                }
            }
        },
        
        // Methods /////////////////////////////////////////////////////////////
        getAsData: function() {
            const retval = {
                    c:this.c,
                    n:this.n?.getAsData(),
                    s:this.s?.getAsData(),
                    e:this.e?.getAsData(),
                    w:this.w?.getAsData(),
                    t:this.t?.getAsData(),
                    b:this.b?.getAsData()
                },
                fixturesData = this.getFixturesAsData();
            if (fixturesData) retval.fix = fixturesData;
            return retval;
        },
        getAsDataForCharacter: function(character) {
            const retval = this.getAsData(),
                entities = this.entities;
            if (entities?.size > 0) {
                const accum = [],
                    characterId = character.getId();
                
                for (const entity of entities.values()) {
                    if (entity.getId() !== characterId) accum.push(entity.getAsDataForCharacter(character));
                }
                if (accum.length > 0) retval.ent = accum;
            }
            return retval;
        },
        
        mayMoveInto: function(character, compassDirection) {
            return orb.rules.characterMayMoveOutOfCell(character, compassDirection) && 
                orb.rules.characterMayMoveIntoCell(character, compassDirection, this);
        },
        
        // Change Listeners //
        getVisualChangeListeners: function() {return this._visualChangeListeners ??= new Set();},
        getAuditoryChangeListeners: function() {return this._auditoryChangeListeners ??= new Set();},
        
        addVisualChangeListener: function(character) {this.getVisualChangeListeners().add(character);},
        addAuditoryChangeListener: function(character) {this.getAuditoryChangeListeners().add(character);},
        
        removeVisualChangeListener: function(character) {this.getVisualChangeListeners().delete(character);},
        removeAuditoryChangeListener: function(character) {this.getAuditoryChangeListeners().delete(character);},
        
        notifyAllVisualChangeListenersThatCellChanged: function() {
            if (isReady) {
                const self = this,
                    locId = self.locId;
                for (const character of self.getVisualChangeListeners()) {
                    sendCellDataMsgToCharacter(character, {[locId]:self.getAsDataForCharacter(character)});
                }
            }
        },
        notifyAllAuditoryChangeListenersThatCellChanged: function() {
            if (isReady) {
                const self = this,
                    locId = self.locId;
                for (const character of self.getAuditoryChangeListeners()) {
                    sendCellDataMsgToCharacter(character, {[locId]:self.getAsDataForCharacter(character)});
                }
            }
        },
        
        notifyAllVisualChangeListeners: function(type, msg, includeLocId) {
            if (isReady) {
                if (includeLocId) msg.locId = this.locId;
                for (const character of this.getVisualChangeListeners()) {
                    sendMsgToCharacter(character, type, msg);
                }
            }
        },
        notifyAllAuditoryChangeListeners: function(type, msg, includeLocId) {
            if (isReady) {
                if (includeLocId) msg.locId = this.locId;
                for (const character of this.getAuditoryChangeListeners()) {
                    sendMsgToCharacter(character, type, msg);
                }
            }
        },
        
        sendExposition: function(message, medium) {
            worldMap.sendExpositionToCell(this, message, medium);
        }
    }),
    
    makeMap = params => new MapModel(params),
    getMap = mapId => maps[mapId],
    setMap = (mapId, map) => {
        maps[mapId] = map;
        map.mapId = mapId;
        return map;
    },
    
    coerceToLocId = locArrOrId => (typeof locArrOrId === 'string' ? locArrOrId : locArrToId(locArrOrId)),
    cellExistsForId = locId => getCell(locId) != null,
    cellExistsForArr = locArr => getCellByLocArr(locArr) != null,
    cellExists = locArrOrId => cellExistsForId(locArrToId(locArr)),
    
    makeCell = params => new CellModel(params),
    makeAndSetCell = (locArrOrId, params) => setCell(coerceToLocId(locArrOrId), makeCell(params)),
    makeAndSetMissingCell = locId => {
        let comp;
        const map = getMap(locIdToMapId(locId));
        if (map) {
            comp = map.getMissingCellComposition();
        } else {
            switch (getRandomInt(0,1)) {
                case 0: comp = 'v1'; break;
                case 1: comp = 'v2'; break;
            }
        }
        return makeAndSetCell(locId, {c:comp});
    },
    
    getCell = (locId, makeIfMissing) => cells[locId] ?? (makeIfMissing ? makeAndSetMissingCell(locId) : null),
    getCellByLocArr = (locArr, makeIfMissing) => getCell(locArrToId(locArr), makeIfMissing),
    setCell = (locId, cell) => {
        cells[locId] = cell;
        cell.setLocId(locId);
        return cell;
    },
    
    getCellsToObserve = (character, distance, newCell, useFacing) => {
        const retval = [];
        if (newCell) {
            if (distance >= 0 && distance < cellOffsetsByDistance.length) {
                let facingFilterFunction;
                if (useFacing) {
                    // Only observe cells in the facing direction. Also always observe the rear
                    // adjacent cell since interactions often occur there.
                    switch (character.getFacing()) {
                        case NORTH:facingFilterFunction = (offsetX, offsetY) => offsetY <= 0 || (offsetX === 0 && offsetY === -1); break;
                        case SOUTH:facingFilterFunction = (offsetX, offsetY) => offsetY >= 0 || (offsetX === 0 && offsetY === 1);; break;
                        case EAST: facingFilterFunction = (offsetX, offsetY) => offsetX >= 0 || (offsetX === -1 && offsetY === 0);; break;
                        case WEST: facingFilterFunction = (offsetX, offsetY) => offsetX <= 0 || (offsetX === 1 && offsetY === 0);; break;
                    }
                }
                
                const offsets = cellOffsetsByDistance[distance],
                    locArr = newCell.getLocArr(true),
                    baseX = locArr[1],
                    baseY = locArr[2];
                for (const [offsetX, offsetY] of offsets) {
                    if (!facingFilterFunction || facingFilterFunction(offsetX, offsetY)) {
                        locArr[1] = baseX + offsetX;
                        locArr[2] = baseY + offsetY;
                        retval.push(getCell(locArrToId(locArr), true));
                    }
                }
            }
        }
        return retval;
    },
    
    intersectCellArrays = (arrA, arrB) => {
        const map = {},
            inBoth = [],
            inAOnly = [],
            inBOnly = [];
        
        // Fill the map with elements from arrA
        for (const cell of arrA) {
            map[cell.locId] = [1, cell]; // Mark elements from arrA
        }
        
        // Process arrB and simultaneously determine the intersection 
        // and unique elements
        for (const cell of arrB) {
            if (map[cell.locId]) {
                inBoth.push(cell);
                map[cell.locId][0] = 0; // Mark as found in both arrays
            } else {
                inBOnly.push(cell);
            }
        }
        
        // Elements remaining in the map with value 1 are unique to arrA
        for (const locId in map) {
            const entry = map[locId];
            if (entry[0] === 1) inAOnly.push(entry[1]);
        }
        
        return {inAOnly, inBoth, inBOnly};
    },
    
    _updateVisualListenersForCharacter = (character, newCell, msgAccum) => {
        const observedCells = character.getVisualObservedCells(),
            newObservedCells = getCellsToObserve(character, character.getSightDistance(), newCell, true),
            {inAOnly, inBoth, inBOnly} = intersectCellArrays(observedCells, newObservedCells);
        
        // Stop Observing
        for (const cell of inAOnly) cell.removeVisualChangeListener(character);
        
        // Start Observing
        if (inBOnly.length > 0) {
            for (const cell of inBOnly) {
                cell.addVisualChangeListener(character);
                msgAccum[cell.locId] ??= cell.getAsDataForCharacter(character);
            }
        }
        
        // Quickly update observedCells in character
        character.setVisualObservedCells([...inBoth, ...inBOnly]);
    },
    
    _updateAuditoryListenersForCharacter = (character, newCell, msgAccum) => {
        const observedCells = character.getAuditoryObservedCells(),
            newObservedCells = getCellsToObserve(character, character.getHearDistance(), newCell, false),
            {inAOnly, inBoth, inBOnly} = intersectCellArrays(observedCells, newObservedCells);
        
        // Stop Observing
        for (const cell of inAOnly) cell.removeAuditoryChangeListener(character);
        
        // Start Observing
        if (inBOnly.length > 0) {
            for (const cell of inBOnly) {
                cell.addAuditoryChangeListener(character);
                msgAccum[cell.locId] ??= cell.getAsDataForCharacter(character);
            }
        }
        
        // Quickly update observedCells in character
        character.setAuditoryObservedCells([...inBoth, ...inBOnly]);
    },
    
    live = (resolve, reject) => {
        console.log('Restoring World Maps...');
        
        let jsonData = orb.readDataFile(FILENAME_MAPS);
        if (jsonData) {
            const mapData = jsonData || {};
            for (const mapId in mapData) {
                setMap(mapId, makeMap(mapData[mapId]));
            }
            console.log('  Loaded ' + objectKeys(maps).length + ' maps.');
        }
        
        jsonData = orb.readDataFile(FILENAME_CELLS);
        if (jsonData) {
            const cellData = jsonData || {};
            for (const locId in cellData) {
                setCell(locId, makeCell(cellData[locId]));
            }
            console.log('  Loaded ' + objectKeys(cells).length + ' cells.');
        }
        
        isReady = true;
        
        resolve();
    },
    
    die = (resolve, reject) => {
        console.log('Save World Maps');
        
        const cellData = {};
        for (const locId in cells) {
            cellData[locId] = cells[locId].getAsData();
        }
        
        const mapData = {};
        for (const mapId in maps) {
            mapData[mapId] = maps[mapId].getAsData();
        }
        
        orb.saveDataToFile(FILENAME_MAPS, mapData);
        console.log('  Saved ' + objectKeys(mapData).length + '  maps.');
        
        orb.saveDataToFile(FILENAME_CELLS, cellData);
        console.log('  Saved ' + objectKeys(cellData).length + ' cells.');
        
        resolve();
    },
    
    worldMap = module.exports = {
        lifeCycle: isBirth => new Promise((resolve, reject) => {
            if (isBirth) {
                live(resolve, reject);
            } else {
                die(resolve, reject);
            }
        }),
        
        getCell:getCell,
        getCellByLocArr:getCellByLocArr,
        cellExistsForArr:cellExistsForArr,
        makeAndSetCell:makeAndSetCell,
        
        getFixtureById:fixtureId => fixtures[fixtureId],
        
        getMapDataForCharacter: character => {
            // Send all mapData since it doesn't hurt and it's needed when a character changes maps.
            const mapData = {};
            for (const mapId in maps) {
                mapData[mapId] = maps[mapId].getAsData();
            }
            return mapData;
        },
        
        // Start:Listener Management
        clearListenersForCharacter: character => {
            const msgAccum = {};
            _updateVisualListenersForCharacter(character, null, msgAccum);
            _updateAuditoryListenersForCharacter(character, null, msgAccum);
            sendCellDataMsgToCharacter(character, msgAccum);
        },
        
        updateListenersForCharacter: (character, newCell) => {
            const msgAccum = {};
            _updateVisualListenersForCharacter(character, newCell, msgAccum);
            _updateAuditoryListenersForCharacter(character, newCell, msgAccum);
            sendCellDataMsgToCharacter(character, msgAccum);
        },
        
        updateVisualListenersForCharacter: (character, newCell) => {
            const msgAccum = {};
            _updateVisualListenersForCharacter(character, newCell, msgAccum);
            sendCellDataMsgToCharacter(character, msgAccum);
        },
        
        updateAuditoryListenersForCharacter: (character, newCell) => {
            const msgAccum = {};
            _updateAuditoryListenersForCharacter(character, newCell, msgAccum);
            sendCellDataMsgToCharacter(character, msgAccum);
        },
        // End:Listener Management
        
        // Start:expository messages
        sendExpositionToCharacter: (character, message, medium) => {
            medium ??= 'narrative';
            const msg = {msg:message, medium:medium};
            switch (medium) {
                case 'narrative':
                case 'mental':
                case 'visual':
                case 'auditory':
                    // All mediums are sent the same way for direct exposition to a character.
                    sendMsgToCharacter(character, TYPE_EXPOSITION, msg);
            }
        },
        sendExpositionToCell: (cell, message, medium) => {
            medium ??= 'narrative';
            const msg = {msg:message, medium:medium};
            switch (medium) {
                case 'narrative':
                case 'mental':
                    // Only characters in the cell will receive the exposition.
                    //sendMsgToCharacter(character, TYPE_EXPOSITION, msg);
                    break;
                case 'visual':
                    // The exposition emanates from the cell visually.
                    cell.notifyAllVisualChangeListeners(TYPE_EXPOSITION, msg, true);
                    break;
                case 'auditory':
                    // The exposition emanates from the cell aurally.
                    cell.notifyAllAuditoryChangeListeners(TYPE_EXPOSITION, msg, true);
                    break;
            }
        },
        /* FIXME: implement when needed.
        sendExpositionToMap: (map, msg, medium) => {},
        sendExpositionToEveryone: (msg, medium) => {}
        */
        // End:expository messages
    };

CommonCellModel.FACE_MODEL_CLASS = FaceModel;