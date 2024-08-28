(() => {
    const IS_NODEJS = typeof module === 'object' && module.exports,
        
        /*
        
        
        makeLink: (text, callbackName, data) => {
            return '<a href="#" onclick=\'jgo.doLink(this, "' + callbackName + '", &apos;' + JSONStringify(data) + '&apos;); return false;\'>' + text + '</a>';
        },
        
        doLink: (elem, callbackName, data) => {
            while (elem) {
                const model = elem.model;
                if (model && typeof model[callbackName] === 'function') {
                    let value;
                    if (data) {
                        try {
                            value = JSONParse(data);
                        } catch(e) {
                            M.dumpStack(e);
                        }
                    }
                    model[callbackName].call(model, value);
                    break;
                }
                elem = elem.parentNode;
            }
        },
        
        */
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
                    
                    /*getInteractions: function(fixture, character) {
                        const open = fixture.getStateByName('open');
                        if (open) {
                            return '<a href="">Open</a> the door.';
                        } else {
                            return '<a href="">Close</a> the door.';
                        }
                    },*/
                    /*doInteraction: function(fixture, character, interactionId) {
                        const open = fixture.getStateByName('open');
                        if (open) {
                            if (interactionId === 'close') {
                                fixture.setStateByName('open', false);
                            }
                        } else {
                            if (interactionId === 'open') {
                                fixture.setStateByName('open', true);
                            }
                        }
                    },*/
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
