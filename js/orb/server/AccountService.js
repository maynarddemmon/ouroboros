let accessLog,
    accountUnlockerIntervalId = null;

const {scryptSync} = require('crypto'),
    orb = require('./orb.js'),
    {salt, authFailLimit, accountUnlockerInterval} = orb,
    
    characterService = require('./CharacterService.js'),
    {getAccessLog} = require('./LoggingService.js'),
    
    FILENAME_ACCOUNTS = 'accounts',
    
    FIELD_USERNAME = 'username',
    FIELD_PASSWORD = 'password',
    FIELD_LAST_LOGIN = 'lastLogin',
    FIELD_AUTH_FAIL_COUNT = 'authFailCount',
    FIELD_AUTHENTICATED = 'authenticated',
    FIELD_WEBSOCKET = 'websocket',
    FIELD_SOCKET_TOKEN = 'socketToken',
    
    // An object holding all user accounts.
    accountsByUsername = {},
    
    // An object only holding user accounts that currently have a socketToken.
    accountsBySocketToken = {},
    
    // An array of user accounts that are currently locked out. These will gets unlocked on
    // a regular interval.
    lockedAccounts = [],
    
    isAuthFailLimitExceeded = authFailCount => {
        if (authFailCount >= 0) {
            return authFailCount >= authFailLimit;
        } else {
            return false;
        }
    },
    
    startAccountUnlocker = () => {
        if (!accountUnlockerIntervalId && accountUnlockerInterval > 0) {
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
            }, accountUnlockerInterval);
        }
    },
    
    /** Makes an empty user account object with nulls and/or default values. */
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
    
    /** Cryptographically hashes a value. Used to hash passwords. */
    makeHash = value => scryptSync(value, salt, 64).toString('base64'),
    
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
    
    authenticate = (session, username, password) => {
        const existingAccount = getAccountByUsername(username),
            retval = {success:false};
        if (existingAccount) {
            if (isAuthFailLimitExceeded(existingAccount[FIELD_AUTH_FAIL_COUNT])) {
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
                if (isAuthFailLimitExceeded(++existingAccount[FIELD_AUTH_FAIL_COUNT])) {
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
    
    live = (resolve, reject) => {
        accessLog = getAccessLog();
        
        console.log('Restoring User Accounts...');
        const jsonData = orb.readDataFile(FILENAME_ACCOUNTS);
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
                    
                    if (isAuthFailLimitExceeded(authFailCount)) {
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
        
        resolve();
    },
    
    die = (resolve, reject) => {
        if (accountUnlockerIntervalId) clearInterval(accountUnlockerIntervalId);
        
        console.log('Save Accounts');
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
        
        resolve();
    };

module.exports = {
    lifeCycle: isBirth => new Promise((resolve, reject) => {
        if (isBirth) {
            live(resolve, reject);
        } else {
            die(resolve, reject);
        }
    }),
    
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
    
    changePassword: (session, username, password, newPassword) => {
        const existingAccount = getAccountByUsername(username),
            retval = {success:false};
        if (existingAccount) {
            if (!username) {
                retval.message = 'No username provided.';
            } else if (!password) {
                retval.message = 'No password provided.';
            } else if (!newPassword) {
                retval.message = 'No new password provided.';
            } else if (newPassword.length < 7) {
                retval.message = 'New password not suitable.';
            } else if (isAuthFailLimitExceeded(existingAccount[FIELD_AUTH_FAIL_COUNT])) {
                // Catch accounts locked for excessive fail counts before we try to authenticate.
                retval.message = 'Account authentication temporarily locked.';
            } else if (makeHash(password) === existingAccount[FIELD_PASSWORD]) {
                accessLog.info('Updating Password:' + username);
                existingAccount[FIELD_PASSWORD] = makeHash(newPassword);
                retval.success = true;
            } else {
                // Auth Failed
                retval.message = 'Update Password failed.';
                accessLog.warn('Update Password failed. Password mismatch:' + username);
                
                // Lock account if necessary
                if (isAuthFailLimitExceeded(++existingAccount[FIELD_AUTH_FAIL_COUNT])) {
                    lockedAccounts.push(existingAccount);
                    startAccountUnlocker();
                    retval.message += ' Account temporarily locked.';
                    accessLog.warn('Temporarily locking account:' + username);
                }
            }
        } else {
            // No account for username
            retval.message = 'Update Password failed.';
            accessLog.warn('Update Password failed. No account:' + username);
        }
        return retval;
    },
    
    deleteAccount: (session, username, password) => {
        const existingAccount = getAccountByUsername(username),
            retval = {success:false};
        if (existingAccount) {
            if (isAuthFailLimitExceeded(existingAccount[FIELD_AUTH_FAIL_COUNT])) {
                // Catch accounts locked for excessive fail counts before we try to authenticate.
                retval.message = 'Account authentication temporarily locked.';
            } else if (makeHash(password) === existingAccount[FIELD_PASSWORD]) {
                accessLog.info('Deleting Account:' + username);
                
                closeSocketForAccount(existingAccount);
                characterService.convertAllCharactersToZombiesForAccount(username);
                delete accountsByUsername[username];
                
                retval.success = true;
            } else {
                // Auth Failed
                retval.message = 'Account Deletion failed.';
                accessLog.warn('Account Deletion failed. Password mismatch:' + username);
                
                // Lock account if necessary
                if (isAuthFailLimitExceeded(++existingAccount[FIELD_AUTH_FAIL_COUNT])) {
                    lockedAccounts.push(existingAccount);
                    startAccountUnlocker();
                    retval.message += ' Account temporarily locked.';
                    accessLog.warn('Temporarily locking account:' + username);
                }
            }
        } else {
            // No account for username
            retval.message = 'Account Deletion failed.';
            accessLog.warn('Account Deletion failed. No account:' + username);
        }
        return retval;
    }
};