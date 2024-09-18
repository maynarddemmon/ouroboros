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
    
    const {Eventable} = tym,
        {Module:JSModule, Class:JSClass} = JS,
        
        {
            pluralize,
            inventory:{
                ERR_ITEM_NOT_FOUND, ERR_MAX_CAPACITY_EXCEEDED, ERR_MAX_WEIGHT_EXCEEDED, ERR_MAX_VOLUME_EXCEEDED
            }
        } = pkg,
        
        getWorldMap = () => worldMap ??= require('../../server/WorldMap.js'),
        
        STATE_CHARGES = 'charges',
        
        INTERACTION_DROP = 'drop',
        INTERACTION_PICK_UP = 'pick up',
        INTERACTION_EAT = 'eat',
        INTERACTION_DISCHARGE = 'discharge',
        INTERACTION_RECHARGE = 'recharge',
        
        items = new Map(),
        
        broadcastSound = (item, character, interactionName) => {
            const worldMap = getWorldMap(),
                {volume, sound} = worldMap.selectSoundRandomly(item.getSoundForInteraction(character, interactionName));
            if (sound) worldMap.broadcastSound(item, 'item', sound, volume);
        },
        
        isItemInCharacterInventory = (item, character) => item.getInventory().isOwner(character),
        
        ItemTemplate = new JSClass('ItemTemplate', Eventable, {
            setName: function(v) {this.set('name', v, true);},
            getName: function(item, character) {return this.name;},
            getSimpleName: function(item, character) {return this.name;},
            
            setStates: function(v) {this.set('states', v, true);},
            getStates: function() {return this.states;},
            
            setWeight: function(v) {this.set('weight', v, true);},
            getWeight: function(item, character) {return this.weight;},
            
            setVolume: function(v) {this.set('volume', v, true);},
            getVolume: function(item, character) {return this.volume;},
            
            getCapacityNeeded: function(item, character) {return 1;},
            
            
            // Methods /////////////////////////////////////////////////////////
            getInteractions: (item, character) => [isItemInCharacterInventory(item, character) ? INTERACTION_DROP : INTERACTION_PICK_UP],
            getLockPropertyForInteraction: function(item, character, interactionName) {
                switch (interactionName) {
                    case INTERACTION_PICK_UP: return 'lockAct';
                    case INTERACTION_DROP:    return 'lockFree';
                }
                return this.callSuper?.(item, character, interactionName);
            },
            getSoundForInteraction: (item, character, interactionName) => {
                switch (interactionName) {
                    case INTERACTION_DROP:
                        return [
                            // threshold in ascending order, sound, volume
                            [0.6, '*plink*', 1<<2],  // 60% chance
                            [0.8, '*thump*', 1<<3],  // 20% chance
                            [0.9, '*thud*', 1<<4],  // 10% chance
                            [1.0, '*clatter*', 1<<5] // 10% chance
                        ];
                }
                return null;
            },
            
            // Server Only
            /** Optionally returns an error message. */
            doInteraction: function(item, character, interactionName) {
                switch (interactionName) {
                    case INTERACTION_PICK_UP: return this.doInteractionPickUp(item, character, interactionName);
                    case INTERACTION_DROP:    return this.doInteractionDrop(item, character, interactionName);
                }
            },
            
            doExpositionBeforeInteraction: (item, character, interactionName, willSucceed) => {},
            doExpositionAfterInteraction: function(item, character, interactionName, succeeded) {
                if (succeeded) {
                    const simpleExpositionFunc = (actionWordSelf, actionWordOther) => {
                        const itemName = item.getSimpleName();
                        character.sendExposition('You ' + actionWordSelf + ' the ' + itemName + '.', 'narrative');
                        character.getCell().sendExposition(character.getName() + ' ' + actionWordOther + ' the ' + itemName + '.', 'visual', character);
                    };
                    switch (interactionName) {
                        case INTERACTION_PICK_UP: simpleExpositionFunc(interactionName, 'picked up'); return;
                        case INTERACTION_DROP: simpleExpositionFunc(interactionName, 'dropped'); return;
                    }
                }
                this.callSuper?.(item, character, interactionName, succeeded);
            },
            
            doInteractionPickUp: (item, character, interactionName) => {
                const characterCell = character.getCell(),
                    itemCell = item.getInventory().getOwner();
                if (characterCell && itemCell && characterCell === itemCell) {
                    switch(character.addItem(item)) {
                        case ERR_ITEM_NOT_FOUND:
                            return "Can't " + interactionName + ' the ' + item.getName(character) + " because it can't be found.";
                        case ERR_MAX_CAPACITY_EXCEEDED:
                            return "Can't " + interactionName + ' the ' + item.getName(character) + " because it would exceed the maximum capacity of your inventory.";
                        case ERR_MAX_WEIGHT_EXCEEDED:
                            return "Can't " + interactionName + ' the ' + item.getName(character) + " because it would exceed the maximum weight of your inventory.";
                        case ERR_MAX_VOLUME_EXCEEDED:
                            return "Can't " + interactionName + ' the ' + item.getName(character) + " because it would exceed the maximum volume of your inventory.";
                        default:
                            item.doExpositionAfterInteraction(character, interactionName, true);
                    }
                } else {
                    return "Can't " + interactionName + ' the ' + item.getName(character) + " because it's not here.";
                }
            },
            
            doInteractionDrop: (item, character, interactionName) => {
                const characterCell = character.getCell(),
                    itemOwner = item.getInventory().getOwner();
                if (characterCell && itemOwner && character === itemOwner) {
                    switch(characterCell.addItem(item)) {
                        case ERR_ITEM_NOT_FOUND:
                            return "Can't " + interactionName + ' the ' + item.getName(character) + " because it can't be found.";
                        case ERR_MAX_CAPACITY_EXCEEDED:
                            return "Can't " + interactionName + ' the ' + item.getName(character) + " because it would exceed the maximum capacity of this location.";
                        case ERR_MAX_WEIGHT_EXCEEDED:
                            return "Can't " + interactionName + ' the ' + item.getName(character) + " because it would exceed the maximum weight of this location.";
                        case ERR_MAX_VOLUME_EXCEEDED:
                            return "Can't " + interactionName + ' the ' + item.getName(character) + " because it would exceed the maximum volume of this location.";
                        default:
                            item.doExpositionAfterInteraction(character, interactionName, true);
                    }
                } else {
                    return "Can't " + interactionName + ' the ' + item.getName(character) + " because you don't seem to have it.";
                }
            },
            
            // Client Only
            describe: (item, character) => item.getName(character)
        }),
        
        /** An Item that an Entity can "eat". */
        EatableItem = new JSModule('EatableItem', {
            // Methods /////////////////////////////////////////////////////////
            getInteractions: function(item, character) {
                const retval = this.callSuper(item, character);
                if (isItemInCharacterInventory(item, character)) retval.push(INTERACTION_EAT);
                return retval;
            },
            getLockPropertyForInteraction: function(item, character, interactionName) {
                if (interactionName === INTERACTION_EAT) return 'lockAct';
                return this.callSuper(item, character, interactionName);
            },
            getSoundForInteraction: function(item, character, interactionName) {
                if (interactionName === INTERACTION_EAT) return [[1.0, '*munch*', 1<<2]];
                return this.callSuper(item, character, interactionName);
            },
            
            doInteraction: function(item, character, interactionName) {
                if (interactionName === INTERACTION_EAT) return this.doInteractionEat(item, character, interactionName);
                return this.callSuper(item, character, interactionName);
            },
            
            doExpositionAfterInteraction: function(item, character, interactionName, succeeded) {
                if (succeeded) {
                    if (interactionName === INTERACTION_EAT) {
                        const itemName = item.getSimpleName();
                        character.sendExposition('You ' + interactionName + ' the ' + itemName + '.', 'narrative');
                        character.getCell().sendExposition(character.getName() + ' ' + interactionName + 's the ' + itemName + '.', 'visual', character);
                    }
                }
                this.callSuper?.(item, character, interactionName, succeeded);
            },
            
            doInteractionEat: (item, character, interactionName) => {/** Subclasses to implement. */}
        }),
        
        /** An Item that contains zero or more charges. */
        ChargeableItem = new JSModule('ChargeableItem', {
            init: function(attrs) {
                attrs.states ??= [];
                attrs.states[STATE_CHARGES] = 'int';
                
                this.callSuper(attrs);
            },
            
            setChargeWeight: function(v) {this.set('chargeWeight', v, true);},
            getChargeWeight: function(item, character) {return this.chargeWeight;},
            
            setChargeVolume: function(v) {this.set('chargeVolume', v, true);},
            getChargeVolume: function(item, character) {return this.chargeVolume;},
            
            setChargeMax: function(v) {this.set('chargeMax', v, true);},
            getChargeMax: function(item, character) {return this.chargeMax;},
            
            setDestroyWhenDepleted: function(v) {this.set('destroyWhenDepleted', v, true);},
            getDestroyWhenDepleted: function(item, character) {return this.destroyWhenDepleted;},
            
            getWeight: function(item, character) {
                return this.callSuper(item, character) + 
                    (item.getStateByName(STATE_CHARGES) ?? 0) * this.getChargeWeight();
            },
            
            getVolume: function(item, character) {
                return this.callSuper(item, character) + 
                    (item.getStateByName(STATE_CHARGES) ?? 0) * this.getChargeVolume();
            },
            
            describe: function(item, character) {
                const charges = item.getStateByName(STATE_CHARGES) ?? 0;
                return this.callSuper(item, character) + ' (' + charges + ' ' + pluralize(charges, 'charge') + ')';
            }
        }),
        
        FoodItemTemplate = new JSClass('FoodItemTemplate', ItemTemplate, {
            include:[EatableItem],
            
            // Accessors ///////////////////////////////////////////////////////
            setSustenance: function(v) {this.set('sustenance', v, true);},
            getSustenance: function(item, character) {return this.sustenance;},
            
            
            // Methods /////////////////////////////////////////////////////////
            doInteractionEat: function(item, character, interactionName) {
                const somaRecovered = character.soma.adjValue(this.getSustenance());
                item.doExpositionAfterInteraction(character, interactionName, true);
                broadcastSound(item, character, interactionName);
                character.sendExposition('You recover ' + somaRecovered + ' soma from eating the ' + item.getSimpleName() + '.', 'narrative');
                
                item.getInventory().removeItem(item.getId());
                item.destroy();
            }
        }),
        
        ChargeableFoodItemTemplate = new JSClass('ChargeableFoodItemTemplate', FoodItemTemplate, {
            include:[ChargeableItem],
            
            
            // Methods /////////////////////////////////////////////////////////
            getInteractions: function(item, character) {
                const retval = this.callSuper(item, character);
                
                // Remove "eat" if no charges remain.
                let charges = item.getStateByName(STATE_CHARGES) ?? 0;
                if (charges === 0) {
                    const idx = retval.indexOf(INTERACTION_EAT);
                    if (idx !== -1) retval.splice(idx, 1);
                }
                
                return retval;
            },
            
            doInteractionEat: function(item, character, interactionName) {
                let charges = item.getStateByName(STATE_CHARGES) ?? 0;
                if (charges > 0) {
                    const somaRecovered = character.soma.adjValue(this.getSustenance());
                    item.setStateByName(STATE_CHARGES, --charges);
                    
                    item.doExpositionAfterInteraction(character, interactionName, true);
                    broadcastSound(item, character, interactionName);
                    character.sendExposition('You recover ' + somaRecovered + ' soma from eating some of the ' + item.getSimpleName() + '.', 'narrative');
                    
                    if (charges === 0 && this.getDestroyWhenDepleted()) {
                        item.getInventory().removeItem(item.getId());
                        item.destroy();
                    }
                } else {
                    character.sendExposition('There is nothing left to eat of the ' + item.getSimpleName() + '.', 'narrative');
                }
            }
        }),
        
        Item = new JSClass('Item', Eventable, {
            // Accessors ///////////////////////////////////////////////////////
            setId: function(v) {this.set('id', v, true);},
            getId: function() {return this.id;},
            
            getCell: function() {return this.getInventory().getCell();},
            
            setInventory: function(v) {this._inventory = v;},
            getInventory: function() {return this._inventory},
            
            setName: function(v) {this.set('n', v, true);},
            getName: function(character) {
                return this.n != null ? this.n : this.getTemplateObject().getName(this, character);
            },
            
            getSimpleName: function(character) {
                return this.n != null ? this.n : this.getTemplateObject().getSimpleName(this, character);
            },
            
            setWeight: function(v) {this.set('w', v, true);},
            getWeight: function(character) {
                return this.w != null ? this.w : this.getTemplateObject().getWeight(this, character);
            },
            
            setVolume: function(v) {this.set('v', v, true);},
            getVolume: function(character) {
                return this.v != null ? this.v : this.getTemplateObject().getVolume(this, character);
            },
            
            setCapacityNeeded: function(v) {this.set('c', v, true);},
            getCapacityNeeded: function(character) {
                return this.c != null ? this.c : this.getTemplateObject().getCapacityNeeded(this, character);
            },
            
            setTemplate: function(v) {this.set('t', v, true);},
            getTemplate: function() {return this.t;},
            getTemplateObject: function() {return getTemplate(this.getTemplate());},
            
            getStateObject: function() {return this.state ??= {};},
            setStateByName: function(stateName, value) {this.getStateObject()[stateName] = value;},
            getStateByName: function(stateName) {return this.getStateObject()[stateName];},
            
            
            // Item Methods ////////////////////////////////////////////////////
            getInteractions: function(character) {
                return this.getTemplateObject().getInteractions(this, character);
            },
            
            getLockPropertyForInteraction: function(character, interactionName) {
                return this.getTemplateObject().getLockPropertyForInteraction(this, character, interactionName);
            },
            
            getSoundForInteraction: function(character, interactionName) {
                return this.getTemplateObject().getSoundForInteraction(this, character, interactionName);
            },
            
            doInteraction: function(character, interactionName) {
                return this.getTemplateObject().doInteraction(this, character, interactionName);
            },
            doExpositionBeforeInteraction: function(character, interactionName, willSucceed) {
                return this.getTemplateObject().doExpositionBeforeInteraction(this, character, interactionName, willSucceed);
            },
            doExpositionAfterInteraction: function(character, interactionName, succeeded) {
                return this.getTemplateObject().doExpositionAfterInteraction(this, character, interactionName, succeeded);
            },
            
            describe: function(character) {
                return this.getTemplateObject().describe(this, character);
            },
            
            
            // Persistence and Serialization ///////////////////////////////////
            getAsData: function(cfg) {
                const retval = {
                    id:this.id,
                    t:this.t
                };
                
                if (this.state != null) retval.state = this.state;
                
                // Serialize overridden attributes.
                for (const attrName of ['n','w','v','c']) {
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
                if (datum.c != null) this.setCapacityNeeded(datum.c);
                
                items.set(this.id, this);
            }
        }),
        
        templates = {
            item_1:new ItemTemplate({name:'Item Number One', weight:4, volume:78}),
            item_2:new ItemTemplate({name:'Item Number Two', weight:7, volume:100}),
            item_3:new ItemTemplate({name:'Item Number Three', weight:9, volume:50}),
            
            // Food
            food_1:new FoodItemTemplate({name:'Mushroom Jerky', weight:0.25, volume:100, sustenance:25}),
            food_2:new FoodItemTemplate({name:'Centipede Jerky', weight:0.10, volume:25, sustenance:15}),
            
            food_3:new ChargeableFoodItemTemplate({
                name:'Kibble', destroyWhenDepleted:true,
                weight:0, volume:0, chargeWeight:0.05, chargeVolume:5, 
                sustenance:5
            }),
            food_4:new ChargeableFoodItemTemplate({
                name:'Giant Spider Carcass', destroyWhenDepleted:false,
                weight:5, volume:100, chargeWeight:0.1, chargeVolume:25, maxCharges:50, 
                sustenance:15
            }),
        },
        
        getTemplate = itemTemplateId => templates[itemTemplateId];
    
    pkg.item = {
        getItemById:itemId => items.get(itemId),
        clearItemCache: () => {items.clear();},
        
        Item:Item,
        
        getTemplates: () => templates,
        getTemplate: getTemplate
    };
})(global.urob);
