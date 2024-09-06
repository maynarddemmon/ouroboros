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
        
        PERM_CREATOR = pkg.permission.PERM_CREATOR,
        
        BASE_EXP_PER_LVL = 1000;
    
    pkg.entity = {
        experienceByLevel: lvl => lvl * BASE_EXP_PER_LVL,
        minExperienceForLevel: lvl => ((lvl * (lvl + 1)) / 2) * BASE_EXP_PER_LVL,
        experienceToLevel: exp => mathFloor((-1 + mathSqrt(1 + 8*exp/BASE_EXP_PER_LVL)) / 2),
        
        CommonEntityModelMixin: new JSModule('CommonEntityModelMixin', {
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
            setLockAct: function(v) {this.set('lockAct', v, true);},
            getLockAct: function() {return this.lockAct;},
            setLockFree: function(v) {this.set('lockFree', v, true);},
            getLockFree: function() {return this.lockFree;},
            setLockReact: function(v) {this.set('lockReact', v, true);},
            getLockReact: function() {return this.lockReact;},
            
            getWorldClockNow: () => {/* Subclasses must implement. */},
            canMove: function() {return this.lockMove <= this.getWorldClockNow();},
            canAct: function() {return this.lockAct <= this.getWorldClockNow();},
            canReact: function() {return this.lockAct <= this.getWorldClockNow();},
            canFree: function() {return this.lockFree <= this.getWorldClockNow();},
            
            getSightDistance: () => 3,
            getHearDistance: () => 9, // Maximum so sound propogation can handle things.
        }),
        
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
            }
        })
    };
})(global.urob);
