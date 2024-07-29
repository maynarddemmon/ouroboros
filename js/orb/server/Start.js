let shuttingDown = false;

const ARGS = process.argv,
    IS_PROD = ARGS[2] ?? false,
    CACHE_BUST = ARGS[3] ?? '',
    
    path = require('path'),
    fs = require('fs'),
    express = require('express'),
    session = require('express-session'),
    
    PATH_PREFIX = '../../../',
    PORT_HTTP = 8080,
    
    orb = require('./orb.js'),
    accountService = require('./AccountService.js'),
    accessLog = accountService.accessLog,
    socketMessageHandler = require('./SocketMessageHandler.js'),
    
    makePath = suffix => path.join(__dirname, PATH_PREFIX + suffix),
    
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


// Start Socket Server
const ws = require('ws'),
    socketServer = new ws.WebSocketServer({
        port:orb.socketPort,
        maxPayload:1<<20 // Approx 1MB
    });

socketServer.on('connection', (ws, req) => {
    accessLog.info('Socket Opened for IP:' + req.socket.remoteAddress);
    
    ws.on('error', console.error);
    ws.on('message', data => {
        const strData = data.toString();
        if (strData) {
            let jsonData;
            try {
                jsonData = JSON.parse(strData);
            } catch (err) {
                console.error('Socket Message could not be parsed as JSON', err);
                return;
            }
            
            // Build a scope for further message processing.
            const socketToken = jsonData.token;
            if (socketToken) {
                const account = accountService.getAccountBySocketToken(socketToken);
                if (account) {
                    account.websocket = ws;
                    socketMessageHandler.handleMessage({account:account, data:jsonData});
                } else {
                    console.warn('Socket Message without associated account');
                }
            } else {
                console.warn('Socket Message without token');
            }
        } else {
            console.warn('Socket Message without string data');
        }
    });
});

// Shutdown Socket Server
const shutdownSocketServer = callback => {
    console.log('Closing Socket Server...');
    socketServer.close();
    socketServer.clients.forEach(ws => {
        console.log('  Terminating WebSocket');
        ws.close();
    });
    callback?.();
};


// Start HTTP Server
const server = app.listen(PORT_HTTP, () => {
    console.log(
        'Oroboros Server listening on port: ' + PORT_HTTP + '\n' +
        '     IS_PROD: ' + IS_PROD + '\n' + 
        '  CACHE_BUST: ' + CACHE_BUST + '\n'
    );
});

// Shutdown HTTP Server
process.on('SIGTERM', () => {
    shuttingDown = true;
    
    console.log('SIGTERM signal received. Starting Shutdown...');
    shutdownSocketServer(() => {
        accountService.shutdown(() => {
            console.log('Closing HTTP Server');
            server.close(() => {
                console.log('HTTP Server Closed');
            });
        });
    });
})