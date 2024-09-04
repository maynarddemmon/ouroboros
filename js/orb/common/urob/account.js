(pkg => {
    /** User Accounts and Permissions */
    const PERM_CREATOR = 'creator';
    
    pkg.account = {
        FIELD_USERNAME:'username', // Also used to store username in the HTTP session.
        FIELD_PASSWORD:'password',
        FIELD_LAST_LOGIN:'lastLogin',
        FIELD_AUTH_FAIL_COUNT:'authFailCount',
        FIELD_AUTHENTICATED:'authenticated',
        FIELD_WEBSOCKET:'websocket',
        FIELD_SOCKET_TOKEN:'socketToken'
    };
    
    pkg.permission = {
        PERM_CREATOR:PERM_CREATOR
    };
})(global.urob);
