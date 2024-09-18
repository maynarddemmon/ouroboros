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
        fixture:{CommonFixtureModel},
        greek:{TYPE_CELL_DATA, TYPE_SOUND, TYPE_EXPOSITION, TYPE_ALTER_INVENTORY},
        map:{CommonMapModel},
        cell:{CommonFaceModel, CommonCellModel},
        inventory:{Inventory}
    } = global.urob,
    
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
        setStateByName: function(stateName, value) {
            this.callSuper(stateName, value);
            if (this.inited) {
                const cell = this.getCell() ?? this.getFace()?.getCell();
                cell?.notifyAllVisualChangeListenersThatCellChanged();
            }
        },
        
        updateFromData: function(datum) {
            const id = datum.id ??= orb.getFixtureGuid();
            return fixtures[id] = this.callSuper?.(datum);
        }
    }),
    
    makeFixtureFromDatum = datum => (new FixtureModel()).updateFromData(datum),
    
    FaceModel = new JSClass('FaceModel', CommonFaceModel, {
        setC: function(v) {
            this.callSuper(v);
            if (this.inited) this.getCell()?.notifyAllVisualChangeListenersThatCellChanged();
        },
        
        makeFixtureFromDatum:makeFixtureFromDatum
    }),
    
    notifyForInventoryAction = (inventory, item, action) => {
        if (isReady) {
            const cell = inventory.getCell(),
                cellId = cell.getId();
            for (const character of cell.getVisualChangeListeners()) {
                sendMsgToCharacter(character, TYPE_ALTER_INVENTORY, {
                    inventoryType:'cell',
                    action:action,
                    id:cellId, 
                    item:item.getAsData({character:character})
                });
            }
        }
    },
    
    InventoryModel = new JSClass('InventoryModel', Inventory, {
        init: function(attrs) {
            // All CellModels will have the same configuration for inventory
            attrs.maxCapacity = 1000;
            attrs.maxWeight = 100000;
            attrs.maxVolume = 100 * 100 * 100 * 27; // 3m cube in cubic cm.
            
            this.callSuper(attrs);
        },
        
        notifyForAdd: function(item) {notifyForInventoryAction(this, item, 'add');},
        notifyForUpdate: function(item) {notifyForInventoryAction(this, item, 'update');},
        notifyForRemove: function(item) {notifyForInventoryAction(this, item, 'remove');},
        
        getAsData: function(cfg) {
            const retval = this.callSuper(cfg);
            
            // All CellModels will have the same configuration for inventory so don't write the
            // details if we're saving to disk.
            if (cfg?.isSave) {
                delete retval.mc;
                delete retval.mw;
                delete retval.mv;
            }
            
            return retval;
        },
        
        updateFromData: function(datum) {
            // Don't change the values hard-coded in the init function.
            datum.mc = this.maxCapacity;
            datum.mw = this.maxWeight;
            datum.mv = this.maxVolume;
            
            this.callSuper(datum);
        }
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
        makeFixtureFromDatum:makeFixtureFromDatum,
        
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
        getCorporealEntityCount: function(atLeast) {return this.getEntityCount(entity => entity.isCorporeal(), atLeast);},
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
                    sendCellDataMsgToCharacter(character, {[locId]:self.getAsData({character:character})});
                }
            }
        },
        /*notifyAllAuditoryChangeListenersThatCellChanged: function() {
            if (isReady) {
                const self = this,
                    locId = self.locId;
                for (const character of self.getAuditoryChangeListeners()) {
                    sendCellDataMsgToCharacter(character, {[locId]:self.getAsData({character:character})});
                }
            }
        },*/
        
        notifyAllVisualChangeListeners: function(type, msg, includeLocId, characterToOmit) {
            if (isReady) {
                if (includeLocId) msg.locId = this.locId;
                for (const character of this.getVisualChangeListeners()) {
                    if (character !== characterToOmit) sendMsgToCharacter(character, type, msg);
                }
            }
        },
        notifyAllAuditoryChangeListeners: function(type, msg, characterToOmit) {
            if (isReady) {
                msg.locId = this.locId;
                for (const character of this.getAuditoryChangeListeners()) {
                    if (character !== characterToOmit) sendMsgToCharacter(character, type, msg);
                }
            }
        },
        
        sendExposition: function(message, medium, characterToOmit) {
            worldMap.sendExpositionToCell(this, message, medium, characterToOmit);
        },
        
        
        // Persistence and Serialization ///////////////////////////////////////
        getAsData: function(cfg) {
            const retval = this.callSuper?.(cfg) ?? {};
            
            // Don't save empty inventories to disk under any circumstances.
            if (
                cfg?.isSave && retval.inv &&
                (!retval.inv.it || retval.inv.it.length === 0)
            ) {
                delete retval.inv;
            }
            
            return retval;
        }
    }),
    
    getMap = mapId => maps[mapId],
    setMap = (mapId, map) => {
        maps[mapId] = map;
        map.mapId = mapId;
        return map;
    },
    
    makeAndSetCellFromDatum = (locId, datum) => setCell(locId, (new CellModel()).updateFromData(datum)),
    
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
        return makeAndSetCellFromDatum(locId, {c:comp});
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
                msgAccum[cell.locId] ??= cell.getAsData({character:character});
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
                msgAccum[cell.locId] ??= cell.getAsData({character:character});
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
                setMap(mapId, (new MapModel()).updateFromData(mapData[mapId]));
            }
            console.log('  Loaded ' + objectKeys(maps).length + ' maps.');
        }
        
        jsonData = orb.readDataFile(FILENAME_CELLS);
        if (jsonData) {
            const cellData = jsonData || {};
            for (const locId in cellData) {
                makeAndSetCellFromDatum(locId, cellData[locId]);
            }
            console.log('  Loaded ' + objectKeys(cells).length + ' cells.');
        }
        
        isReady = true;
        
        resolve();
    },
    
    die = (resolve, reject) => {
        console.log('Save World Maps');
        
        const mapData = {};
        for (const mapId in maps) mapData[mapId] = maps[mapId].getAsData({isSave:true});
        orb.saveDataToFile(FILENAME_MAPS, mapData);
        console.log('  Saved ' + objectKeys(mapData).length + '  maps.');
        
        const cellData = {};
        for (const locId in cells) cellData[locId] = cells[locId].getAsData({isSave:true});
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
        
        getFixtureById:fixtureId => fixtures[fixtureId],
        
        getMapDataForCharacter: character => {
            // Send all mapData since it doesn't hurt and it's needed when a character changes maps.
            const mapData = {};
            for (const mapId in maps) {
                mapData[mapId] = maps[mapId].getAsData({character:character});
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
        sendExpositionToCell: (cell, message, medium, characterToOmit) => {
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
                    cell.notifyAllVisualChangeListeners(TYPE_EXPOSITION, msg, true, characterToOmit);
                    break;
                case 'auditory':
                    // The exposition emanates from the cell aurally.
                    cell.notifyAllAuditoryChangeListeners(TYPE_EXPOSITION, msg, characterToOmit);
                    break;
            }
        },
        /* FIXME: implement when needed.
        sendExpositionToMap: (map, msg, medium) => {},
        sendExpositionToEveryone: (msg, medium) => {}
        */
        // End:expository messages
        
        // Start:sound messages
        DEFAULT_SOUND_VOLUME: 2,
        selectSoundRandomly: soundProbabilityArr => {
            const retval = {};
            if (!soundProbabilityArr) {
                // Nothing to select from so return {}
            } else if (soundProbabilityArr.length > 0) {
                const rand = getRandom();
                for (const entry of soundProbabilityArr) {
                    if (rand < entry[0]) {
                        retval.sound = entry[1];
                        retval.volume = entry[2] ?? worldMap.DEFAULT_SOUND_VOLUME;
                        break;
                    }
                }
            } else {
                const entry = soundProbabilityArr[0];
                retval.sound = entry[1];
                retval.volume = entry[2] ?? worldMap.DEFAULT_SOUND_VOLUME;
            }
            return retval;
        },
        
        broadcastSound: (fromObj, type, sound, volume) => {
            if (fromObj && sound) {
                fromObj.getCell().notifyAllAuditoryChangeListeners(TYPE_SOUND, {
                    from:fromObj.getId(), type:type, volume:volume, message:sound
                });
            }
        },
        
        generateSoundForEntityAction: (entity, actionType) => {
            let soundEffect = 'sound',
                volume = 1<<1;
            switch (actionType) {
                case 'teleport-arrive':
                    soundEffect = 'pop';
                    volume = 1<<5;
                    break;
                case 'teleport-leave':
                    soundEffect = 'pip';
                    volume = 1<<5;
                    break;
                case 'move':
                    soundEffect = 'footsteps';
                    volume = 1<<5;
                    break;
            }
            worldMap.broadcastSound(entity, actionType, '*' + soundEffect + '*', volume);
        }
        // End:sound messages
    };

CommonCellModel.FACE_MODEL_CLASS = FaceModel;
CommonCellModel.INVENTORY_MODEL_CLASS = InventoryModel;
