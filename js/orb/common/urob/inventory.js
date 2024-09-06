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
                newTotalVolume <= inventory.getTotalVolume()
            ) {
                inventory.totalCapcity = newTotalCapacity;
                inventory.totalWeight = newTotalWeight;
                inventory.totalVolume = newTotalVolume;
                inventory._items[item.getId()] = item;
            }
        },
        
        Inventory = new JSClass('Inventory', Eventable, {
            init: function(attrs) {
                this.maxCapacity = this.maxWeight = this.maxVolume = 0;
                this.totalCapacity = this.totalWeight = this.totalVolume = 0;
                this.callSuper(attrs);
            },
            
            
            // Accessors ///////////////////////////////////////////////////////
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
            
            
            // Methods /////////////////////////////////////////////////////////
            addItem: function(item) {
                const itemId = item.getId(),
                    existingItem = this.getItem(itemId);
                if (!existingItem) addWeightAndVolume(this, item);
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
            }
        });
    
    pkg.inventory = {
        InventoryContainer: new JSModule('InventoryContainer', {
            getInventoryClass: () => Inventory,
            getInventory: function() {
                return this._inventory ??= new (this.getInventoryClass())();
            }
        }),
        
        Inventory:Inventory
    };
})(global.urob);
