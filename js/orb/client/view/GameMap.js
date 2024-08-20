(pkg => {
    let gameMap,
        cellPool,
        entityPool,
        character,
        cellCountX,
        cellCountY;
    
    const JSClass = JS.Class,
        
        {ceil:mathCeil, abs:mathAbs} = Math,
        
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
        
        /* A Map of EntityView instances by entity ID.  */
        entityViewsByEntityId = new Map(),
        
        observedLocIds = new Set(), // Reused inside the render function.
        obscuredLocIds = new Set(), // Reused inside the render function.
        
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
                
                const twiceBorderWidth = 2*this.borderWidth;
                this.faceView = new View(this, {width:6 + twiceBorderWidth, height:twiceBorderWidth}, [TransformSupport]);
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
                const self = this,
                    entity = self.entity = v,
                    size = entitySizeM,
                    halfSize = size / 2,
                    isAstralProjected = entity.isAstralProjected(),
                    isSpirit = entity.isSpirit(),
                    {borderWidth, faceView} = self;
                
                entityViewsByEntityId.set(entity.getId(), self);
                
                self.setWidth(size);
                self.setHeight(size);
                self.setRoundedCorners(borderWidth + halfSize);
                
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
                
                let angle;
                switch (entity.getFacing()) {
                    case NORTH: angle = 270; break;
                    case WEST:  angle = 180; break;
                    case SOUTH: angle = 90; break;
                    case EAST:  angle = 0; break;
                }
                
                self.setVisible(true);
                self.setBgColor(bgColor);
                self.setBorderColor(color);
                faceView.setBgColor(color);
                faceView.setRotation(angle);
            },
            
            updatePosition: function(position, cellView) {
                const self = this,
                    inset = 3,
                    {width, height, borderWidth} = self;
                self.cellView = cellView;
                let adjX,
                    adjY;
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
                        adjX = (cellSize - width) / 2;
                        adjY = (cellSize - height) / 2;
                }
                self.setX(cellView.x + adjX - borderWidth);
                self.setY(cellView.y + adjY - borderWidth);
            }
        }),
        
        CellView = new JSClass('CellView', View, {
            include:[Reusable, MouseOverAndDown, ImageSupport],
            
            initNode: function(parent, attrs) {
                this.mouseOver = this.mouseDown = false;
                
                attrs.focusable = true;
                attrs.focusIndicator = false;
                
                attrs.isSeen = false;
                attrs.width = attrs.height = cellSize;
                attrs.imageSize = 'contain';
                
                this.callSuper(parent, attrs);
                
                this._observedOverlay = new View(this, {width:cellSize, height:cellSize, bgColor:'#0008', pointerEvents:'none'});
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
                if (this.inited) {
                    const {mapColor, tileUrl} = composition[cell.hasBeenSeen ? cell[FIELD_COMPOSITION] : 'unk'];
                    this.setVisible(true);
                    this.setBgColor(mapColor);
                    this.setImageUrl(tileUrl);
                }
            },
            
            setIsSeen: function(v) {
                const isSeen = this.isSeen = v;
                this._observedOverlay?.setVisible(!isSeen);
            }
        });
        
        getVisibilityPath = (x, y, isPosX, isPosY, isYgtX, isYgtNegX) => {
            let lookupX,
                lookupY;
            if (x === y) {
                // origin and diagonal
                lookupX = lookupY = mathAbs(x);
            } else if (x === 0) {
                // horizontal
                lookupX = 0;
                lookupY = mathAbs(y);
            } else if (y === 0) {
                // vertical
                lookupX = 0;
                lookupY = mathAbs(x);
            } else if (isPosX) {
                if (isPosY) {
                    if (isYgtX) {
                        lookupX = x;
                        lookupY = y;
                    } else {
                        lookupX = y;
                        lookupY = x;
                    }
                } else if (isYgtNegX) {
                    lookupX = -y;
                    lookupY = x;
                } else {
                    lookupX = x;
                    lookupY = -y;
                }
            } else if (isPosY) {
                if (isYgtNegX) {
                    lookupX = -x;
                    lookupY = y;
                } else {
                    lookupX = y;
                    lookupY = -x;
                }
            } else if (isYgtX) {
                lookupX = -y;
                lookupY = -x;
            } else {
                lookupX = -x;
                lookupY = -y;
            }
            
            return visibilityPaths[lookupX][lookupY];
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
            const entityView = entityViewsByEntityId.get(entityId);
            if (entityView) {
                switch (animationType) {
                    case 'shake': Animator.shakeView(entityView, amount); break;
                    case 'bounce': Animator.bounceView(entityView, amount); break;
                }
            }
        },
        
        handleSoundMessage: socketMsg => {
            const {locId, from, volume, message} = socketMsg,
                entity = model.getEntityById(from);
            
            let entityName = '<i>unknown</i>',
                isCharacter = false;
            if (entity) {
                if (entity === character) {
                    isCharacter = true;
                    entityName = 'You';
                } else {
                    entityName = entity.name ?? '<i>Entity ' + from + '</i>';
                }
            }
            
            let actionLabel;
            switch (volume) {
                case 'speak': actionLabel = isCharacter ? 'say' : 'says'; break;
                case 'whisper': actionLabel = isCharacter ? 'whisper' : 'whispers'; break;
                case 'yell': actionLabel = isCharacter ? 'yell' : 'yells'; break;
            }
            
            pkg.gamePanel.appendToChatLog(entityName + ' ' + actionLabel + ': ' + message);
        },
        
        refreshMap: debounce(event => {
            if (!character) return;
            
            cellPool.putActives();
            entityPool.putActives();
            
            entityViewsByEntityId.clear();
            observedLocIds.clear();
            obscuredLocIds.clear();
            
            // Make a lookup table of observed cell IDs. These are Cells that are within your
            // sight distance. This produces a "set" of Cells in a circular shape.
            const originArr = character[FIELD_LOC],
                baseX = originArr[1],
                baseY = originArr[2],
                offsets = cellOffsetsByDistance[character.getSightDistance()];
            if (offsets) {
                let facingFilterFunction;
                switch (character.getFacing()) {
                    case NORTH:facingFilterFunction = (offsetX, offsetY) => offsetY <= 0; break;
                    case SOUTH:facingFilterFunction = (offsetX, offsetY) => offsetY >= 0; break;
                    case EAST: facingFilterFunction = (offsetX, offsetY) => offsetX >= 0; break;
                    case WEST: facingFilterFunction = (offsetX, offsetY) => offsetX <= 0; break;
                }
                
                const locArr = originArr.slice();
                for (const [offsetX, offsetY] of offsets) {
                    if (facingFilterFunction(offsetX, offsetY)) {
                        locArr[1] = baseX + offsetX;
                        locArr[2] = baseY + offsetY;
                        observedLocIds.add(locArrToId(locArr));
                    }
                }
            }
            
            // Make a lookup table of obscured cellIDs. Only observed Cells can be obscured.
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
                        path = getVisibilityPath(x, y, isPosX, isPosY, isYgtX, isYgtNegX);
                    
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
            
            // Render the Cells and Entities
            let posX = 0,
                posY = 0;
            const characterId = character.getId(),
                locArr = originArr.slice(),
                xLimit = cellCountX - mapRangeOffset,
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
                        characterView.updatePosition(posCount++, cellView);
                        gameMap.doCharacterCell(character, cellDatum, cellView);
                    }
                    if (isSeen && len > 0) {
                        for (const entity of entities) {
                            if (entity.getId() !== characterId) {
                                const entityView = entityPool.getInstance();
                                entityView.setEntity(entity);
                                entityView.updatePosition(posCount++, cellView);
                            }
                        }
                    }
                    
                    posY += cellSize;
                }
                posX += cellSize;
                posY = 0;
            }
            
            // Have backgroundImage track the map offset so the background image does not drift
            // as the character moves.
            //gameMap.setImagePosition(-baseX * cellSize + 'px ' + -baseY * cellSize + 'px');
        }, 35)
    });
})(orb);
