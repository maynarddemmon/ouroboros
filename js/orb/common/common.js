(() => {
    const IS_NODEJS = typeof module === 'object' && module.exports;
    
    let tym, JS;
    if (IS_NODEJS) {
        const imported = require('../../../lib/tym.js');
        JS = imported.JS;
        tym = imported.tym;
    } else {
        JS = global.JS;
        tym = global.myt;
    }
    
    const
        {
            AccessorSupport:{generateSetterName}
        } = tym,
        
        PERM_CREATOR = 'creator',
        
        FIELD_ID ='id',
        FIELD_SPIRIT = 'spirit',
        FIELD_ZOMBIE = 'zombie',
        
        FIELD_USER_ID = 'uid',
        FIELD_PERMISSIONS = 'perms',
        FIELD_IN_WORLD = 'inWorld',
        FIELD_NAME = 'name',
        FIELD_LOC = 'loc',
        FIELD_MOVE_SPEED = 'moveSpeed',
        FIELD_LOCK_MOVE = 'lockMove',
        FIELD_LOCK_ACTION = 'lockAct',
        FIELD_LOCK_FREE = 'lockFree',
        FIELD_LOCK_REACT = 'lockReact',
        
        CIRCLE_0 = [[0,0]],
        CIRCLE_1 = (() => {
            let x = -1, y = 0;
            return [
                ...CIRCLE_0,
                [++x,++y],[++x,--y],[--x,--y],[--x,++y]
            ];
        })(),
        CIRCLE_2 = (() => {
            let x = -1, y = 2;
            return [
                ...CIRCLE_1,
                [++x,y],[++x,y],[x,--y],[++x,y],
                [x,--y],[x,--y],[--x,y],[x,--y],
                [--x,y],[--x,y],[x,++y],[--x,y],
                [x,++y],[x,++y],[++x,y],[x,++y]
            ];
        })(),
        CIRCLE_3 = (() => {
            let x = -1, y = 3;
            return [
                ...CIRCLE_2,
                [++x,y],[++x,y],[++x,--y],[++x,--y],
                [x,--y],[x,--y],[--x,--y],[--x,--y],
                [--x,y],[--x,y],[--x,++y],[--x,++y],
                [x,++y],[x,++y],[++x,++y],[++x,++y]
            ];
        })(),
        CIRCLE_4 = (() => {
            let x = -1, y = 4;
            return [
                ...CIRCLE_3,
                [++x,y],[++x,y],[++x,--y],[++x,y],[x,--y],[++x,--y],
                [x,--y],[x,--y],[--x,--y],[x,--y],[--x,y],[--x,--y],
                [--x,y],[--x,y],[--x,++y],[--x,y],[x,++y],[--x,++y],
                [x,++y],[x,++y],[++x,++y],[x,++y],[++x,y],[++x,++y]
            ];
        })(),
        CIRCLE_5 = (() => {
            let x = -1, y = 5;
            return [
                ...CIRCLE_4,
                [++x,y],[++x,y],[++x,y],[x,--y],[++x,y],[++x,--y],[x,--y],[++x,y],[x,--y],
                [x,--y],[x,--y],[x,--y],[--x,y],[x,--y],[--x,--y],[--x,y],[x,--y],[--x,y],
                [--x,y],[--x,y],[--x,y],[x,++y],[--x,y],[--x,++y],[x,++y],[--x,y],[x,++y],
                [x,++y],[x,++y],[x,++y],[++x,y],[x,++y],[++x,++y],[++x,y],[x,++y],[++x,y]
            ];
        })(),
        CIRCLE_6 = (() => {
            let x = -1, y = 6;
            return [
                ...CIRCLE_5,
                [++x,y],[++x,y],[++x,y],[++x,--y],[++x,y],[x,--y],[++x,y],[x,--y],[++x,--y],[x,--y],
                [x,--y],[x,--y],[x,--y],[--x,--y],[x,--y],[--x,y],[x,--y],[--x,y],[--x,--y],[--x,y],
                [--x,y],[--x,y],[--x,y],[--x,++y],[--x,y],[x,++y],[--x,y],[x,++y],[--x,++y],[x,++y],
                [x,++y],[x,++y],[x,++y],[++x,++y],[x,++y],[++x,y],[x,++y],[++x,y],[++x,++y],[++x,y]
            ];
        })(),
        CIRCLE_7 = (() => {
            let x = -1, y = 7;
            return [
                ...CIRCLE_6,
                [++x,y],[++x,y],[++x,y],[++x,--y],[++x,y],[++x,--y],[x,--y],[++x,y],[x,--y],[++x,--y],[x,--y],
                [x,--y],[x,--y],[x,--y],[--x,--y],[x,--y],[--x,--y],[--x,y],[x,--y],[--x,y],[--x,--y],[--x,y],
                [--x,y],[--x,y],[--x,y],[--x,++y],[--x,y],[--x,++y],[x,++y],[--x,y],[x,++y],[--x,++y],[x,++y],
                [x,++y],[x,++y],[x,++y],[++x,++y],[x,++y],[++x,++y],[++x,y],[x,++y],[++x,y],[++x,++y],[++x,y]
            ];
        })(),
        
        CIRCLE_8 = (() => {
            let x = -1, y = 8;
            return [
                ...CIRCLE_7,
                [++x,y],[++x,y],[++x,y],[++x,--y],[++x,y],[++x,--y],[++x,--y],[x,--y],[++x,y],[x,--y],[++x,--y],[x,--y],
                [x,--y],[x,--y],[x,--y],[--x,--y],[x,--y],[--x,--y],[--x,--y],[--x,y],[x,--y],[--x,y],[--x,--y],[--x,y],
                [--x,y],[--x,y],[--x,y],[--x,++y],[--x,y],[--x,++y],[--x,++y],[x,++y],[--x,y],[x,++y],[--x,++y],[x,++y],
                [x,++y],[x,++y],[x,++y],[++x,++y],[x,++y],[++x,++y],[++x,++y],[++x,y],[x,++y],[++x,y],[++x,++y],[++x,y]
            ];
        })(),
        CIRCLE_9 = (() => {
            let x = -1, y = 9;
            return [
                ...CIRCLE_8,
                //   r       r       r        dr       r       r       d       r       d       r       d       r       d       d        rd       d
                [++x,y],[++x,y],[++x,y],[++x,--y],[++x,y],[++x,y],[x,--y],[++x,y],[x,--y],[++x,y],[x,--y],[++x,y],[x,--y],[x,--y],[++x,--y],[x,--y],
                [x,--y],[x,--y],[x,--y],[--x,--y],[x,--y],[x,--y],[--x,y],[x,--y],[--x,y],[x,--y],[--x,y],[x,--y],[--x,y],[--x,y],[--x,--y],[--x,y],
                [--x,y],[--x,y],[--x,y],[--x,++y],[--x,y],[--x,y],[x,++y],[--x,y],[x,++y],[--x,y],[x,++y],[--x,y],[x,++y],[x,++y],[--x,++y],[x,++y],
                [x,++y],[x,++y],[x,++y],[++x,++y],[x,++y],[x,++y],[++x,y],[x,++y],[++x,y],[x,++y],[++x,y],[x,++y],[++x,y],[++x,y],[++x,++y],[++x,y]
            ];
        })(),
        
        CommonEntityModelMixin = new JS.Module('CommonEntityModelMixin', {
            // Accessors ///////////////////////////////////////////////////////
            [generateSetterName(FIELD_ID)]: function(v) {this.set(FIELD_ID, v, true);},
            getId: function() {return this[FIELD_ID];},
            [generateSetterName(FIELD_SPIRIT)]: function(v) {this.set(FIELD_SPIRIT, v, true);},
            isSpirit: function() {return this[FIELD_SPIRIT];},
            [generateSetterName(FIELD_ZOMBIE)]: function(v) {this.set(FIELD_ZOMBIE, v, true);},
            isZombie: function() {return this[FIELD_ZOMBIE];},
        }),
        
        CommonCharacterModelMixin = new JS.Module('CommonCharacterModelMixin', {
            // Accessors ///////////////////////////////////////////////////////
            [generateSetterName(FIELD_USER_ID)]: function(v) {this.set(FIELD_USER_ID, v, true);},
            getUserId: function() {return this[FIELD_USER_ID];},
            [generateSetterName(FIELD_NAME)]: function(v) {this.set(FIELD_NAME, v, true);},
            getName: function() {return this[FIELD_NAME];},
            isSpirit: function() {
                // Creators are treated like spirits.
                return this.callSuper() || this.hasPermission(PERM_CREATOR);
            },
            [generateSetterName(FIELD_IN_WORLD)]: function(v) {this.set(FIELD_IN_WORLD, v, true);},
            isInWorld: function() {return this[FIELD_IN_WORLD];},
            [generateSetterName(FIELD_LOC)]: function(v) {this.set(FIELD_LOC, v, true);},
            getLocArr: function(asCopy) {
                const locArr = this[FIELD_LOC];
                return asCopy ? locArr.slice() : locArr;
            },
            [generateSetterName(FIELD_LOCK_MOVE)]: function(v) {this.set(FIELD_LOCK_MOVE, v, true);},
            getLockMove: function() {return this[FIELD_LOCK_MOVE];},
            [generateSetterName(FIELD_MOVE_SPEED)]: function(v) {this.set(FIELD_MOVE_SPEED, v, true);},
            getMoveSpeed: function() {return this[FIELD_MOVE_SPEED];},
            [generateSetterName(FIELD_LOCK_ACTION)]: function(v) {this.set(FIELD_LOCK_ACTION, v, true);},
            getLockAction: function() {return this[FIELD_LOCK_ACTION];},
            [generateSetterName(FIELD_LOCK_FREE)]: function(v) {this.set(FIELD_LOCK_FREE, v, true);},
            getLockFree: function() {return this[FIELD_LOCK_FREE];},
            [generateSetterName(FIELD_LOCK_REACT)]: function(v) {this.set(FIELD_LOCK_REACT, v, true);},
            getLockReact: function() {return this[FIELD_LOCK_REACT];},
            
            [generateSetterName(FIELD_PERMISSIONS)]: function(v) {this.set(FIELD_PERMISSIONS, v, true);},
            
            
            // Methods /////////////////////////////////////////////////////////,
            hasPermission: function(permId) {
                const permissions = this[FIELD_PERMISSIONS];
                return permissions ? permissions.includes(permId) : false;
            }
        }),
        
        EXPORT = {
            CommonEntityModelMixin:CommonEntityModelMixin,
            CommonCharacterModelMixin:CommonCharacterModelMixin,
            
            cellOffsetsByDistance:[CIRCLE_0,CIRCLE_1,CIRCLE_2,CIRCLE_3,CIRCLE_4,CIRCLE_5,CIRCLE_6,CIRCLE_7,CIRCLE_8,CIRCLE_9],
            
            permissions:{
                PERM_CREATOR:PERM_CREATOR
            },
            
            account:{
                FIELD_USERNAME:'username', // Also used to store username in the HTTP session.
                FIELD_PASSWORD:'password',
                FIELD_LAST_LOGIN:'lastLogin',
                FIELD_AUTH_FAIL_COUNT:'authFailCount',
                FIELD_AUTHENTICATED:'authenticated',
                FIELD_WEBSOCKET:'websocket',
                FIELD_SOCKET_TOKEN:'socketToken'
            },
            
            entity:{
                FIELD_ID:FIELD_ID,
                FIELD_SPIRIT:FIELD_SPIRIT,
                FIELD_ZOMBIE:FIELD_ZOMBIE,
            },
            
            character:{
                FIELD_USER_ID:FIELD_USER_ID,
                FIELD_NAME:FIELD_NAME,
                FIELD_PERMISSIONS:FIELD_PERMISSIONS,
                FIELD_IN_WORLD:FIELD_IN_WORLD,
                FIELD_LOC:FIELD_LOC,
                FIELD_MOVE_SPEED:FIELD_MOVE_SPEED,
                FIELD_LOCK_MOVE:FIELD_LOCK_MOVE,
                FIELD_LOCK_ACTION:FIELD_LOCK_ACTION,
                FIELD_LOCK_FREE:FIELD_LOCK_FREE,
                FIELD_LOCK_REACT:FIELD_LOCK_REACT
            },
            
            cell:{
                FIELD_COMPOSITION:'c',
                FIELD_ENTITIES:'e',
            },
            
            composition:{
                // Void
                v1:{
                    name:'void',
                    mapColor:'#101',
                    solidity:-1
                },
                v2:{
                    name:'nothingness',
                    mapColor:'#112',
                    solidity:-1
                },
                v3:{
                    name:'ether',
                    mapColor:'#131',
                    solidity:0
                },
                
                // Air
                a1:{
                    name:'empty space',
                    mapColor:'#ccf',
                    solidity:0
                },
                
                // Earth
                s1:{
                    name:'stone',
                    mapColor:'#888',
                    solidity:1
                }
            }
        };
    
    if (IS_NODEJS) {
        module.exports = EXPORT;
    } else {
        global.common = EXPORT;
    }
})();
