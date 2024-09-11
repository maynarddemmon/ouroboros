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
    
    pkg.map = {
        CommonMapModel: new JS.Class('CommonMapModel', tym.Eventable, {
            // Accessors ///////////////////////////////////////////////////////
            setName: function(v) {this.set('name', v, true);},
            getName: function() {return this.name;},
            setDescription: function(v) {this.set('description', v, true);},
            getDescription: function() {return this.description;},
            setElements: function(v) {this.set('elements', v, true);},
            getElements: function() {return this.elements;},
            
            
            // Persistence and Serialization ///////////////////////////////////
            getAsData: function(cfg) {
                return {
                    name:this.name,
                    description:this.description,
                    elements:this.elements
                };
            },
            
            updateFromData: function(datum) {
                this.setName(datum.name);
                this.setDescription(datum.description);
                this.setElements(datum.elements);
                return this;
            }
        })
    };
})(global.urob);
