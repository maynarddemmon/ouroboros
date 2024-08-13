let isReady = false,
    mapData = {},
    cells = {},
    compositionsByCompId = {};

const orb = require('./orb.js'),
    
    objectKeys = Object.keys,
    
    {
        JS:{Class:JSClass}, 
        tym:{
            Eventable,
            getRandomInt,
            AccessorSupport:{generateSetterName}
        }
    } = require('../../../lib/tym.js'),
    
    {
        cellOffsetsByDistance,
        cell:{FIELD_COMPOSITION, FIELD_ENTITIES},
        composition
    } = require('../common/common.js'),
    {locIdToArr, locArrToId, locArrToMapId} = require('../common/util.js'),
    {TYPE_CELL_DATA} = require('../common/SocketProtocol.js'),
    accountService = require('./AccountService.js'),
    
    FILENAME_WORLD_MAP = 'world_map',
    
    FIELD_SOLIDITY = 'solidity',
    
    Composition = new JSClass('Composition', Eventable, {
        getSolidity: function() {return this[FIELD_SOLIDITY];}
    }),
    
    Cell = new JSClass('Cell', Eventable, {
        // Accessors ///////////////////////////////////////////////////////////
        [generateSetterName(FIELD_COMPOSITION)]: function(v) {
            this.set(FIELD_COMPOSITION, v, true);
            this.notifyAllChangeListeners();
        },
        setComposition: function(v) {this.set(FIELD_COMPOSITION, v);},
        getComposition: function() {return this[FIELD_COMPOSITION];},
        getCompositionObject: function() {
            return compositionsByCompId[this.getComposition()];
        },
        
        isCompositionVoid: function() {return this.getCompositionObject().solidity === -1;},
        isCompositionAether: function() {
            switch (this.getComposition()) {
                case 'v3':
                case 'v4':
                    return true;
                default:
                    return false;
            }
        },
        
        
        // Methods /////////////////////////////////////////////////////////////
        getAsData: function() {
            return {
                [FIELD_COMPOSITION]:this[FIELD_COMPOSITION]
            };
        },
        getAsDataForCharacter: function(character) {
            const retval = this.getAsData(),
                entities = this.entities;
            if (entities && entities.size > 0) {
                const values = entities.values(),
                    characterId = character.getId(),
                    accum = [];
                for (const entity of values) {
                    if (entity.getId() !== characterId) {
                        accum.push(entity.getAsDataForCharacter(character));
                    }
                }
                if (accum.length > 0) retval[FIELD_ENTITIES] = accum;
            }
            return retval;
        },
        
        mayMoveInto: function(character) {
            return orb.rules.characterMayMoveIntoCell(character, this);
        },
        
        // ChangeListener //
        getChangeListeners: function() {
            return this._changeListeners ??= new Set();
        },
        addChangeListener: function(character) {
            this.getChangeListeners().add(character);
        },
        removeChangeListener: function(character) {
            this.getChangeListeners().delete(character);
        },
        notifyAllChangeListeners: function() {
            if (!isReady) return;
            
            const self = this;
            self.getChangeListeners().forEach(character => {
                accountService.addMessageToUser(character.getUserId(), {
                    type:TYPE_CELL_DATA, msg:{[self.locId]:self.getAsDataForCharacter(character)}
                });
            });
        },
        
        // Entities //
        getEntitiesMap: function() {return this.entities ??= new Map();},
        addEntity: function(entity) {
            this.getEntitiesMap().set(entity.getId(), entity);
            this.notifyAllChangeListeners();
        },
        removeEntity: function(entity) {return this.removeEntityById(entity.getId());},
        removeEntityById: function(entityId) {
            const entities = this.getEntitiesMap(),
                removedEntity = entities.get(entityId);
            if (removedEntity) {
                entities.delete(entityId);
                this.notifyAllChangeListeners();
                return removedEntity;
            }
        },
        
        getSpiritEntityCount: function(atLeast) {
            return this.getEntityCount(entity => entity.isSpirit(), atLeast);
        },
        
        getAstralProjectedEntityCount: function(atLeast) {
            return this.getEntityCount(entity => entity.isAstralProjected(), atLeast);
        },
        
        getCorporealEntityCount: function(atLeast) {
            return this.getEntityCount(entity => !entity.isSpirit() && !entity.isAstralProjected(), atLeast);
        },
        
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
        }
    }),
    
    getMapData = mapId => mapData[mapId],
    
    coerceToLocId = locArrOrId => (typeof locArrOrId === 'string' ? locArrOrId : locArrToId(locArrOrId)),
    cellExistsForId = locId => getCell(locId) != null,
    cellExistsForArr = locArr => getCellByLocArr(locArr) != null,
    cellExists = locArrOrId => cellExistsForId(locArrToId(locArr)),
    
    makeCell = params => new Cell(params),
    makeAndSetCell = (locArrOrId, params) => setCell(coerceToLocId(locArrOrId), makeCell(params)),
    makeAndSetMissingCell = locId => {
        let comp;
        switch (getRandomInt(0,1)) {
            case 0: comp = 'v1'; break;
            case 1: comp = 'v2'; break;
        }
        return makeAndSetCell(locId, {[FIELD_COMPOSITION]:comp});
    },
    
    getCell = (locId, makeIfMissing) => cells[locId] ?? (makeIfMissing ? makeAndSetMissingCell(locId) : null),
    getCellByLocArr = (locArr, makeIfMissing) => getCell(locArrToId(locArr), makeIfMissing),
    setCell = (locId, cell) => {
        cells[locId] = cell;
        cell.locId = locId;
        return cell;
    },
    
    getCellsToObserve = (character, newCell) => {
        const retval = [];
        if (newCell) {
            const distance = character.getMonitorDistance();
            if (distance >= 0 && distance < cellOffsetsByDistance.length) {
                const offsets = cellOffsetsByDistance[distance],
                    locArr = locIdToArr(newCell.locId),
                    baseX = locArr[1],
                    baseY = locArr[2];
                for (const offset of offsets) {
                    locArr[1] = baseX + offset[0];
                    locArr[2] = baseY + offset[1];
                    retval.push(getCell(locArrToId(locArr), true));
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
    
    live = (resolve, reject) => {
        console.log('Restoring World Maps...');
        
        console.log('  Making Compositions...');
        for (const compId in composition) {
            compositionsByCompId[compId] = new Composition(composition[compId]);
        }
        console.log('  Constructed ' + objectKeys(compositionsByCompId).length + ' Composition Objects.');
        
        const jsonData = orb.readDataFile(FILENAME_WORLD_MAP);
        if (jsonData) {
            mapData = jsonData.mapData || {};
            console.log('  Loaded ' + objectKeys(mapData).length + ' maps.');
            
            const cellData = jsonData.cellData || {};
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
        
        orb.saveDataToFile(FILENAME_WORLD_MAP, {
            mapData:mapData,
            cellData:cellData
        });
        console.log('  Saved ' + objectKeys(mapData).length + '  maps.');
        console.log('  Saved ' + objectKeys(cells).length + ' cells.');
        
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
        
        clearListenersForCharacter: function(character) {
            worldMap.updateListenersForCharacter(character);
        },
        
        updateListenersForCharacter: function(character, newCell) {
            const observedCells = character.getObservedCells(),
                newObservedCells = getCellsToObserve(character, newCell),
                {inAOnly, inBoth, inBOnly} = intersectCellArrays(observedCells, newObservedCells);
            
            // Stop Observing
            for (const cell of inAOnly) cell.removeChangeListener(character);
            
            // Start Observing
            if (inBOnly.length > 0) {
                const msgAccum = {};
                for (const cell of inBOnly) {
                    cell.addChangeListener(character);
                    msgAccum[cell.locId] = cell.getAsDataForCharacter(character);
                }
                
                // Send data for new cells to the listener immediately
                accountService.addMessageToUser(character.getUserId(), {type:TYPE_CELL_DATA, msg:msgAccum});
            }
            
            // Quickly update observedCells in character
            character.setObservedCells([...inBoth, ...inBOnly])
        },
        
        getMapDataForCharacter: character => {
            const locArr = character.getLocArr(),
                accum = {};
            if (locArr) {
                const mapId = locArrToMapId(locArr);
                accum[mapId] = getMapData(mapId);
            }
            return accum;
        }
    };