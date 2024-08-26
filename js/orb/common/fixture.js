(() => {
    const IS_NODEJS = typeof module === 'object' && module.exports,
        
        EXPORT = {
            templates:{
                d1:{
                    name:'Wooden Door',
                    states:{
                        open:'boolean'
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
