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
        cell:{
            FIELD_COMPOSITION
        },
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
        getAsData: function(isForSave) {
            return {
                [FIELD_COMPOSITION]:this[FIELD_COMPOSITION]
            }
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
    }),
    
    getMapData = mapId => mapData[mapId],
    getCell = (locId, returnDefault) => {
        return cells[locId] ?? (returnDefault ? makeCell() : null);
    },
    setCell = (locId, cell) => {cells[locId] = cell;},
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
            cellData[locId] = cells[locId].getAsData(true);
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
                const DISTANCE = 2;
                const locArrCopy = locArr.slice();
                for (let x = -DISTANCE; x <= DISTANCE; x++) {
                    locArrCopy[1] = locArr[1] + x;
                    for (let y = -DISTANCE; y <= DISTANCE; y++) {
                        locArrCopy[2] = locArr[2] + y;
                        const locId = locArrToId(locArrCopy),
                            cell = getCell(locId, true);
                        accum[locId] =cell.getAsData(false);
                    }
                }
            }
            return accum;
        }
    };