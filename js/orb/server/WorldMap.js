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
    {locArrToId, locArrToMapId} = require('../common/util.js'),
    
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
        [generateSetterName(FIELD_COMPOSITION)]: function(v) {this.set(FIELD_COMPOSITION, v, true);},
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
        
        // Entities //
        getEntitiesMap: function() {return this.entities ??= new Map();},
        addEntity: function(entity) {
            this.getEntitiesMap().set(entity.getId(), entity);
        },
        removeEntity: function(entity) {return this.removeEntityById(entity.getId());},
        removeEntityById: function(entityId) {
            const entities = this.getEntitiesMap(),
                removedEntity = entities.get(entityId);
            if (removedEntity) {
                entities.delete(entityId);
                return removedEntity;
            }
        }
    }),
    
    getMapData = mapId => mapData[mapId],
    getCell = (locId, returnDefault) => cells[locId] ?? (returnDefault ? makeCell() : null),
    getCellByLocArr = (locArr, returnDefault) => getCell(locArrToId(locArr), returnDefault),
    setCell = (locId, cell) => {
        cells[locId] = cell;
        cell.locId = locId;
    },
    makeCell = params => new Cell(params),
    
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
        getCell:getCell,
        getCellByLocArr:getCellByLocArr,
        setCell:setCell,
        makeCell:makeCell,
        
        
        lifeCycle: isBirth => new Promise((resolve, reject) => {
            if (isBirth) {
                live(resolve, reject);
            } else {
                die(resolve, reject);
            }
        }),
        
        getMapDataForCharacter: character => {
            const locArr = character.getLocArr(),
                accum = {};
            if (locArr) {
                const mapId = locArrToMapId(locArr);
                accum[mapId] = getMapData(mapId);
            }
            return accum;
        },
        
        getCellDataForCharacter: character => {
            const locArr = character.getLocArr(),
                accum = {};
            if (locArr) {
                // FIXME: for now do a fixed NxN grid around the character
                const DISTANCE = 9;
                const locArrCopy = locArr.slice();
                for (let x = -DISTANCE; x <= DISTANCE; x++) {
                    locArrCopy[1] = locArr[1] + x;
                    for (let y = -DISTANCE; y <= DISTANCE; y++) {
                        locArrCopy[2] = locArr[2] + y;
                        const locId = locArrToId(locArrCopy),
                            cell = getCell(locId, true);
                        accum[locId] = cell.getAsDataForCharacter(character);
                    }
                }
            }
            return accum;
        }
    };