let GUID_COUNTER = -1;

const path = require('path'),
    fs = require('fs'),
    JSON5 = require('json5'),
    
    {JS, tym} = require('../../../lib/tym.js'),
    {getRandomInt} = tym,
    
    PATH_PREFIX = '../../../',
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
            const path = makePath('data/' + filename + '.json');
            fs.writeFileSync(path, JSON.stringify(data, null, 4));
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
        
        getGuidString: prefix => (prefix ? prefix : '') + getGuid()
    };
