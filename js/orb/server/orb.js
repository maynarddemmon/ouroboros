let GUID_COUNTER = -1;

const path = require('path'),
    fs = require('fs'),
    JSON5 = require('json5'),
    
    PATH_PREFIX = '../../../',
    
    {JS, tym} = require(PATH_PREFIX + 'lib/tym.js'),
    {getRandomInt} = tym,
    
    {TYPE_SOUND} = require('../common/SocketProtocol.js'),
    
    FILENAME_PACKAGE_STATE = 'pkg_state',
    
    getGuid = () => ++GUID_COUNTER,
    
    makePath = suffix => path.join(__dirname, PATH_PREFIX + suffix),
    
    readJSONFile = (path, filename, useJSON5) => {
        const fullPath = makePath(path + '/' + filename + '.json');
        try {
            const strData = fs.readFileSync(fullPath).toString();
            if (strData) {
                try {
                    return (useJSON5 ? JSON5 : JSON).parse(strData);
                } catch (err) {
                    console.error('Error Parsing JSON for ' + fullPath + '.', err);
                }
            } else {
                console.log('No ' + fullPath + ' data to load.', strData);
            }
        } catch (err) {
            console.error('Could not read file: ' + fullPath + ' because:', err.message);
        }
        return null;
    },
    
    readConfigFile = filename => readJSONFile('cfg', filename, true),
    
    readDataFile = filename => readJSONFile('data', filename, false),
    
    saveDataToFile = (filename, data) => {
        try {
            const dirPath = makePath('data'),
                path = dirPath + '/' + filename + '.json';
            fs.mkdirSync(dirPath, {recursive:true});
            fs.writeFileSync(path, JSON.stringify(data, null, 2));
            console.log('  Saved ' + path + (Array.isArray(data) ? ' with ' + data.length + ' elements.' : ''));
        } catch (err) {
            console.error('Error Saving ' + filename + '.', err);
            return false;
        }
        return true;
    },
    
    live = (resolve, reject) => {
        console.log('Restoring Package State...');
        const jsonData = readDataFile(FILENAME_PACKAGE_STATE);
        if (jsonData) {
            GUID_COUNTER = jsonData.guidCounter ?? -1;
        }
        resolve();
    },
    
    die = (resolve, reject) => {
        console.log('Save Package State');
        saveDataToFile(FILENAME_PACKAGE_STATE, {
            guidCounter:GUID_COUNTER
        });
        resolve();
    },
    
    orb = module.exports = {
        lifeCycle: isBirth => new Promise((resolve, reject) => {
            if (isBirth) {
                live(resolve, reject);
            } else {
                die(resolve, reject);
            }
        }),
        
        // Set from startup args
        IS_PROD: false,
        CACHE_BUST: '',
        
        // Set from cfg/override.json
        salt:'',
        sessionSecret:'',
        
        // Set from cfg/base.json
        httpPort: null,
        socketPort: null,
        socketUrl: null,
        authFailLimit: -1, // -1 is no limit.
        accountUnlockerInterval: -1, // -1 is never unlock.
        maxCharactersPerUser:1,
        
        worldClockTick:-1, // -1 is a nonsensical value.
        
        // Functions
        generateSecret: () => {
            let secret = '';
            for (let i = 0; i < 8; i++) secret += getRandomInt(0,99999999).toString(36);
            return secret;
        },
        
        makePath:makePath,
        readJSONFile:readJSONFile,
        readConfigFile:readConfigFile,
        readDataFile:readDataFile,
        saveDataToFile:saveDataToFile,
        
        readAndApplyConfigFile: (filename, scope) => {
            if (scope) {
                const cfgData = readConfigFile(filename);
                if (cfgData) {
                    console.log('Applying data from ' + filename + ' to scope object.');
                    for (const key in cfgData) scope[key] = cfgData[key];
                }
            }
        },
        
        getGuidString: prefix => (prefix ? prefix : '') + getGuid(),
        
        /** Watch a file for changes and execute a callback when a change
            occurs setting the file to a non-empty value. On each such change
            reset the file to an empty state. This will be used to send
            messages into the running server from the command line or any
            other process that has access to the file system. If true
            interprocess communication is needed we should use a named pipe. */
        fileWatcher: (filePath, onChangeCallback) => {
            const writeEmptyFile = () => {
                    fs.writeFile(filePath, '', err => {
                        if (err) console.error('Error creating file:', filePath, err);
                    });
                },
                handleFileChange = () => {
                    fs.readFile(filePath, 'utf8', (err, data) => {
                        if (err) {
                            console.error(err);
                        } else {
                            if (data?.length > 0) {
                                writeEmptyFile();
                                onChangeCallback?.(data);
                            }
                        }
                    });
                };
            
            // Ensure the file exists then watch it for changes.
            writeEmptyFile();
            return fs.watch(filePath, (eventType, filename) => {
                if (eventType === 'change') handleFileChange();
            });
        },
        
        // Game Rules
        rules: {
            doOnSpiritualChangeForCharacter: (character, cell) => {
                if (!cell) cell = character.getCell();
                if (cell.isCompositionVoid()) {
                    if (character.isSpirit()) {
                        cell.setComposition('v3');
                    } else if (character.isAstralProjected()) {
                        cell.setComposition('v4');
                    }
                } else if (cell.isCompositionAether()) {
                    // Corporeal characters can change to astral cord but not
                    // Vice versa.
                    if (character.isAstralProjected()) {
                        cell.setComposition('v4');
                    }
                }
            },
            characterMayMoveIntoCell: function(character, cell) {
                const comp = cell.getCompositionObject(),
                    solidity = comp.getSolidity(),
                    entities = cell.getEntitiesMap();
                if (character.isSpirit()) {
                    // Only 1 spirit at a time in a cell
                    return !cell.getSpiritEntityCount(1);
                } else if (character.isAstralProjected()) {
                    if (cell.isCompositionVoid()) {
                        // Only 1 AstralProjected at a time in a cell
                        return !cell.getAstralProjectedEntityCount(1);
                    }
                }
                
                if (solidity >= 0 && solidity < 1) {
                    // Only 2 Corporeal at a time in a cell
                    return !cell.getCorporealEntityCount(2);
                }
                
                return false;
            },
            
            generateSoundForEntityAction: function(entity, cell, actionType) {
                let soundEffect = 'sound',
                    volume = 1;
                switch (actionType) {
                    case 'move':
                        soundEffect = 'footsteps';
                        volume = 5;
                        break;
                }
                
                cell.notifyAllAuditoryChangeListeners(TYPE_SOUND, {
                    from:entity.getId(), type:actionType, volume:volume, message:'*' + soundEffect + '*'
                }, true);
            }
        }
    };
