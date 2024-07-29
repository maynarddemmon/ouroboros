let httpServer,
    shuttingDown = false;

const ARGS = process.argv,
    IS_PROD = ARGS[2] ?? false,
    CACHE_BUST = ARGS[3] ?? '',
    
    fs = require('fs'),
    express = require('express'),
    session = require('express-session'),
    
    PORT_HTTP = 8080,
    
    socketServer = require('./SocketServer.js'),
    
    orb = require('./orb.js'),
    makePath = orb.makePath,
    
    accountService = require('./AccountService.js'),
    accessLog = accountService.accessLog,
    
    sendJSONResponse = (res, success, message, data) => {
        message ??= success ? 'success' : 'failure';
        data ??= {};
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({success:success, message:message, data:data}));
    },
    
    escapeStringForResponse = str => str ? '"' + str.replaceAll('"','\\"') + '"' : str,
    
    app = express();

// Parse requests as JSON.
app.use(express.json());

// Use Sessions. Sessions are not persistent across server restarts since there
// is no persistent storage for them.
app.use(session({secret:orb.generateSecret(), resave:false, saveUninitialized:false}));

// Serve Static files
for (const dirName of ['lib','css','img','i18n', IS_PROD ? null : 'js/orb/client']) {
    if (dirName) app.use('/' + dirName, express.static(makePath(dirName)));
}

// Serve Root Path
let rootFile;
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
            '{{SOCKET_URL}}', escapeStringForResponse(orb.socketUrl)
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

// Startup
console.log('Socket Server Starting Up...');
socketServer.startup(() => {
    console.log('  Oroboros Socket Server listening on port: ' + orb.socketPort);
    
    accountService.startup();
    
    console.log('HTTP Server Starting Up...');
    httpServer = app.listen(PORT_HTTP, () => {
        console.log(
            '  Oroboros HTTP Server listening on port: ' + PORT_HTTP + '\n' +
            '       IS_PROD: ' + IS_PROD + '\n' + 
            '    CACHE_BUST: ' + CACHE_BUST + '\n'
        );
    });
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    shuttingDown = true;
    
    console.log('SIGTERM signal received. Starting Shutdown...');
    socketServer.shutdown(success => {
        accountService.shutdown(() => {
            console.log('Closing HTTP Server');
            httpServer.close(() => {
                console.log('  HTTP Server Closed');
            });
        });
    });
});