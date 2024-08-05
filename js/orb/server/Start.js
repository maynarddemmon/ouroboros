const ARGS = process.argv,
    orb = require('./orb.js'),
    JSON5 = require('json5');

// Load Config Files before anything else is required.
orb.readAndApplyConfigFile('base', orb);
orb.readAndApplyConfigFile('override', orb);

// Store Arguments before anything else is required. Do this after config
// file loading so it's possible to override things via arguments.
orb.IS_PROD = ARGS[2] ?? false;
orb.CACHE_BUST = ARGS[3] ?? '';

// Startup
let inputWatcher;
const loggingService = require('./LoggingService.js'),
    socketServer = require('./SocketServer.js'),
    httpServer = require('./HTTPServer.js'),
    accountService = require('./AccountService.js'),
    characterService = require('./CharacterService.js'),
    worldClock = require('./WorldClock.js'),
    
    {
        TYPE_WARNING, TYPE_SERVERINFO
    } = require('../common/SocketProtocol.js'),
    
    msgAllAccounts = (msg, msgType=TYPE_WARNING, connectedOnly=true) => {
        accountService[connectedOnly ? 'addMessageToAllConnectedAccounts' : 'addMessageToAllAccounts']({type:msgType, msg:msg});
    },
    
    setupInputWatcher = fileNameToWatch => {
        return orb.fileWatcher(fileNameToWatch, data => {
            let command;
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
                default:
                    console.warn('Unknown Command Type: ', type);
            }
        });
    },
    
    lifeCycle = isBirth => {
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
            () => characterService.lifeCycle(isBirth)).then(
            () =>       worldClock.lifeCycle(isBirth)).then(
            () =>       httpServer.lifeCycle(isBirth)).then(
            () => {
                if (isBirth) {
                    worldClock.startClock();
                    console.log('\nREADY!!!\n');
                } else {
                    console.log('\nSHUTDOWN COMPLETE!!!\n');}
                }
            );
    };

lifeCycle(true);

// Graceful Shutdown
process.on('SIGTERM', () => {
    console.log('\nSIGTERM signal received. Starting Shutdown...');
    lifeCycle(false);
});