(pkg => {
    let tym, JS;
    if (typeof module === 'object' && module.exports) {
        const imported = require('../../../../lib/tym.js');
        JS = imported.JS;
        tym = imported.tym;
    } else {
        JS = global.JS;
        tym = global.myt;
    }
    
    const {Eventable} = tym,
        {Module:JSModule, Class:JSClass} = JS,
        
        {
            pluralize, getPhraseWithArticle
        } = pkg,
        
        STATE_CHARGES = 'charges',
        STATE_OPEN = 'open',
        STATE_LOCKED = 'locked',
        STATE_FACING = 'facing',
        STATE_DESTINATION = 'destination',
        STATE_STAIR_DIRECTION = 'direction',
        
        INTERACTION_ID_ASCEND = 'ascend',
        INTERACTION_ID_CLOSE = 'close',
        INTERACTION_ID_DESCEND = 'descend',
        INTERACTION_ID_DISCHARGE = 'discharge',
        INTERACTION_ID_DROP = 'drop',
        INTERACTION_ID_EAT = 'eat',
        INTERACTION_ID_ENTER = 'enter',
        INTERACTION_ID_LOCK = 'lock',
        INTERACTION_ID_OPEN = 'open',
        INTERACTION_ID_PICK_UP = 'pick up',
        INTERACTION_ID_RECHARGE = 'recharge',
        INTERACTION_ID_ROTATE_CLOCKWISE = 'rotate clockwise',
        INTERACTION_ID_ROTATE_COUNTER_CLOCKWISE = 'rotate counter clockwise',
        INTERACTION_ID_UNLOCK = 'unlock',
        
        INTERACTION_ASCEND = {id:INTERACTION_ID_ASCEND, label:'ascend'},
        INTERACTION_CLOSE = {id:INTERACTION_ID_CLOSE, label:'close'},
        INTERACTION_DESCEND = {id:INTERACTION_ID_DESCEND, label:'descend'},
        INTERACTION_DROP = {id:INTERACTION_ID_DROP, label:'drop'},
        INTERACTION_EAT = {id:INTERACTION_ID_EAT, label:'eat'},
        INTERACTION_ENTER = {id:INTERACTION_ID_ENTER, label:'enter'},
        INTERACTION_LOCK = {id:INTERACTION_ID_LOCK, label:'lock'},
        INTERACTION_OPEN = {id:INTERACTION_ID_OPEN, label:'open'},
        INTERACTION_PICK_UP = {id:INTERACTION_ID_PICK_UP, label:'pick up'},
        INTERACTION_ROTATE_CLOCKWISE = {id:INTERACTION_ID_ROTATE_CLOCKWISE, label:'rotate clockwise'},
        INTERACTION_ROTATE_COUNTER_CLOCKWISE = {id:INTERACTION_ID_ROTATE_COUNTER_CLOCKWISE, label:'rotate counter clockwise'},
        INTERACTION_UNLOCK = {id:INTERACTION_ID_UNLOCK, label:'unlock'},
        
        gramsToPounds = grams => grams / 453.592,
        
        MATERIALS = {
            acid: {name:'acid',  hardness:0, density:1,    description:""},
            water:{name:'water', hardness:0, density:1,    description:""},
            oil:  {name:'oil',   hardness:0, density:0.97, description:""},
            
            // Organic
            flesh:    {name:'flesh',     hardness:0, density:0.95, description:""},
            fungus:   {name:'fungus',    hardness:0, density:0.9, description:""},
            vegetable:{name:'vegetable', hardness:0, density:0.9, description:""},
            
            // Wood
            pinewood:{name:'pine',     hardness:4, density:0.5,  description:""},
            oakwood: {name:'oak',      hardness:5, density:0.75, description:""},
            ironwood:{name:'ironwood', hardness:7, density:1.25, description:""},
            
            // Metal
            tin:      {name:'tim',       hardness:10, density:7.27,  description:"Tin is a soft silvery-white metal"},
            iron:     {name:'iron',      hardness:17, density:7.87,  description:"Iron is a soft, silver-white or gray, metal"},
            steel:    {name:'steel',     hardness:20, density:7.9,   description:"Steel is an alloy of iron and carbon with improved strength and fracture resistance"},
            copper:   {name:'copper',    hardness:12, density:8.96,  description:"Copper is a reddish lustrous metal"},
            bronze:   {name:'bronze',    hardness:14, density:8.5,   description:"Bronze is an alloy of copper and tin"},
            brass:    {name:'brass',     hardness:14, density:8.5,   description:"Brass is an alloy of copper and zinc"},
            silver:   {name:'silver',    hardness:10, density:10.49, description:"Silver is a white metal with brilliant metallic luster"},
            gold:     {name:'gold',      hardness:7,  density:19.3,  description:"Gold is a lustrous, ductile, and malleable, yellow metal"},
            platinum: {name:'platinum',  hardness:6,  density:21.45, description:"Platinum is a lustrous, ductile, and malleable, silver-white metal"},
            palladium:{name:'palladium', hardness:8,  density:12.01, description:"Palladium is a lustrous, ductile, and malleable, silver-white metal"},
            nickel:   {name:'nickel',    hardness:8,  density:8.91,  description:"Nickel is a silvery-white lustrous metal with a slight golden tinge"},
            lead:     {name:'lead',      hardness:6,  density:11.4,  description:"Lead is a very soft silvery grey metal with bright luster"},
            
            // Stone
            alabaster:  {name:'alabaster',  hardness:6,  density:10, description:""},
            soapstone:  {name:'soapstone',  hardness:5,  density:10, description:""},
            sandstone:  {name:'sandstone',  hardness:5,  density:10, description:""},
            limestone:  {name:'limestone',  hardness:8,  density:10, description:""},
            granite:    {name:'granite',    hardness:13, density:10, description:""},
            marble:     {name:'marble',     hardness:8,  density:10, description:""},
            basalt:     {name:'basalt',     hardness:8,  density:10, description:""},
            serpentine: {name:'serpentine', hardness:7,  density:10, description:""},
        },
        
        ThingTemplate = new JSClass('ThingTemplate', Eventable, {
            setName: function(v) {this.set('name', v, true);},
            getName: function(thing, character) {return this.name;},
            
            getSimpleName: function(thing, character) {return this.name;},
            
            setStates: function(v) {this.set('states', v, true);},
            getStates: function() {return this.states;},
            
            setWeight: function(v) {this.set('weight', v, true);},
            getWeight: function(thing, character) {return this.weight;},
            
            setVolume: function(v) {this.set('volume', v, true);},
            getVolume: function(thing, character) {return this.volume;},
            
            setMaterial: function(v) {this.set('material', v, true);},
            getMaterial: function(thing, character) {return this.material;},
            
            setInteractionLabels: function(v) {this.set('interactionLabels', v, true);},
            getInteractionLabels: function(thing, character) {return this.interactionLabels;},
            
            setSoundsByInteractionId: function(v) {this.set('soundsByInteractionId', v, true);},
            getSoundsByInteractionId: function(thing, character) {return this.soundsByInteractionId;},
            
            
            // Methods /////////////////////////////////////////////////////////
            describe: function(thing, character, isAppend) {
                return isAppend ? thing.getName(character) : getPhraseWithArticle(thing.getName(character));
            },
            
            getInteractions: (thing, character, adjacent) => [],
            getInteractionLabel: function(thing, character, interaction) {
                const interactionLabels = this.getInteractionLabels();
                if (interactionLabels) {
                    const customLabel = interactionLabels[interaction.id];
                    if (customLabel) return customLabel;
                }
                return interaction.label;
            },
            addInteractionToReturnValue: function(thing, character, interaction, retval) {
                retval ??= [];
                retval.push({id:interaction.id, label:this.getInteractionLabel(thing, character, interaction)});
                return retval;
            },
            
            getLockPropertyForInteraction: (thing, character, interaction) => 'lockAct',
            getSoundForInteraction: function(thing, character, interaction) {
                const soundsByInteractionId = this.getSoundsByInteractionId();
                if (soundsByInteractionId) {
                    const customSounds = soundsByInteractionId[interaction.id];
                    if (customSounds) return customSounds;
                }
                return null;
            },
            
            /** Optionally returns an error message. */
            doInteraction: (thing, character, interaction) => {},
            doExpositionBeforeInteraction: (thing, character, interaction, willSucceed) => {},
            doExpositionAfterInteraction: (thing, character, interaction, succeeded) => {},
        }),
        
        
        Thing = new JSClass('Thing', Eventable, {
            // Accessors ///////////////////////////////////////////////////////
            setId: function(v) {this.set('id', v, true);},
            getId: function() {return this.id;},
            
            setName: function(v) {this.set('n', v, true);},
            getName: function(character) {
                return this.n != null ? this.n : this.getTemplateObject().getName(this, character);
            },
            
            getSimpleName: function(character) {
                return this.n != null ? this.n : this.getTemplateObject().getSimpleName(this, character);
            },
            
            setWeight: function(v) {this.set('w', v, true);},
            getWeight: function(character) {
                if (this.w == null) {
                    const templateWeight = this.getTemplateObject().getWeight(this, character);
                    if (templateWeight == null) {
                        return gramsToPounds(this.getVolume() * (this.getMaterialObject()?.density ?? 1));
                    } else {
                        return templateWeight;
                    }
                } else {
                    return this.w;
                }
            },
            
            setVolume: function(v) {this.set('v', v, true);},
            getVolume: function(character) {
                return this.v != null ? this.v : this.getTemplateObject().getVolume(this, character);
            },
            
            setMaterial: function(v) {this.set('m', v, true);},
            getMaterial: function(character) {
                return this.m != null ? this.m : this.getTemplateObject().getMaterial(this, character);
            },
            getMaterialObject: function() {return MATERIALS[this.getMaterial()];},
            
            setTemplate: function(v) {this.set('t', v, true);},
            getTemplate: function() {return this.t;},
            getTemplateObject: () => {/** Subclasses must implement. */},
            
            getStateObject: function() {return this.state ??= {};},
            setStateByName: function(stateName, value) {this.getStateObject()[stateName] = value;},
            getStateByName: function(stateName) {return this.getStateObject()[stateName];},
            
            getCell: () => {/** Subclasses must implement. */},
            
            
            // Methods /////////////////////////////////////////////////////////
            describe: function(character, isAppend) {
                return this.getTemplateObject().describe(this, character, isAppend);
            },
            
            getInteractions: function(character, adjacent) {
                return this.getTemplateObject().getInteractions(this, character, adjacent);
            },
            
            getLockPropertyForInteraction: function(character, interaction) {
                return this.getTemplateObject().getLockPropertyForInteraction?.(this, character, interaction);
            },
            
            getSoundForInteraction: function(character, interaction) {
                return this.getTemplateObject().getSoundForInteraction(this, character, interaction);
            },
            
            doExpositionBeforeInteraction: function(character, interaction, willSucceed) {
                return this.getTemplateObject().doExpositionBeforeInteraction(this, character, interaction, willSucceed);
            },
            
            doExpositionAfterInteraction: function(character, interaction, succeeded) {
                return this.getTemplateObject().doExpositionAfterInteraction(this, character, interaction, succeeded);
            },
            
            
            // Persistence and Serialization ///////////////////////////////////
            getAsData: function(cfg) {
                const retval = {
                    id:this.id,
                    t:this.t
                };
                
                if (this.state != null) retval.state = this.state;
                
                // Serialize overridden attributes.
                for (const attrName of ['n','w','v','m']) {
                    if (this[attrName] != null) retval[attrName] = this[attrName];
                }
                
                return retval;
            },
            
            updateFromData: function(datum) {
                this.setId(datum.id);
                this.setTemplate(datum.t);
                
                this.state = datum.state;
                
                if (datum.n != null) this.setName(datum.n);
                if (datum.w != null) this.setWeight(datum.w);
                if (datum.v != null) this.setVolume(datum.v);
                if (datum.m != null) this.setMaterial(datum.m);
                
                return this;
            }
        });
    
    pkg.thing = {
        ThingTemplate:ThingTemplate,
        Thing:Thing,
        
        STATE_CHARGES:STATE_CHARGES,
        STATE_OPEN:STATE_OPEN,
        STATE_LOCKED:STATE_LOCKED,
        STATE_FACING:STATE_FACING,
        STATE_DESTINATION:STATE_DESTINATION,
        STATE_STAIR_DIRECTION:STATE_STAIR_DIRECTION,
        
        INTERACTION_ID_ASCEND:INTERACTION_ID_ASCEND,
        INTERACTION_ID_CLOSE:INTERACTION_ID_CLOSE,
        INTERACTION_ID_DESCEND:INTERACTION_ID_DESCEND,
        INTERACTION_ID_DISCHARGE:INTERACTION_ID_DISCHARGE,
        INTERACTION_ID_DROP:INTERACTION_ID_DROP,
        INTERACTION_ID_EAT:INTERACTION_ID_EAT,
        INTERACTION_ID_ENTER:INTERACTION_ID_ENTER,
        INTERACTION_ID_LOCK:INTERACTION_ID_LOCK,
        INTERACTION_ID_OPEN:INTERACTION_ID_OPEN,
        INTERACTION_ID_PICK_UP:INTERACTION_ID_PICK_UP,
        INTERACTION_ID_RECHARGE:INTERACTION_ID_RECHARGE,
        INTERACTION_ID_ROTATE_CLOCKWISE:INTERACTION_ID_ROTATE_CLOCKWISE,
        INTERACTION_ID_ROTATE_COUNTER_CLOCKWISE:INTERACTION_ID_ROTATE_COUNTER_CLOCKWISE,
        INTERACTION_ID_UNLOCK:INTERACTION_ID_UNLOCK,
        
        INTERACTION_ASCEND:INTERACTION_ASCEND,
        INTERACTION_CLOSE:INTERACTION_CLOSE,
        INTERACTION_DESCEND:INTERACTION_DESCEND,
        INTERACTION_DROP:INTERACTION_DROP,
        INTERACTION_EAT:INTERACTION_EAT,
        INTERACTION_ENTER:INTERACTION_ENTER,
        INTERACTION_LOCK:INTERACTION_LOCK,
        INTERACTION_OPEN:INTERACTION_OPEN,
        INTERACTION_PICK_UP:INTERACTION_PICK_UP,
        INTERACTION_ROTATE_CLOCKWISE:INTERACTION_ROTATE_CLOCKWISE,
        INTERACTION_ROTATE_COUNTER_CLOCKWISE:INTERACTION_ROTATE_COUNTER_CLOCKWISE,
        INTERACTION_UNLOCK:INTERACTION_UNLOCK,
        
        TeleportTemplate: new JSModule('TeleportTemplate', {
            init: function(attrs) {
                attrs.states ??= [];
                attrs.states[STATE_DESTINATION] = 'string';
                
                this.callSuper(attrs);
            },
            
            // Methods /////////////////////////////////////////////////////////
            getInteractions: function(thing, character, adjacent) {
                const retval = this.callSuper(thing, character, adjacent);
                if (adjacent) {
                    return retval;
                } else {
                    return this.addInteractionToReturnValue(thing, character, INTERACTION_ENTER, retval);
                }
            },
            
            getLockPropertyForInteraction: function(thing, character, interaction) {
                if (interaction.id === INTERACTION_ID_ENTER) return 'lockMove';
                return this.callSuper(thing, character, interaction);
            },
            
            getSoundForInteraction: function(thing, character, interaction) {
                const sounds = this.callSuper(thing, character, interaction);
                if (sounds) return sounds;
                
                if (interaction.id === INTERACTION_ID_ENTER) return [[1, '*whoosh*', 2]];
                return null;
            },
            
            doInteraction: function(thing, character, interaction) {
                if (interaction.id === INTERACTION_ID_ENTER) return this.doInteractionEnter(thing, character, interaction);
                return this.callSuper(thing, character, interaction);
            },
            
            doInteractionEnter: function(thing, character, interaction) {
                const destination = thing.getStateByName(STATE_DESTINATION);
                
                if (destination) {
                    character.doMove(
                        destination, null, 
                        'teleport-leave', 'teleport-arrive', 
                        () => {thing.doExpositionBeforeInteraction(character, interaction, true);},
                        () => {thing.doExpositionAfterInteraction(character, interaction, true);}
                    );
                } else {
                    thing.doExpositionAfterInteraction(character, interaction, false);
                }
            },
            
            doExpositionBeforeInteraction: function(thing, character, interaction, willSucceed) {
                if (willSucceed && interaction.id === INTERACTION_ID_ENTER) {
                    const thingName = thing.getName();
                    character.sendExposition('You enter the ' + thingName + ' and your essence is torn apart. You are transported through higher dimensions for what seems an eternity. Until finally...', 'narrative');
                    character.getCell().sendExposition(character.getName() + ' enters the ' + thingName + '.', 'visual', character);
                    return;
                }
                this.callSuper(thing, character, interaction, willSucceed);
            },
            
            doExpositionAfterInteraction: function(thing, character, interaction, succeeded) {
                if (interaction.id === INTERACTION_ID_ENTER) {
                    const thingName = thing.getName();
                    if (succeeded) {
                        character.sendExposition('You emerge from the ' + thingName + ' somewhere else.', 'narrative');
                        character.getCell().sendExposition(character.getName() + ' emerges from the ' + thingName + '.', 'visual', character);
                    } else {
                        character.sendExposition('You ' + interaction.label + ' the ' + thingName + ' and nothing happens.', 'narrative');
                    }
                    return;
                }
                this.callSuper(thing, character, interaction, succeeded);
            }
        }),
        
        /** A Thing that an Entity can "eat". */
        EatableTemplate: new JSModule('EatableTemplate', {
            // Methods /////////////////////////////////////////////////////////
            getInteractions: function(thing, character, adjacent) {
                return this.addInteractionToReturnValue(thing, character, INTERACTION_EAT, this.callSuper(thing, character, adjacent));
            },
            getLockPropertyForInteraction: function(thing, character, interaction) {
                if (interaction.id === INTERACTION_ID_EAT) return 'lockAct';
                return this.callSuper(thing, character, interaction);
            },
            getSoundForInteraction: function(thing, character, interaction) {
                const sounds = this.callSuper(thing, character, interaction);
                if (sounds) return sounds;
                
                if (interaction.id === INTERACTION_ID_EAT) return [[1.0, '*munch*', 1<<2]];
                return null;
            },
            
            doInteraction: function(thing, character, interaction) {
                if (interaction.id === INTERACTION_ID_EAT) return this.doInteractionEat(thing, character, interaction);
                return this.callSuper(thing, character, interaction);
            },
            
            doExpositionAfterInteraction: function(thing, character, interaction, succeeded) {
                if (succeeded) {
                    if (interaction.id === INTERACTION_ID_EAT) {
                        const thingName = thing.getSimpleName();
                        character.sendExposition('You ' + interaction.label + ' the ' + thingName + '.', 'narrative');
                        character.getCell().sendExposition(character.getName() + ' ' + interaction.label  + 's the ' + thingName + '.', 'visual', character);
                    }
                }
                this.callSuper(thing, character, interaction, succeeded);
            },
            
            doInteractionEat: (thing, character, interaction) => {/** Subclasses to implement. */}
        }),
        
        /** A Thing that contains zero or more charges. */
        ChargeableTemplate: new JSModule('ChargeableTemplate', {
            init: function(attrs) {
                attrs.states ??= [];
                attrs.states[STATE_CHARGES] = 'int';
                
                this.callSuper(attrs);
            },
            
            setChargeWeight: function(v) {this.set('chargeWeight', v, true);},
            getChargeWeight: function(thing, character) {return this.chargeWeight;},
            
            setChargeVolume: function(v) {this.set('chargeVolume', v, true);},
            getChargeVolume: function(thing, character) {return this.chargeVolume;},
            
            setChargeMax: function(v) {this.set('chargeMax', v, true);},
            getChargeMax: function(thing, character) {return this.chargeMax;},
            
            setDestroyWhenDepleted: function(v) {this.set('destroyWhenDepleted', v, true);},
            getDestroyWhenDepleted: function(thing, character) {return this.destroyWhenDepleted;},
            
            getWeight: function(thing, character) {
                const baseWeight = this.callSuper(thing, character),
                    chargeWeight = this.getChargeWeight();
                if (baseWeight == null && chargeWeight == null) {
                    return null;
                } else {
                    return baseWeight + (thing.getStateByName(STATE_CHARGES) ?? 0) * (chargeWeight ?? 0);
                }
            },
            
            getVolume: function(thing, character) {
                return this.callSuper(thing, character) + 
                    (thing.getStateByName(STATE_CHARGES) ?? 0) * this.getChargeVolume();
            },
            
            describe: function(thing, character) {
                const charges = thing.getStateByName(STATE_CHARGES) ?? 0;
                return this.callSuper(thing, character) + ' (' + charges + ' ' + pluralize(charges, 'charge') + ')';
            },
            
            handleDepletion: function(thing, character, interaction) {
                const charges = thing.getStateByName(STATE_CHARGES) ?? 0;
                if (charges === 0 && this.getDestroyWhenDepleted()) {
                    const id = thing.getId();
                    if (thing.isA(pkg.item.Item)) {
                        // Item case
                        thing.getInventory().removeItemById(id);
                    } else if (thing.isA(pkg.fixture.CommonFixtureModel)) {
                        // Fixture case
                        thing.getThingContainer().removeFixtureById(id);
                    }
                    thing.destroy();
                }
            }
        }),
        
        material:MATERIALS
    };
})(global.urob);
