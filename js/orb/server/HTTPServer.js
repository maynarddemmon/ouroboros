let app,
    rootFile,
    httpServer,
    memoryStore,
    shuttingDown = false;

const fs = require('fs'),
    express = require('express'),
    session = require('express-session'),
    MemoryStore = require('memorystore')(session),
    
    {
        IS_PROD, CACHE_BUST, httpPort, socketUrl, sessionSecret,
        makePath, readDataFile, saveDataToFile
    } = global.orb,
    
    accountService = require('./AccountService.js'),
    
    FILENAME_SESSIONS = 'sessions',
    
    sendJSONResponse = (res, success, message, data) => {
        message ??= success ? 'success' : 'failure';
        data ??= {};
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({success:success, message:message, data:data}));
    },
    
    escapeStringForResponse = str => str ? '"' + str.replaceAll('"','\\"') + '"' : str,
    
    live = (resolve, reject) => {
        if (httpServer) {
            console.warn('Attempt to start HTTP server again.');
            reject();
            return;
        }
        
        app = express();
        
        // Parse requests as JSON.
        app.use(express.json());
        
        // Use Sessions. Sessions are not persistent across server restarts since there
        // is no persistent storage for them.
        memoryStore = new MemoryStore({
            checkPeriod: 3600000, // prune expired entries every hour
            max:10000 // Seems like a reasonable maximum number of sessions
        });
        app.use(session({
            secret:sessionSecret,
            cookie:{maxAge: 86400000}, // 24 hours
            rolling:true,
            resave:false,
            saveUninitialized:false,
            store:memoryStore
        }));
        
        // Serve Static files
        for (const dirName of ['lib','css','img','i18n', IS_PROD ? null : 'js/orb/client', IS_PROD ? null : 'js/orb/common']) {
            if (dirName) app.use('/' + dirName, express.static(makePath(dirName)));
        }
        
        // Serve Root Path
        app.get('/', (req, res) => {
            if (shuttingDown) return;
            
            if (!rootFile) {
                rootFile = fs.readFileSync(makePath('html/index.html')).toString();
                
                // Template evaluation
                rootFile = rootFile.replaceAll(
                    '{{IS_PROD}}', IS_PROD).replaceAll(
                    '{{CACHE_BUST}}', CACHE_BUST
                );
            }
            
            // Escape values for injection into the HTML.
            const pkgAccount = urob.account,
                username = req.session[pkgAccount.FIELD_USERNAME],
                userAccount = accountService.getAccountByUsername(username),
                socketToken = userAccount ? userAccount[pkgAccount.FIELD_SOCKET_TOKEN] : null,
                responseData = rootFile.replaceAll(
                        '{{USERNAME}}', escapeStringForResponse(username)
                    ).replaceAll(
                        '{{SOCKET_TOKEN}}', escapeStringForResponse(socketToken)
                    ).replaceAll(
                        '{{SOCKET_URL}}', escapeStringForResponse(socketUrl)
                    );
            res.send(responseData);
        });
        
        // Server Register Path
        app.post('/reg', (req, res) => {
            if (shuttingDown) return;
            
            const {username, password} = req.body,
                result = accountService.createAccount(req.session, username, password);
            if (result.success) {
                sendJSONResponse(res, true, null, {socketToken:result.socketToken, socketUrl:result.socketUrl});
            } else {
                sendJSONResponse(res, false, result.message);
            }
        });
        
        // Serve Authenticate Path
        app.post('/auth', (req, res) => {
            if (shuttingDown) return;
            
            const {username, password} = req.body,
                result = accountService.authenticate(req.session, username, password);
            if (result.success) {
                sendJSONResponse(res, true, null, {socketToken:result.socketToken, socketUrl:result.socketUrl});
            } else {
                sendJSONResponse(res, false, result.message);
            }
        });
        
        // Serve Deauthenticate Path
        app.post('/deauth', (req, res) => {
            if (shuttingDown) return;
            
            const result = accountService.deauthenticate(req.session);
            if (result.success) {
                sendJSONResponse(res, true);
            } else {
                sendJSONResponse(res, false, result.message);
            }
        });
        
        // Serve Change Password Path
        app.post('/changePassword', (req, res) => {
            if (shuttingDown) return;
            
            const {username, password, newPassword} = req.body,
                result = accountService.changePassword(req.session, username, password, newPassword);
            if (result.success) {
                sendJSONResponse(res, true);
            } else {
                sendJSONResponse(res, false, result.message);
            }
        });
        
        // Serve Account Deletion Path
        app.post('/deleteAccount', (req, res) => {
            if (shuttingDown) return;
            
            const {username, password} = req.body,
                result = accountService.deleteAccount(req.session, username, password);
            if (result.success) {
                sendJSONResponse(res, true);
            } else {
                sendJSONResponse(res, false, result.message);
            }
        });
        
        console.log('HTTP Server Starting Up...');
        const whenReadyFunc = () => {
            console.log(
                '  Ouroboros HTTP Server listening on port: ' + httpPort + '\n' +
                '       IS_PROD: ' + IS_PROD + '\n' + 
                '    CACHE_BUST: ' + CACHE_BUST
            );
            resolve();
        };
        httpServer = app.listen(httpPort, () => {
            // Restore Sessions
            console.log('  Restoring HTTP Sessions...');
            const jsonData = readDataFile(FILENAME_SESSIONS);
            if (jsonData) {
                for (const sessionId in jsonData) {
                    memoryStore.set(
                        sessionId, jsonData[sessionId], 
                        err => {
                            if (err) console.error('Error Restoring Session: ', err);
                        }
                    );
                }
                memoryStore.length((err, len) => {
                    console.log('    Restored ' + len + ' HTTP sessions.');
                    whenReadyFunc();
                });
            } else {
                whenReadyFunc();
            }
        });
    },
    
    die = (resolve, reject) => {
        console.log('Closing HTTP Server');
        
        if (!httpServer) {
            console.warn('  No HTTP server to shutdown.');
            reject();
            return;
        }
        
        console.log('  Saving Sessions');
        memoryStore.all((err, sessions) => {
            if (err) {
                console.error('Saving sessions failed because: ', err);
                // Don't reject because we should still try to shutdown the
                // HTTP server.
            } else {
                saveDataToFile(FILENAME_SESSIONS, sessions);
            }
            
            httpServer.close(() => {
                console.log('  HTTP Server Closed');
                resolve();
            });
        });
    };

module.exports = {
    lifeCycle: isBirth => new Promise((resolve, reject) => {
        if (isBirth) {
            live(resolve, reject);
        } else {
            die(resolve, reject);
        }
    }),
    
    notifyShuttingDown: () => {
        shuttingDown = true;
    }
};