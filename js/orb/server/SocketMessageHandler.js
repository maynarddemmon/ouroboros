const {JS, tym} = require('../../../lib/tym.js'),
    orb = require('./orb.js');

module.exports = {
    handleMessage: scope => {
        const {account, data} = scope,
            websocket = account.websocket,
            {time, type, msg} = data;
        
        let response;
        
        switch (type) {
            case 'enterLobby':
                response = {type:'message', msg:'Hello'};
                break;
        }
        
        
        if (response) {
            try {
                websocket.send(JSON.stringify(response));
            } catch (err) {
                console.error('Failed to send response', response, err);
            }
        }
    }
};