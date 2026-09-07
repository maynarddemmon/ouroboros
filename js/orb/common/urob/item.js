(pkg => {
    let tym, JS, worldMap;
    if (typeof module === 'object' && module.exports) {
        const imported = require('../../../../lib/tym.js');
        JS = imported.JS;
        tym = imported.tym;
    } else {
        JS = globalThis.JS;
        tym = globalThis.myt;
    }
    
    const {Eventable} = tym,
        {Module:JSModule, Class:JSClass} = JS,
        
        {
            inventory:{
                ERR_ITEM_NOT_FOUND, ERR_MAX_CAPACITY_EXCEEDED, ERR_MAX_WEIGHT_EXCEEDED, ERR_MAX_VOLUME_EXCEEDED
            },
            thing:{
                ThingTemplate, Thing, ChargeableTemplate, EatableTemplate, FoodTemplate, ChargeableFoodTemplate, 
                TeleportTemplate, ChargeableTeleportTemplate, 
                INTERACTION_ID_DROP, INTERACTION_ID_PICK_UP,
                INTERACTION_DROP, INTERACTION_PICK_UP
            }
        } = pkg,
        
        getWorldMap = () => worldMap ??= require('../../server/WorldMap.js'),
        
        items = new Map(),
        
        broadcastSound = (item, character, interaction) => {
            const worldMap = getWorldMap(),
                {volume, sound} = worldMap.selectSoundRandomly(item.getSoundForInteraction(character, interaction));
            if (sound) worldMap.broadcastSound(item, 'item', sound, volume);
        },
        
        isItemInCharacterInventory = (item, character) => item.getInventory() === character,
        
        ItemTemplate = new JSClass('ItemTemplate', ThingTemplate, {
            getCapacityNeeded: function(item, character) {return 1;},
            
            
            // Methods /////////////////////////////////////////////////////////
            getInteractions: function(item, character, adjacent) {
                return this.addInteractionToReturnValue(item, character, isItemInCharacterInventory(item, character) ? INTERACTION_DROP : INTERACTION_PICK_UP);
            },
            getLockPropertyForInteraction: function(item, character, interaction) {
                switch (interaction.id) {
                    case INTERACTION_ID_PICK_UP: return 'lockAct';
                    case INTERACTION_ID_DROP:    return 'lockFree';
                }
                return this.callSuper?.(item, character, interaction);
            },
            getSoundForInteraction: function(item, character, interaction) {
                const sounds = this.callSuper(item, character, interaction);
                if (sounds) return sounds;
                
                if (interaction.id === INTERACTION_ID_DROP) {
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
            /*  Optionally returns an error message. */
            doInteraction: function(item, character, interaction) {
                switch (interaction.id) {
                    case INTERACTION_ID_PICK_UP: return this.doInteractionPickUp(item, character, interaction);
                    case INTERACTION_ID_DROP:    return this.doInteractionDrop(item, character, interaction);
                }
                return this.callSuper(item, character, interaction);
            },
            
            doExpositionAfterInteraction: function(item, character, interaction, succeeded) {
                if (succeeded) {
                    const simpleExpositionFunc = (actionWordSelf, actionWordOther) => {
                        const itemName = item.getSimpleName();
                        character.sendExposition('You ' + actionWordSelf + ' the ' + itemName + '.', 'narrative');
                        character.getCell().sendExposition(character.getName() + ' ' + actionWordOther + ' the ' + itemName + '.', 'visual', character);
                        broadcastSound(item, character, interaction);
                    };
                    switch (interaction.id) {
                        case INTERACTION_ID_PICK_UP: simpleExpositionFunc(interaction.label, 'picked up'); return;
                        case INTERACTION_ID_DROP: simpleExpositionFunc(interaction.label, 'dropped'); return;
                    }
                }
                this.callSuper?.(item, character, interaction, succeeded);
            },
            
            doInteractionPickUp: (item, character, interaction) => {
                const characterCell = character.getCell(),
                    itemCell = item.getInventory();
                if (characterCell && itemCell && characterCell === itemCell) {
                    switch(character.addItem(item)) {
                        case ERR_ITEM_NOT_FOUND:
                            return "Can't " + interaction.label + ' the ' + item.getName(character) + " because it can't be found.";
                        case ERR_MAX_CAPACITY_EXCEEDED:
                            return "Can't " + interaction.label + ' the ' + item.getName(character) + " because it would exceed the maximum capacity of your inventory.";
                        case ERR_MAX_WEIGHT_EXCEEDED:
                            return "Can't " + interaction.label + ' the ' + item.getName(character) + " because it would exceed the maximum weight of your inventory.";
                        case ERR_MAX_VOLUME_EXCEEDED:
                            return "Can't " + interaction.label + ' the ' + item.getName(character) + " because it would exceed the maximum volume of your inventory.";
                        default:
                            item.doExpositionAfterInteraction(character, interaction, true);
                    }
                } else {
                    return "Can't " + interaction.label + ' the ' + item.getName(character) + " because it's not here.";
                }
            },
            
            doInteractionDrop: (item, character, interaction) => {
                const characterCell = character.getCell(),
                    itemOwner = item.getInventory();
                if (characterCell && itemOwner && character === itemOwner) {
                    switch(characterCell.addItem(item)) {
                        case ERR_ITEM_NOT_FOUND:
                            return "Can't " + interaction.label + ' the ' + item.getName(character) + " because it can't be found.";
                        case ERR_MAX_CAPACITY_EXCEEDED:
                            return "Can't " + interaction.label + ' the ' + item.getName(character) + " because it would exceed the maximum capacity of this location.";
                        case ERR_MAX_WEIGHT_EXCEEDED:
                            return "Can't " + interaction.label + ' the ' + item.getName(character) + " because it would exceed the maximum weight of this location.";
                        case ERR_MAX_VOLUME_EXCEEDED:
                            return "Can't " + interaction.label + ' the ' + item.getName(character) + " because it would exceed the maximum volume of this location.";
                        default:
                            item.doExpositionAfterInteraction(character, interaction, true);
                    }
                } else {
                    return "Can't " + interaction.label + ' the ' + item.getName(character) + " because you don't seem to have it.";
                }
            }
        }),
        
        FoodItemTemplate = new JSClass('FoodItemTemplate', ItemTemplate, {
            include:[FoodTemplate]
        }),
        
        ChargeableFoodItemTemplate = new JSClass('ChargeableFoodItemTemplate', ItemTemplate, {
            include:[ChargeableFoodTemplate]
        }),
        
        TeleportItemTemplate = new JSClass('TeleportItemTemplate', ItemTemplate, {
            include:[TeleportTemplate]
        }),
        
        ChargeableTeleportItemTemplate = new JSClass('ChargeableTeleportItemTemplate', ItemTemplate, {
            include:[ChargeableTeleportTemplate]
        }),
        
        templates = {
            item_1:new ItemTemplate({name:'short sword', volume:150, material:'bronze'}),
            item_2:new ItemTemplate({name:'club', volume:500, material:'ironwood'}),
            item_3:new ItemTemplate({name:'dagger', volume:65, material:'steel'}),
            item_4:new ItemTemplate({name:'long sword', volume:300, material:'steel'}),
            
            // Teleporter Items
            stone_1:new TeleportItemTemplate({
                name:'sphere', volume:75, material:'marble',
                interactionLabels:{enter:'rub'},
            }),
            stone_2:new ChargeableTeleportItemTemplate({
                name:'sphere', volume:75, destroyWhenDepleted:false, material:'granite',
                interactionLabels:{enter:'rub'}, chargeVolume:0, maxCharges:10
            }),
            
            // Food
            food_1:new FoodItemTemplate({
                name:'Mushroom Jerky', volume:25, material:'fungus', sustenance:20
            }),
            food_2:new FoodItemTemplate({
                name:'Centipede Jerky', volume:25, material:'flesh', sustenance:25
            }),
            
            drink_1:new FoodItemTemplate({
                name:'water', volume:10, material:'water', sustenance:5, 
                interactionLabels:{eat:'drink'},
                soundsByInteractionId:{eat:[[1.0, '*gulp*', 1<<2]]}
            }),
            drink_2:new FoodItemTemplate({
                name:'beer', volume:10, material:'water', sustenance:8, 
                interactionLabels:{eat:'chug'},
                soundsByInteractionId:{eat:[[1.0, '*glug*', 1<<2]]}
            }),
            drink_3:new FoodItemTemplate({
                name:'wine', volume:10, material:'water', sustenance:8, 
                interactionLabels:{eat:'sip'},
                soundsByInteractionId:{eat:[[1.0, '*sip*', 1<<2]]}
            }),
            drink_4:new FoodItemTemplate({
                name:'mead', volume:10, material:'water', sustenance:10, 
                interactionLabels:{eat:'sip'},
                soundsByInteractionId:{eat:[[1.0, '*sip*', 1<<2]]}
            }),
            
            food_3:new ChargeableFoodItemTemplate({
                name:'Kibble', destroyWhenDepleted:true, material:'vegetable',
                volume:0, chargeVolume:5, sustenance:4,
                soundsByInteractionId:{eat:[[1.0, '*crunch*', 1<<3]]}
            }),
            food_4:new ChargeableFoodItemTemplate({
                name:'Giant Spider Carcass', destroyWhenDepleted:false, material:'flesh',
                volume:100, chargeVolume:15, maxCharges:50, sustenance:15,
                soundsByInteractionId:{eat:[[1.0, '*slurp*', 1<<2]]}
            }),
        },
        
        getTemplate = itemTemplateId => templates[itemTemplateId];
    
    pkg.item = {
        getItemById:itemId => items.get(itemId),
        clearItemCache: () => {items.clear();},
        
        Item:new JSClass('Item', Thing, {
            // Accessors ///////////////////////////////////////////////////////
            getCell: function() {return this.getInventory().getCell();},
            getTemplateObject: function() {return getTemplate(this.getTemplate());},
            
            setInventory: function(v) {this._inventory = v;},
            getInventory: function() {return this._inventory;},
            
            setCapacityNeeded: function(v) {this.set('c', v, true);},
            getCapacityNeeded: function(character) {
                return this.c != null ? this.c : this.getTemplateObject().getCapacityNeeded(this, character);
            },
            
            
            // Item Methods ////////////////////////////////////////////////////
            doInteraction: function(character, interaction) {
                return this.getTemplateObject().doInteraction(this, character, interaction);
            },
            
            
            // Persistence and Serialization ///////////////////////////////////
            getAsData: function(cfg) {
                const retval = this.callSuper(cfg);
                if (this.c != null) retval.c = this.c;
                return retval;
            },
            
            updateFromData: function(datum) {
                this.callSuper(datum);
                if (datum.c != null) this.setCapacityNeeded(datum.c);
                items.set(this.id, this);
                return this;
            }
        }),
        
        getTemplates: () => templates,
        getTemplate: getTemplate
    };
})(globalThis.urob);
