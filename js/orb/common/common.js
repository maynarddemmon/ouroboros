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
        
        {
            getCompositionTemplate, getFixtureTemplate, locIdToArr, locArrToId, 
            isTraversableSolidityForCorporeal,
            permission:{PERM_CREATOR},
            facing:{
                NORTH, SOUTH, EAST, WEST, UP, DOWN, COMPASS_FIELDS,
                isValidCompassFacing, getOppositeCompassFacing
            }
        } = global.urob,
        
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
            
            getParentCell: function() {
                return this.cell ?? this.face.getCell();
            },
            
            setTemplate: function(v) {this.set('template', v, true);},
            getTemplate: function() {return this.template;},
            getTemplateObject: function() {return getFixtureTemplate(this.getTemplate());},
            
            getStateObject: function() {return this.state ??= {};},
            setStateByName: function(stateName, value) {this.getStateObject()[stateName] = value;},
            getStateByName: function(stateName) {return this.getStateObject()[stateName];},
            
            getTemplateUrl: function(character) {
                return this.getTemplateObject().getUrl(this, character);
            },
            
            describeForCharacter: function(character) {
                return this.getTemplateObject().describe(this, character);
            },
            
            getNameForCharacter: function(character) {
                return this.getTemplateObject().getName(this, character);
            },
            
            getLockPropertyForInteraction: function(character, interactionName) {
                return this.getTemplateObject().getLockPropertyForInteraction?.(this, character, interactionName);
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
            
            getFixtureInteractions: function(character, adjacent) {
                let retval;
                const fixtures = this.fixtures;
                if (fixtures?.size > 0) {
                    for (const [fixtureId, fixture] of fixtures) {
                        retval ??= {};
                        retval[fixtureId] = fixture.getTemplateObject().getInteractions?.(fixture, character, adjacent);
                    }
                }
                return retval;
            }
        }),
        
        CompositionTemplateProxyMixin = new JSModule('CompositionTemplateProxyMixin', {
            setC: function(v) {this.set('c', v, true);},
            setComposition: function(v) {this.setC(v);},
            getComposition: function() {return this.c;},
            getCompositionObject: function() {return getCompositionTemplate(this.getComposition());},
            
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
            
            extend: {
                // Set by the client and server so the appropriate face class is instantated.
                FACE_MODEL_CLASS:null
            },
            
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
            
            setN: function(v) {
                if (v) {
                    v.cell = this;
                    v = new CommonCellModel.FACE_MODEL_CLASS(v);
                } else {
                    this.getN()?.destroy();
                }
                this.set(NORTH, v, true);
            },
            getN: function(v) {return this[NORTH];},
            
            setS: function(v) {
                if (v) {
                    v.cell = this;
                    v = new CommonCellModel.FACE_MODEL_CLASS(v);
                } else {
                    this.getS()?.destroy();
                }
                this.set(SOUTH, v, true);
            },
            getS: function(v) {return this[SOUTH];},
            
            setE: function(v) {
                if (v) {
                    v.cell = this;
                    v = new CommonCellModel.FACE_MODEL_CLASS(v);
                } else {
                    this.getE()?.destroy();
                }
                this.set(EAST, v, true);
            },
            getE: function(v) {return this[EAST];},
            
            setW: function(v) {
                if (v) {
                    v.cell = this;
                    v = new CommonCellModel.FACE_MODEL_CLASS(v);
                } else {
                    this.getW()?.destroy();
                }
                this.set(WEST, v, true);
            },
            getW: function(v) {return this[WEST];},
            
            setT: function(v) {
                if (v) {
                    v.cell = this;
                    v = new CommonCellModel.FACE_MODEL_CLASS(v);
                } else {
                    this.getT()?.destroy();
                }
                this.set(UP, v, true);
            },
            getT: function(v) {return this[UP];},
            
            setB: function(v) {
                if (v) {
                    v.cell = this;
                    v = new CommonCellModel.FACE_MODEL_CLASS(v);
                } else {
                    this.getB()?.destroy();
                }
                this.set(DOWN, v, true);
            },
            getB: function(v) {return this[DOWN];},
            
            getFaceForDirection: function(compassDirection) {
                if (isValidCompassFacing(compassDirection)) return this.get(compassDirection);
            },
            
            getFaceForOppositeDirection: function(compassDirection) {
                return this.getFaceForDirection(getOppositeCompassFacing(compassDirection));
            },
            
            getAnotherCell: locId => {/* Subclasses must implement. */},
            getAdjacentCell: function(compassDirection) {
                const locArr = this.getLocArr(true);
                switch (compassDirection) {
                    case NORTH: --locArr[2]; break;
                    case SOUTH: ++locArr[2]; break;
                    case EAST: ++locArr[1]; break;
                    case WEST: --locArr[1]; break;
                    case UP: ++locArr[3]; break;
                    case DOWN: --locArr[3]; break;
                }
                return this.getAnotherCell(locArrToId(locArr));
            },
            
            getInteractions: function(character) {
                const accum = {};
                for (const faceDir of COMPASS_FIELDS) {
                    let face = this[faceDir],
                        solidity = 0;
                    if (face) {
                        accum[faceDir] = face.getFixtureInteractions(character, false);
                        solidity = face.getSolidity();
                    }
                    
                    // Adjacent interactions from adjacent cells
                    if (isTraversableSolidityForCorporeal(solidity)) {
                        const adjacentCell = this.getAdjacentCell(faceDir);
                        if (adjacentCell) {
                            const adjFaceDir = getOppositeCompassFacing(faceDir);
                            face = adjacentCell[adjFaceDir];
                            if (face) accum['adj_' + adjFaceDir] = face.getFixtureInteractions(character, true);
                        }
                    }
                }
                accum.cell = this.getFixtureInteractions(character, false);
                
                return accum;
            }
        }),
        
        CommonEntityModelMixin = new JSModule('CommonEntityModelMixin', {
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
        
        CommonCharacterModelMixin = new JSModule('CommonCharacterModelMixin', {
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
        }),
        
        EXPORT = {
            CommonMapModel:CommonMapModel,
            CommonFixtureModel:CommonFixtureModel,
            CommonFaceModel:CommonFaceModel,
            CommonCellModel:CommonCellModel,
            CommonEntityModelMixin:CommonEntityModelMixin,
            CommonCharacterModelMixin:CommonCharacterModelMixin,
        };
    
    if (IS_NODEJS) {
        module.exports = EXPORT;
    } else {
        global.common = EXPORT;
    }
})();
