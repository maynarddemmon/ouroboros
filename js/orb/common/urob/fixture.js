(pkg => {
    let tym, JS, worldMap;
    if (typeof module === 'object' && module.exports) {
        const imported = require('../../../../lib/tym.js');
        JS = imported.JS;
        tym = imported.tym;
    } else {
        JS = global.JS;
        tym = global.myt;
    }
    
    const {I18N:{get:I18N}, Eventable} = tym,
        {Module:JSModule, Class:JSClass} = JS,
        
        {
            getPhraseWithArticle,
            facing:{NORTH, SOUTH, EAST, WEST}
        } = pkg,
        
        getWorldMap = () => worldMap ??= require('../../server/WorldMap.js'),
        
        IMAGE_PREFIX = '/img/fixture/',
        
        STATE_OPEN = 'open',
        STATE_LOCKED = 'locked',
        STATE_FACING = 'facing',
        STATE_MATERIAL = 'material',
        STATE_DESTINATION = 'destination',
        STATE_STAIR_DIRECTION = 'direction',
        
        INTERACTION_OPEN = 'open',
        INTERACTION_CLOSE = 'close',
        INTERACTION_LOCK = 'lock',
        INTERACTION_UNLOCK = 'unlock',
        INTERACTION_ROTATE_CLOCKWISE = 'rotate clockwise',
        INTERACTION_ROTATE_COUNTER_CLOCKWISE = 'rotate counter clockwise',
        INTERACTION_ENTER = 'enter',
        INTERACTION_ASCEND = 'ascend',
        INTERACTION_DESCEND = 'descend',
        
        FixtureTemplate = new JSClass('FixtureTemplate', Eventable, {
            init: function(attrs) {
                attrs.adjacentSupported ??= false;
                
                this.callSuper(attrs);
            },
            
            setName: function(v) {this.set('name', v, true);},
            getName: function(fixture, character) {return this.name;},
            getSimpleName: function(fixture, character) {return this.name;},
            
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
            
            doExpositionBeforeInteraction: (fixture, character, interactionName, willSucceed) => {},
            doExpositionAfterInteraction: (fixture, character, interactionName, succeeded) => {},
            
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
                            fixture.doExpositionBeforeInteraction(character, interactionName, true);
                            fixture.setStateByName(STATE_OPEN, false);
                            return;
                        } else {
                            return 'Can\'t close the ' + this.getName(fixture, character) + ' because it\'s already closed.';
                        }
                    case INTERACTION_OPEN:
                        if (fixture.getStateByName(STATE_OPEN)) {
                            return 'Can\'t open the ' + this.getName(fixture, character) + ' because it\'s already open.';
                        } else {
                            if (fixture.getStateByName(STATE_LOCKED)) {
                                return 'Can\'t open the ' + this.getName(fixture, character) + ' because it appears to be locked.';
                            } else {
                                fixture.setStateByName(STATE_OPEN, true);
                                fixture.doExpositionAfterInteraction(character, interactionName, true);
                                return;
                            }
                        }
                }
                return this.callSuper(fixture, character, interactionName);
            },
            doExpositionBeforeInteraction: function(fixture, character, interactionName, willSucceed) {
                if (willSucceed) {
                    switch (interactionName) {
                        case INTERACTION_CLOSE:
                            const fixtureName = fixture.getSimpleName();
                            character.sendExposition('You ' + interactionName + ' the ' + fixtureName + '.', 'narrative');
                            character.getCell().sendExposition(character.getName() + ' ' + interactionName + 'ed the ' + fixtureName + '.', 'visual', character);
                            return;
                    }
                }
                this.callSuper(fixture, character, interactionName, succeeded);
            },
            doExpositionAfterInteraction: function(fixture, character, interactionName, succeeded) {
                if (succeeded) {
                    switch (interactionName) {
                        case INTERACTION_OPEN:
                            const fixtureName = fixture.getSimpleName();
                            character.sendExposition('You ' + interactionName + ' the ' + fixtureName + '.', 'narrative');
                            character.getCell().sendExposition(character.getName() + ' ' + interactionName + 'ed the ' + fixtureName + '.', 'visual', character);
                            return;
                    }
                }
                this.callSuper(fixture, character, interactionName, succeeded);
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
                            fixture.doExpositionAfterInteraction(character, interactionName, true);
                            return;
                        } else {
                            return 'Can\'t unlock the ' + this.getName(fixture, character) + ' because it\'s already unlocked.';
                        }
                    case INTERACTION_LOCK:
                        if (fixture.getStateByName(STATE_LOCKED)) {
                            return 'Can\'t lock the ' + this.getName(fixture, character) + ' because it\'s already locked.';
                        } else {
                            fixture.setStateByName(STATE_LOCKED, true);
                            fixture.doExpositionAfterInteraction(character, interactionName, true);
                            return;
                        }
                }
                return this.callSuper(fixture, character, interactionName);
            },
            doExpositionAfterInteraction: function(fixture, character, interactionName, succeeded) {
                if (succeeded) {
                    switch (interactionName) {
                        case INTERACTION_UNLOCK:
                        case INTERACTION_LOCK:
                            const fixtureName = fixture.getSimpleName();
                            character.sendExposition('You ' + interactionName + ' the ' + fixtureName + '.', 'narrative');
                            character.getCell().sendExposition(character.getName() + ' ' + interactionName + 'ed the ' + fixtureName + '.', 'visual', character);
                            return;
                    }
                }
                this.callSuper(fixture, character, interactionName, succeeded);
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
                        fixture.doExpositionAfterInteraction(character, interactionName, true);
                        return;
                    case INTERACTION_ROTATE_COUNTER_CLOCKWISE:
                        switch (fixture.getStateByName(STATE_FACING)) {
                            case NORTH: fixture.setStateByName(STATE_FACING, WEST); break;
                            case EAST: fixture.setStateByName(STATE_FACING, NORTH); break;
                            case SOUTH: fixture.setStateByName(STATE_FACING, EAST); break;
                            case WEST: fixture.setStateByName(STATE_FACING, SOUTH); break;
                        }
                        fixture.doExpositionAfterInteraction(character, interactionName, true);
                        return;
                }
                return this.callSuper(fixture, character, interactionName);
            },
            
            doExpositionAfterInteraction: function(fixture, character, interactionName, succeeded) {
                if (succeeded) {
                    const expositionFunc = directionTxt => {
                        const fixtureName = fixture.getSimpleName();
                        character.sendExposition('You rotate the ' + fixtureName + ' ' + directionTxt + '.', 'narrative');
                        character.getCell().sendExposition(character.getName() + ' rotates the ' + fixtureName + ' ' + directionTxt + '.', 'visual', character);
                    };
                    switch (interactionName) {
                        case INTERACTION_ROTATE_CLOCKWISE: expositionFunc('clockwise'); return;
                        case INTERACTION_ROTATE_COUNTER_CLOCKWISE: expositionFunc('counter clockwise'); return;
                    }
                }
                this.callSuper(fixture, character, interactionName, succeeded);
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
                    [0.6, '*grinding*', 1<<5],  // 60% chance
                    [0.9, '*scraping*', 1<<4],  // 30% chance
                    [1.0, '*scratching*', 1<<2] // 10% chance
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
            getSoundForInteraction: (fixture, character, interactionName) => [[1, '*whoosh*', 2]],
            doInteraction: function(fixture, character, interactionName) {
                if (interactionName === INTERACTION_ENTER) {
                    character.doMove(
                        fixture.getStateByName(STATE_DESTINATION), null, 
                        'teleport-leave', 'teleport-arrive', 
                        () => {
                            fixture.doExpositionBeforeInteraction(character, interactionName, true);
                        },
                        () => {
                            fixture.doExpositionAfterInteraction(character, interactionName, true);
                        }
                    );
                    return;
                }
                return this.callSuper(fixture, character, interactionName);
            },
            
            doExpositionBeforeInteraction: (fixture, character, interactionName, willSucceed) => {
                if (willSucceed && interactionName === INTERACTION_ENTER) {
                    const fixtureName = fixture.getName();
                    character.sendExposition('You enter the ' + fixtureName + ' and your essence is torn apart. You are transported through higher dimensions for what seems an eternity. Until finally...', 'narrative');
                    character.getCell().sendExposition(character.getName() + ' enters the ' + fixtureName + '.', 'visual', character);
                    return;
                }
                this.callSuper(fixture, character, interactionName, willSucceed);
            },
            
            doExpositionAfterInteraction: (fixture, character, interactionName, succeeded) => {
                if (succeeded && interactionName === INTERACTION_ENTER) {
                    const fixtureName = fixture.getName();
                    character.sendExposition('You emerge from the ' + fixtureName + ' somewhere else.', 'narrative');
                    character.getCell().sendExposition(character.getName() + ' emerges from the ' + fixtureName + '.', 'visual', character);
                    return;
                }
                this.callSuper(fixture, character, interactionName, succeeded);
            },
            
            getUrl: (fixture, character) => IMAGE_PREFIX + 'portal.png'
        }),
        
        StairFixtureTemplate = new JSClass('StairFixtureTemplate', FixtureTemplate, {
            init: function(attrs) {
                attrs.states ??= [];
                attrs.states[STATE_STAIR_DIRECTION] = 'string'; // up, down, both
                
                this.callSuper(attrs);
            },
            
            getName: function(fixture, character) {
                let prefix = '';
                switch (fixture.getStateByName(STATE_STAIR_DIRECTION)) {
                    case 'up': prefix = 'ascending'; break;
                    case 'down': prefix = 'descending'; break;
                    case 'both': prefix = 'ascending and descending'; break;
                }
                return prefix + ' ' + this.callSuper();
            },
            
            // Methods /////////////////////////////////////////////////////////
            getInteractions: function(fixture, character, adjacent) {
                const retval = this.callSuper(fixture, character);
                if (!adjacent) {
                    const direction = fixture.getStateByName(STATE_STAIR_DIRECTION);
                    if (direction !== 'down') retval.push(INTERACTION_ASCEND);
                    if (direction !== 'up') retval.push(INTERACTION_DESCEND);
                }
                return retval;
            },
            
            getLockPropertyForInteraction: (fixture, character, interactionName) => 'lockMove',
            
            doInteraction: function(fixture, character, interactionName) {
                const doAscendOrDescend = isAscend => {
                    const direction = fixture.getStateByName(STATE_STAIR_DIRECTION);
                    if (direction !== (isAscend ? 'down' : 'up')) {
                        const locArr = character.getLocArr(true);
                        locArr[3] += isAscend ? 1 : -1;
                        character.doMove(
                            locArr, null, 'move', 'move', 
                            () => {
                                fixture.doExpositionBeforeInteraction(character, interactionName, true);
                            },
                            () => {
                                fixture.doExpositionAfterInteraction(character, interactionName, true);
                            }
                        );
                    }
                };
                
                switch (interactionName) {
                    case INTERACTION_ASCEND: doAscendOrDescend(true); return;
                    case INTERACTION_DESCEND: doAscendOrDescend(false); return;
                }
                return this.callSuper(fixture, character, interactionName);
            },
            
            doExpositionBeforeInteraction: (fixture, character, interactionName, willSucceed) => {
                if (willSucceed) {
                    switch (interactionName) {
                        case INTERACTION_ASCEND:
                        case INTERACTION_DESCEND:
                            const fixtureName = fixture.getSimpleName();
                            character.sendExposition('You ' + interactionName + ' the ' + fixtureName + '.', 'narrative');
                            character.getCell().sendExposition(character.getName() + ' ' + interactionName + 's the ' + fixtureName + '.', 'visual', character);
                            return;
                    }
                }
                this.callSuper(fixture, character, interactionName, willSucceed);
            },
            
            doExpositionAfterInteraction: (fixture, character, interactionName, succeeded) => {
                if (succeeded) {
                    switch (interactionName) {
                        case INTERACTION_ASCEND:
                        case INTERACTION_DESCEND:
                            const fixtureName = fixture.getSimpleName();
                            character.getCell().sendExposition(character.getName() + ' comes ' + (interactionName === INTERACTION_ASCEND ? 'up' : 'down') + ' the ' + fixtureName + '.', 'visual', character);
                            return;
                    }
                }
                this.callSuper(fixture, character, interactionName, succeeded);
            },
            
            getUrl: (fixture, character) => {
                return IMAGE_PREFIX + 'spiral_stair_' + fixture.getStateByName(STATE_STAIR_DIRECTION) + '.png';
            }
        }),
        
        FaceableStairFixtureTemplate = new JSClass('FaceableStairFixtureTemplate', StairFixtureTemplate, {
            include:[FaceableFixture],
            
            getUrl: (fixture, character) => {
                return IMAGE_PREFIX + 'switchback_stair_' + fixture.getStateByName(STATE_STAIR_DIRECTION) + '.png';
            }
        }),
        
        templates = {
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
            
            stair_1:new StairFixtureTemplate({name:'spiral stairs'}),
            stair_2:new FaceableStairFixtureTemplate({name:'switchback stairs'}),
            stair_3:new FaceableStairFixtureTemplate({name:'stairs'}, [{
                getUrl: (fixture, character) => {
                    return IMAGE_PREFIX + 'stair_' + fixture.getStateByName(STATE_STAIR_DIRECTION) + '.png';
                }
            }]),
            stair_4:new FaceableStairFixtureTemplate({name:'ramp'}, [{
                getUrl: (fixture, character) => {
                    return IMAGE_PREFIX + 'ramp_' + fixture.getStateByName(STATE_STAIR_DIRECTION) + '.png';
                }
            }]),
            
            crate_1:new FixtureTemplate({name:'wooden crate'})
        },
        
        getTemplate = fixtureTemplateId => templates[fixtureTemplateId],
        
        ValueAffectorMixin = new JSModule('ValueAffectorMixin', {
            affectValue: (attrName, value) => value,
            
            registerEffects: function(affectable) {
                const effects = this.getTemplateObject()?.getEffects();
                if (effects?.length > 0) {
                    for (const effectedAttrName of effects) {
                        affectable.registerValueAffector(effectedAttrName, this);
                    }
                }
            },
            
            unregisterEffects: function(affectable) {
                const effects = this.getTemplateObject()?.getEffects();
                if (effects?.length > 0) {
                    for (const effectedAttrName of effects) {
                        affectable.unregisterValueAffector(effectedAttrName, this);
                    }
                }
            }
        });
    
    pkg.fixture = {
        STATE_FACING:STATE_FACING,
        
        CommonFixtureModel: new JSClass('CommonFixtureModel', Eventable, {
            include:[ValueAffectorMixin],
            
            
            // Life Cycle //////////////////////////////////////////////////////
            destroy: function() {
                if (this.face) {
                    this.unregisterEffects(this.face);
                } else if (this.cell) {
                    this.unregisterEffects(this.cell);
                }
                this.callSuper();
            },
            
            
            // Accessors ///////////////////////////////////////////////////////
            setId: function(v) {this.set('id', v, true);},
            getId: function() {return this.id;},
            
            setFixtureContainer: function(v) {
                if (this.fixtureContainer) this.unregisterEffects(this.fixtureContainer);
                this.set('fixtureContainer', v, true);
                this.registerEffects(this.fixtureContainer);
            },
            
            getCell: function() {return this.fixtureContainer.getCell();},
            
            setTemplate: function(v) {this.set('template', v, true);},
            getTemplate: function() {return this.template;},
            getTemplateObject: function() {return getTemplate(this.getTemplate());},
            
            getStateObject: function() {return this.state ??= {};},
            setStateByName: function(stateName, value) {this.getStateObject()[stateName] = value;},
            getStateByName: function(stateName) {return this.getStateObject()[stateName];},
            
            getTemplateUrl: function(character) {
                return this.getTemplateObject().getUrl(this, character);
            },
            
            
            // Methods /////////////////////////////////////////////////////////
            getInteractions: function(character) {
                return this.getTemplateObject().getInteractions(this, character);
            },
            
            describe: function(character) {
                return this.getTemplateObject().describe(this, character);
            },
            
            getName: function(character) {
                return this.getTemplateObject().getName(this, character);
            },
            
            getSimpleName: function(character) {
                return this.getTemplateObject().getSimpleName(this, character);
            },
            
            getLockPropertyForInteraction: function(character, interactionName) {
                return this.getTemplateObject().getLockPropertyForInteraction?.(this, character, interactionName);
            },
            
            getSoundForInteraction: function(character, interactionName) {
                return this.getTemplateObject().getSoundForInteraction(this, character, interactionName);
            },
            
            doInteraction: function(character, interactionName) {
                const failureMsg = this.getTemplateObject().doInteraction(this, character, interactionName);
                
                // Make sound if successful
                if (!failureMsg) {
                    const worldMap = getWorldMap(),
                        {volume, sound} = worldMap.selectSoundRandomly(this.getSoundForInteraction(character, interactionName));
                    if (sound) {
                        worldMap.broadcastSound(this, 'fixture', sound, volume);
                    }
                }
                
                return failureMsg;
            },
            
            doExpositionBeforeInteraction: function(character, interactionName, willSucceed) {
                return this.getTemplateObject().doExpositionBeforeInteraction(this, character, interactionName, willSucceed);
            },
            doExpositionAfterInteraction: function(character, interactionName, succeeded) {
                return this.getTemplateObject().doExpositionAfterInteraction(this, character, interactionName, succeeded);
            },
            
            affectValue: function(attrName, value) {
                const template = this.getTemplateObject();
                return template ? template.affectValue(this, attrName, value) : this.callSuper(value);
            },
            
            
            // Persistence and Serialization ///////////////////////////////////
            getAsData: function(cfg) {
                const retval = this.callSuper?.(cfg) ?? {};
                retval.id = this.id;
                retval.t = this.template;
                if (this.state != null) retval.state = this.state;
                return retval;
            },
            
            updateFromData: function(datum) {
                this.callSuper?.(datum);
                
                this.setId(datum.id);
                this.setTemplate(datum.t);
                this.state = datum.state;
                
                this.setFixtureContainer(datum.fixtureContainer);
                
                return this;
            }
        }),
        
        getTemplates: () => templates,
        getTemplate: getTemplate
    };
})(global.urob);
