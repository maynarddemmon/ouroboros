let app,
    rootFile,
    httpServer,
    shuttingDown = false;

const fs = require('fs'),
    express = require('express'),
    session = require('express-session'),
    
    {IS_PROD, CACHE_BUST, httpPort, socketUrl, makePath, generateSecret} = require('./orb.js'),
    
    accountService = require('./AccountService.js'),
    
    sendJSONResponse = (res, success, message, data) => {
        message ??= success ? 'success' : 'failure';
        data ??= {};
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({success:success, message:message, data:data}));
    },
    
    escapeStringForResponse = str => str ? '"' + str.replaceAll('"','\\"') + '"' : str;

module.exports = {
    startup: callback => {
        if (httpServer) {
            console.warn('Attempt to start HTTP server again.');
            callback?.(false);
            return;
        }
        
        app = express();
        
        // Parse requests as JSON.
        app.use(express.json());
        
        // Use Sessions. Sessions are not persistent across server restarts since there
        // is no persistent storage for them.
        app.use(session({secret:generateSecret(), resave:false, saveUninitialized:false}));
        
        // Serve Static files
        for (const dirName of ['lib','css','img','i18n', IS_PROD ? null : 'js/orb/client']) {
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
            let username = req.session.username;;
            const userAccount = accountService.getAccountByUsername(username),
                socketToken = userAccount ? userAccount.socketToken : null;
            
            const responseData = rootFile.replaceAll(
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
        
        console.log('HTTP Server Starting Up...');
        httpServer = app.listen(httpPort, () => {
            console.log(
                '  Oroboros HTTP Server listening on port: ' + httpPort + '\n' +
                '       IS_PROD: ' + IS_PROD + '\n' + 
                '    CACHE_BUST: ' + CACHE_BUST + '\n'
            );
            callback?.(true);
        });
    },
    
    notifyShuttingDown: () => {
        shuttingDown = true;
    },
    
    shutdown: callback => {
        if (!httpServer) {
            console.warn('  No HTTP server to shutdown.');
            callback?.(false);
            return;
        }
        
        httpServer.close(() => {
            console.log('  HTTP Server Closed');
            callback?.(true);
        });
    }
};