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
            locIdToArr, locArrToId, 
            isTraversableSolidityForCorporeal,
            facing:{
                NORTH, SOUTH, EAST, WEST, UP, DOWN, COMPASS_FIELDS,
                isValidCompassFacing, getOppositeCompassFacing
            },
            composition:{CompositionTemplateProxyMixin},
            inventory:{InventoryContainer}
        } = pkg,
        
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
        
        FixtureContainerMixin = new JSModule('FixtureContainerMixin', {
            include: [AffectableValuesMixin],
            
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
            },
            
            
            // Persistence and Serialization ///////////////////////////////////
            getAsData: function(cfg) {
                const retval = this.callSuper?.(cfg) ?? {};
                
                let fixturesData;
                const fixtures = this.fixtures;
                if (fixtures?.size > 0) {
                    fixturesData = {};
                    for (const [fixtureId, fixture] of fixtures) {
                        fixturesData[fixtureId] = fixture.getAsData(cfg);
                    }
                }
                if (fixturesData) retval.fix = fixturesData;
                
                return retval;
            },
            
            updateFromData: function(datum) {
                this.callSuper?.(datum);
                if (datum.fix != null) {
                    const fixturesData = datum.fix;
                    for (const fixtureId in fixturesData) {
                        this.addFixture(this.makeFixtureFromDatum(this.prepareFixtureDatum(fixturesData[fixtureId], fixtureId)));
                    }
                }
                return this;
            },
            makeFixtureFromDatum: datum => {/* Subclasses must implement. */},
            prepareFixtureDatum: (datum, fixtureId) => {
                datum.id = fixtureId;
                return datum;
            }
        }),
        
        makeFaceForCell = (cell, datum) => {
            const face = new CommonCellModel.FACE_MODEL_CLASS();
            face.setCell(cell);
            face.updateFromData(datum);
            return face;
        },
        
        CommonCellModel = new JSClass('CommonCellModel', Eventable, {
            include:[FixtureContainerMixin, InventoryContainer, CompositionTemplateProxyMixin],
            
            extend: {
                // Set by the client and server so the appropriate face class is instantated.
                FACE_MODEL_CLASS:null,
                INVENTORY_MODEL_CLASS:null
            },
            
            getInventoryClass: () => CommonCellModel.INVENTORY_MODEL_CLASS,
            
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
                    v = makeFaceForCell(this, v);
                } else {
                    this.getN()?.destroy();
                }
                this.set(NORTH, v, true);
            },
            getN: function(v) {return this[NORTH];},
            
            setS: function(v) {
                if (v) {
                    v = makeFaceForCell(this, v);
                } else {
                    this.getS()?.destroy();
                }
                this.set(SOUTH, v, true);
            },
            getS: function(v) {return this[SOUTH];},
            
            setE: function(v) {
                if (v) {
                    v = makeFaceForCell(this, v);
                } else {
                    this.getE()?.destroy();
                }
                this.set(EAST, v, true);
            },
            getE: function(v) {return this[EAST];},
            
            setW: function(v) {
                if (v) {
                    v = makeFaceForCell(this, v);
                } else {
                    this.getW()?.destroy();
                }
                this.set(WEST, v, true);
            },
            getW: function(v) {return this[WEST];},
            
            setT: function(v) {
                if (v) {
                    v = makeFaceForCell(this, v);
                } else {
                    this.getT()?.destroy();
                }
                this.set(UP, v, true);
            },
            getT: function(v) {return this[UP];},
            
            setB: function(v) {
                if (v) {
                    v = makeFaceForCell(this, v);
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
            },
            
            
            // Persistence and Serialization ///////////////////////////////////
            getAsData: function(cfg) {
                const retval = this.callSuper?.(cfg) ?? {};
                
                for (const attrName of COMPASS_FIELDS) {
                    const attr = this[attrName];
                    if (attr != null) retval[attrName] = attr.getAsData(cfg);
                }
                
                const character = cfg?.character;
                if (character) {
                    const entities = this.entities;
                    if (entities?.size > 0) {
                        const accum = [],
                            characterId = character.getId();
                        for (const entity of entities.values()) {
                            if (entity.getId() !== characterId) accum.push(entity.getAsData(cfg));
                        }
                        if (accum.length > 0) retval.ent = accum;
                    }
                }
                
                return retval;
            },
            
            updateFromData: function(datum) {
                this.callSuper?.(datum);
                this.setN(datum.n);
                this.setS(datum.s);
                this.setE(datum.e);
                this.setW(datum.w);
                this.setT(datum.t);
                this.setB(datum.b);
                return this;
            },
            
            prepareFixtureDatum: function(datum, fixtureId) {
                datum.cell = this;
                return this.callSuper(datum, fixtureId);
            }
        });
    
    pkg.cell = {
        CommonFaceModel: new JSClass('CommonFaceModel', Eventable, {
            include:[FixtureContainerMixin, CompositionTemplateProxyMixin],
            
            prepareFixtureDatum: function(datum, fixtureId) {
                datum.face = this;
                return this.callSuper(datum, fixtureId);
            },
            
            setCell: function(v) {this.set('cell', v, true);},
            getCell: function() {return this.cell;}
        }),
        
        CommonCellModel:CommonCellModel
    };
})(global.urob);
