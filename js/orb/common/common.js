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
        FIELD_ASTRAL_PROJECTED = 'astral',
        
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
        
        /*
        [0,9] = d, d, d, d, d, d, d, d, d
        [0,8] = d, d, d, d, d, d, d, d
        [0,7] = d, d, d, d, d, d, d
        [0,6] = d, d, d, d, d, d
        [0,5] = d, d, d, d, d
        [0,4] = d, d, d, d
        [0,3] = d, d, d
        [0,2] = d, d
        [0,1] = d
        
        [1,9] = d, d, d, d, z, d, d, d, d
        [1,8] = d, d, d, z, d, d, d, d
        [1,7] = d, d, do,d, d, d, d
        [1,6] = d, d, z, d, d, d
        [1,5] = d, z, d, d, d
        [1,4] = d, z, d, d
        [1,3] = d, z, d
        [1,2] = d, z
        [1,1] = z
        
        [2,9] = d, z, d, d, d, z, d, d, d
        [2,8] = d, z, d, d, d, z, d, d
        [2,7] = d, z, d, d, z, d, d
        [2,6] = d, z, d, d, z, d
        [2,5] = do,d, d, z, d
        [2,4] = do,d, do,d
        [2,3] = z, z, d
        [2,2] = z, z
        
        [3,8] = d, z, d, z, d, d, z, d
        [3,7] = do,d, do,d, d, z, d
        [3,6] = do,d, do,d, do,d
        [3,5] = z, do,d, do,d
        [3,4] = z, do,do,d
        [3,3] = z, z, z
        
        [4,8] = do,d, do,d, do,d, do,d
        [4,7] = do,d, z ,do,d, do,d
        [4,6] = z, do,d, z, do,d
        [4,5] = z, z, d, z, z
        [4,4] = z, z, z, z,
        
        [5,8] = z ,do,d ,do,d, z, d, z
        [5,7] = z ,do,d ,z, do,d ,z
        [5,6] = z, do,do,do,d ,z
        [5,5] = z, z, z, z, z
        
        [6,7] = z ,z ,do,do,do,d ,z
        [6,6] = z, z ,z ,z ,z ,z
        */
        
        
        /* all zags must be the same order within a path
            should walk from origin out to loc. */
        VISIBILITY_PATHS = [
            [,
                ['up'],
                ['up', 'up'],
                ['up', 'up', 'up'],
                ['up', 'up', 'up', 'up'],
                ['up', 'up', 'up', 'up', 'up'],
                ['up', 'up', 'up', 'up', 'up', 'up'],
                ['up', 'up', 'up', 'up', 'up', 'up', 'up'],
                ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
                ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up']
            ],[,
                ['zz'],
                ['up', 'zz'],
                ['up', 'zz', 'up'],
                ['up', 'zz', 'up', 'up'],
                ['up', 'up', 'up', 'zz', 'up'],
                ['up', 'up', 'up', 'zz', 'up', 'up'],
                ['up', 'up', 'up', 'up', 'uo', 'up', 'up'],
                ['up', 'up', 'up', 'up', 'zz', 'up', 'up', 'up'],
                ['up', 'up', 'up', 'up', 'zz', 'up', 'up', 'up', 'up'],
            ],[,,
                ['zz', 'zz'],
                ['zz', 'up', 'zz'],
                ['up', 'zz', 'up', 'zz'],
                ['up', 'zz', 'up', 'zz', 'up'],
                ['up', 'zz', 'up', 'up', 'zz', 'up'],
                ['up', 'up', 'zz', 'up', 'up', 'zz', 'up'],
                ['up', 'up', 'zz', 'up', 'up', 'up', 'zz', 'up'],
                ['up', 'up', 'up', 'zz', 'up', 'up', 'up', 'zz', 'up'],
            ],[,,,
                ['zz', 'zz', 'zz'],
                ['zz', 'up', 'zz', 'zz'],
                ['up', 'uo', 'up', 'uo', 'zz'],
                ['up', 'uo', 'up', 'uo', 'up', 'uo'],
                ['up', 'up', 'up', 'up', 'uo', 'up', 'uo'],
                ['up', 'zz', 'up', 'up', 'zz', 'up', 'zz', 'up'],
            ],[,,,,
                ['zz', 'zz', 'zz', 'zz'],
                ['zz', 'zz', 'up', 'zz', 'zz'],
                ['up', 'uo', 'zz', 'up', 'uo', 'zz'],
                ['uo', 'up', 'up' ,'uo', 'zz', 'uo', 'up'],
                ['up', 'uo', 'up', 'uo', 'up', 'uo', 'up', 'uo'],
            ],[,,,,,
                ['zz', 'zz', 'zz', 'zz', 'zz'],
                ['zz', 'up', 'uo', 'uo', 'uo' ,'zz'],
                ['zz' ,'up', 'uo' ,'zz', 'up', 'uo' ,'zz'],
                ['zz' ,'up', 'zz' ,'up', 'uo', 'up', 'uo', 'zz'],
            ],[,,,,,,
                ['zz', 'zz' ,'zz' ,'zz' ,'zz' ,'zz'],
                ['zz' ,'up' ,'uo', 'uo', 'uo', 'zz' ,'zz'],
            ]
        ],
        
        RING_0 = [[0,0]],
        RING_1 = (() => {
            let x = -1, y = 0;
            return [[++x,++y],[++x,--y],[--x,--y],[--x,++y]];
        })(),
        RING_2 = (() => {
            let x = -1, y = 2;
            return [
                [++x,y],[++x,y],[x,--y],[++x,y],
                [x,--y],[x,--y],[--x,y],[x,--y],
                [--x,y],[--x,y],[x,++y],[--x,y],
                [x,++y],[x,++y],[++x,y],[x,++y]
            ];
        })(),
        RING_3 = (() => {
            let x = -1, y = 3;
            return [
                [++x,y],[++x,y],[++x,--y],[++x,--y],
                [x,--y],[x,--y],[--x,--y],[--x,--y],
                [--x,y],[--x,y],[--x,++y],[--x,++y],
                [x,++y],[x,++y],[++x,++y],[++x,++y]
            ];
        })(),
        RING_4 = (() => {
            let x = -1, y = 4;
            return [
                [++x,y],[++x,y],[++x,--y],[++x,y],[x,--y],[++x,--y],
                [x,--y],[x,--y],[--x,--y],[x,--y],[--x,y],[--x,--y],
                [--x,y],[--x,y],[--x,++y],[--x,y],[x,++y],[--x,++y],
                [x,++y],[x,++y],[++x,++y],[x,++y],[++x,y],[++x,++y]
            ];
        })(),
        RING_5 = (() => {
            let x = -1, y = 5;
            return [
                [++x,y],[++x,y],[++x,y],[x,--y],[++x,y],[++x,--y],[x,--y],[++x,y],[x,--y],
                [x,--y],[x,--y],[x,--y],[--x,y],[x,--y],[--x,--y],[--x,y],[x,--y],[--x,y],
                [--x,y],[--x,y],[--x,y],[x,++y],[--x,y],[--x,++y],[x,++y],[--x,y],[x,++y],
                [x,++y],[x,++y],[x,++y],[++x,y],[x,++y],[++x,++y],[++x,y],[x,++y],[++x,y]
            ];
        })(),
        RING_6 = (() => {
            let x = -1, y = 6;
            return [
                [++x,y],[++x,y],[++x,y],[++x,--y],[++x,y],[x,--y],[++x,y],[x,--y],[++x,--y],[x,--y],
                [x,--y],[x,--y],[x,--y],[--x,--y],[x,--y],[--x,y],[x,--y],[--x,y],[--x,--y],[--x,y],
                [--x,y],[--x,y],[--x,y],[--x,++y],[--x,y],[x,++y],[--x,y],[x,++y],[--x,++y],[x,++y],
                [x,++y],[x,++y],[x,++y],[++x,++y],[x,++y],[++x,y],[x,++y],[++x,y],[++x,++y],[++x,y]
            ];
        })(),
        RING_7 = (() => {
            let x = -1, y = 7;
            return [
                [++x,y],[++x,y],[++x,y],[++x,--y],[++x,y],[++x,--y],[x,--y],[++x,y],[x,--y],[++x,--y],[x,--y],
                [x,--y],[x,--y],[x,--y],[--x,--y],[x,--y],[--x,--y],[--x,y],[x,--y],[--x,y],[--x,--y],[--x,y],
                [--x,y],[--x,y],[--x,y],[--x,++y],[--x,y],[--x,++y],[x,++y],[--x,y],[x,++y],[--x,++y],[x,++y],
                [x,++y],[x,++y],[x,++y],[++x,++y],[x,++y],[++x,++y],[++x,y],[x,++y],[++x,y],[++x,++y],[++x,y]
            ];
        })(),
        RING_8 = (() => {
            let x = -1, y = 8;
            return [
                [++x,y],[++x,y],[++x,y],[++x,--y],[++x,y],[++x,--y],[++x,--y],[x,--y],[++x,y],[x,--y],[++x,--y],[x,--y],
                [x,--y],[x,--y],[x,--y],[--x,--y],[x,--y],[--x,--y],[--x,--y],[--x,y],[x,--y],[--x,y],[--x,--y],[--x,y],
                [--x,y],[--x,y],[--x,y],[--x,++y],[--x,y],[--x,++y],[--x,++y],[x,++y],[--x,y],[x,++y],[--x,++y],[x,++y],
                [x,++y],[x,++y],[x,++y],[++x,++y],[x,++y],[++x,++y],[++x,++y],[++x,y],[x,++y],[++x,y],[++x,++y],[++x,y]
            ];
        })(),
        RING_9 = (() => {
            let x = -1, y = 9;
            return [
                //   r       r       r        dr       r       r       d       r       d       r       d       r       d       d        rd       d
                [++x,y],[++x,y],[++x,y],[++x,--y],[++x,y],[++x,y],[x,--y],[++x,y],[x,--y],[++x,y],[x,--y],[++x,y],[x,--y],[x,--y],[++x,--y],[x,--y],
                [x,--y],[x,--y],[x,--y],[--x,--y],[x,--y],[x,--y],[--x,y],[x,--y],[--x,y],[x,--y],[--x,y],[x,--y],[--x,y],[--x,y],[--x,--y],[--x,y],
                [--x,y],[--x,y],[--x,y],[--x,++y],[--x,y],[--x,y],[x,++y],[--x,y],[x,++y],[--x,y],[x,++y],[--x,y],[x,++y],[x,++y],[--x,++y],[x,++y],
                [x,++y],[x,++y],[x,++y],[++x,++y],[x,++y],[x,++y],[++x,y],[x,++y],[++x,y],[x,++y],[++x,y],[x,++y],[++x,y],[++x,y],[++x,++y],[++x,y]
            ];
        })(),
        
        CIRCLE_0 = RING_0,
        CIRCLE_1 = [...CIRCLE_0, ...RING_1],
        CIRCLE_2 = [...CIRCLE_1, ...RING_2],
        CIRCLE_3 = [...CIRCLE_2, ...RING_3],
        CIRCLE_4 = [...CIRCLE_3, ...RING_4],
        CIRCLE_5 = [...CIRCLE_4, ...RING_5],
        CIRCLE_6 = [...CIRCLE_5, ...RING_6],
        CIRCLE_7 = [...CIRCLE_6, ...RING_7],
        CIRCLE_8 = [...CIRCLE_7, ...RING_8],
        CIRCLE_9 = [...CIRCLE_8, ...RING_9],
        
        CommonEntityModelMixin = new JS.Module('CommonEntityModelMixin', {
            // Accessors ///////////////////////////////////////////////////////
            [generateSetterName(FIELD_ID)]: function(v) {this.set(FIELD_ID, v, true);},
            getId: function() {return this[FIELD_ID];},
            [generateSetterName(FIELD_SPIRIT)]: function(v) {this.set(FIELD_SPIRIT, v, true);},
            isSpirit: function() {return this[FIELD_SPIRIT];},
            [generateSetterName(FIELD_ZOMBIE)]: function(v) {this.set(FIELD_ZOMBIE, v, true);},
            isZombie: function() {return this[FIELD_ZOMBIE];},
            [generateSetterName(FIELD_ASTRAL_PROJECTED)]: function(v) {this.set(FIELD_ASTRAL_PROJECTED, v, true);},
            isAstralProjected: function() {return this[FIELD_ASTRAL_PROJECTED];},
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
            
            getObserveDistance: () => 3,
            
            
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
            visibilityPaths:VISIBILITY_PATHS,
            
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
                FIELD_ASTRAL_PROJECTED:FIELD_ASTRAL_PROJECTED
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
                // Unknown
                unk:{
                    name:'Unknown',
                    mapColor:'transparent',
                    solidity:0,
                    opacity:1
                },
                
                // Void
                v1:{
                    name:'Void',
                    mapColor:'#0ff9',
                    tileUrl:'/img/tile/void.png',
                    solidity:-1,
                    opacity:0.5
                },
                v2:{
                    name:'Null',
                    mapColor:'#09f9',
                    tileUrl:'/img/tile/null.png',
                    solidity:-1,
                    opacity:0.5
                },
                v3:{
                    name:'Æthoid',
                    mapColor:'#9ff9',
                    tileUrl:'/img/tile/aethoid.png',
                    solidity:0,
                    opacity:0.25
                },
                v4:{
                    name:'Æthrull',
                    mapColor:'#09f9',
                    tileUrl:'/img/tile/aethrull.png',
                    solidity:0,
                    opacity:0.25
                },
                
                // Air
                a1:{
                    name:'Stone Floor',
                    mapColor:'transparent',//'#ccf',
                    tileUrl:'/img/tile/stone_floor.png',
                    solidity:0,
                    opacity:0.01
                },
                
                // Earth
                s1:{
                    name:'Solid Stone',
                    mapColor:'#0003',//'#888',
                    tileUrl:'/img/tile/stone_solid.png',
                    solidity:1,
                    opacity:1
                }
            }
        };
    
    if (IS_NODEJS) {
        module.exports = EXPORT;
    } else {
        global.common = EXPORT;
    }
})();
