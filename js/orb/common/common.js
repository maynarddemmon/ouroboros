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
        
        JSModule = JS.Module,
        
        PERM_CREATOR = 'creator',
        
        // Common Fields
        FIELD_ID ='id',
        FIELD_NAME = 'name',
        FIELD_DESCRIPTION = 'description',
        
        // Map Fields
        FIELD_ELEMENTS = 'elements',
        
        // Cell Fields
        FIELD_COMPOSITION = 'c',
        FIELD_ENTITIES = 'e',
        
        // Entity Fields
        FIELD_SPIRIT = 'spirit',
        FIELD_ZOMBIE = 'zombie',
        FIELD_ASTRAL_PROJECTED = 'astral',
        FIELD_LOC = 'loc',
        FIELD_FACING = 'facing',
        
        // Character Fields
        FIELD_USER_ID = 'uid',
        FIELD_PERMISSIONS = 'perms',
        FIELD_IN_WORLD = 'inWorld',
        FIELD_MOVE_SPEED = 'moveSpeed',
        FIELD_LOCK_MOVE = 'lockMove',
        FIELD_LOCK_ACTION = 'lockAct',
        FIELD_LOCK_FREE = 'lockFree',
        FIELD_LOCK_REACT = 'lockReact',
        
        COMPASS_NORTH = 1,
        COMPASS_SOUTH = 2,
        COMPASS_EAST = 3,
        COMPASS_WEST = 4,
        
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
        
        CommonMapModelMixin = new JSModule('CommonMapModelMixin', {
            [generateSetterName(FIELD_NAME)]: function(v) {this.set(FIELD_NAME, v, true);},
            getName: function() {return this[FIELD_NAME];},
            [generateSetterName(FIELD_DESCRIPTION)]: function(v) {this.set(FIELD_DESCRIPTION, v, true);},
            getDescription: function() {return this[FIELD_DESCRIPTION];},
            [generateSetterName(FIELD_ELEMENTS)]: function(v) {this.set(FIELD_ELEMENTS, v, true);},
            getElements: function() {return this[FIELD_ELEMENTS];}
        }),
        
        CommonCellModelMixin = new JSModule('CommonCellModelMixin', {
            // Accessors ///////////////////////////////////////////////////////////
            [generateSetterName(FIELD_COMPOSITION)]: function(v) {this.set(FIELD_COMPOSITION, v, true);},
            setComposition: function(v) {this.set(FIELD_COMPOSITION, v);},
            getComposition: function() {return this[FIELD_COMPOSITION];},
            
            isCompositionVoid: function() {return this.getCompositionObject().solidity === -1;},
            isCompositionAether: function() {
                switch (this.getComposition()) {
                    case 'v3':
                    case 'v4':
                        return true;
                    default:
                        return false;
                }
            }
        }),
        
        CommonEntityModelMixin = new JSModule('CommonEntityModelMixin', {
            // Accessors ///////////////////////////////////////////////////////
            [generateSetterName(FIELD_ID)]: function(v) {this.set(FIELD_ID, v, true);},
            getId: function() {return this[FIELD_ID];},
            [generateSetterName(FIELD_SPIRIT)]: function(v) {this.set(FIELD_SPIRIT, v, true);},
            isSpirit: function() {return this[FIELD_SPIRIT];},
            [generateSetterName(FIELD_ZOMBIE)]: function(v) {this.set(FIELD_ZOMBIE, v, true);},
            isZombie: function() {return this[FIELD_ZOMBIE];},
            [generateSetterName(FIELD_ASTRAL_PROJECTED)]: function(v) {this.set(FIELD_ASTRAL_PROJECTED, v, true);},
            isAstralProjected: function() {return this[FIELD_ASTRAL_PROJECTED];},
            [generateSetterName(FIELD_LOC)]: function(v) {this.set(FIELD_LOC, v, true);},
            getLocArr: function(asCopy) {
                const locArr = this[FIELD_LOC];
                return asCopy ? locArr.slice() : locArr;
            },
            [generateSetterName(FIELD_FACING)]: function(v) {this.set(FIELD_FACING, v, true);},
            getFacing: function() {return this[FIELD_FACING];},
        }),
        
        CommonCharacterModelMixin = new JSModule('CommonCharacterModelMixin', {
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
            
            // Action Speeds
            [generateSetterName(FIELD_MOVE_SPEED)]: function(v) {this.set(FIELD_MOVE_SPEED, v, true);},
            getMoveSpeed: function(contextObj) {return this[FIELD_MOVE_SPEED];},
            getFreeActionSpeed: function(contextObj) {return 1;},
            
            // Lock Times
            [generateSetterName(FIELD_LOCK_MOVE)]: function(v) {this.set(FIELD_LOCK_MOVE, v, true);},
            getLockMove: function() {return this[FIELD_LOCK_MOVE];},
            [generateSetterName(FIELD_LOCK_ACTION)]: function(v) {this.set(FIELD_LOCK_ACTION, v, true);},
            getLockAction: function() {return this[FIELD_LOCK_ACTION];},
            [generateSetterName(FIELD_LOCK_FREE)]: function(v) {this.set(FIELD_LOCK_FREE, v, true);},
            getLockFree: function() {return this[FIELD_LOCK_FREE];},
            [generateSetterName(FIELD_LOCK_REACT)]: function(v) {this.set(FIELD_LOCK_REACT, v, true);},
            getLockReact: function() {return this[FIELD_LOCK_REACT];},
            
            [generateSetterName(FIELD_PERMISSIONS)]: function(v) {this.set(FIELD_PERMISSIONS, v, true);},
            
            getSightDistance: () => 3,
            getHearDistance: () => 9, // Maximum so sound propogation can handle things.
            
            
            // Methods /////////////////////////////////////////////////////////,
            hasPermission: function(permId) {
                const permissions = this[FIELD_PERMISSIONS];
                return permissions ? permissions.includes(permId) : false;
            }
        }),
        
        EXPORT = {
            CommonMapModelMixin:CommonMapModelMixin,
            CommonCellModelMixin:CommonCellModelMixin,
            CommonEntityModelMixin:CommonEntityModelMixin,
            CommonCharacterModelMixin:CommonCharacterModelMixin,
            
            cellOffsetsByDistance:[CIRCLE_0,CIRCLE_1,CIRCLE_2,CIRCLE_3,CIRCLE_4,CIRCLE_5,CIRCLE_6,CIRCLE_7,CIRCLE_8,CIRCLE_9],
            visibilityPaths:VISIBILITY_PATHS,
            
            FACINGS:{
                NORTH:COMPASS_NORTH,
                SOUTH:COMPASS_SOUTH,
                EAST:COMPASS_EAST,
                WEST:COMPASS_WEST
            },
            
            isValidFacing: v => {
                switch (v) {
                    case COMPASS_NORTH:
                    case COMPASS_SOUTH:
                    case COMPASS_EAST:
                    case COMPASS_WEST:
                        return true;
                }
                return false;
            },
            
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
                FIELD_ASTRAL_PROJECTED:FIELD_ASTRAL_PROJECTED,
                FIELD_LOC:FIELD_LOC,
                FIELD_FACING:FIELD_FACING
            },
            
            character:{
                FIELD_USER_ID:FIELD_USER_ID,
                FIELD_NAME:FIELD_NAME,
                FIELD_PERMISSIONS:FIELD_PERMISSIONS,
                FIELD_IN_WORLD:FIELD_IN_WORLD,
                FIELD_MOVE_SPEED:FIELD_MOVE_SPEED,
                FIELD_LOCK_MOVE:FIELD_LOCK_MOVE,
                FIELD_LOCK_ACTION:FIELD_LOCK_ACTION,
                FIELD_LOCK_FREE:FIELD_LOCK_FREE,
                FIELD_LOCK_REACT:FIELD_LOCK_REACT
            },
            
            map:{
                FIELD_NAME:FIELD_NAME,
                FIELD_DESCRIPTION:FIELD_DESCRIPTION,
                FIELD_ELEMENTS:FIELD_ELEMENTS
            },
            
            cell:{
                FIELD_COMPOSITION:FIELD_COMPOSITION,
                FIELD_ENTITIES:FIELD_ENTITIES,
            },
            
            // Matter, Energy, Light lookup table for missing Cells
            // FIXME: there are not enough composition types to fill this out correctly
            MEL_LOOKUP: [
                [ // Earth
                    [ // Fire
                        ['s1'],['f1'],['v1'] // Light, Shadow, Void
                    ],[ // Water
                        ['s1'],['w1'],['v2'] // Light, Shadow, Void
                    ],[ // Void
                        ['s1'],['s1'],['v1'] // Light, Shadow, Void
                    ]
                ],[ // Air
                    [ // Fire
                        ['a1'],['f1'],['v1'] // Light, Shadow, Void
                    ],[ // Water
                        ['a2'],['w1'],['v2'] // Light, Shadow, Void
                    ],[ // Void
                        ['a1'],['a2'],['v1'] // Light, Shadow, Void
                    ]
                ],[ // Void
                    [ // Fire
                        ['v1'],['f1'],['v1'] // Light, Shadow, Void
                    ],[ // Water
                        ['v2'],['w1'],['v2'] // Light, Shadow, Void
                    ],[ // Void
                        ['v1'],['v2'],['v1'] // Light, Shadow, Void
                    ]
                ],
            ],
            
            composition:{
                // Unknown
                unk:{
                    name:'Unknown',
                    mapColor:'transparent',
                    solidity:0,
                    opacity:1,
                    damping:0
                },
                
                // Void
                v1:{
                    name:'Void',
                    mapColor:'#0ff9',
                    tileUrl:'/img/tile/void.png',
                    solidity:-1,
                    opacity:0.5,
                    damping:0.75
                },
                v2:{
                    name:'Null',
                    mapColor:'#09f9',
                    tileUrl:'/img/tile/null.png',
                    solidity:-1,
                    opacity:0.5,
                    damping:0.75
                },
                v3:{
                    name:'Æthoid',
                    mapColor:'#9ff9',
                    tileUrl:'/img/tile/aethoid.png',
                    solidity:0,
                    opacity:0.25,
                    damping:0.85
                },
                v4:{
                    name:'Æthrull',
                    mapColor:'#09f9',
                    tileUrl:'/img/tile/aethrull.png',
                    solidity:0,
                    opacity:0.25,
                    damping:0.85
                },
                
                // Earth
                s1:{
                    name:'Solid Stone',
                    mapColor:'#0003',
                    tileUrl:'/img/tile/stone_solid.png',
                    solidity:1,
                    opacity:1,
                    damping:0.05
                },
                
                // Air
                a1:{
                    name:'Stone Floor',
                    mapColor:'transparent',
                    tileUrl:'/img/tile/stone_floor.png',
                    solidity:0,
                    opacity:0.01,
                    damping:1
                },
                a2:{
                    name:'Dirt Floor',
                    mapColor:'transparent',
                    tileUrl:'/img/tile/dirt_floor.png',
                    solidity:0,
                    opacity:0.01,
                    damping:1
                },
                
                // Fire
                f1:{
                    name:'Fire',
                    mapColor:'#f66',
                    tileUrl:'/img/tile/fire.png',
                    solidity:0,
                    opacity:0.5,
                    damping:0.9
                },
                
                // Water
                w1:{
                    name:'Solid Ice',
                    mapColor:'#ccf',
                    tileUrl:'/img/tile/ice_solid.png',
                    solidity:1,
                    opacity:0.5,
                    damping:0.25
                },
            }
        };
    
    if (IS_NODEJS) {
        module.exports = EXPORT;
    } else {
        global.common = EXPORT;
    }
})();
