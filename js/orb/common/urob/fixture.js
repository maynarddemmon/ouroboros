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
            facing:{NORTH, SOUTH, EAST, WEST},
            thing:{
                ThingTemplate, Thing,
                STATE_OPEN, STATE_LOCKED, STATE_FACING, STATE_DESTINATION, STATE_STAIR_DIRECTION,
                
                INTERACTION_ID_ASCEND,
                INTERACTION_ID_CLOSE,
                INTERACTION_ID_DESCEND,
                INTERACTION_ID_DISCHARGE,
                INTERACTION_ID_DROP,
                INTERACTION_ID_EAT,
                INTERACTION_ID_ENTER,
                INTERACTION_ID_LOCK,
                INTERACTION_ID_OPEN,
                INTERACTION_ID_PICK_UP,
                INTERACTION_ID_RECHARGE,
                INTERACTION_ID_ROTATE_CLOCKWISE,
                INTERACTION_ID_ROTATE_COUNTER_CLOCKWISE,
                INTERACTION_ID_UNLOCK,
                
                INTERACTION_ASCEND,
                INTERACTION_CLOSE,
                INTERACTION_DESCEND,
                INTERACTION_DROP,
                INTERACTION_EAT,
                INTERACTION_ENTER,
                INTERACTION_LOCK,
                INTERACTION_OPEN,
                INTERACTION_PICK_UP,
                INTERACTION_ROTATE_CLOCKWISE,
                INTERACTION_ROTATE_COUNTER_CLOCKWISE,
                INTERACTION_UNLOCK,
            }
        } = pkg,
        
        getWorldMap = () => worldMap ??= require('../../server/WorldMap.js'),
        
        IMAGE_PREFIX = '/img/fixture/',
        
        fixtures = new Map(),
        
        FixtureTemplate = new JSClass('FixtureTemplate', ThingTemplate, {
            init: function(attrs) {
                attrs.adjacentSupported ??= false;
                
                this.callSuper(attrs);
            },
            
            setEffects: function(v) {this.set('effects', v, true);},
            getEffects: function() {return this.effects;},
            
            setAdjacentSupported: function(v) {this.set('adjacentSupported', v, true);},
            isAdjacentSupported: function() {return this.adjacentSupported;},
            
            
            // Methods /////////////////////////////////////////////////////////
            affectValue: (fixture, attrName, value) => value,
            
            // Client Only
            getUrl: (fixture, character) => IMAGE_PREFIX + 'box.png'
        }),
        
        OpenableFixture = new JSModule('OpenableFixture', {
            init: function(attrs) {
                attrs.states ??= [];
                attrs.states[STATE_OPEN] = 'boolean';
                
                this.callSuper(attrs);
            },
            
            getInteractions: function(fixture, character, adjacent) {
                const retval = this.callSuper(fixture, character, adjacent);
                if (!adjacent || this.isAdjacentSupported()) {
                    retval.push(fixture.getStateByName(STATE_OPEN) ? INTERACTION_CLOSE : INTERACTION_OPEN);
                }
                return retval;
            },
            describe: function(fixture, character, isAppend) {
                return getPhraseWithArticle(fixture.getStateByName(STATE_OPEN) ? 'open' : 'closed', isAppend) + ' ' + this.callSuper(fixture, character, true);
            },
            doInteraction: function(fixture, character, interaction) {
                switch (interaction.id) {
                    case INTERACTION_ID_CLOSE:
                        if (fixture.getStateByName(STATE_OPEN)) {
                            fixture.doExpositionBeforeInteraction(character, interaction, true);
                            fixture.setStateByName(STATE_OPEN, false);
                            return;
                        } else {
                            return 'Can\'t close the ' + this.getName(fixture, character) + ' because it\'s already closed.';
                        }
                    case INTERACTION_ID_OPEN:
                        if (fixture.getStateByName(STATE_OPEN)) {
                            return 'Can\'t open the ' + this.getName(fixture, character) + ' because it\'s already open.';
                        } else {
                            if (fixture.getStateByName(STATE_LOCKED)) {
                                return 'Can\'t open the ' + this.getName(fixture, character) + ' because it appears to be locked.';
                            } else {
                                fixture.setStateByName(STATE_OPEN, true);
                                fixture.doExpositionAfterInteraction(character, interaction, true);
                                return;
                            }
                        }
                }
                return this.callSuper(fixture, character, interaction);
            },
            doExpositionBeforeInteraction: function(fixture, character, interaction, willSucceed) {
                if (willSucceed) {
                    switch (interaction.id) {
                        case INTERACTION_ID_CLOSE:
                            const fixtureName = fixture.getSimpleName();
                            character.sendExposition('You ' + interaction.label + ' the ' + fixtureName + '.', 'narrative');
                            character.getCell().sendExposition(character.getName() + ' ' + interaction.label + 'ed the ' + fixtureName + '.', 'visual', character);
                            return;
                    }
                }
                this.callSuper(fixture, character, interaction, succeeded);
            },
            doExpositionAfterInteraction: function(fixture, character, interaction, succeeded) {
                if (succeeded) {
                    switch (interaction.id) {
                        case INTERACTION_ID_OPEN:
                            const fixtureName = fixture.getSimpleName();
                            character.sendExposition('You ' + interaction.label + ' the ' + fixtureName + '.', 'narrative');
                            character.getCell().sendExposition(character.getName() + ' ' + interaction.label + 'ed the ' + fixtureName + '.', 'visual', character);
                            return;
                    }
                }
                this.callSuper(fixture, character, interaction, succeeded);
            }
        }),
        
        LockableFixture = new JSModule('LockableFixture', {
            init: function(attrs) {
                attrs.states ??= [];
                attrs.states[STATE_LOCKED] = 'boolean';
                
                this.callSuper(attrs);
            },
            
            getInteractions: function(fixture, character, adjacent) {
                const retval = this.callSuper(fixture, character, adjacent);
                if (!adjacent) retval.push(fixture.getStateByName(STATE_LOCKED) ? INTERACTION_UNLOCK : INTERACTION_LOCK);
                return retval;
            },
            describe: function(fixture, character, isAppend) {
                return getPhraseWithArticle(fixture.getStateByName(STATE_LOCKED) ? 'locked' : 'unlocked', isAppend) + ' ' + this.callSuper(fixture, character, true);
            },
            doInteraction: function(fixture, character, interaction) {
                switch (interaction.id) {
                    case INTERACTION_ID_UNLOCK:
                        if (fixture.getStateByName(STATE_LOCKED)) {
                            fixture.setStateByName(STATE_LOCKED, false);
                            fixture.doExpositionAfterInteraction(character, interaction, true);
                            return;
                        } else {
                            return 'Can\'t ' + interaction.label + ' the ' + this.getName(fixture, character) + ' because it\'s already unlocked.';
                        }
                    case INTERACTION_ID_LOCK:
                        if (fixture.getStateByName(STATE_LOCKED)) {
                            return 'Can\'t '+ interaction.label + ' the ' + this.getName(fixture, character) + ' because it\'s already locked.';
                        } else {
                            fixture.setStateByName(STATE_LOCKED, true);
                            fixture.doExpositionAfterInteraction(character, interaction, true);
                            return;
                        }
                }
                return this.callSuper(fixture, character, interaction);
            },
            doExpositionAfterInteraction: function(fixture, character, interaction, succeeded) {
                if (succeeded) {
                    switch (interaction.id) {
                        case INTERACTION_ID_UNLOCK:
                        case INTERACTION_ID_LOCK:
                            const fixtureName = fixture.getSimpleName();
                            character.sendExposition('You ' + interaction.label + ' the ' + fixtureName + '.', 'narrative');
                            character.getCell().sendExposition(character.getName() + ' ' + interaction.label + 'ed the ' + fixtureName + '.', 'visual', character);
                            return;
                    }
                }
                this.callSuper(fixture, character, interaction, succeeded);
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
                const retval = this.callSuper(fixture, character, adjacent);
                if (!adjacent) retval.push(INTERACTION_ROTATE_CLOCKWISE, INTERACTION_ROTATE_COUNTER_CLOCKWISE);
                return retval;
            },
            doInteraction: function(fixture, character, interaction) {
                switch (interaction.id) {
                    case INTERACTION_ID_ROTATE_CLOCKWISE:
                        switch (fixture.getStateByName(STATE_FACING)) {
                            case NORTH: fixture.setStateByName(STATE_FACING, EAST); break;
                            case EAST: fixture.setStateByName(STATE_FACING, SOUTH); break;
                            case SOUTH: fixture.setStateByName(STATE_FACING, WEST); break;
                            case WEST: fixture.setStateByName(STATE_FACING, NORTH); break;
                        }
                        fixture.doExpositionAfterInteraction(character, interaction, true);
                        return;
                    case INTERACTION_ID_ROTATE_COUNTER_CLOCKWISE:
                        switch (fixture.getStateByName(STATE_FACING)) {
                            case NORTH: fixture.setStateByName(STATE_FACING, WEST); break;
                            case EAST: fixture.setStateByName(STATE_FACING, NORTH); break;
                            case SOUTH: fixture.setStateByName(STATE_FACING, EAST); break;
                            case WEST: fixture.setStateByName(STATE_FACING, SOUTH); break;
                        }
                        fixture.doExpositionAfterInteraction(character, interaction, true);
                        return;
                }
                return this.callSuper(fixture, character, interaction);
            },
            
            doExpositionAfterInteraction: function(fixture, character, interaction, succeeded) {
                if (succeeded) {
                    const expositionFunc = directionTxt => {
                        const fixtureName = fixture.getSimpleName();
                        character.sendExposition('You rotate the ' + fixtureName + ' ' + directionTxt + '.', 'narrative');
                        character.getCell().sendExposition(character.getName() + ' rotates the ' + fixtureName + ' ' + directionTxt + '.', 'visual', character);
                    };
                    switch (interaction.id) {
                        case INTERACTION_ID_ROTATE_CLOCKWISE: expositionFunc('clockwise'); return;
                        case INTERACTION_ID_ROTATE_COUNTER_CLOCKWISE: expositionFunc('counter clockwise'); return;
                    }
                }
                this.callSuper(fixture, character, interaction, succeeded);
            }
        }),
        
        
        // Materials for statues: alabaster, marble, limestone, sandstone, soapstone, granite, 
        StatueFixtureTemplate = new JSClass('StatueFixtureTemplate', FixtureTemplate, {
            include:[RotatableFixture],
            
            init: function(attrs) {
                attrs.name ??= 'statue';
                this.callSuper(attrs);
            },
            
            getName: function(fixture, character) {
                const materialObj = fixture.getMaterialObject();
                return (materialObj ? materialObj.name + ' ' : '') + this.callSuper();
            },
            
            getSoundForInteraction: (fixture, character, interaction) => {
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
            
            getSoundForInteraction: (fixture, character, interaction) => {
                switch (interaction.id) {
                    case INTERACTION_ID_CLOSE:
                        return [
                            [0.25, '*soft thud*', 2],
                            [1, '*creak*', 3]
                        ];
                    case INTERACTION_ID_OPEN:
                        return [[1, '*creak*', 3]];
                    case INTERACTION_ID_UNLOCK:
                        return [[1, '*click*', 1]];
                    case INTERACTION_ID_LOCK:
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
                const retval = this.callSuper(fixture, character, adjacent);
                if (!adjacent) retval.push(INTERACTION_ENTER);
                return retval;
            },
            getLockPropertyForInteraction: (fixture, character, interaction) => 'lockMove',
            getSoundForInteraction: (fixture, character, interaction) => [[1, '*whoosh*', 2]],
            doInteraction: function(fixture, character, interaction) {
                if (interaction.id === INTERACTION_ID_ENTER) {
                    character.doMove(
                        fixture.getStateByName(STATE_DESTINATION), null, 
                        'teleport-leave', 'teleport-arrive', 
                        () => {
                            fixture.doExpositionBeforeInteraction(character, interaction, true);
                        },
                        () => {
                            fixture.doExpositionAfterInteraction(character, interaction, true);
                        }
                    );
                    return;
                }
                return this.callSuper(fixture, character, interaction);
            },
            
            doExpositionBeforeInteraction: (fixture, character, interaction, willSucceed) => {
                if (willSucceed && interaction.id === INTERACTION_ID_ENTER) {
                    const fixtureName = fixture.getName();
                    character.sendExposition('You enter the ' + fixtureName + ' and your essence is torn apart. You are transported through higher dimensions for what seems an eternity. Until finally...', 'narrative');
                    character.getCell().sendExposition(character.getName() + ' enters the ' + fixtureName + '.', 'visual', character);
                    return;
                }
                this.callSuper(fixture, character, interaction, willSucceed);
            },
            
            doExpositionAfterInteraction: (fixture, character, interaction, succeeded) => {
                if (succeeded && interaction.id === INTERACTION_ID_ENTER) {
                    const fixtureName = fixture.getName();
                    character.sendExposition('You emerge from the ' + fixtureName + ' somewhere else.', 'narrative');
                    character.getCell().sendExposition(character.getName() + ' emerges from the ' + fixtureName + '.', 'visual', character);
                    return;
                }
                this.callSuper(fixture, character, interaction, succeeded);
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
                const retval = this.callSuper(fixture, character, adjacent);
                if (!adjacent) {
                    const direction = fixture.getStateByName(STATE_STAIR_DIRECTION);
                    if (direction !== 'down') retval.push(INTERACTION_ASCEND);
                    if (direction !== 'up') retval.push(INTERACTION_DESCEND);
                }
                return retval;
            },
            
            getLockPropertyForInteraction: (fixture, character, interaction) => 'lockMove',
            
            doInteraction: function(fixture, character, interaction) {
                const doAscendOrDescend = isAscend => {
                    const direction = fixture.getStateByName(STATE_STAIR_DIRECTION);
                    if (direction !== (isAscend ? 'down' : 'up')) {
                        const locArr = character.getLocArr(true);
                        locArr[3] += isAscend ? 1 : -1;
                        character.doMove(
                            locArr, null, 'move', 'move', 
                            () => {
                                fixture.doExpositionBeforeInteraction(character, interaction, true);
                            },
                            () => {
                                fixture.doExpositionAfterInteraction(character, interaction, true);
                            }
                        );
                    }
                };
                
                switch (interaction.id) {
                    case INTERACTION_ID_ASCEND: doAscendOrDescend(true); return;
                    case INTERACTION_ID_DESCEND: doAscendOrDescend(false); return;
                }
                return this.callSuper(fixture, character, interaction);
            },
            
            doExpositionBeforeInteraction: (fixture, character, interaction, willSucceed) => {
                if (willSucceed) {
                    switch (interaction.id) {
                        case INTERACTION_ID_ASCEND:
                        case INTERACTION_ID_DESCEND:
                            const fixtureName = fixture.getSimpleName();
                            character.sendExposition('You ' + interaction.label + ' the ' + fixtureName + '.', 'narrative');
                            character.getCell().sendExposition(character.getName() + ' ' + interaction.label + 's the ' + fixtureName + '.', 'visual', character);
                            return;
                    }
                }
                this.callSuper(fixture, character, interaction, willSucceed);
            },
            
            doExpositionAfterInteraction: (fixture, character, interaction, succeeded) => {
                if (succeeded) {
                    switch (interaction.id) {
                        case INTERACTION_ID_ASCEND:
                        case INTERACTION_ID_DESCEND:
                            const fixtureName = fixture.getSimpleName();
                            character.getCell().sendExposition(character.getName() + ' comes ' + (interaction.id === INTERACTION_ID_ASCEND ? 'up' : 'down') + ' the ' + fixtureName + '.', 'visual', character);
                            return;
                    }
                }
                this.callSuper(fixture, character, interaction, succeeded);
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
            
            crate_1:new FixtureTemplate({name:'wooden crate'}),
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
        
        getFixtureById:fixtureId => fixtures.get(fixtureId),
        clearFixtureCache: () => {fixtures.clear();},
        
        CommonFixtureModel: new JSClass('CommonFixtureModel', Thing, {
            include:[ValueAffectorMixin],
            
            
            // Life Cycle //////////////////////////////////////////////////////
            destroy: function() {
                this.unregisterEffects(this.thingContainer);
                this.callSuper();
            },
            
            
            // Accessors ///////////////////////////////////////////////////////
            getCell: function() {return this.thingContainer.getCell();},
            
            getTemplateObject: function() {return getTemplate(this.getTemplate());},
            
            setThingContainer: function(v) {
                if (this.thingContainer) this.unregisterEffects(this.thingContainer);
                this.set('thingContainer', v, true);
                this.registerEffects(this.thingContainer);
            },
            getThingContainer: function() {return this.thingContainer;},
            
            getTemplateUrl: function(character) {
                return this.getTemplateObject().getUrl(this, character);
            },
            
            
            // Methods /////////////////////////////////////////////////////////
            doInteraction: function(character, interaction) {
                const failureMsg = this.getTemplateObject().doInteraction(this, character, interaction);
                
                // Make sound if successful
                if (!failureMsg) {
                    const worldMap = getWorldMap(),
                        {volume, sound} = worldMap.selectSoundRandomly(this.getSoundForInteraction(character, interaction));
                    if (sound) worldMap.broadcastSound(this, 'fixture', sound, volume);
                }
                
                return failureMsg;
            },
            
            affectValue: function(attrName, value) {
                const template = this.getTemplateObject();
                return template ? template.affectValue(this, attrName, value) : this.callSuper(value);
            },
            
            
            // Persistence and Serialization ///////////////////////////////////
            updateFromData: function(datum) {
                this.callSuper(datum);
                this.setThingContainer(datum.thingContainer);
                fixtures.set(this.id, this);
                return this;
            }
        }),
        
        getTemplates: () => templates,
        getTemplate: getTemplate
    };
})(global.urob);
