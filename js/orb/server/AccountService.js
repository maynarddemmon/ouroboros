let accountUnlockerIntervalId = null;

const crypto = require('crypto'),
    pino = require('pino'),
    fs = require('fs'),
    
    {JS, tym} = require('../../../lib/tym.js'),
    orb = require('./orb.js'),
    authFailLimit = orb.authFailLimit,
    
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
                    lockedAccounts.pop().authFailCount = 0;
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
            username:null,
            password:null,
            socketToken:null,
            websocket:null,
            authenticated:false,
            lastLogin:-1,
            authFailCount:0
        };
    },
    
    hashSecret = 'This should probably not be in the source code.',
    makeHash = value => crypto.createHash('sha512', hashSecret).update(value).digest('hex'),
    
    makeAccountObject = (username, password) => {
        const emptyAccount = makeEmptyAccount();
        emptyAccount.username = username;
        emptyAccount.password = makeHash(password);
        return accountsByUsername[username] = emptyAccount;
    },
    
    getAccountByUsername = username => accountsByUsername[username],
    getAccountBySocketToken = socketToken => accountsBySocketToken[socketToken],
    
    closeSocketForAccount = existingAccount => {
        const {socketToken, websocket} = existingAccount;
        if (socketToken) delete accountsBySocketToken[socketToken];
        if (websocket) {
            websocket.close();
            existingAccount.websocket = null;
            accessLog.info('Closing Websocket');
        }
    },
    
    saveAccountsOnShutdown = () => {
        const dataToSave = [];
        for (const key in accountsByUsername) {
            const {username, password, lastLogin, authFailCount} = accountsByUsername[key],
                datum = {
                    username:username, 
                    password:password, 
                    lastLogin:lastLogin
                };
            if (authFailCount > 0) datum.authFailCount = authFailCount;
            dataToSave.push(datum);
        }
        
        try {
            fs.writeFileSync(orb.makePath('data/accounts.js'), JSON.stringify(dataToSave, null, 4));
            console.log('Saved ' + dataToSave.length + ' Account(s)');
        } catch (err) {
            console.error('Error Saving Accounts.', err);
        }
    },
    
    loadAccountsOnStartup = () => {
        const strData = fs.readFileSync(orb.makePath('data/accounts.js')).toString();
        if (strData) {
            const jsonData = JSON.parse(strData);
            if (jsonData) {
                let count = 0,
                    needsAccountUnlocker = false;
                for (const datum of jsonData) {
                    const {username, password, lastLogin, authFailCount} = datum;
                    if (username && password) {
                        const account = makeEmptyAccount();
                        account.username = username;
                        account.password = password;
                        account.lastLogin = lastLogin;
                        account.authFailCount = authFailCount || 0;
                        accountsByUsername[username] = account;
                        
                        if (authFailCount >= authFailLimit) {
                            lockedAccounts.push(account);
                            needsAccountUnlocker = true;
                        }
                        
                        count++;
                    } else {
                        console.error('Failed to restore account: ', datum);
                    }
                }
                if (needsAccountUnlocker) startAccountUnlocker();
                console.log('Restored ' + count + ' user account(s).');
            }
        } else {
            console.log('No user account data to load.');
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
    );

module.exports = {
    accessLog:accessLog,
    getAccountByUsername:getAccountByUsername,
    getAccountBySocketToken:getAccountBySocketToken,
    
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
            return module.exports.authenticate(session, username, password);
        }
        return retval;
    },
    
    authenticate: (session, username, password) => {
        const existingAccount = getAccountByUsername(username),
            retval = {success:false};
        if (existingAccount) {
            if (existingAccount.authFailCount >= authFailLimit) {
                // Catch accounts locked for excessive fail counts.
                retval.message = 'Account temporarily locked.';
            } else if (makeHash(password) === existingAccount.password) {
                // Auth Success
                session.username = username;
                accessLog.info('Authenticate:' + username);
                
                closeSocketForAccount(existingAccount);
                
                retval.success = true;
                existingAccount.lastLogin = Date.now();
                existingAccount.authFailCount = 0;
                const newSocketToken = retval.socketToken = existingAccount.socketToken = orb.generateSecret();
                retval.socketUrl = orb.socketUrl;
                
                accountsBySocketToken[newSocketToken] = existingAccount;
            } else {
                // Auth Failed
                retval.message = 'Authentication failed.';
                accessLog.warn('Authenticate failed. Password mismatch:' + username);
                
                if (++existingAccount.authFailCount >= authFailLimit) {
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
    },
    
    deauthenticate: session => {
        const username = session.username,
            retval = {success:false};
        if (username) {
            const existingAccount = getAccountByUsername(username);
            if (existingAccount) {
                delete session.username;
                accessLog.info('Deauthenticate:' + username);
                
                closeSocketForAccount(existingAccount);
                
                existingAccount.socketToken = null;
                existingAccount.authenticated = false;
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
        
        // 
    },
    
    shutdown: callback => {
        if (accountUnlockerIntervalId) clearInterval(accountUnlockerIntervalId);
        
        console.log('Flush Logs');
        accessLog.flush(callback);
        
        console.log('Save Accounts');
        saveAccountsOnShutdown();
    }
};