(pkg => {
    let gameMap,
        cellPool,
        entityPool,
        character;
    
    const JSClass = JS.Class,
        
        mathRound = Math.round,
        
        {View, ImageSupport, Reusable, MouseOverAndDown, TrackActivesPool, Animator, debounce} = myt,
        
        {
            cellOffsetsByDistance,
            character:{FIELD_LOC},
            util:{locArrToId,locIdToArr},
            composition,
            cell:{FIELD_COMPOSITION, FIELD_ENTITIES}
        } = common,
        
        {
            model,
            cfg:{mapRange, cellSize, entitySizeM}
        } = pkg,
        
        halfCellSize = cellSize / 2,
        halfMapSize = halfCellSize + (mapRange * cellSize),
        mapSize = 2*halfMapSize,
        
        observedLocIds = new Set(),
        obscuredLocIds = new Set(),
        cellViewsByLocId = new Map(),
        getCellViewForLocId = locId => cellViewsByLocId.get(locId),
        
        entityViewsByEntityId = new Map(),
        getEntityViewForEntityId = entityId => entityViewsByEntityId.get(entityId),
        
        EntityView = new JSClass('EntityView', View, {
            include:[Reusable, MouseOverAndDown],
            
            initNode: function(parent, attrs) {
                this.mouseOver = this.mouseDown = false;
                
                attrs.zIndex = 2;
                attrs.bgColor ??= '#000';
                attrs.outline ??= [1, 'solid', '#000'];
                attrs.border ??= [1, 'solid', '#fff'];
                attrs.boxShadow ??= [2, 2, 4, '#000'];
                this.callSuper(parent, attrs);
            },
            
            clean: function() {
                this.setVisible(false);
            },
            
            setMouseDown: function(v) {
                if (v !== this.mouseDown) {
                    this.callSuper(v);
                    this.parent.doMouseDownEntity(this.mouseDown, this.entity, this);
                }
            },
            
            setMouseOver: function(v) {
                if (v !== this.mouseOver) {
                    this.callSuper(v);
                    this.parent.doMouseOverEntity(this.mouseOver, this.entity, this);
                    this.cellView?.setMouseOver(v);
                }
            },
            
            setEntity: function(v) {
                const entity = this.entity = v,
                    isAstralProjected = entity.isAstralProjected(),
                    isSpirit = entity.isSpirit();
                
                entityViewsByEntityId.set(entity.getId(), this);
                
                this.setWidth(entitySizeM);
                this.setHeight(entitySizeM);
                this.setRoundedCorners(this.borderWidth + entitySizeM / 2);
                
                let color = '#fff',
                    bgColor;
                if (entity === character) {
                    if (isSpirit) {
                        color = '#00f';
                        bgColor = '#fff9';
                    } else if (isAstralProjected) {
                        color = '#999';
                        bgColor = '#9999';
                    } else {
                        bgColor = '#fff';
                    }
                } else {
                    if (isSpirit) {
                        color = '#00f';
                        bgColor = '#0009';
                    } else if (isAstralProjected) {
                        color = '#999';
                        bgColor = '#0009';
                    } else {
                        bgColor = '#000';
                    }
                }
                
                
                this.setVisible(true);
                this.setBgColor(bgColor);
                this.setBorderColor(color);
            },
            
            setCellView: function(v) {
                this.cellView = v;
            },
            
            updatePosition: function(position, cellView) {
                if (cellView) {
                    const inset = 3,
                        borderWidth = this.borderWidth || 0;
                    let adjX = 0,
                        adjY = 0,
                        {width, height} = this;
                    switch (position) {
                        case 1: // topLeft
                            adjX = inset;
                            adjY = inset;
                            break;
                        case 2: // bottomRight
                            adjX = cellSize - width - inset;
                            adjY = cellSize - height - inset;
                            break;
                        case 3: // bottomLeft
                            adjX = inset;
                            adjY = cellSize - height - inset;
                            break;
                        case 4: // topRight
                            adjX = cellSize - width - inset;
                            adjY = inset;
                            break;
                        case 0: // center
                        default:
                            adjX = halfCellSize - width / 2;
                            adjY = halfCellSize - height / 2;
                    }
                    this.setX(cellView.x + adjX - borderWidth);
                    this.setY(cellView.y + adjY - borderWidth);
                }
            }
        }),
        
        CellView = new JSClass('CellView', View, {
            include:[Reusable, MouseOverAndDown, ImageSupport],
            
            initNode: function(parent, attrs) {
                this.mouseOver = this.mouseDown = false;
                attrs.observedByCharacter ??= false;
                
                attrs.width = attrs.height = cellSize;
                attrs.imageSize = 'contain';
                
                this.callSuper(parent, attrs);
                
                this._observedOverlay = new View(this, {width:cellSize, height:cellSize, pointerEvents:'none'});
            },
            
            clean: function() {
                this.setVisible(false);
                this.setObservedByCharacter(false);
            },
            
            setMouseDown: function(v) {
                if (v !== this.mouseDown) {
                    this.callSuper(v);
                    this.parent.doMouseDownCell(this.mouseDown, this.cell, this);
                }
            },
            
            setMouseOver: function(v) {
                if (v !== this.mouseOver) {
                    this.callSuper(v);
                    this.parent.doMouseOverCell(this.mouseOver, this.cell, this);
                }
            },
            
            setCell: function(v) {
                const cell = this.cell = v;
                cellViewsByLocId.set(cell.locId, this);
                if (this.inited) this.redraw();
            },
            
            setObservedByCharacter: function(v) {
                this._observedOverlay?.setBgColor(this.observedByCharacter = v ? 'transparent' : '#0009');
            },
            
            redraw: function() {
                const cell = this.cell,
                    {mapColor, tileUrl} = composition[cell[FIELD_COMPOSITION]];
                this.setVisible(true);
                this.setBgColor(mapColor);
                this.setImageUrl(tileUrl);
            }
        });
    
        //all zags must be the same order within a path
        //should walk from origin out to loc
        //order below is from the cell to the origin.
        const VISIBILITY = [
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
                ['zz', 'up'],
                ['up', 'zz', 'up'],
                ['up', 'up', 'zz', 'up'],
                ['up', 'up', 'up', 'zz', 'up'],
                ['up', 'up', 'up', 'zz', 'up', 'up'],
                ['up', 'up', 'up', 'up', 'uo', 'up', 'up'],
                ['up', 'up', 'up', 'up', 'zz', 'up', 'up', 'up'],
                ['up', 'up', 'up', 'up', 'zz', 'up', 'up', 'up', 'up'],
            ],[,,
                ['zz', 'zz'],
                ['up', 'zz', 'zz'],
                ['up', 'uo', 'up', 'uo'],
                ['up', 'zz', 'up', 'up', 'uo'],
                ['up', 'zz', 'up', 'up', 'zz', 'up'],
                ['up', 'up', 'zz', 'up', 'up', 'zz', 'up'],
                ['up', 'up', 'zz', 'up', 'up', 'up', 'zz', 'up'],
                ['up', 'up', 'up', 'zz', 'up', 'up', 'up', 'zz', 'up'],
            ],[,,,
                ['zz', 'zz', 'zz'],
                ['zz', 'uo', 'uo','up'],
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
        
        getLookupXY = (x, y, isPosX, isPosY, isYgtX, isYgtNegX) => {
            let lookupX,
                lookupY;
            if (x === y) {
                if (x === 0) {
                    // origin. Won't resolve to a path hence never obscured for now
                    lookupX = x;
                    lookupY = y;
                } else {
                    // diagonal
                    if (isPosX) {
                        if (isPosY) {
                            lookupX = x;
                            lookupY = y;
                        } else {
                            lookupX = x;
                            lookupY = -y;
                        }
                    } else {
                        if (isPosY) {
                            lookupX = -x;
                            lookupY = y;
                        } else {
                            lookupX = -x;
                            lookupY = -y;
                        }
                    }
                }
            } else if (x === 0) {
                // horizontal
                if (isPosY) {
                    lookupX = 0;
                    lookupY = y;
                } else {
                    lookupX = 0;
                    lookupY = -y;
                }
            } else if (y === 0) {
                // vertical
                if (isPosX) {
                    lookupX = 0;
                    lookupY = x;
                } else {
                    lookupX = 0;
                    lookupY = -x;
                }
            } else {
                // special
                if (isPosX) {
                    if (isPosY) {
                        if (isYgtX) {
                            lookupX = x;
                            lookupY = y;
                        } else {
                            lookupX = y;
                            lookupY = x;
                        }
                    } else {
                        if (isYgtNegX) {
                            lookupX = -y;
                            lookupY = x;
                        } else {
                            lookupX = x;
                            lookupY = -y;
                        }
                    }
                } else {
                    if (isPosY) {
                        if (isYgtNegX) {
                            lookupX = -x;
                            lookupY = y;
                        } else {
                            lookupX = y;
                            lookupY = -x;
                        }
                    } else {
                        if (isYgtX) {
                            lookupX = -y;
                            lookupY = -x;
                        } else {
                            lookupX = -x;
                            lookupY = -y;
                        }
                    }
                }
            }
            return {lookupX, lookupY};
        };
    
    pkg.GameMap = new JSClass('GameMap', View, {
        include:[ImageSupport],
        
        
        // Life Cycle //////////////////////////////////////////////////////////
        initNode: function(parent, attrs) {
            gameMap = pkg.gameMap = this;
            
            attrs.width = attrs.height = mapSize;
            attrs.imageSize = 'contain';
            attrs.imageUrl = '/img/gameMapBg4.jpg';
            
            gameMap.callSuper(parent, attrs);
            
            cellPool = new TrackActivesPool(CellView, gameMap);
            entityPool = new TrackActivesPool(EntityView, gameMap);
            
            gameMap.constrain('refreshMap', [
                model, 'cellChanged', model, 'mapChanged',
                model, 'cellDataCleared', model, 'mapDataCleared'
            ]);
        },
        
        
        // Accessors ///////////////////////////////////////////////////////////
        setCharacter: v => character = v,
        
        setWidth: v => {
            gameMap.callSuper(v);
            if (gameMap.inited) gameMap.refreshMap();
        },
        
        setHeight: v => {
            gameMap.callSuper(v);
            if (gameMap.inited) gameMap.refreshMap();
        },
        
        
        // Methods /////////////////////////////////////////////////////////////
        doMouseOverCell: (isOver, cell, cellView) => {},
        doMouseDownCell: (isDown, cell, cellView) => {},
        doCharacterCell: (character, cell, cellView) => {},
        doMouseOverEntity: (isOver, entity, entityView) => {},
        doMouseDownEntity: (isDown, entity, entityView) => {},
        
        animateEntity: (entityId, animationType='shake', amount=6) => {
            const entityView = getEntityViewForEntityId(entityId);
            if (entityView) {
                switch (animationType) {
                    case 'shake': Animator.shakeView(entityView, amount); break;
                    case 'bounce': Animator.bounceView(entityView, amount); break;
                }
            }
        },
        
        refreshMap: debounce(() => {
            if (!character) return;
            
            cellPool.putActives();
            entityPool.putActives();
            cellViewsByLocId.clear();
            entityViewsByEntityId.clear();
            
            const centerX = mathRound(gameMap.width / 2),
                centerY = mathRound(gameMap.height / 2),
                originArr = character[FIELD_LOC],
                locArr = originArr.slice(),
                baseX = locArr[1],
                baseY = locArr[2],
                posStartAdj = halfMapSize,
                distance = character.getObserveDistance();
            
            // Make a lookup table of observed cell IDs.
            observedLocIds.clear();
            if (distance >= 0 && distance < cellOffsetsByDistance.length) {
                const offsets = cellOffsetsByDistance[distance];
                for (const offset of offsets) {
                    locArr[1] = baseX + offset[0];
                    locArr[2] = baseY + offset[1];
                    observedLocIds.add(locArrToId(locArr));
                }
            }
            
            // Make a lookup table of obscured cellIDs.
            obscuredLocIds.clear();
            for (const locId of observedLocIds) {
                const cellDatum = model.getCellDatum(locId);
                if (cellDatum) {
                    const observedLocArr = locIdToArr(locId),
                        x = observedLocArr[1] - baseX,
                        y = observedLocArr[2] - baseY,
                        isPosX = x > 0,
                        isPosY = y > 0,
                        isYgtX = y > x,
                        isYgtNegX = y > -x,
                        {lookupX, lookupY} = getLookupXY(x, y, isPosX, isPosY, isYgtX, isYgtNegX),
                        path = VISIBILITY[lookupX][lookupY];
                    
                    if (path) {
                        const checkCell = locArrToCheck => {
                            const cellDatumToCheck = model.getCellDatum(locArrToId(locArrToCheck));
                            if (cellDatumToCheck) {
                                const solidity = composition[cellDatumToCheck[FIELD_COMPOSITION]].solidity;
                                if (solidity < 1) return false;
                            }
                            return true;
                        };
                        const len = path.length,
                            locArrToCheck = originArr.slice();
                        let xAdj = isPosX ? 1 : -1,
                            yAdj = isPosY ? 1 : -1;
                        const isNotFlipped = (isYgtX && isYgtNegX) || (!isYgtX && !isYgtNegX),
                            xIdx = isNotFlipped ? 1 : 2,
                            yIdx = isNotFlipped ? 2 : 1;
                        if (!isNotFlipped) {
                            const tempAdj = xAdj;
                            xAdj = yAdj;
                            yAdj = tempAdj;
                        }
                        
                        const checkForEntryValue = (depth, firstZZ, zzOptA) => {
                            let retval = false;
                            switch (path[depth]) {
                                case 'up':
                                    locArrToCheck[yIdx] += yAdj;
                                    retval = checkCell(locArrToCheck);
                                    break;
                                case 'uo':
                                    locArrToCheck[yIdx] += yAdj;
                                    retval = checkCell(locArrToCheck);
                                    if (!retval) {
                                        locArrToCheck[xIdx] += xAdj;
                                        retval = checkCell(locArrToCheck);
                                    }
                                    break;
                                case 'zz':
                                    if (firstZZ) {
                                        const optBX = locArrToCheck[1],
                                            optBY = locArrToCheck[2];
                                        retval = checkForEntryValue(depth, false, true);
                                        if (retval) {
                                            locArrToCheck[1] = optBX;
                                            locArrToCheck[2] = optBY;
                                            retval = checkForEntryValue(depth, false, false);
                                        }
                                        return retval;
                                    } else {
                                        if (zzOptA) {
                                            locArrToCheck[yIdx] += yAdj;
                                            retval = checkCell(locArrToCheck);
                                            if (!retval) {
                                                locArrToCheck[xIdx] += xAdj;
                                                retval = checkCell(locArrToCheck);
                                            }
                                        } else {
                                            locArrToCheck[xIdx] += xAdj;
                                            retval = checkCell(locArrToCheck);
                                            if (!retval) {
                                                locArrToCheck[yIdx] += yAdj;
                                                retval = checkCell(locArrToCheck);
                                            }
                                        }
                                    }
                                    break;
                            }
                            
                            if (retval) return true;
                            
                            if (depth < len) {
                                return checkForEntryValue(++depth, firstZZ, zzOptA);
                            } else {
                                return false;
                            }
                        };
                        
                        const isObscured = checkForEntryValue(0, true, true);
                        if (isObscured) obscuredLocIds.add(locId);
//console.log(isObscured, x, y, isNotFlipped, xAdj, yAdj, path);
                    }
                } else {
                    obscuredLocIds.add(locId);
                }
            }
            
            let posX = centerX - posStartAdj,
                posY = centerY - posStartAdj;
            for (let x = -mapRange; x <= mapRange; x++) {
                locArr[1] = baseX + x;
                for (let y = -mapRange; y <= mapRange; y++) {
                    locArr[2] = baseY + y;
                    
                    const locId = locArrToId(locArr),
                        isObserved = observedLocIds.has(locId),
                        cellDatum = model.getCellDatum(locId) ?? {locId:locId, [FIELD_COMPOSITION]:'unk'},
                        cellView = cellPool.getInstance();
                    
                    cellView.callSetters({x:posX, y:posY, cell:cellDatum, observedByCharacter:isObserved});
                    
                    let posCount = 0,
                        characterView;
                    if (x === 0 && y === 0) {
                        characterView = entityPool.getInstance();
                        characterView.setEntity(character);
                        characterView.setCellView(cellView);
                        characterView.updatePosition(posCount++, cellView);
                        gameMap.doCharacterCell(character, cellDatum, cellView);
                    }
                    
                    if (isObserved) {
                        if (obscuredLocIds.has(locId)) {
                            cellView.setObservedByCharacter(false);
                        } else {
                            const entities = cellDatum[FIELD_ENTITIES],
                                len = entities?.length;
                            if (len > 0) {
                                if (characterView) {
                                    // Reposition character to not be in center.
                                    characterView.updatePosition(posCount++, cellView);
                                } else if (len > 1) {
                                    posCount++;
                                }
                                
                                for (const entityDatum of entities) {
                                    const entityView = entityPool.getInstance(),
                                        entityModel = model.makeEntityFromData(entityDatum);
                                    entityView.setEntity(entityModel);
                                    entityView.setCellView(cellView);
                                    entityView.updatePosition(posCount++, cellView);
                                }
                            }
                        }
                    }
                    
                    posY += cellSize;
                }
                posX += cellSize;
                posY -= mapSize;
            }
        }, 50)
    });
})(orb);
