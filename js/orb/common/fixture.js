(() => {
    const IS_NODEJS = typeof module === 'object' && module.exports,
        
        EXPORT = {
            templates:{
                d1:{
                    name:'Wooden Door',
                    states:{
                        open:'boolean'
                    },
                    effects:['solidity','opacity','damping'],
                    affectValue: function(fixture, attrName, value) {
                        const open = fixture.getStateByName('open');
                        switch (attrName) {
                            case 'solidity': value += (open ? 0 : 0.5); break;
                            case 'opacity': value += (open ? 0 : 0.75); break;
                            case 'damping': value += (open ? 0 : -0.1); break;
                        }
                        return value;
                    },
                    urlsByState:{
                        "open-true":"/img/fixture/wooden_door_open.png",
                        "open-false":"/img/fixture/wooden_door_closed.png"
                    }
                },
                d2:{
                    name:'Lockable Wooden Door',
                    states:{
                        open:'boolean',
                        locked:'boolean'
                    },
                    effects:['solidity','opacity','damping'],
                    affectValue: function(fixture, attrName, value) {
                        const open = fixture.getStateByName('open');
                        switch (attrName) {
                            case 'solidity': value += (open ? 0 : 0.5); break;
                            case 'opacity': value += (open ? 0 : 0.75); break;
                            case 'damping': value += (open ? 0 : -0.1); break;
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
                    name:'Stone Statue',
                    states:{
                        facing:'number'
                    },
                    effects:[], // FIXME: cell occupancy limit? solidity. opacity, damping?
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
