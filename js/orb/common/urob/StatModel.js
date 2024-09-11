(pkg => {
    let tym, JS, worldClock;
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
        
        {min:mathMin, max:mathMax} = Math,
        
        getWorldClock = () => worldClock ??= require('../../server/WorldClock.js'),
        
        /** A stat on an object. Enforces min and max values and provides a way to temporarily
            adjust the effective value. */
        StatModel = new JSClass('StatModel', Eventable, {
            // FIXME: adjustements to min, max, value
            
            init: function(attrs) {
                const {parentObj, attrName, absMin, absMax, min, max, value} = attrs;
                delete attrs.parentObj;
                delete attrs.attrName;
                delete attrs.absMin;
                delete attrs.absMax;
                delete attrs.min;
                delete attrs.max;
                delete attrs.value;
                
                // Need to set attrs in an exact order
                this.parentObj = parentObj;
                this.attrName = attrName;
                
                this.setAbsMin(absMin ?? Number. MIN_SAFE_INTEGER);
                this.setAbsMax(absMax ?? Number. MAX_SAFE_INTEGER);
                this.setMin(min ?? this.absMin);
                this.setMax(max ?? this.absMax);
                this.setValue(value ?? this.min);
                
                this.callSuper(attrs);
            },
            
            /* The absolute minimum for the stat in the game. This value will never change once set. */
            setAbsMin: function(v) {
                if (this.absMin == null) this.set('absMin', v, true);
            },
            getAbsMin: function() {return this.absMin;},
            
            /* The absolute maximum for the stat in the game. This value will never change once set. */
            setAbsMax: function(v) {
                if (this.absMax == null) this.set('absMax', v, true);
            },
            getAbsMax: function() {return this.absMax;},
            
            /* The minimum value for the stat for the object it is attached to. */
            setMin: function(v) {
                const curMin = this.min,
                    newMin = mathMax(this.getAbsMin(), v);
                if (curMin !== newMin) {
                    this.set('min', newMin, true);
                    if (this.value < this.min && this.setValue(this.min)) return true;
                    if (this.inited) this.notifyForChange();
                    return true;
                }
                return false;
            },
            getMin: function() {return this.min;},
            
            /* The minimum value for the stat for the object it is attached to. */
            setMax: function(v) {
                const curMax = this.max,
                    newMax = mathMin(this.getAbsMax(), v);
                if (curMax !== newMax) {
                    this.set('max', newMax, true);
                    if (this.value > this.max && this.setValue(this.max)) return true;
                    if (this.inited) this.notifyForChange();
                    return true;
                }
                return false;
            },
            getMax: function() {return this.max;},
            
            /* The minimum value for the stat for the object it is attached to. */
            setValue: function(v) {
                const curValue = this.value,
                    newValue = mathMin(mathMax(v, this.getMin()), this.getMax());
                if (curValue !== newValue) {
                    this.set('value', newValue, true);
                    if (this.inited) this.notifyForChange();
                    return true;
                }
                return false;
            },
            getValue: function() {return this.value;},
            
            adjValue: function(adj, cfg) {
                if (adj === 0) return 0;
                
                const curValue = this.getValue();
                if (adj > 0) {
                    const max = this.getMax(),
                        allowedAdj = max - curValue;
                    if (adj <= allowedAdj) {
                        this.setValue(curValue + adj);
                        return adj;
                    } else {
                        if (cfg?.allOrNothing) {
                            // Change would exceed max so do not change.
                            return 0;
                        } else {
                            this.setValue(curValue + allowedAdj);
                            return allowedAdj;
                        }
                    }
                } else {
                    const min = this.getMin(),
                        allowedAdj = min - curValue;
                    if (adj >= allowedAdj) {
                        this.setValue(curValue + adj);
                        return adj;
                    } else {
                        if (cfg?.allOrNothing) {
                            // Change would exceed max so do not change.
                            return 0;
                        } else {
                            this.setValue(curValue + allowedAdj);
                            return allowedAdj;
                        }
                    }
                }
            },
            
            getValueToMax: function() {return this.getMax() - this.getValue();},
            isAtMaxValue: function() {return this.getMax() === this.getValue();},
            
            
            // Methods /////////////////////////////////////////////////////////
            notifyForChange: () => {/** Subclasses must implement. */},
            
            
            // Persistence and Serialization ///////////////////////////////////
            getAsData: function(cfg) {
                return {
                    min:this.min,
                    max:this.max,
                    value:this.value
                };
            },
            
            updateFromData: function(datum) {
                this.setMin(datum?.min ?? this.absMin);
                this.setMax(datum?.max ?? this.absMax);
                this.setValue(datum?.value ?? this.min);
            }
        });
    
    pkg.stat = {
        StatModel:StatModel,
        
        /** A stat that gets its value from other StatModels. */
        DerivedStatModelMixin: new JSModule('DerivedStatModelMixin', {
            init: function(attrs) {
                const watch = attrs.watch;
                delete attrs.watch;
                
                this.callSuper(attrs);
                
                this.setValuesToWatch(watch);
            },
            
            setValuesToWatch: function(observables) {
                this.releaseConstraint('updateValue');
                this.constrain('updateValue', observables);
            },
            
            updateValue: function(ignoreEvent) {
                this.setValue(this.calculateValue());
            },
            
            calculateValue: () => {/* Subclasses must implement. */},
            
            
            // Persistence and Serialization ///////////////////////////////////
            updateFromData: function(datum) {
                this.setMin(datum?.min ?? this.absMin);
                this.setMax(datum?.max ?? this.absMax);
            }
        }),
        
        /** A stat that gets its max value from other StatModels. */
        DerivedMaxStatModelMixin: new JSModule('DerivedMaxStatModelMixin', {
            init: function(attrs) {
                const watch = attrs.watch;
                delete attrs.watch;
                
                this.callSuper(attrs);
                
                this.setValuesToWatch(watch);
            },
            
            setValuesToWatch: function(observables) {
                this.releaseConstraint('updateMax');
                this.constrain('updateMax', observables);
            },
            
            updateMax: function(ignoreEvent) {
                this.setMax(this.calculateMax());
            },
            
            calculateMax: () => {/* Subclasses must implement. */},
            
            
            // Persistence and Serialization ///////////////////////////////////
            updateFromData: function(datum) {
                this.setMin(datum?.min ?? this.absMin);
                this.setValue(datum?.value ?? this.min);
            }
        }),
        
        RecoverableStatMixin: new JSModule('RecoverableStatMixin', {
            setValue: function(v) {
                const isChanged = this.callSuper(v);
                if (this.inited && this.parentObj?.inited) this.registerForRecovery();
                return isChanged;
            },
            
            registerForRecovery: function() {
                if (!this.isAtMaxValue()) getWorldClock().addToRecQueue(this.parentObj, this.attrName);
            }
        })
    };
})(global.urob);
