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
            getPhraseWithArticle
        } = pkg,
        
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
            
            
            // Methods /////////////////////////////////////////////////////////
            describe: function(thing, character, isAppend) {
                return isAppend ? thing.getName(character) : getPhraseWithArticle(thing.getName(character));
            },
            
            getInteractions: (thing, character, adjacent) => [],
            getLockPropertyForInteraction: (thing, character, interactionName) => 'lockAct',
            getSoundForInteraction: (thing, character, interactionName) => null,
            
            /** Optionally returns an error message. */
            doInteraction: (fixture, character, interactionName) => {},
            doExpositionBeforeInteraction: (fixture, character, interactionName, willSucceed) => {},
            doExpositionAfterInteraction: (fixture, character, interactionName, succeeded) => {},
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
                return this.w != null ? this.w : this.getTemplateObject().getWeight(this, character);
            },
            
            setVolume: function(v) {this.set('v', v, true);},
            getVolume: function(character) {
                return this.v != null ? this.v : this.getTemplateObject().getVolume(this, character);
            },
            
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
            
            getLockPropertyForInteraction: function(character, interactionName) {
                return this.getTemplateObject().getLockPropertyForInteraction?.(this, character, interactionName);
            },
            
            getSoundForInteraction: function(character, interactionName) {
                return this.getTemplateObject().getSoundForInteraction(this, character, interactionName);
            },
            
            doExpositionBeforeInteraction: function(character, interactionName, willSucceed) {
                return this.getTemplateObject().doExpositionBeforeInteraction(this, character, interactionName, willSucceed);
            },
            
            doExpositionAfterInteraction: function(character, interactionName, succeeded) {
                return this.getTemplateObject().doExpositionAfterInteraction(this, character, interactionName, succeeded);
            },
            
            
            // Persistence and Serialization ///////////////////////////////////
            getAsData: function(cfg) {
                const retval = {
                    id:this.id,
                    t:this.t
                };
                
                if (this.state != null) retval.state = this.state;
                
                // Serialize overridden attributes.
                for (const attrName of ['n','w','v']) {
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
                
                return this;
            }
        });
    
    pkg.thing = {
        ThingTemplate:ThingTemplate,
        Thing:Thing
    };
})(global.urob);
