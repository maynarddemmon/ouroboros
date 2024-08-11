let mapData = {},
    cells = {},
    compositionsByCompId = {};

const orb = require('./orb.js'),
    
    objectKeys = Object.keys,
    
    {
        JS:{Class:JSClass}, 
        tym:{
            Eventable,
            AccessorSupport:{generateSetterName}
        }
    } = require('../../../lib/tym.js'),
    
    {
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
        // Life Cycle //////////////////////////////////////////////////////////
        init: function(attrs) {
            attrs[FIELD_COMPOSITION] ??= 'v1';
            
            this.callSuper(attrs);
        },
        
        
        // Accessors ///////////////////////////////////////////////////////////
        [generateSetterName(FIELD_COMPOSITION)]: function(v) {
            this.set(FIELD_COMPOSITION, v, true);
            this.notifyAllChangeListeners();
        },
        getComposition: function() {return this[FIELD_COMPOSITION];},
        getCompositionObject: function() {
            return compositionsByCompId[this.getComposition()];
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
            const isSpirit = character.isSpirit(),
                comp = this.getCompositionObject(),
                solidity = comp.getSolidity();
            if (isSpirit) {
                return true;
            } else {
                return solidity >= 0 && solidity < 1;
            }
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
            if (!worldMap.isReady) return;
            
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
        }
    }),
    
    getMapData = mapId => mapData[mapId],
    
    coerceToLocId = locArrOrId => (typeof locArrOrId === 'string' ? locArrOrId : locArrToId(locArrOrId)),
    cellExistsForId = locId => getCell(locId) != null,
    cellExistsForArr = locArr => getCellByLocArr(locArr) != null,
    cellExists = locArrOrId => cellExistsForId(locArrToId(locArr)),
    
    makeCell = params => new Cell(params),
    getCell = (locId, returnDefault) => cells[locId] ?? (returnDefault ? makeCell() : null),
    getCellByLocArr = locArr => getCell(locArrToId(locArr)),
    setCell = (locId, cell) => {
        cells[locId] = cell;
        cell.locId = locId;
        return cell;
    },
    
    getCellsToObserve = (character, newCell) => {
        const retval = [];
        if (newCell) {
            const distance = character.getMonitorDistance();
            if (distance >= 0) {
                // FIXME: for now do a fixed NxN grid around the character
                const locArr = locIdToArr(newCell.locId),
                    locArrCopy = locArr.slice();
                for (let x = -distance; x <= distance; x++) {
                    locArrCopy[1] = locArr[1] + x;
                    for (let y = -distance; y <= distance; y++) {
                        locArrCopy[2] = locArr[2] + y;
                        retval.push(getCell(locArrToId(locArrCopy), true));
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
        
        worldMap.isReady = true;
        
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
        
        isReady:false,
        
        getCell:getCell,
        getCellByLocArr:getCellByLocArr,
        cellExistsForArr:cellExistsForArr,
        makeAndSetCell: (locArrOrId, params) => setCell(coerceToLocId(locArrOrId), makeCell(params)),
        
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
                
                // Send data for new cells the listener immediately
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