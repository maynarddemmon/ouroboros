let accountUnlockerIntervalId = null;

const crypto = require('crypto'),
    pino = require('pino'),
    
    {JS, tym} = require('../../../lib/tym.js'),
    orb = require('./orb.js'),
    authFailLimit = orb.authFailLimit,
    
    FILENAME_ACCOUNTS = 'accounts',
    
    FIELD_USERNAME = 'username',
    FIELD_PASSWORD = 'password',
    FIELD_LAST_LOGIN = 'lastLogin',
    FIELD_AUTH_FAIL_COUNT = 'authFailCount',
    FIELD_AUTHENTICATED = 'authenticated',
    FIELD_WEBSOCKET = 'websocket',
    FIELD_SOCKET_TOKEN = 'socketToken',
    
    accountsByUsername = {},
    accountsBySocketToken = {},
    
    // Start:Account Locking
    lockedAccounts = [],
    startAccountUnlocker = () => {
        if (!accountUnlockerIntervalId) {
            accountUnlockerIntervalId = setInterval(() => {
                // Unlock all locked accounts. This may mean some accounts get unlocked quickly,
                // but on average accounts will be locked out for the accountUnlockerInterval time.
                let count = 0;
                while (lockedAccounts.length) {
                    lockedAccounts.pop()[FIELD_AUTH_FAIL_COUNT] = 0;
                    count++;
                }
                if (count) console.log('Unlocked Accounts:' + count);
                clearInterval(accountUnlockerIntervalId);
                accountUnlockerIntervalId = null;
            }, orb.accountUnlockerInterval);
        }
    },
    // End:Account Locking
    
    makeEmptyAccount = () => {
        return {
            [FIELD_USERNAME]:null,
            [FIELD_PASSWORD]:null,
            [FIELD_SOCKET_TOKEN]:null,
            [FIELD_WEBSOCKET]:null,
            [FIELD_AUTHENTICATED]:false,
            [FIELD_LAST_LOGIN]:-1,
            [FIELD_AUTH_FAIL_COUNT]:0
        };
    },
    
    hashSecret = 'This should probably not be in the source code.',
    makeHash = value => crypto.createHash('sha512', hashSecret).update(value).digest('hex'),
    
    makeAccountObject = (username, password) => {
        const emptyAccount = makeEmptyAccount();
        emptyAccount[FIELD_USERNAME] = username;
        emptyAccount[FIELD_PASSWORD] = makeHash(password);
        return accountsByUsername[username] = emptyAccount;
    },
    
    getAccountByUsername = username => accountsByUsername[username],
    getAccountBySocketToken = socketToken => accountsBySocketToken[socketToken],
    
    closeSocketForAccount = existingAccount => {
        const websocket = existingAccount[FIELD_WEBSOCKET],
            socketToken = existingAccount[FIELD_SOCKET_TOKEN];
        if (socketToken) delete accountsBySocketToken[socketToken];
        if (websocket) {
            websocket.close();
            existingAccount[FIELD_WEBSOCKET] = null;
            accessLog.info('Closing Websocket');
        }
    },
    
    saveAccountsOnShutdown = () => {
        const dataToSave = [];
        for (const key in accountsByUsername) {
            const account = accountsByUsername[key],
                authFailCount = account[FIELD_AUTH_FAIL_COUNT],
                datum = {
                    [FIELD_USERNAME]:account[FIELD_USERNAME], 
                    [FIELD_PASSWORD]:account[FIELD_PASSWORD], 
                    [FIELD_LAST_LOGIN]:account[FIELD_LAST_LOGIN]
                };
            if (authFailCount > 0) datum[FIELD_AUTH_FAIL_COUNT] = authFailCount;
            dataToSave.push(datum);
        }
        orb.saveDataToFile(FILENAME_ACCOUNTS, dataToSave);
    },
    
    loadAccountsOnStartup = () => {
        const jsonData = orb.readDataFromFile(FILENAME_ACCOUNTS);
        if (jsonData) {
            let count = 0,
                needsAccountUnlocker = false;
            for (const datum of jsonData) {
                const username = datum[FIELD_USERNAME],
                    password = datum[FIELD_PASSWORD];
                if (username && password) {
                    const authFailCount = datum[FIELD_AUTH_FAIL_COUNT],
                        account = makeEmptyAccount();
                    account[FIELD_USERNAME] = username;
                    account[FIELD_PASSWORD] = password;
                    account[FIELD_LAST_LOGIN] = datum[FIELD_LAST_LOGIN];
                    account[FIELD_AUTH_FAIL_COUNT] = authFailCount || 0;
                    accountsByUsername[username] = account;
                    
                    if (authFailCount >= authFailLimit) {
                        lockedAccounts.push(account);
                        needsAccountUnlocker = true;
                    }
                    
                    count++;
                } else {
                    console.error('  Failed to restore account: ', datum);
                }
            }
            if (needsAccountUnlocker) startAccountUnlocker();
            console.log('  Restored ' + count + ' user account(s).');
        }
    },
    
    // Logging
    accessLog = pino(
        {
            base:undefined,
            level:process.env.PINO_LOG_LEVEL || 'info', // ???
            formatters:{
                level:label => ({level:label})
            }
        },
        pino.destination({
            dest:'./logs/access.log',
            minLength:1<<14, // 16384 byte buffer
            maxWrite:1<<16, // 64k Must be larger than minLength
            sync:false
        })
    ),
    
    authenticate = (session, username, password) => {
        const existingAccount = getAccountByUsername(username),
            retval = {success:false};
        if (existingAccount) {
            if (existingAccount[FIELD_AUTH_FAIL_COUNT] >= authFailLimit) {
                // Catch accounts locked for excessive fail counts before we try to authenticate.
                retval.message = 'Account temporarily locked.';
            } else if (makeHash(password) === existingAccount[FIELD_PASSWORD]) {
                // Auth Success
                session[FIELD_USERNAME] = username;
                accessLog.info('Authenticate:' + username);
                
                closeSocketForAccount(existingAccount);
                
                retval.success = true;
                existingAccount[FIELD_LAST_LOGIN] = Date.now();
                existingAccount[FIELD_AUTH_FAIL_COUNT] = 0;
                const newSocketToken = retval[FIELD_SOCKET_TOKEN] = existingAccount[FIELD_SOCKET_TOKEN] = orb.generateSecret();
                retval.socketUrl = orb.socketUrl;
                
                accountsBySocketToken[newSocketToken] = existingAccount;
            } else {
                // Auth Failed
                retval.message = 'Authentication failed.';
                accessLog.warn('Authenticate failed. Password mismatch:' + username);
                
                // Lock account if necessary
                if (++existingAccount[FIELD_AUTH_FAIL_COUNT] >= authFailLimit) {
                    lockedAccounts.push(existingAccount);
                    startAccountUnlocker();
                    retval.message += ' Account temporarily locked.';
                    accessLog.warn('Temporarily locking account:' + username);
                }
            }
        } else {
            // No account for username
            retval.message = 'Authentication failed.';
            accessLog.warn('Authenticate failed. No account:' + username);
        }
        return retval;
    };

module.exports = {
    accessLog:accessLog,
    getAccountByUsername:getAccountByUsername,
    getAccountBySocketToken:getAccountBySocketToken,
    authenticate:authenticate,
    
    createAccount: (session, username, password) => {
        const retval = {success:false};
        if (!username) {
            retval.message = 'No username provided.';
        } else if (!password) {
            retval.message = 'No password provided.';
        } else if (password.length < 7) {
            retval.message = 'Password not suitable.';
        } else if (getAccountByUsername(username)) {
            retval.message = 'Account already exists.';
        } else {
            const account = makeAccountObject(username, password);
            accessLog.info('Create Account:' + username);
            return authenticate(session, username, password);
        }
        return retval;
    },
    
    
    deauthenticate: session => {
        const username = session[FIELD_USERNAME],
            retval = {success:false};
        if (username) {
            const existingAccount = getAccountByUsername(username);
            if (existingAccount) {
                delete session[FIELD_USERNAME];
                accessLog.info('Deauthenticate:' + username);
                
                closeSocketForAccount(existingAccount);
                
                existingAccount[FIELD_SOCKET_TOKEN] = null;
                existingAccount[FIELD_AUTHENTICATED] = false;
                retval.success = true;
            } else {
                retval.message = 'Logout failed.';
                accessLog.error('Deauthenticate failed. No account:' + username);
            }
        } else {
            retval.message = 'Logout failed because session was already unauthenticated.';
        }
        return retval;
    },
    
    startup: () => {
        console.log('Restoring User Accounts...');
        loadAccountsOnStartup();
    },
    
    shutdown: callback => {
        if (accountUnlockerIntervalId) clearInterval(accountUnlockerIntervalId);
        
        console.log('Save Accounts');
        saveAccountsOnShutdown();
        
        console.log('  Flush Logs');
        accessLog.flush(callback);
    }
};