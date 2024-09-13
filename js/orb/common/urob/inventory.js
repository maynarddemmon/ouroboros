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
        
        addWeightAndVolume = (inventory, item) => {
            const newTotalCapacity = inventory.getTotalCapacity() + item.getCapacityNeeded(),
                newTotalWeight = inventory.getTotalWeight() + item.getWeight(),
                newTotalVolume = inventory.getTotalVolume() + item.getVolume();
            if (newTotalCapacity <= inventory.getMaxCapacity() && 
                newTotalWeight <= inventory.getMaxWeight() && 
                newTotalVolume <= inventory.getMaxVolume()
            ) {
                inventory.totalCapacity = newTotalCapacity;
                inventory.totalWeight = newTotalWeight;
                inventory.totalVolume = newTotalVolume;
                inventory._items[item.getId()] = item;
                return true;
            }
            return false;
        },
        
        Inventory = new JSClass('Inventory', Eventable, {
            extend: {
                ITEM_MODEL_CLASS:null
            },
            
            
            // Life Cycle //////////////////////////////////////////////////////
            init: function(attrs) {
                this.maxCapacity = this.maxWeight = this.maxVolume = 0;
                this.totalCapacity = this.totalWeight = this.totalVolume = 0;
                this.callSuper(attrs);
            },
            
            
            // Accessors ///////////////////////////////////////////////////////
            setOwner: function(v) {this._owner = v;},
            getOwner: function() {return this._owner;},
            isOwner: function(ownerToTest) {return ownerToTest?.getId() === this._owner?.getId()},
            
            // The maximum number of items the inventory can contain.
            setMaxCapacity: function(v) {this.set('maxCapacity', v, true);},
            getMaxCapacity: function(fixture, character) {return this.maxCapacity;},
            
            // The maximum volume of items the inventory can contain.
            setMaxVolume: function(v) {this.set('maxVolume', v, true);},
            getMaxVolume: function(fixture, character) {return this.maxVolume;},
            
            // The maximum weight the inventory can contain.
            setMaxWeight: function(v) {this.set('maxWeight', v, true);},
            getMaxWeight: function(fixture, character) {return this.maxWeight;},
            
            getTotalCapacity: function() {return this.totalCapacity;},
            getTotalWeight: function() {return this.totalWeight;},
            getTotalVolume: function() {return this.totalVolume;},
            
            
            // Item Methods ////////////////////////////////////////////////////
            makeItemFromData: function(itemDatum) {
                const item = new (this.getItemClass())({inventory:this});
                item.updateFromData(itemDatum);
                return item;
            },
            getItemClass: () => Inventory.ITEM_MODEL_CLASS,
            
            addItem: function(item) {
                const itemId = item.getId(),
                    existingItem = this.getItem(itemId);
                if (!existingItem) {
                    const success = addWeightAndVolume(this, item);
                    if (success) {
                        const oldInventory = item.getInventory();
                        if (oldInventory !== this) {
                            oldInventory.removeItem(itemId);
                            item.setInventory(this);
                        }
                    }
                    return success;
                }
                return false;
            },
            getItem: function(itemId) {
                return this.getAllItems()[itemId];
            },
            getAllItems: function() {
                return this._items ??= {};
            },
            removeItem: function(itemId) {
                const item = this.getItem(itemId);
                if (item) {
                    this.totalCapacity -= item.getCapacityNeeded();
                    this.totalWeight -= item.getWeight();
                    this.totalVolume -= item.getVolume();
                    delete this._items[itemId];
                    return item;
                }
            },
            
            
            // Persistence and Serialization ///////////////////////////////////
            getAsData: function(cfg) {
                const retval = {
                    mc:this.maxCapacity,
                    mw:this.maxWeight,
                    mv:this.maxVolume
                };
                
                let itemsData;
                const items = this._items;
                if (items) {
                    itemsData = [];
                    for (const itemId in items) {
                        itemsData.push(items[itemId].getAsData(cfg));
                    }
                }
                if (itemsData) retval.it = itemsData;
                return retval;
            },
            
            updateFromData: function(datum) {
                this.setMaxCapacity(datum.mc ?? 0);
                this.setMaxVolume(datum.mv ?? 0);
                this.setMaxWeight(datum.mw ?? 0);
                
                const itemData = datum.it;
                if (itemData) {
                    for (const itemDatum of itemData) {
                        this.addItem(this.makeItemFromData(itemDatum));
                    }
                }
            }
        });
    
    pkg.inventory = {
        InventoryContainer: new JSModule('InventoryContainer', {
            getInventoryClass: () => Inventory,
            getInventory: function() {
                return this._inventory ??= new (this.getInventoryClass())({owner:this});
            },
            
            
            // Inventory Wrapper Functions
            addItem: function(item) {return this.getInventory().addItem(item);},
            getItem: function(itemId) {return this.getInventory().getItem(itemId);},
            getAllItems: function() {return this.getInventory().getAllItems();},
            removeItem: function(itemId) {return this.getInventory().removeItem(itemId);},
            
            
            // Persistence and Serialization ///////////////////////////////////
            getAsData: function(cfg) {
                const retval = this.callSuper?.(cfg) ?? {},
                    inventory = this._inventory;
                if (inventory) retval.inv = inventory.getAsData(cfg);
                return retval;
            },
            
            updateFromData: function(datum) {
                this.callSuper?.(datum);
                const inventoryData = datum.inv;
                if (inventoryData) this.getInventory().updateFromData(inventoryData);
            }
        }),
        
        Inventory:Inventory
    };
})(global.urob);
