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
        {Eventable} = tym,
        
        {Module:JSModule, Class:JSClass} = JS,
        
        compositionsByCompId = {},
        fixtureTemplatesById = {},
        
        PERM_CREATOR = 'creator',
        
        COMPASS_NORTH = 1,
        COMPASS_SOUTH = 2,
        COMPASS_EAST = 3,
        COMPASS_WEST = 4,
        COMPASS_UP = 5,
        COMPASS_DOWN = 6,
        
        locIdToArr = locId => {
            let locArr;
            if (locId) {
                locArr = locId.split(',');
                const len = locArr.length;
                for (let i = 0; i < len; i++) {
                    locArr[i] = parseInt(locArr[i]);
                }
            } else {
                locArr = [];
            }
            return locArr;
        },
        
        CommonMapModelMixin = new JSModule('CommonMapModelMixin', {
            setName: function(v) {this.set('name', v, true);},
            getName: function() {return this.name;},
            setDescription: function(v) {this.set('description', v, true);},
            getDescription: function() {return this.description;},
            setElements: function(v) {this.set('elements', v, true);},
            getElements: function() {return this.elements;}
        }),
        
        CompositionModel = new JSClass('CompositionModel', Eventable, {
            setName: function(v) {this.set('name', v, true);},
            getName: function() {return this.name;},
            
            setMapColor: function(v) {this.set('mapColor', v, true);},
            getMapColor: function() {return this.mapColor;},
            setTileUrl: function(v) {this.set('tileUrl', v, true);},
            getTileUrl: function() {return this.tileUrl;},
            
            setSolidity: function(v) {this.set('solidity', v, true);},
            getSolidity: function() {return this.solidity;},
            setOpacity: function(v) {this.set('opacity', v, true);},
            getOpacity: function() {return this.opacity;},
            setDamping: function(v) {this.set('damping', v, true);},
            getDamping: function() {return this.damping;}
        }),
        
        FixtureTemplate = new JSClass('FixtureTemplate', Eventable, {
            setName: function(v) {this.set('name', v, true);},
            getName: function() {return this.name;},
            
            setStates: function(v) {this.set('states', v, true);},
            getStates: function() {return this.states;},
            
            setUrlsByState: function(v) {this.set('urlsByState', v, true);},
            getUrlsByState: function() {return this.urlsByState;},
            getUrlByStateKey: function(stateKey) {
                return this.urlsByState[stateKey] ?? this.urlsByState.DEFAULT;
            }
        }),
        
        CommonFixtureModelMixin = new JSModule('CommonEntityModelMixin', {
            setId: function(v) {this.set('id', v, true);},
            getId: function() {return this.id;},
            
            setCell: function(v) {this.set('cell', v, true);},
            getCell: function() {return this.cell;},
            
            setTemplate: function(v) {this.set('template', v, true);},
            getTemplate: function() {return this.template;},
            getTemplateObject: () => {return fixtureTemplatesById[this.getTemplate()];},
            
            getStateObject: function() {return this.state ??= {};},
            setStateByAttr: function(attrName, value) {this.getStateObject()[attrName] = value;},
            getStateByAttr: function(attrName) {return this.getStateObject()[attrName];},
            
            getStateKey: function() {
                const parts = [],
                    stateObj = this.getStateObject();
                for (const stateName in stateObj) {
                    parts.push(stateName + '-' + stateObj[stateName]);
                }
                return parts.sort().join('_');
            }
        }),
        
        FixtureContainerMixin = new JSModule('FixtureContainerMixin', {
            setFix: function(fixturesData) {
                if (fixturesData) {
                    for (const fixtureId in fixturesData) {
                        const datum = fixturesData[fixtureId];
                        datum.id = fixtureId;
                        this.addFixture(this.makeFixtureFromDatum(datum));
                    }
                }
            },
            makeFixtureFromDatum: datum => {/* Subclasses must implement. */},
            getFixturesMap: function() {return this.fixtures ??= new Map();},
            addFixture: function(fixture) {
                this.getFixturesMap().set(fixture.getId(), fixture);
            },
            removeFixture: function(fixture) {return this.removeFixtureById(fixture.getId());},
            removeFixtureById: function(fixtureId) {
                const fixtures = this.getFixturesMap(),
                    removedFixture = fixtures.get(fixtureId);
                if (removedFixture) {
                    fixtures.delete(fixtureId);
                    return removedFixture;
                }
            },
            getFixturesAsData: function() {
                let retval = null;
                const fixtures = this.fixtures;
                if (fixtures?.size > 0) {
                    retval = {};
                    for (const [fixtureId, fixture] of fixtures) {
                        retval[fixtureId] = fixture.getAsData();
                    }
                }
                return retval;
            }
        }),
        
        CommonFaceModelMixin = new JSModule('CommonCellModelMixin', {
            include:[FixtureContainerMixin],
            
            setCell: function(v) {this.set('cell', v, true);},
            getCell: function() {return this.cell;},
            
            setC: function(v) {this.set('c', v, true);},
            setComposition: function(v) {this.setC(v);},
            getComposition: function() {return this.c;},
            getCompositionObject: function() {return compositionsByCompId[this.getComposition()];},
        }),
        
        CommonCellModelMixin = new JSModule('CommonCellModelMixin', {
            include:[FixtureContainerMixin],
            
            setLocId: function(v) {
                if (this.locId !== v) {
                    this.locId = v;
                    this.locArr = null;
                }
            },
            getLocArr: function(asCopy) {
                const locArr = this.locArr ??= locIdToArr(this.locId);
                return asCopy ? locArr.slice() : locArr;
            },
            
            setC: function(v) {this.set('c', v, true);},
            setComposition: function(v) {this.setC(v);},
            getComposition: function() {return this.c;},
            getCompositionObject: function() {return compositionsByCompId[this.getComposition()];},
            
            isCompositionVoid: function() {return this.getCompositionObject().getSolidity() === -1;},
            isCompositionAether: function() {
                switch (this.getComposition()) {
                    case 'v3':
                    case 'v4':
                        return true;
                    default:
                        return false;
                }
            },
            
            setN: function(v) {this.set('n', v, true);},
            getNorthFace: function(v) {return this.n;},
            setS: function(v) {this.set('s', v, true);},
            getSouthFace: function(v) {return this.s;},
            setE: function(v) {this.set('e', v, true);},
            getEastFace: function(v) {return this.e;},
            setW: function(v) {this.set('w', v, true);},
            getWestFace: function(v) {return this.w;},
            setT: function(v) {this.set('t', v, true);},
            getTopFace: function(v) {return this.t;},
            setB: function(v) {this.set('b', v, true);},
            getBottomFace: function(v) {return this.b;},
            
            getFaceForDirection: function(compassDirection) {
                switch (compassDirection) {
                    case COMPASS_NORTH: return this.getNorthFace();
                    case COMPASS_SOUTH: return this.getSouthFace();
                    case COMPASS_EAST: return this.getEastFace();
                    case COMPASS_WEST: return this.getWestFace();
                    case COMPASS_UP: return this.getTopFace();
                    case COMPASS_DOWN: return this.getBottomFace();
                }
            },
            
            getFaceForOppositeDirection: function(compassDirection) {
                switch (compassDirection) {
                    case COMPASS_NORTH: return this.getSouthFace();
                    case COMPASS_SOUTH: return this.getNorthFace();
                    case COMPASS_EAST: return this.getWestFace();
                    case COMPASS_WEST: return this.getEastFace();
                    case COMPASS_UP: return this.getBottomFace();
                    case COMPASS_DOWN: return this.getTopFace();
                }
            }
        }),
        
        CommonEntityModelMixin = new JSModule('CommonEntityModelMixin', {
            setId: function(v) {this.set('id', v, true);},
            getId: function() {return this.id;},
            setSpirit: function(v) {this.set('spirit', v, true);},
            isSpirit: function() {return this.spirit;},
            setZombie: function(v) {this.set('zombie', v, true);},
            isZombie: function() {return this.zombie;},
            setAstral: function(v) {this.set('astral', v, true);},
            isAstralProjected: function() {return this.astral;},
            setLoc: function(v) {this.set('loc', v, true);},
            getLocArr: function(asCopy) {
                const locArr = this.loc;
                return asCopy ? locArr.slice() : locArr;
            },
            setFacing: function(v) {this.set('facing', v, true);},
            getFacing: function() {return this.facing;},
        }),
        
        CommonCharacterModelMixin = new JSModule('CommonCharacterModelMixin', {
            setUid: function(v) {this.set('uid', v, true);},
            getUserId: function() {return this.uid;},
            setName: function(v) {this.set('name', v, true);},
            getName: function() {return this.name;},
            isSpirit: function() {
                // Creators are treated like spirits.
                return this.callSuper() || this.hasPermission(PERM_CREATOR);
            },
            setInWorld: function(v) {this.set('inWorld', v, true);},
            isInWorld: function() {return this.inWorld;},
            
            // Action Speeds
            setMoveSpeed: function(v) {this.set('moveSpeed', v, true);},
            getMoveSpeed: function(contextObj) {return this.moveSpeed;},
            getFreeActionSpeed: function(contextObj) {return 1;},
            
            // Lock Times
            setLockMove: function(v) {this.set('lockMove', v, true);},
            getLockMove: function() {return this.lockMove;},
            setLockAct: function(v) {this.set('lockAct', v, true);},
            getLockAction: function() {return this.lockAct;},
            setLockFree: function(v) {this.set('lockFree', v, true);},
            getLockFree: function() {return this.lockFree;},
            setLockReact: function(v) {this.set('lockReact', v, true);},
            getLockReact: function() {return this.lockReact;},
            
            setPerms: function(v) {this.set('perms', v, true);},
            
            getSightDistance: () => 3,
            getHearDistance: () => 9, // Maximum so sound propogation can handle things.
            
            
            // Methods /////////////////////////////////////////////////////////,
            hasPermission: function(permId) {
                const permissions = this.perms;
                return permissions ? permissions.includes(permId) : false;
            }
        }),
        
        EXPORT = {
            // Start: loc
            locIdToArr:locIdToArr,
            locArrToId: locArr => locArr.join(),
            locIdToMapId: locId => locId ? locId.split(',')[0] : null,
            locArrToMapId: locArr => '' + locArr[0],
            isValidLocArr: locArr => {
                if (locArr.length === 4) {
                    for (const entry of locArr) {
                        if (!Number.isInteger(entry)) return false;
                    }
                    return true;
                }
                return false;
            },
            areLocArrEqual: (locArrA, locArrB) => {
                if (locArrA !== locArrB) {
                    if (locArrA == null || locArrB == null) return false;
                    if (locArrA[1] !== locArrB[1]) return false;
                    if (locArrA[2] !== locArrB[2]) return false;
                    if (locArrA[3] !== locArrB[3]) return false;
                    if (locArrA[0] !== locArrB[0]) return false;
                }
                return true;
            },
            // End: loc
            
            getComposition: compId => compositionsByCompId[compId],
            getFixtureTemplate: id => fixtureTemplatesById[id],
            
            CommonMapModelMixin:CommonMapModelMixin,
            CommonFaceModelMixin:CommonFaceModelMixin,
            CommonCellModelMixin:CommonCellModelMixin,
            CommonEntityModelMixin:CommonEntityModelMixin,
            CommonCharacterModelMixin:CommonCharacterModelMixin,
            CommonFixtureModelMixin:CommonFixtureModelMixin,
            
            facings:{
                NORTH:COMPASS_NORTH,
                SOUTH:COMPASS_SOUTH,
                EAST:COMPASS_EAST,
                WEST:COMPASS_WEST,
                UP:COMPASS_UP,
                DOWN:COMPASS_DOWN,
                
                isValidFacing: v => {
                    switch (v) {
                        case COMPASS_NORTH:
                        case COMPASS_SOUTH:
                        case COMPASS_EAST:
                        case COMPASS_WEST:
                        case COMPASS_UP:
                        case COMPASS_DOWN:
                            return true;
                    }
                    return false;
                },
                
                getOppositeDirection: compassDirection => {
                    switch (compassDirection) {
                        case COMPASS_NORTH: return COMPASS_SOUTH;
                        case COMPASS_SOUTH: return COMPASS_NORTH;
                        case COMPASS_EAST: return COMPASS_WEST;
                        case COMPASS_WEST: return COMPASS_EAST;
                        case COMPASS_UP: return COMPASS_DOWN;
                        case COMPASS_DOWN: return COMPASS_UP;
                    }
                }
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
            
            composition:{
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
                
                compositions:{
                    // Unknown
                    unk:{
                        name:'Unknown',
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
                        damping:0.4
                    },
                    v2:{
                        name:'Null',
                        mapColor:'#09f9',
                        tileUrl:'/img/tile/null.png',
                        solidity:-1,
                        opacity:0.5,
                        damping:0.4
                    },
                    v3:{
                        name:'Æthoid',
                        mapColor:'#9ff9',
                        tileUrl:'/img/tile/aethoid.png',
                        solidity:0,
                        opacity:0.25,
                        damping:0.45
                    },
                    v4:{
                        name:'Æthrull',
                        mapColor:'#09f9',
                        tileUrl:'/img/tile/aethrull.png',
                        solidity:0,
                        opacity:0.25,
                        damping:0.45
                    },
                    
                    // Earth
                    s1:{
                        name:'Solid Stone',
                        mapColor:'#0003',
                        tileUrl:'/img/tile/stone_solid.png',
                        solidity:1,
                        opacity:1,
                        damping:0
                    },
                    
                    // Air
                    a1:{
                        name:'Open Air',
                        solidity:0,
                        opacity:0.01,
                        damping:0.5
                    },
                    a2:{
                        name:'Dusty Air',
                        mapColor:'#fea2',
                        solidity:0,
                        opacity:0.05,
                        damping:0.49
                    },
                    
                    // Fire
                    f1:{
                        name:'Fire',
                        mapColor:'#f66',
                        tileUrl:'/img/tile/fire.png',
                        solidity:0,
                        opacity:0.5,
                        damping:0.45
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
                    
                    // Faces
                    W1:{
                        name:'Smooth Stone Wall',
                        tileUrl:'/img/tile/stone_wall.png',
                        solidity:1,
                        opacity:1,
                        damping:0.13
                    },
                    W2:{
                        name:'Rough Stone Wall',
                        tileUrl:'/img/tile/rough_stone_wall.png',
                        solidity:1,
                        opacity:1,
                        damping:0.13
                    },
                    W3:{
                        name:'Smooth Stone Wall with Door Frame',
                        tileUrl:'/img/tile/stone_wall_door_frame.png',
                        solidity:0.5,
                        opacity:0.25,
                        damping:0.13
                    },
                    
                    C1:{
                        name:'Vaulted Stone Ceiling',
                        solidity:1,
                        opacity:1,
                        damping:0.13
                    },
                    
                    F1:{
                        name:'Stone Floor',
                        tileUrl:'/img/tile/stone_floor.png',
                        solidity:1,
                        opacity:1,
                        damping:0.13
                    },
                    F2:{
                        name:'Dirt Floor',
                        tileUrl:'/img/tile/dirt_floor.png',
                        solidity:1,
                        opacity:1,
                        damping:0.13
                    }
                }
            },
            
            fixture:{
                templates:{
                    d1:{
                        name:'Wooden Door',
                        states:{
                            open:'boolean'
                        },
                        urlsByState:{
                            "open-true":"/img/fixture/wooden_door_open.png",
                            "open-false":"/img/fixture/wooden_door_closed.png"
                        }
                    },
                    d2:{
                        name:'Lockable Wooden Door',
                        states:{
                            open:'boolean',
                            locked:'boolean'
                        },
                        urlsByState:{
                            "locked-true_open-true":"/img/fixture/wooden_door_open.png",
                            "locked-true_open-false":"/img/fixture/wooden_door_closed.png",
                            "locked-false_open-true":"/img/fixture/wooden_door_open.png",
                            "locked-false_open-false":"/img/fixture/wooden_door_closed.png"
                        }
                    },
                    s1:{
                        name:'Stone Statue',
                        states:{
                            facing:'number'
                        },
                        urlsByState:{
                            "DEFAULT":"/img/fixture/statue.png"
                        }
                    }
                }
            }
        };
    
    const compositions = EXPORT.composition.compositions;
    for (const compId in compositions) {
        compositionsByCompId[compId] = new CompositionModel(compositions[compId]);
    }
    
    const fixtureTemplates = EXPORT.fixture.templates;
    for (const id in fixtureTemplates) {
        fixtureTemplatesById[id] = new FixtureTemplate(fixtureTemplates[id]);
    }
    
    if (IS_NODEJS) {
        module.exports = EXPORT;
    } else {
        global.common = EXPORT;
    }
})();
