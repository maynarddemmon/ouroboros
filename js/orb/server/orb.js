const path = require('path'),
    fs = require('fs'),
    
    {JS, tym} = require('../../../lib/tym.js'),
    {getRandomInt} = tym,
    
    PATH_PREFIX = '../../../',
    
    HTTP_PORT = 8080,
    SOCKET_PORT = 8081,
    
    makePath = suffix => path.join(__dirname, PATH_PREFIX + suffix);

module.exports = {
    IS_PROD: false,
    CACHE_BUST: '',
    
    httpPort: HTTP_PORT,
    socketPort: SOCKET_PORT,
    socketUrl: 'ws://localhost:' + SOCKET_PORT,
    authFailLimit: 12, // The maximum number of failed auth attempts
    accountUnlockerInterval: 30 * 60 * 1000, // 30 minutes
    
    generateSecret: () => {
        let secret = '';
        for (let i = 0; i < 8; i++) secret += getRandomInt(0,99999999).toString(36);
        return secret;
    },
    
    makePath:makePath,
    
    saveDataToFile: (filename, data) => {
        try {
            const path = makePath('data/' + filename + '.js');
            fs.writeFileSync(path, JSON.stringify(data, null, 4));
            console.log('  Saved ' + path + (Array.isArray(data) ? ' with ' + data.length + ' elements.' : ''));
        } catch (err) {
            console.error('Error Saving ' + filename + '.', err);
            return false;
        }
        return true;
    },
    
    readDataFromFile: filename => {
        const path = makePath('data/' + filename + '.js'),
            strData = fs.readFileSync(path).toString();
        if (strData) {
            try {
                return JSON.parse(strData);
            } catch (err) {
                console.error('Error Parsing JSON for ' + filename + '.', err);
            }
        } else {
            console.log('No ' + filename + ' data to load.', strData);
        }
        return null;
    }
};
