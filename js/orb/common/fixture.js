(() => {
    const IS_NODEJS = typeof module === 'object' && module.exports,
        
        EXPORT = {
            templates:{
                d1:{
                    name:'wooden door',
                    states:{
                        open:'boolean'
                    },
                    effects:['solidity','opacity','damping'],
                    getInteractions: (fixture, character) => [fixture.getStateByName('open') ? 'close' : 'open'],
                    describe: function(fixture, character) {
                        return (fixture.getStateByName('open') ? 'an open' : 'a closed') + ' ' + this.name;
                    },
                    doInteraction: function(fixture, character, interactionId) {
                        if (fixture.getStateByName('open')) {
                            if (interactionId === 'close') fixture.setStateByName('open', false);
                        } else {
                            if (interactionId === 'open') fixture.setStateByName('open', true);
                        }
                    },
                    affectValue: function(fixture, attrName, value) {
                        const open = fixture.getStateByName('open');
                        switch (attrName) {
                            case 'solidity': value += (open ? 0 : 0.5); break;
                            case 'opacity': value += (open ? 0 : 0.75); break;
                            case 'damping': value *= (open ? 1 : 0.15); break;
                        }
                        return value;
                    },
                    urlsByState:{
                        "open-true":"/img/fixture/wooden_door_open.png",
                        "open-false":"/img/fixture/wooden_door_closed.png"
                    }
                },
                d2:{
                    name:'lockable wooden door',
                    states:{
                        open:'boolean',
                        locked:'boolean'
                    },
                    effects:['solidity','opacity','damping'],
                    getInteractions: (fixture, character) => [fixture.getStateByName('open') ? 'close' : 'open'],
                    describe: function(fixture, character) {
                        return (fixture.getStateByName('open') ? 'an open' : 'a closed') + ' ' + this.name;
                    },
                    affectValue: function(fixture, attrName, value) {
                        const open = fixture.getStateByName('open');
                        switch (attrName) {
                            case 'solidity': value += (open ? 0 : 0.5); break;
                            case 'opacity': value += (open ? 0 : 0.75); break;
                            case 'damping': value *= (open ? 1 : 0.15); break;
                        }
                        return value;
                    },
                    urlsByState:{
                        "locked-true_open-true":"/img/fixture/wooden_door_open.png",
                        "locked-true_open-false":"/img/fixture/wooden_door_closed.png",
                        "locked-false_open-true":"/img/fixture/wooden_door_open.png",
                        "locked-false_open-false":"/img/fixture/wooden_door_closed.png"
                    }
                },
                s1:{
                    name:'stone statue',
                    states:{
                        facing:'number'
                    },
                    effects:[], // FIXME: cell occupancy limit? solidity. opacity, damping?
                    describe: function(fixture, character) {return 'a ' + this.name;},
                    urlsByState:{
                        "DEFAULT":"/img/fixture/statue.png"
                    }
                }
            }
        };
    
    if (IS_NODEJS) {
        module.exports = EXPORT;
    } else {
        global.fixture = EXPORT;
    }
})();
