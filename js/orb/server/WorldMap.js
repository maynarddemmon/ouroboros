let mapData = {},
    cellData = {};

const orb = require('./orb.js'),
    {locArrToId, locArrToMapId} = require('../common/util.js'),
    {
        character:{
            FIELD_LOC
        }
    } = require('../common/common.js'),
    
    FILENAME_WORLD_MAP = 'world_map',
    
    getMapData = mapId => mapData[mapId],
    getCellData = locId => cellData[locId],
    
    live = (resolve, reject) => {
        console.log('Restoring World Maps...');
        
        const jsonData = orb.readDataFile(FILENAME_WORLD_MAP);
        if (jsonData) {
            mapData = jsonData.mapData || {};
            console.log('  Loaded ' + Object.keys(mapData).length + ' map descriptions.');
            cellData = jsonData.cellData || {};
            console.log('  Loaded ' + Object.keys(cellData).length + ' cell descriptions.');
        }
        
        resolve();
    },
    
    die = (resolve, reject) => {
        console.log('Save World Maps');
        
        orb.saveDataToFile(FILENAME_WORLD_MAP, {
            mapData:mapData,
            cellData:cellData
        });
        
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
        
        getMapDataForCharacter: character => {
            const locArr = character[FIELD_LOC],
                accum = {};
            if (locArr) {
                const mapId = locArrToMapId(locArr);
                accum[mapId] = getMapData(mapId);
            }
            return accum;
        },
        
        getCellDataForCharacter: character => {
            const locArr = character[FIELD_LOC],
                accum = {};
            if (locArr) {
                // FIXME: for now do a fixed NxN grid around the character
                const DISTANCE = 2;
                const locArrCopy = locArr.slice();
                for (let x = -DISTANCE; x <= DISTANCE; x++) {
                    locArrCopy[1] = locArr[1] + x;
                    for (let y = -DISTANCE; y <= DISTANCE; y++) {
                        locArrCopy[2] = locArr[2] + y;
                        const locId = locArrToId(locArrCopy);
                        accum[locId] = getCellData(locId);
                    }
                }
            }
            return accum;
        }
    };