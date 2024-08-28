(() => {
    const IS_NODEJS = typeof module === 'object' && module.exports;
    
    let tym, JS;
    if (IS_NODEJS) {
        const imported = require('../../../lib/tym.js');
        JS = imported.JS;
        tym = imported.tym;
    } else {
        JS = global.JS;
        tym = global.myt;
    }
    
    const
        {Eventable} = tym,
        {Module:JSModule, Class:JSClass} = JS,
        
        IMAGE_PREFIX = '/img/fixture/',
        
        STATE_OPEN = 'open',
        STATE_LOCKED = 'locked',
        STATE_FACING = 'facing',
        
        INTERACTION_OPEN = 'open',
        INTERACTION_CLOSE = 'close',
        INTERACTION_LOCK = 'lock',
        INTERACTION_UNLOCK = 'unlock',
        
        FixtureTemplate = new JSClass('FixtureTemplate', Eventable, {
            setName: function(v) {this.set('name', v, true);},
            getName: function() {return this.name;},
            
            setStates: function(v) {this.set('states', v, true);},
            getStates: function() {return this.states;},
            
            setEffects: function(v) {this.set('effects', v, true);},
            getEffects: function() {return this.effects;},
            
            
            // Methods /////////////////////////////////////////////////////////
            getInteractions: (fixture, character) => [],
            describe: function(fixture, character, isAppend) {return this.name;},
            doInteraction: function(fixture, character, interactionId) {},
            affectValue: (fixture, attrName, value) => value,
            getUrl: (fixture, character) => IMAGE_PREFIX + 'box.png'
        }),
        
        OpenableFixture = new JSModule('OpenableFixture', {
            init: function(attrs) {
                attrs.states ??= [];
                attrs.states[STATE_OPEN] = 'boolean';
                
                this.callSuper(attrs);
            },
            
            getInteractions: function(fixture, character) {
                const retval = this.callSuper(fixture, character);
                retval.push(fixture.getStateByName(STATE_OPEN) ? INTERACTION_CLOSE : INTERACTION_OPEN);
                return retval;
            },
            describe: function(fixture, character, isAppend) {
                const isOpen = fixture.getStateByName(STATE_OPEN),
                    prefix = isAppend ? 'and ' : (isOpen ? 'an' : 'a');
                return prefix + ' ' + (isOpen ? 'open' : 'closed') + ' ' + this.callSuper(fixture, character, true);
            },
            doInteraction: function(fixture, character, interactionId) {
                if (!fixture.getStateByName(STATE_LOCKED)) {
                    // Can't open/close while locked is true.
                    if (fixture.getStateByName(STATE_OPEN)) {
                        if (interactionId === INTERACTION_CLOSE) fixture.setStateByName(STATE_OPEN, false);
                    } else {
                        if (interactionId === INTERACTION_OPEN) fixture.setStateByName(STATE_OPEN, true);
                    }
                }
                this.callSuper(fixture, character, interactionId);
            }
        }),
        
        LockableFixture = new JSModule('LockableFixture', {
            init: function(attrs) {
                attrs.states ??= [];
                attrs.states[STATE_LOCKED] = 'boolean';
                
                this.callSuper(attrs);
            },
            
            getInteractions: function(fixture, character) {
                const retval = this.callSuper(fixture, character);
                retval.push(fixture.getStateByName(STATE_LOCKED) ? INTERACTION_UNLOCK : INTERACTION_LOCK);
                return retval;
            },
            describe: function(fixture, character, isAppend) {
                const isLocked = fixture.getStateByName(STATE_LOCKED),
                    prefix = isAppend ? 'and ' : (isLocked ? 'a' : 'an');
                return prefix + ' ' + (isLocked ? 'locked' : 'unlocked') + ' ' + this.callSuper(fixture, character, true);
            },
            doInteraction: function(fixture, character, interactionId) {
                if (!fixture.getStateByName(STATE_OPEN)) {
                    // Can't lock/unlock if open is true.
                    if (fixture.getStateByName(STATE_LOCKED)) {
                        if (interactionId === INTERACTION_UNLOCK) fixture.setStateByName(STATE_LOCKED, false);
                    } else {
                        if (interactionId === INTERACTION_LOCK) fixture.setStateByName(STATE_LOCKED, true);
                    }
                }
                this.callSuper(fixture, character, interactionId);
            }
        }),
        
        DoorFixtureTemplate = new JSClass('DoorFixtureTemplate', FixtureTemplate, {
            include:[OpenableFixture],
            
            init: function(attrs) {
                attrs.effects ??= [];
                attrs.effects.push('solidity','opacity','damping')
                
                this.callSuper(attrs);
            },
            
            // Methods /////////////////////////////////////////////////////////
            affectValue: function(fixture, attrName, value) {
                const open = fixture.getStateByName(STATE_OPEN);
                switch (attrName) {
                    case 'solidity': value += (open ? 0 : 0.5); break;
                    case 'opacity': value += (open ? 0 : 0.75); break;
                    case 'damping': value *= (open ? 1 : 0.15); break;
                }
                return value;
            },
        }),
        
        EXPORT = {
            templates:{
                d1:new DoorFixtureTemplate({
                    name:'wooden door'
                },[{
                    getUrl: (fixture, character) => {
                        return IMAGE_PREFIX + (fixture.getStateByName(STATE_OPEN) ? 'wooden_door_open.png' : 'wooden_door_closed.png');
                    }
                }]),
                
                d2:new DoorFixtureTemplate({
                    name:'lockable wooden door'
                },[LockableFixture, {
                    getUrl: (fixture, character) => {
                        return IMAGE_PREFIX + (fixture.getStateByName(STATE_OPEN) ? 'wooden_door_open.png' : 'wooden_door_closed.png');
                    }
                }]),
                
                s1:new FixtureTemplate({
                    name:'marble statue',
                    states:{
                        [STATE_FACING]:'number'
                    },
                    effects:[] // FIXME: cell occupancy limit? solidity. opacity, damping?
                },[{
                    describe: function(fixture, character, isAppend) {return 'a ' + this.callSuper(fixture, character, isAppend);},
                    getUrl: (fixture, character) => IMAGE_PREFIX + 'statue.png'
                }]),
                
                crate_1:new FixtureTemplate({
                    name:'wooden frame crate'
                },[{
                    describe: function(fixture, character, isAppend) {return 'a ' + this.callSuper(fixture, character, isAppend);}
                }])
            }
        };
    
    if (IS_NODEJS) {
        module.exports = EXPORT;
    } else {
        global.fixture = EXPORT;
    }
})();
