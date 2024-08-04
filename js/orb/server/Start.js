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
    
    lifeCycle = isBirth => {
        if (isBirth) {
            // Watch a file for "command line" interaction with the server.
            inputWatcher = orb.fileWatcher('./SERVER_COMMAND_INPUT.txt', data => {
                let command;
                try {
                    command = JSON5.parse(data);
                } catch (err) {
                    console.error('Failed to parse command input JSON: ', data);
                    return;
                }
                
                const type = command.type;
                console.log('Command Received: ' + type);
                switch(type) {
                    case 'shutdown':
                        lifeCycle(false);
                        break;
                    default:
                        console.warn('Unknown Command Type: ', type);
                    /*
                        FIXME: handle various messages. Maybe do them as JSON?
                        - Send a broadcast message to every isInGame socket.
                        - Send a broadcast message to every account. Requires out-of-game and offline message queues.
                    */
                }
            });
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