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
        
        items = {},
        
        Item = new JSClass('Item', Eventable, {
            init: function(attrs) {
                this.w = this.v = 0;
                
                this.callSuper(attrs);
            },
            
            
            // Accessors ///////////////////////////////////////////////////////
            setId: function(v) {this.set('id', v, true);},
            getId: function(fixture, character) {return this.id;},
            
            setName: function(v) {this.set('n', v, true);},
            getName: function(fixture, character) {return this.n;},
            
            setWeight: function(v) {this.set('w', v, true);},
            getWeight: function(fixture, character) {return this.w;},
            
            setVolume: function(v) {this.set('v', v, true);},
            getVolume: function(fixture, character) {return this.v;},
            
            getCapacityNeeded: () => 1,
            
            
            // Item Methods ////////////////////////////////////////////////////
            
            
            // Persistence and Serialization ///////////////////////////////////
            getAsData: function(character) {
                return {
                    id:this.id,
                    n:this.n,
                    w:this.w,
                    v:this.v
                };
            },
            
            updateFromData: function(datum) {
                const id = datum.id;
                
                this.setId(id);
                this.setName(datum.n);
                this.setWeight(datum.w);
                this.setVolume(datum.v);
                
                items[id] = this;
            }
        });
    
    pkg.item = {
        getItemById:itemId => items[itemId],
        
        Item:Item
    };
})(global.urob);
