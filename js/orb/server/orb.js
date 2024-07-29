const path = require('path'),
    
    {JS, tym} = require('../../../lib/tym.js'),
    {getRandomInt} = tym,
    
    PATH_PREFIX = '../../../',
    
    SOCKET_PORT = 8081;

module.exports = {
    socketPort: SOCKET_PORT,
    socketUrl: 'ws://localhost:' + SOCKET_PORT,
    
    generateSecret: () => {
        let secret = '';
        for (let i = 0; i < 8; i++) secret += getRandomInt(0,99999999).toString(36);
        return secret;
    },
    
    makePath: suffix => path.join(__dirname, PATH_PREFIX + suffix),
};
