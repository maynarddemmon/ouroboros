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
        
        getWorldMap = () => worldMap ??= require('../../server/WorldMap.js'),
        
        INTERACTION_DROP = 'drop',
        INTERACTION_PICK_UP = 'pick up',
        
        items = new Map(),
        
        ItemTemplate = new JSClass('ItemTemplate', Eventable, {
            setName: function(v) {this.set('name', v, true);},
            getName: function(character) {return this.name;},
            
            setWeight: function(v) {this.set('weight', v, true);},
            getWeight: function(character) {return this.weight;},
            
            setVolume: function(v) {this.set('volume', v, true);},
            getVolume: function(character) {return this.volume;},
            
            getCapacityNeeded: function(character) {return 1;},
            
            
            // Methods /////////////////////////////////////////////////////////
            getInteractions: (item, character) => [item.getInventory().isOwner(character) ? INTERACTION_DROP : INTERACTION_PICK_UP],
            getLockPropertyForInteraction: (item, character, interactionName) => {
                switch (interactionName) {
                    case INTERACTION_PICK_UP: return 'lockAct';
                    case INTERACTION_DROP:    return 'lockFree';
                }
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
            
            doInteractionPickUp: (item, character, interactionName) => {
                const characterCell = character.getCell(),
                    itemCell = item.getInventory().getOwner();
                if (characterCell && itemCell && characterCell === itemCell) {
                    if (!character.addItem(item)) {
                        return 'Can\'t ' + interactionName + ' the ' + item.getName(character) + ' because it can\'t be added to your inventory.';
                    }
                } else {
                    return 'Can\'t ' + interactionName + ' the ' + item.getName(character) + ' because it\'s not here.';
                }
            },
            
            doInteractionDrop: (item, character, interactionName) => {
                const characterCell = character.getCell(),
                    itemOwner = item.getInventory().getOwner();
                if (characterCell && itemOwner && character === itemOwner) {
                    if (!characterCell.addItem(item)) {
                        return 'Can\'t ' + interactionName + ' the ' + item.getName(character) + ' because it can\'t be added to this location.';
                    }
                } else {
                    return 'Can\'t ' + interactionName + ' the ' + item.getName(character) + ' because you don\'t seem to have it.';
                }
            },
            
            // Client Only
            describe: (item, character) => item.getName(character)
        }),
        
        Item = new JSClass('Item', Eventable, {
            // Accessors ///////////////////////////////////////////////////////
            setId: function(v) {this.set('id', v, true);},
            getId: function() {return this.id;},
            
            setInventory: function(v) {this._inventory = v;},
            getInventory: function() {return this._inventory},
            
            setName: function(v) {this.set('n', v, true);},
            getName: function(character) {
                return this.n != null ? this.n : this.getTemplateObject().getName(character);
            },
            
            setWeight: function(v) {this.set('w', v, true);},
            getWeight: function(character) {
                return this.w != null ? this.w : this.getTemplateObject().getWeight(character);
            },
            
            setVolume: function(v) {this.set('v', v, true);},
            getVolume: function(character) {
                return this.v != null ? this.v : this.getTemplateObject().getVolume(character);
            },
            
            setCapacityNeeded: function(v) {this.set('c', v, true);},
            getCapacityNeeded: function(character) {
                return this.c != null ? this.c : this.getTemplateObject().getCapacityNeeded(character);
            },
            
            setTemplate: function(v) {this.set('t', v, true);},
            getTemplate: function() {return this.t;},
            getTemplateObject: function() {return getTemplate(this.getTemplate());},
            
            
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
                const failureMsg = this.getTemplateObject().doInteraction(this, character, interactionName);
                
                // Make sound if successful
                if (!failureMsg) {
                    const worldMap = getWorldMap(),
                        {volume, sound} = worldMap.selectSoundRandomly(this.getSoundForInteraction(character, interactionName));
                    if (sound) {
                        const inventoryOwner = this.getInventory().getOwner(),
                            cell = inventoryOwner.isA(pkg.cell.CommonCellModel) ? inventoryOwner : inventoryOwner.getCell();
                        worldMap.broadcastSound(cell, this, 'item', sound, volume);
                    }
                }
                
                return failureMsg;
                
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
                
                // Serialize overridden attributes.
                for (const attrName of ['n','w','v','c']) {
                    if (this[attrName] != null) retval[attrName] = this[attrName];
                }
                
                return retval;
            },
            
            updateFromData: function(datum) {
                this.setId(datum.id);
                this.setTemplate(datum.t);
                
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
            item_3:new ItemTemplate({name:'Item Number Three', weight:9, volume:50})
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
