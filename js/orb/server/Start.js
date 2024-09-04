const ARGS = process.argv,
    orb = global.orb = require('./orb.js'),
    JSON5 = require('json5');

// Load Config Files before anything else is required.
orb.readAndApplyConfigFile('base', orb);
orb.readAndApplyConfigFile('override', orb);

// Store Arguments before anything else is required. Do this after config
// file loading so it's possible to override things via arguments.
orb.IS_PROD = ARGS[2] ?? false;
orb.CACHE_BUST = ARGS[3] ?? '';

// Startup
require('../common/urob.js');
let inputWatcher;
const loggingService = require('./LoggingService.js'),
    socketServer = require('./SocketServer.js'),
    httpServer = require('./HTTPServer.js'),
    accountService = require('./AccountService.js'),
    characterService = require('./CharacterService.js'),
    worldClock = require('./WorldClock.js'),
    worldMap = require('./WorldMap.js'),
    
    {
        TYPE_WARNING, TYPE_SERVERINFO
    } = require('../common/SocketProtocol.js'),
    
    msgAllAccounts = (msg, msgType=TYPE_WARNING, connectedOnly=true) => {
        accountService[connectedOnly ? 'addMessageToAllConnectedAccounts' : 'addMessageToAllAccounts']({type:msgType, msg:msg});
    },
    
    setupInputWatcher = fileNameToWatch => {
        return orb.fileWatcher(fileNameToWatch, data => {
            let command,
                character;
            try {
                command = JSON5.parse(data);
            } catch (err) {
                console.error('Failed to parse command input JSON: ', data);
                return;
            }
            
            const {type, msg} = command;
            console.log('Command Received: ' + type);
            switch(type) {
                case 'shutdown':
                    // {type:'shutdown', msg:'Server going down for maintenance.', delay:5000}
                    const delay = command.delay;
                    if (delay > 0) {
                        msgAllAccounts(command.msg ?? `Server shutting down in ${delay} milliseconds.`, TYPE_SERVERINFO);
                        setTimeout(() => {
                            lifeCycle(false);
                        }, delay);
                    } else {
                        lifeCycle(false);
                    }
                    break;
                // FIXME: cancel shutdown
                case 'broadcast':
                    // {type:'broadcast', msg:'Here is a message.', msgType:'error', connectedOnly:false}
                    console.log('  Broadcast Message: ' + msg);
                    msgAllAccounts(msg, command.msgType, command.connectedOnly);
                    break;
                case 'logCharacter':
                    // {type:'logCharacter', name:'Foo'}
                    character = characterService.getCharacterByName(command.name);
                    if (character) {
                        console.log('  Character: ', character);
                    } else {
                        console.warn('  Character not found: ' + command.name);
                    }
                    break;
                case 'modifyCharacter':
                    // {type:'modifyCharacter', id:'c123', prop:'movementSpeed', value:2}
                    character = characterService.getCharacterById(command.id);
                    if (character) {
                        character.set(command.prop, command.value);
                        console.log('  Character: ', character);
                    } else {
                        console.warn('  Character not found: ' + command.id);
                    }
                    break;
                default:
                    console.warn('Unknown Command Type: ', type);
            }
        });
    },
    
    lifeCycle = (isBirth, restart) => {
        if (isBirth) {
            // Watch a file for "command line" interaction with the server.
            inputWatcher = setupInputWatcher('./SERVER_COMMAND_INPUT.txt');
        } else {
            // Block or Disable some functionality immediately
            worldClock.stopClock();
            httpServer.notifyShuttingDown();
            inputWatcher.close();
        }
        
        orb.lifeCycle(isBirth).then(
            () =>   loggingService.lifeCycle(isBirth)).then(
            () =>     socketServer.lifeCycle(isBirth)).then(
            () =>   accountService.lifeCycle(isBirth)).then(
            () =>         worldMap.lifeCycle(isBirth)).then(
            () =>       worldClock.lifeCycle(isBirth)).then(
            () => characterService.lifeCycle(isBirth)).then( // After worldMap so characters can add to Cells.
            () =>       httpServer.lifeCycle(isBirth)).then(
            () => {
                if (isBirth) {
                    worldClock.startClock();
                    console.log('\nREADY!!!\n');
                } else {
                    console.log('\nSHUTDOWN COMPLETE!!!\n');
                    
                    if (restart) {
                        const {spawn} = require('child_process');
                        console.log('Restarting...\n');
                        spawn(ARGS[0], ARGS.slice(1), {detached:true, stdio:'inherit'});
                        process.exit();
                    }
                }
            });
    };

lifeCycle(true);

// Graceful Shutdown
process.on('SIGTERM', () => {
    console.log('\nSIGTERM signal received. Starting Shutdown...');
    lifeCycle(false);
});

// Graceful Restart
process.on('SIGHUP', () => {
    console.log('\nSIGHUP signal received. Restarting...\n\nStarting Shutdown...');
    lifeCycle(false, true);
});
