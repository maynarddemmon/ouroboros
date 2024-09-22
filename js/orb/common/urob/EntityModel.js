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
    
    const JSModule = JS.Module,
        
        {floor:mathFloor, ceil:mathCeil, sqrt:mathSqrt} = Math,
        
        {
            inventory:{Inventory}
        } = pkg,
        
        PERM_CREATOR = pkg.permission.PERM_CREATOR,
        
        BASE_EXP_PER_LVL = 1000,
        
        CORE_STAT_NAMES = ['exp','lvl','qui'],
        ABILITY_NAMES = ['str','agl','dex','con','wil','per','wis','int'],
        DERIVED_STAT_NAMES = ['soma','end','endRec','hp','hpRec','pneuma','magos','magosRec','psyche','psycheRec'],
        
        CommonEntityModelMixin = new JSModule('CommonEntityModelMixin', {
            include:[Inventory],
            
            
            // Class Methods and Attributes ////////////////////////////////////
            extend: {
                INVENTORY_MODEL_CLASS:null
            },
            
            
            // Life Cycle //////////////////////////////////////////////////////
            init: function(attrs) {
                attrs.spirit ??= false;
                attrs.zombie ??= false;
                attrs.astral ??= false;
                
                attrs.lockMove ??= 0;
                attrs.lockAct ??= 0;
                attrs.lockReact ??= 0;
                attrs.lockFree ??= 0;
                
                this.callSuper(attrs);
            },
            
            
            // Accessors ///////////////////////////////////////////////////////
            setId: function(v) {this.set('id', v, true);},
            getId: function() {return this.id;},
            
            setName: function(v) {this.set('name', v, true);},
            getName: function() {return this.name;},
            
            setSpirit: function(v) {this.set('spirit', v, true);},
            isSpirit: function() {return this.spirit;},
            setZombie: function(v) {this.set('zombie', v, true);},
            isZombie: function() {return this.zombie;},
            setAstral: function(v) {this.set('astral', v, true);},
            isAstralProjected: function() {return this.astral;},
            isCorporeal: function() {return !this.isSpirit() && !this.isAstralProjected();},
            
            setLoc: function(v) {this.set('loc', v, true);},
            getLocArr: function(asCopy) {return asCopy ? this.loc.slice() : this.loc;},
            
            setFacing: function(v) {this.set('facing', v, true);},
            getFacing: function() {return this.facing;},
            
            // Action Speeds
            setMoveSpeed: function(v) {this.set('moveSpeed', v, true);},
            getMoveSpeed: function(contextObj) {return this.moveSpeed;},
            getReactSpeed: function(contextObj) {return 0;},
            getFreeSpeed: function(contextObj) {return 1;},
            getActSpeed: function(contextObj) {return 3;},
            
            // Lock Times
            setLockMove: function(v) {this.set('lockMove', v, true);},
            getLockMove: function() {return this.lockMove;},
            adjLockMove: function(v) {if (v !== 0) this.setLockMove(this.getLockMove() + v);},
            
            setLockAct: function(v) {this.set('lockAct', v, true);},
            getLockAct: function() {return this.lockAct;},
            adjLockAct: function(v) {if (v !== 0) this.setLockAct(this.getLockAct() + v);},
            
            setLockFree: function(v) {this.set('lockFree', v, true);},
            getLockFree: function() {return this.lockFree;},
            adjLockFree: function(v) {if (v !== 0) this.setLockFree(this.getLockFree() + v);},
            
            setLockReact: function(v) {this.set('lockReact', v, true);},
            getLockReact: function() {return this.lockReact;},
            adjLockReact: function(v) {if (v !== 0) this.setLockReact(this.getLockReact() + v);},
            
            getWorldClockNow: () => {/* Subclasses must implement. */},
            canMove: function() {return this.lockMove <= this.getWorldClockNow();},
            canAct: function() {return this.lockAct <= this.getWorldClockNow();},
            canReact: function() {return this.lockAct <= this.getWorldClockNow();},
            canFree: function() {return this.lockFree <= this.getWorldClockNow();},
            
            getSightDistance: () => 4,
            getHearDistance: () => 9, // Maximum so sound propogation can handle things.
            
            
            // Persistence and Serialization ///////////////////////////////////
            getAsData: function(cfg) {
                const retval = this.callSuper?.(cfg) ?? {};
                
                retval.id = this.id;
                retval.name = this.name;
                retval.spirit = this.spirit;
                retval.zombie = this.zombie;
                retval.astral = this.astral;
                retval.facing = this.facing;
                
                if (!cfg?.character) {
                    retval.loc = this.loc;
                    retval.moveSpeed = this.moveSpeed;
                    retval.lockMove = this.lockMove;
                    retval.lockAct = this.lockAct;
                    retval.lockReact = this.lockReact;
                    retval.lockFree = this.lockFree;
                }
                
                return retval;
            },
            
            updateFromData: function(datum) {
                this.callSuper?.(datum) ?? {};
                
                if (datum.id != null) this.setId(datum.id);
                if (datum.name != null) this.setName(datum.name);
                if (datum.spirit != null) this.setSpirit(datum.spirit);
                if (datum.zombie != null) this.setZombie(datum.zombie);
                if (datum.astral != null) this.setAstral(datum.astral);
                if (datum.facing != null) this.setFacing(datum.facing);
                
                if (datum.loc != null) this.setLoc(datum.loc);
                if (datum.moveSpeed != null) this.setMoveSpeed(datum.moveSpeed);
                if (datum.lockMove != null) this.setLockMove(datum.lockMove);
                if (datum.lockAct != null) this.setLockAct(datum.lockAct);
                if (datum.lockReact != null) this.setLockReact(datum.lockReact);
                if (datum.lockFree != null) this.setLockFree(datum.lockFree);
                
                return this;
            }
        });
    
    pkg.entity = {
        experienceByLevel: lvl => lvl * BASE_EXP_PER_LVL,
        minExperienceForLevel: lvl => ((lvl * (lvl + 1)) / 2) * BASE_EXP_PER_LVL,
        experienceToLevel: exp => mathFloor((-1 + mathSqrt(1 + 8*exp/BASE_EXP_PER_LVL)) / 2),
        
        CORE_STAT_NAMES:CORE_STAT_NAMES,
        ABILITY_NAMES:ABILITY_NAMES,
        DERIVED_STAT_NAMES:DERIVED_STAT_NAMES,
        
        CommonEntityModelMixin:CommonEntityModelMixin,
        CommonCharacterModelMixin: new JSModule('CommonCharacterModelMixin', {
            init: function(attrs) {
                attrs.uid ??= null;
                attrs.inWorld ??= false;
                attrs.perms ??= null;
                
                this.callSuper(attrs);
            },
            
            setUid: function(v) {this.set('uid', v, true);},
            getUserId: function() {return this.uid;},
            setInWorld: function(v) {this.set('inWorld', v, true);},
            isInWorld: function() {return this.inWorld;},
            
            setPerms: function(v) {this.set('perms', v, true);},
            hasPermission: function(permId) {return this.perms?.includes(permId) ?? false;},
            
            isSpirit: function() {
                // Creators are treated like spirits.
                return this.callSuper() || this.hasPermission(PERM_CREATOR);
            },
            
            
            // Persistence and Serialization ///////////////////////////////////
            getAsData: function(cfg) {
                const retval = this.callSuper(cfg);
                retval.inWorld = this.inWorld;
                if (!cfg?.character) {
                    retval.uid = this.uid;
                    retval.perms = this.perms;
                }
                return retval;
            },
            
            updateFromData: function(datum) {
                this.callSuper(datum);
                if (datum.inWorld != null) this.setInWorld(datum.inWorld);
                if (datum.uid != null) this.setUid(datum.uid);
                if (datum.perms != null) this.setPerms(datum.perms);
                return this;
            }
        })
    };
})(global.urob);
