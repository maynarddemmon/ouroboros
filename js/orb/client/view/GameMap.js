(pkg => {
    let gameMap,
        cellPool,
        entityPool,
        character,
        cellCountX,
        cellCountY;
    
    const JSClass = JS.Class,
        
        {round:mathRound, ceil:mathCeil} = Math,
        
        {
            View, ImageSupport, Reusable, MouseOverAndDown, TrackActivesPool, Animator, TransformSupport,
            debounce
        } = myt,
        
        {
            cellOffsetsByDistance, visibilityPaths,
            character:{FIELD_LOC},
            util:{locArrToId,locIdToArr},
            composition,
            cell:{FIELD_COMPOSITION, FIELD_ENTITIES},
            FACINGS:{NORTH, SOUTH, EAST, WEST},
        } = common,
        
        {
            model,
            cfg:{mapRangeOffset, cellSize, entitySizeM}
        } = pkg,
        
        halfCellSize = cellSize / 2,
        
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
                
                this.faceView = new View(this, {}, [TransformSupport]);
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
                    size = entitySizeM,
                    halfSize = size / 2,
                    isAstralProjected = entity.isAstralProjected(),
                    isSpirit = entity.isSpirit(),
                    borderWidth = this.borderWidth || 0,
                    faceView = this.faceView;
                
                entityViewsByEntityId.set(entity.getId(), this);
                
                this.setWidth(size);
                this.setHeight(size);
                this.setRoundedCorners(borderWidth + halfSize);
                
                faceView.setWidth(6 + 2*borderWidth);
                faceView.setHeight(2*borderWidth);
                faceView.setX(size - 6);
                faceView.setY(halfSize - borderWidth);
                faceView.setTransformOrigin((halfSize - faceView.x) + 'px ' + (faceView.height / 2) + 'px');
                
                let color = '#fff',
                    bgColor;
                if (entity === character) {
                    if (isSpirit) {
                        color = '#00f';
                        bgColor = '#99f6';
                    } else if (isAstralProjected) {
                        color = '#ccf';
                        bgColor = '#6666';
                    } else {
                        color = '#000';
                        bgColor = '#fff';
                    }
                } else {
                    if (isSpirit) {
                        color = '#00f';
                        bgColor = '#0096';
                    } else if (isAstralProjected) {
                        color = '#ccf';
                        bgColor = '#0006';
                    } else {
                        bgColor = '#000';
                    }
                }
                
                let angle = 0;
                switch (entity.getFacing()) {
                    case NORTH:
                        angle = 270;
                        break;
                    case SOUTH:
                        angle = 90;
                        break;
                    case EAST:
                        angle = 0;
                        break;
                    case WEST:
                        angle = 180;
                        break;
                }
                
                this.setVisible(true);
                this.setBgColor(bgColor);
                this.setBorderColor(color);
                faceView.setBgColor(color);
                faceView.setRotation(angle);
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
                attrs.isSeen ??= false;
                
                attrs.width = attrs.height = cellSize;
                attrs.imageSize = 'contain';
                
                this.callSuper(parent, attrs);
                
                this._observedOverlay = new View(this, {width:cellSize, height:cellSize, pointerEvents:'none'});
            },
            
            clean: function() {
                this.setVisible(false);
                this.setIsSeen(false);
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
                if (this.inited) {
                    // Redraw
                    const {mapColor, tileUrl} = composition[cell.hasBeenSeen ? cell[FIELD_COMPOSITION] : 'unk'];
                    this.setVisible(true);
                    this.setBgColor(mapColor);
                    this.setImageUrl(tileUrl);
                }
            },
            
            setIsSeen: function(v) {
                this._observedOverlay?.setBgColor(this.isSeen = v ? 'transparent' : '#0008');
            }
        });
        
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
            
            attrs.imageRepeat = 'both';
            attrs.imageUrl = '/img/gameMapBg.png';
            
            gameMap.callSuper(parent, attrs);
            
            cellPool = new TrackActivesPool(CellView, gameMap);
            entityPool = new TrackActivesPool(EntityView, gameMap);
            
            gameMap.constrain('refreshMap', [
                model, 'cellChanged', model, 'mapChanged',
                model, 'cellDataCleared', model, 'mapDataCleared',
                model, 'entityChanged'
            ]);
        },
        
        
        // Accessors ///////////////////////////////////////////////////////////
        setWidth: v => {
            gameMap.callSuper(v);
            cellCountX = mathCeil(v / cellSize);
            if (gameMap.inited) gameMap.refreshMap();
        },
        
        setHeight: v => {
            gameMap.callSuper(v);
            cellCountY = mathCeil(v / cellSize);
            if (gameMap.inited) gameMap.refreshMap();
        },
        
        setCharacter: v => character = v,
        
        
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
        
        refreshMap: debounce((event) => {
            if (!character) return;
            
            cellPool.putActives();
            entityPool.putActives();
            cellViewsByLocId.clear();
            entityViewsByEntityId.clear();
            
            const characterId = character.getId(),
                facing = character.getFacing(),
                centerX = mathRound(gameMap.width / 2),
                centerY = mathRound(gameMap.height / 2),
                originArr = character[FIELD_LOC],
                locArr = originArr.slice(),
                baseX = locArr[1],
                baseY = locArr[2],
                distance = character.getSightDistance();
            
            // Have backgroundImage track the map ofset.
            gameMap.setImagePosition(-baseX * cellSize + 'px ' + -baseY * cellSize + 'px');
            
            // Make a lookup table of observed cell IDs.
            observedLocIds.clear();
            if (distance >= 0 && distance < cellOffsetsByDistance.length) {
                const offsets = cellOffsetsByDistance[distance];
                for (const [offsetX, offsetY] of offsets) {
                    locArr[1] = baseX + offsetX;
                    locArr[2] = baseY + offsetY;
                    
                    let isFacedLoc = false;
                    switch (facing) {
                        case NORTH:isFacedLoc = offsetY <= 0; break;
                        case SOUTH:isFacedLoc = offsetY >= 0; break;
                        case EAST:isFacedLoc = offsetX >= 0; break;
                        case WEST:isFacedLoc = offsetX <= 0; break;
                    }
                    if (isFacedLoc) observedLocIds.add(locArrToId(locArr));
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
                        path = visibilityPaths[lookupX][lookupY];
                    
                    if (path) {
                        const len = path.length,
                            locArrToCheck = originArr.slice(),
                            isNotFlipped = (isYgtX && isYgtNegX) || (!isYgtX && !isYgtNegX),
                            xIdx = isNotFlipped ? 1 : 2,
                            yIdx = isNotFlipped ? 2 : 1,
                            xAdj = isNotFlipped ? (isPosX ? 1 : -1) : (isPosY ? 1 : -1),
                            yAdj = isNotFlipped ? (isPosY ? 1 : -1) : (isPosX ? 1 : -1);
                        
                        let opacityTotal = 0,
                            endedOnObserved = false;
                        const isCellObscured = locArrToCheck => {
                            const cellDatumToCheck = model.getCellDatum(locArrToId(locArrToCheck));
                            if (cellDatumToCheck) {
                                // FIXME check cell walls once we have walls implemented.
                                opacityTotal += composition[cellDatumToCheck[FIELD_COMPOSITION]].opacity;
                                if (opacityTotal < 1) return false;
                            }
                            return true;
                        };
                        const isObscured = (depth, firstZZ, zzOptA) => {
                            let retval = false;
                            switch (path[depth]) {
                                case 'up':
                                    // Up only
                                    locArrToCheck[yIdx] += yAdj;
                                    retval = isCellObscured(locArrToCheck);
                                    break;
                                case 'uo':
                                    // Up and Over
                                    locArrToCheck[yIdx] += yAdj;
                                    retval = isCellObscured(locArrToCheck);
                                    if (!retval) {
                                        locArrToCheck[xIdx] += xAdj;
                                        retval = isCellObscured(locArrToCheck);
                                    }
                                    break;
                                case 'zz':
                                    // Zig: up and over OR over and up. Keep the same pattern
                                    // once chosen.
                                    if (firstZZ) {
                                        const optBX = locArrToCheck[1],
                                            optBY = locArrToCheck[2],
                                            optBOpacityTotal = opacityTotal;
                                        retval = isObscured(depth, false, true);
                                        const optAEndedOnObserved = endedOnObserved;
                                        if (retval) {
                                            locArrToCheck[1] = optBX;
                                            locArrToCheck[2] = optBY;
                                            opacityTotal = optBOpacityTotal;
                                            retval = isObscured(depth, false, false);
                                            if (retval && optAEndedOnObserved) endedOnObserved = true;
                                        }
                                        return retval;
                                    } else {
                                        if (zzOptA) {
                                            locArrToCheck[yIdx] += yAdj;
                                            retval = isCellObscured(locArrToCheck);
                                            if (!retval) {
                                                locArrToCheck[xIdx] += xAdj;
                                                retval = isCellObscured(locArrToCheck);
                                            }
                                        } else {
                                            locArrToCheck[xIdx] += xAdj;
                                            retval = isCellObscured(locArrToCheck);
                                            if (!retval) {
                                                locArrToCheck[yIdx] += yAdj;
                                                retval = isCellObscured(locArrToCheck);
                                            }
                                        }
                                    }
                                    break;
                            }
                            
                            if (retval) {
                                endedOnObserved = (x + baseX === locArrToCheck[1]) && (y + baseY === locArrToCheck[2]);
                                return true;
                            }
                            
                            if (depth < len) {
                                return isObscured(++depth, firstZZ, zzOptA);
                            } else {
                                return false;
                            }
                        };
                        
                        if (isObscured(0, true, true)) {
                            if (!endedOnObserved) obscuredLocIds.add(locId);
                        }
                    }
                } else {
                    obscuredLocIds.add(locId);
                }
            }
            
            let posX = 0,
                posY = 0;
            const xLimit = cellCountX - mapRangeOffset,
                yLimit = cellCountY - mapRangeOffset;
            for (let x = -mapRangeOffset; x < xLimit; x++) {
                locArr[1] = baseX + x;
                for (let y = -mapRangeOffset; y < yLimit; y++) {
                    locArr[2] = baseY + y;
                    
                    const locId = locArrToId(locArr),
                        isSeen = observedLocIds.has(locId) && !obscuredLocIds.has(locId),
                        cellDatum = model.getCellDatum(locId) ?? {locId:locId, [FIELD_COMPOSITION]:'unk'},
                        cellView = cellPool.getInstance();
                    
                    if (isSeen) cellDatum.hasBeenSeen = true;
                    
                    cellView.callSetters({x:posX, y:posY, cell:cellDatum, isSeen:isSeen});
                    
                    const entities = cellDatum[FIELD_ENTITIES],
                        len = entities?.length;
                    let posCount = len > 1 ? 1 : 0;
                    if (x === 0 && y === 0) {
                        const characterView = entityPool.getInstance();
                        characterView.setEntity(character);
                        characterView.setCellView(cellView);
                        characterView.updatePosition(posCount++, cellView);
                        gameMap.doCharacterCell(character, cellDatum, cellView);
                    }
                    if (isSeen && len > 0) {
                        for (const entityDatum of entities) {
                            if (entityDatum.id !== characterId) {
                                const entityView = entityPool.getInstance();
                                entityView.setEntity(model.makeEntityFromData(entityDatum));
                                entityView.setCellView(cellView);
                                entityView.updatePosition(posCount++, cellView);
                            }
                        }
                    }
                    
                    posY += cellSize;
                }
                posX += cellSize;
                posY = 0;
            }
        }, 50)
    });
})(orb);
