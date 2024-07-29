const ARGS = process.argv,
    orb = require('./orb.js');

// Store Arguments before anything else is required.
orb.IS_PROD = ARGS[2] ?? false;
orb.CACHE_BUST = ARGS[3] ?? '';

const socketServer = require('./SocketServer.js'),
    httpServer = require('./HTTPServer.js'),
    accountService = require('./AccountService.js');


// Startup
socketServer.startup(success => {
    if (success) {
        accountService.startup(success => {
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

// Graceful Shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Starting Shutdown...');
    httpServer.notifyShuttingDown();
    socketServer.shutdown(success => {
        accountService.shutdown(() => {
            console.log('Closing HTTP Server');
            httpServer.shutdown(success => {
                if (success) {
                    console.log('\nSHUTDOWN COMPLETE!!!\n');
                }
            });
        });
    });
});