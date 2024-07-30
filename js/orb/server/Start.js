const ARGS = process.argv,
    orb = require('./orb.js');

// Load Config Files before anything else is required.
orb.readAndApplyConfigFile('base', orb);
orb.readAndApplyConfigFile('override', orb);

// Store Arguments before anything else is required. Do this after config
// file loading so it's possible to override things via arguments.
orb.IS_PROD = ARGS[2] ?? false;
orb.CACHE_BUST = ARGS[3] ?? '';

// Startup
const socketServer = require('./SocketServer.js'),
    httpServer = require('./HTTPServer.js'),
    accountService = require('./AccountService.js'),
    characterService = require('./CharacterService.js');
socketServer.startup(success => {
    if (success) {
        accountService.startup(success => {
            if (success) {
                characterService.startup(success => {
                    if (success) {
                        httpServer.startup(success => {
                            if (success) {
                                console.log('READY!!!\n');
                            }
                        });
                    }
                });
            }
        });
    }
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Starting Shutdown...');
    httpServer.notifyShuttingDown();
    socketServer.shutdown(success => {
        accountService.shutdown(() => {
            characterService.shutdown(success => {
                console.log('Closing HTTP Server');
                httpServer.shutdown(success => {
                    if (success) {
                        console.log('\nSHUTDOWN COMPLETE!!!\n');
                    }
                });
            });
        });
    });
});