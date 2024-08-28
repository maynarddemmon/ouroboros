(() => {
    const IS_NODEJS = typeof module === 'object' && module.exports;
    
    let tym, JS, composition, fixture;
    if (IS_NODEJS) {
        const imported = require('../../../lib/tym.js');
        JS = imported.JS;
        tym = imported.tym;
        composition = require('./composition.js');
        fixture = require('./fixture.js');
    } else {
        JS = global.JS;
        tym = global.myt;
        composition = global.composition;
        fixture = global.fixture;
    }
    
    const
        {Eventable} = tym,
        {Module:JSModule, Class:JSClass} = JS,
        
        compositionTemplatesById = {},
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
        
        CompositionTemplate = new JSClass('CompositionTemplate', Eventable, {
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
            init: function(attrs) {
                if (attrs.affectValue) {
                    this.affectValue = attrs.affectValue.bind(this);
                    delete attrs.affectValue;
                }
                
                this.callSuper(attrs);
            },
            
            setName: function(v) {this.set('name', v, true);},
            getName: function() {return this.name;},
            
            setStates: function(v) {this.set('states', v, true);},
            getStates: function() {return this.states;},
            
            setEffects: function(v) {this.set('effects', v, true);},
            getEffects: function() {return this.effects;},
            
            setUrlsByState: function(v) {this.set('urlsByState', v, true);},
            getUrlsByState: function() {return this.urlsByState;},
            getUrlByStateKey: function(stateKey) {
                return this.urlsByState[stateKey] ?? this.urlsByState.DEFAULT;
            },
            
            affectValue: (fixture, attrName, value) => value
        }),
        
        CommonMapModel = new JSClass('CommonMapModel', Eventable, {
            setName: function(v) {this.set('name', v, true);},
            getName: function() {return this.name;},
            setDescription: function(v) {this.set('description', v, true);},
            getDescription: function() {return this.description;},
            setElements: function(v) {this.set('elements', v, true);},
            getElements: function() {return this.elements;}
        }),
        
        ValueAffectorMixin = new JSModule('ValueAffectorMixin', {
            affectValue: (attrName, value) => value,
            
            registerEffects: function(affectable) {
                const effects = this.getTemplateObject()?.getEffects();
                if (effects?.length > 0) {
                    for (const effectedAttrName of effects) {
                        affectable.registerValueAffector(effectedAttrName, this);
                    }
                }
            },
            
            unregisterEffects: function(affectable) {
                const effects = this.getTemplateObject()?.getEffects();
                if (effects?.length > 0) {
                    for (const effectedAttrName of effects) {
                        affectable.unregisterValueAffector(effectedAttrName, this);
                    }
                }
            }
        }),
        
        AffectableValuesMixin = new JSModule('AffectableValuesMixin', {
            registerValueAffector: function(attrName, affector) {
                const affectorsByAttrName = this._affectorsByAttrName ??= {},
                    affectors = affectorsByAttrName[attrName] ??= new Set();
                affectors.add(affector);
            },
            
            unregisterValueAffector: function(attrName, effector) {
                const affectorsByAttrName = this._affectorsByAttrName ??= {},
                    affectors = affectorsByAttrName[attrName] ??= [];
                affectors.delete(affector);
            },
            
            getAffectedValue: function(attrName) {
                let value = this.get(attrName);
                const affectorsByAttrName = this._affectorsByAttrName;
                if (affectorsByAttrName) {
                    const affectors = affectorsByAttrName[attrName];
                    if (affectors?.size > 0) {
                        for (const affector of affectors) {
                            value = affector.affectValue(attrName, value);
                        }
                    }
                }
                return value;
            }
        }),
        
        CommonFixtureModel = new JSClass('CommonFixtureModel', Eventable, {
            include:[ValueAffectorMixin],
            
            /** Fixtures will have either a face or a cell but not both. The cell for a face
                can be accessed via the face. */
            init: function(attrs) {
                const face = attrs.face,
                    cell = attrs.cell;
                if (face) {
                    this.setFace(face);
                } else if (cell) {
                    this.setCell(cell);
                }
                delete attrs.face;
                delete attrs.cell;
                
                this.callSuper(attrs);
                
                if (this.face) {
                    this.registerEffects(this.face);
                } else if (this.cell) {
                    this.registerEffects(this.cell);
                }
            },
            
            destroy: function() {
                if (this.face) {
                    this.unregisterEffects(this.face);
                } else if (this.cell) {
                    this.unregisterEffects(this.cell);
                }
                this.callSuper();
            },
            
            affectValue: function(attrName, value) {
                const template = this.getTemplateObject();
                return template ? template.affectValue(this, attrName, value) : this.callSuper(value);
            },
            
            setId: function(v) {this.set('id', v, true);},
            getId: function() {return this.id;},
            
            setFace: function(v) {
                if (this.inited && this.face) this.unregisterEffects(this.face);
                this.set('face', v, true);
                if (this.inited) this.registerEffects(this.face);
            },
            getFace: function() {return this.face;},
            
            setCell: function(v) {
                if (this.inited && this.cell) this.unregisterEffects(this.cell);
                this.set('cell', v, true);
                if (this.inited) this.registerEffects(this.cell);
            },
            getCell: function() {return this.cell;},
            
            setTemplate: function(v) {this.set('template', v, true);},
            getTemplate: function() {return this.template;},
            getTemplateObject: function() {return fixtureTemplatesById[this.getTemplate()];},
            
            getStateObject: function() {return this.state ??= {};},
            setStateByName: function(stateName, value) {this.getStateObject()[stateName] = value;},
            getStateByName: function(stateName) {return this.getStateObject()[stateName];},
            
            getStateKey: function() {
                const parts = [],
                    stateObj = this.getStateObject();
                for (const stateName in stateObj) {
                    parts.push(stateName + '-' + stateObj[stateName]);
                }
                return parts.sort().join('_');
            },
            
            describeForCharacter: function(character) {
                return this.getTemplateObject().describe(this, character);
            }
        }),
        
        FixtureContainerMixin = new JSModule('FixtureContainerMixin', {
            include: [AffectableValuesMixin],
            
            setFix: function(fixturesData) {
                if (fixturesData) {
                    for (const fixtureId in fixturesData) {
                        this.addFixture(this.makeFixtureFromDatum(this.prepareFixtureDatum(fixturesData[fixtureId], fixtureId)));
                    }
                }
            },
            prepareFixtureDatum: (datum, fixtureId) => {
                datum.id = fixtureId;
                return datum;
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
            },
            
            getFixtureInteractions: function(character) {
                let retval;
                const fixtures = this.fixtures;
                if (fixtures?.size > 0) {
                    for (const [fixtureId, fixture] of fixtures) {
                        retval ??= {};
                        retval[fixtureId] = fixture.getTemplateObject().getInteractions?.(fixture, character);
                    }
                }
                return retval;
            }
        }),
        
        CompositionTemplateProxyMixin = new JSModule('CompositionTemplateProxyMixin', {
            setC: function(v) {this.set('c', v, true);},
            setComposition: function(v) {this.setC(v);},
            getComposition: function() {return this.c;},
            getCompositionObject: function() {return compositionTemplatesById[this.getComposition()];},
            
            getSolidity: function() {return this.getCompositionObject()?.getSolidity();},
            getOpacity: function() {return this.getCompositionObject()?.getOpacity();},
            getDamping: function() {return this.getCompositionObject()?.getDamping();}
        }),
        
        CommonFaceModel = new JSClass('CommonFaceModel', Eventable, {
            include:[FixtureContainerMixin, CompositionTemplateProxyMixin],
            
            prepareFixtureDatum: function(datum, fixtureId) {
                datum.face = this;
                return this.callSuper(datum, fixtureId);
            },
            
            setCell: function(v) {this.set('cell', v, true);},
            getCell: function() {return this.cell;},
        }),
        
        CommonCellModel = new JSClass('CommonCellModel', Eventable, {
            include:[FixtureContainerMixin, CompositionTemplateProxyMixin],
            
            prepareFixtureDatum: function(datum, fixtureId) {
                datum.cell = this;
                return this.callSuper(datum, fixtureId);
            },
            
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
            },
            
            getInteractions: function(character) {
                const accum = {};
                for (const faceDir of ['n','s','e','w','t','b']) {
                    const face = this[faceDir];
                    if (face) accum[faceDir] = face.getFixtureInteractions(character);
                    // FIXME: get adjacent cell faces
                }
                accum.cell = this.getFixtureInteractions(character);
                return accum;
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
            getActionSpeed: function(contextObj) {return 3;},
            
            // Lock Times
            setLockMove: function(v) {this.set('lockMove', v, true);},
            getLockMove: function() {return this.lockMove;},
            setLockAct: function(v) {this.set('lockAct', v, true);},
            getLockAct: function() {return this.lockAct;},
            setLockFree: function(v) {this.set('lockFree', v, true);},
            getLockFree: function() {return this.lockFree;},
            setLockReact: function(v) {this.set('lockReact', v, true);},
            getLockReact: function() {return this.lockReact;},
            
            setPerms: function(v) {this.set('perms', v, true);},
            
            getSightDistance: () => 3,
            getHearDistance: () => 9, // Maximum so sound propogation can handle things.
            
            
            // Methods /////////////////////////////////////////////////////////
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
            /*areLocArrEqual: (locArrA, locArrB) => {
                if (locArrA !== locArrB) {
                    if (locArrA == null || locArrB == null) return false;
                    if (locArrA[1] !== locArrB[1]) return false;
                    if (locArrA[2] !== locArrB[2]) return false;
                    if (locArrA[3] !== locArrB[3]) return false;
                    if (locArrA[0] !== locArrB[0]) return false;
                }
                return true;
            },*/
            // End: loc
            
            getComposition: compId => compositionTemplatesById[compId],
            getFixtureTemplate: id => fixtureTemplatesById[id],
            
            CommonMapModel:CommonMapModel,
            CommonFixtureModel:CommonFixtureModel,
            CommonFaceModel:CommonFaceModel,
            CommonCellModel:CommonCellModel,
            CommonEntityModelMixin:CommonEntityModelMixin,
            CommonCharacterModelMixin:CommonCharacterModelMixin,
            
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
            
            composition:composition,
            fixture:fixture
        };
    
    const compositionTemplates = EXPORT.composition.templates;
    for (const compId in compositionTemplates) {
        compositionTemplatesById[compId] = new CompositionTemplate(compositionTemplates[compId]);
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
