(() => {
    const IS_NODEJS = typeof module === 'object' && module.exports;
    
    let tym, JS, facing, orb;
    if (IS_NODEJS) {
        const imported = require('../../../lib/tym.js');
        JS = imported.JS;
        tym = imported.tym;
        facing = require('./facing.js');
    } else {
        JS = global.JS;
        tym = global.myt;
        facing = global.facing;
    }
    
    const {I18N:{get:I18N}, Eventable} = tym,
        {Module:JSModule, Class:JSClass} = JS,
        
        {NORTH, SOUTH, EAST, WEST} = facing,
        
        IMAGE_PREFIX = '/img/fixture/',
        
        STATE_OPEN = 'open',
        STATE_LOCKED = 'locked',
        STATE_FACING = 'facing',
        STATE_MATERIAL = 'material',
        STATE_DESTINATION = 'destination',
        
        INTERACTION_OPEN = 'open',
        INTERACTION_CLOSE = 'close',
        INTERACTION_LOCK = 'lock',
        INTERACTION_UNLOCK = 'unlock',
        INTERACTION_ROTATE_CLOCKWISE = 'rotate clockwise',
        INTERACTION_ROTATE_COUNTER_CLOCKWISE = 'rotate counter clockwise',
        INTERACTION_ENTER = 'enter',
        
        WORD_AN = 'an',
        WORD_A = 'a',
        WORD_AND = 'and',
        
        getArticle = phrase => {
            const match = /\w+/.exec(phrase);
            if (!match) return WORD_AN;
            
            // Exceptional word starts that should be preceded by "an".
            const word = match[0].toLowerCase();
            for (const altCase of ['honest', 'hour', 'hono']) {
                if (word.startsWith(altCase)) return WORD_AN;
            }
            
            // Special cases where a word that begins with a vowel should be preceded by "a".
            for (const regex of [/^e[uw]/, /^onc?e\b/, /^uni([^nmd]|mo)/, /^u[bcfhjkqrst][aeiou]/]) {
                if (word.match(regex)) return WORD_A;
            }
            
            // Words that begin with a vowel being preceded by "an".
            if ('aeiou'.includes(word[0])) return WORD_AN;
            
            // Instances where y followed by specific letters is preceded by "an".
            if (word.match(/^y(b[lor]|cl[ea]|fere|gg|p[ios]|rou|tt)/)) return WORD_AN;
            
            return WORD_A;
        },
        getPhraseWithArticle = (phrase, isAppend) => (isAppend ? WORD_AND : getArticle(phrase)) + ' ' + phrase,
        
        FixtureTemplate = new JSClass('FixtureTemplate', Eventable, {
            init: function(attrs) {
                attrs.adjacentSupported ??= false;
                
                this.callSuper(attrs);
            },
            
            setName: function(v) {this.set('name', v, true);},
            getName: function(fixture, character) {return this.name;},
            
            setStates: function(v) {this.set('states', v, true);},
            getStates: function() {return this.states;},
            
            setEffects: function(v) {this.set('effects', v, true);},
            getEffects: function() {return this.effects;},
            
            setAdjacentSupported: function(v) {this.set('adjacentSupported', v, true);},
            isAdjacentSupported: function() {return this.adjacentSupported;},
            
            
            // Methods /////////////////////////////////////////////////////////
            getInteractions: (fixture, character, adjacent) => [],
            getLockPropertyForInteraction: (fixture, character, interactionName) => 'lockAct',
            getSoundForInteraction: (fixture, character, interactionName) => null,
            affectValue: (fixture, attrName, value) => value,
            
            // Server Only
            /** Optionally returns an error message. */
            doInteraction: (fixture, character, interactionName) => {},
            
            // Client Only
            describe: function(fixture, character, isAppend) {
                return isAppend ? this.getName(fixture, character) : getPhraseWithArticle(this.getName(fixture, character));
            },
            getUrl: (fixture, character) => IMAGE_PREFIX + 'box.png'
        }),
        
        OpenableFixture = new JSModule('OpenableFixture', {
            init: function(attrs) {
                attrs.states ??= [];
                attrs.states[STATE_OPEN] = 'boolean';
                
                this.callSuper(attrs);
            },
            
            getInteractions: function(fixture, character, adjacent) {
                const retval = this.callSuper(fixture, character);
                if (!adjacent || this.isAdjacentSupported()) {
                    retval.push(fixture.getStateByName(STATE_OPEN) ? INTERACTION_CLOSE : INTERACTION_OPEN);
                }
                return retval;
            },
            describe: function(fixture, character, isAppend) {
                return getPhraseWithArticle(fixture.getStateByName(STATE_OPEN) ? 'open' : 'closed', isAppend) + ' ' + this.callSuper(fixture, character, true);
            },
            doInteraction: function(fixture, character, interactionName) {
                switch (interactionName) {
                    case INTERACTION_CLOSE:
                        if (fixture.getStateByName(STATE_OPEN)) {
                            fixture.setStateByName(STATE_OPEN, false);
                        } else {
                            return 'Can\'t close the ' + this.getName(fixture, character) + ' because it\'s already closed.';
                        }
                        return;
                    case INTERACTION_OPEN:
                        if (fixture.getStateByName(STATE_OPEN)) {
                            return 'Can\'t open the ' + this.getName(fixture, character) + ' because it\'s already open.';
                        } else {
                            if (fixture.getStateByName(STATE_LOCKED)) {
                                return 'Can\'t open the ' + this.getName(fixture, character) + ' because it appears to be locked.';
                            } else {
                                fixture.setStateByName(STATE_OPEN, true);
                            }
                        }
                        return;
                }
                return this.callSuper(fixture, character, interactionName);
            }
        }),
        
        LockableFixture = new JSModule('LockableFixture', {
            init: function(attrs) {
                attrs.states ??= [];
                attrs.states[STATE_LOCKED] = 'boolean';
                
                this.callSuper(attrs);
            },
            
            getInteractions: function(fixture, character, adjacent) {
                const retval = this.callSuper(fixture, character);
                if (!adjacent) retval.push(fixture.getStateByName(STATE_LOCKED) ? INTERACTION_UNLOCK : INTERACTION_LOCK);
                return retval;
            },
            describe: function(fixture, character, isAppend) {
                return getPhraseWithArticle(fixture.getStateByName(STATE_LOCKED) ? 'locked' : 'unlocked', isAppend) + ' ' + this.callSuper(fixture, character, true);
            },
            doInteraction: function(fixture, character, interactionName) {
                switch (interactionName) {
                    case INTERACTION_UNLOCK:
                        if (fixture.getStateByName(STATE_LOCKED)) {
                            fixture.setStateByName(STATE_LOCKED, false);
                        } else {
                            return 'Can\'t unlock the ' + this.getName(fixture, character) + ' because it\'s already unlocked.';
                        }
                        return;
                    case INTERACTION_LOCK:
                        if (fixture.getStateByName(STATE_LOCKED)) {
                            return 'Can\'t lock the ' + this.getName(fixture, character) + ' because it\'s already locked.';
                        } else {
                            fixture.setStateByName(STATE_LOCKED, true);
                        }
                        return;
                }
                return this.callSuper(fixture, character, interactionName);
            }
        }),
        
        /** A fixture with a non-interactive "facing". */
        FaceableFixture = new JSModule('FaceableFixture', {
            init: function(attrs) {
                attrs.states ??= [];
                attrs.states[STATE_FACING] = 'string';
                
                this.callSuper(attrs);
            },
            
            describe: function(fixture, character, isAppend) {
                return getPhraseWithArticle(I18N('facing-' + fixture.getStateByName(STATE_FACING)) + ' facing ', isAppend) + this.callSuper(fixture, character, true);
            }
        }),
        
        /** A fixture that can be rotated (generally used with a facing). */
        RotatableFixture = new JSModule('RotatableFixture', {
            include:[FaceableFixture],
            
            getInteractions: function(fixture, character, adjacent) {
                const retval = this.callSuper(fixture, character);
                if (!adjacent) retval.push(INTERACTION_ROTATE_CLOCKWISE, INTERACTION_ROTATE_COUNTER_CLOCKWISE);
                return retval;
            },
            doInteraction: function(fixture, character, interactionName) {
                switch (interactionName) {
                    case INTERACTION_ROTATE_CLOCKWISE:
                        switch (fixture.getStateByName(STATE_FACING)) {
                            case NORTH: fixture.setStateByName(STATE_FACING, EAST); break;
                            case EAST: fixture.setStateByName(STATE_FACING, SOUTH); break;
                            case SOUTH: fixture.setStateByName(STATE_FACING, WEST); break;
                            case WEST: fixture.setStateByName(STATE_FACING, NORTH); break;
                        }
                        return;
                    case INTERACTION_ROTATE_COUNTER_CLOCKWISE:
                        switch (fixture.getStateByName(STATE_FACING)) {
                            case NORTH: fixture.setStateByName(STATE_FACING, WEST); break;
                            case EAST: fixture.setStateByName(STATE_FACING, NORTH); break;
                            case SOUTH: fixture.setStateByName(STATE_FACING, EAST); break;
                            case WEST: fixture.setStateByName(STATE_FACING, SOUTH); break;
                        }
                        return;
                }
                return this.callSuper(fixture, character, interactionName);
            }
        }),
        
        
        // Materials for statues: alabaster, marble, limestone, sandstone, soapstone, granite, 
        StatueFixtureTemplate = new JSClass('StatueFixtureTemplate', FixtureTemplate, {
            include:[RotatableFixture],
            
            init: function(attrs) {
                attrs.name ??= 'statute';
                
                attrs.states ??= [];
                attrs.states[STATE_MATERIAL] = 'string';
                
                this.callSuper(attrs);
            },
            
            getName: function(fixture, character) {return fixture.getStateByName(STATE_MATERIAL) + ' ' + this.callSuper();},
            
            getSoundForInteraction: (fixture, character, interactionName) => {
                return [
                    // threshold in ascending order, sound, volume
                    [0.6, '*grinding*', 5],  // 60% chance
                    [0.9, '*scraping*', 4],  // 30% chance
                    [1.0, '*scratching*', 2] // 10% chance
                ];
            },
            
            getUrl: (fixture, character) => IMAGE_PREFIX + 'statue.png'
        }),
        
        DoorFixtureTemplate = new JSClass('DoorFixtureTemplate', FixtureTemplate, {
            include:[OpenableFixture],
            
            init: function(attrs) {
                attrs.adjacentSupported ??= true;
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
            
            getSoundForInteraction: (fixture, character, interactionName) => {
                switch (interactionName) {
                    case INTERACTION_CLOSE:
                        return [
                            [0.25, '*soft thud*', 2],
                            [1, '*creak*', 3]
                        ];
                    case INTERACTION_OPEN:
                        return [[1, '*creak*', 3]];
                    case INTERACTION_UNLOCK:
                        return [[1, '*click*', 1]];
                    case INTERACTION_LOCK:
                        return [[1, '*click*', 1]];
                }
            }
        }),
        
        PortalFixtureTemplate = new JSClass('PortalFixtureTemplate', FixtureTemplate, {
            init: function(attrs) {
                attrs.states ??= [];
                attrs.states[STATE_DESTINATION] = 'string';
                
                this.callSuper(attrs);
            },
            
            // Methods /////////////////////////////////////////////////////////
            getInteractions: function(fixture, character, adjacent) {
                const retval = this.callSuper(fixture, character);
                if (!adjacent) retval.push(INTERACTION_ENTER);
                return retval;
            },
            getLockPropertyForInteraction: (fixture, character, interactionName) => 'lockMove',
            getSoundForInteraction: (fixture, character, interactionName) => '*whoosh*',
            doInteraction: function(fixture, character, interactionName) {
                switch (interactionName) {
                    case INTERACTION_ENTER:
                        character.doMove(fixture.getStateByName(STATE_DESTINATION), null, 'teleport-leave', 'teleport-arrive');
                        return;
                }
                return this.callSuper(fixture, character, interactionName);
            },
            
            getUrl: (fixture, character) => IMAGE_PREFIX + 'portal.png'
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
                
                s1:new StatueFixtureTemplate(),
                p1:new PortalFixtureTemplate({name:'swirling silver portal'}),
                
                crate_1:new FixtureTemplate({name:'wooden crate'})
            }
        };
    
    if (IS_NODEJS) {
        module.exports = EXPORT;
    } else {
        global.fixture = EXPORT;
    }
})();
