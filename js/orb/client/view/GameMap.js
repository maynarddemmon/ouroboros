(pkg => {
    let gameMap,
        cellPool,
        entityPool,
        chatBubblePool,
        character,
        cellCountX,
        cellCountY;
    
    const JSClass = JS.Class,
        
        {min:mathMin, ceil:mathCeil} = Math,
        
        {
            View, PaddedText, ImageSupport, Reusable, MouseOverAndDown, TrackActivesPool, 
            Animator, TransformSupport,
            debounce, getRandomInt
        } = myt,
        
        {
            cellOffsetsByDistance, getVisibilityPath, getComposition, getFixtureTemplate,
            locArrToId, locIdToArr,
            facings:{NORTH, SOUTH, EAST, WEST, SELF, getOppositeDirection},
        } = common,
        
        {
            model,
            cfg:{mapRangeOffset, cellSize, entitySizeM}
        } = pkg,
        
        FACE_OVERAGE = 4,
        
        QUIET_ADVERBS = ['quiet','faint','muted','muffled','soft','low'],
        QUIET_VOCALIZATION_ADVERBS = [...QUIET_ADVERBS, 'hushed'],
        
        MOVEMENT_SOUND_VERBS = ['tapping','scraping','shuffling','creaking','ticking','scuffing'],
        VOCALIZATION_SOUND_VERBS = ['murmuring','mumbling','muttering','wailing','moaning','whispering','whimpering','breathing'],
        
        getRandomArrayValue = array => array[getRandomInt(0, array.length - 1)],
        
        /* A Map of EntityView instances by entity ID. */
        entityViewsByEntityId = new Map(),
        
        /* A Map of CellViews by location ID. */
        cellViewsByLocId = new Map(),
        
        observedLocIds = new Set(), // Reused inside the render function.
        obscuredLocIds = new Set(), // Reused inside the render function.
        
        /* z-index reference
             1: FaceView (bottom)
             2: FaceViews (others)
             3: FixturesViews
            10: _observedOverlay (shadow for obscured and not observed cells)
            20: EntityViews
            21: ChatBubbleViews
            ---
            100: overlays in GamePanel.js
            101: cell highlight in GamePanel.js
            102: entity highlight in GamePanel.js
        */
        
        ChatBubbleView = new JSClass('ChatBubbleView', PaddedText, {
            include:[Reusable],
            
            initNode: function(parent, attrs) {
                attrs.pointerEvents = 'none';
                
                attrs.zIndex = 21;
                attrs.boxShadow ??= [0,0,8,'#000'];
                attrs.roundedCorners ??= 6;
                attrs.padding ??= 6;
                attrs.whiteSpace ??= 'normal';
                
                this.callSuper(parent, attrs);
                
                this.getIDS().maxWidth = '160px';
            },
            
            clean: function() {
                this.setVisible(false);
            },
            
            reposition: function() {
                const self = this,
                    entity = self.entity,
                    locId = self.locId,
                    anchorView = entityViewsByEntityId.get(entity.getId()) ?? cellViewsByLocId.get(locId);
                if (anchorView) {
                    self.setX(anchorView.x - (self.width - anchorView.width) / 2);
                    self.setY(anchorView.y - self.height - 6);
                    return true;
                } else {
                    chatBubblePool.putInstance(self);
                    return false;
                }
            },
            
            configure: function(msg, type, entity, locId) {
                const self = this;
                
                self.entity = entity;
                self.locId = locId;
                
                self.setVisible(true);
                self.setText(msg);
                
                if (self.reposition()) {
                    self.setBgColor(type === 'vocalize' ? '#fffc' : '#666c');
                    self.setTextColor(type === 'vocalize' ? '#000' : '#fff');
                    
                    self.stopActiveAnimators('opacity');
                    self.setOpacity(1);
                    
                    const duration = 1500 + mathMin(msg.length * 50, 2500);
                    self.animate({attribute:'opacity', to:0, duration:duration, easingFunction:'inExpo'}).next(success => {
                        chatBubblePool.putInstance(self);
                    });
                }
            }
        }),
        
        EntityView = new JSClass('EntityView', View, {
            include:[Reusable, MouseOverAndDown],
            
            initNode: function(parent, attrs) {
                this.mouseOver = this.mouseDown = false;
                
                attrs.zIndex = 20;
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
        
        FixtureView = new JSClass('FixtureView', View, {
            include:[ImageSupport],
            
            initNode: function(parent, attrs) {
                attrs.width = attrs.height = cellSize;
                attrs.imageSize = 'contain';
                
                this.callSuper(parent, attrs);
            },
            
            clean: function() {
                this.setVisible(false);
            },
            
            update: function(fixture) {
                if (fixture) {
                    this.setVisible(true);
                    this.setImageUrl(fixture.getTemplateUrl(character) ?? null);
                } else {
                    this.setImageUrl(null);
                }
            }
        }),
        
        FixturesView = new JSClass('FixturesView', View, {
            initNode: function(parent, attrs) {
                attrs.width = attrs.height = cellSize;
                attrs.pointerEvents = 'none';
                attrs.zIndex ??= 3;
                this.callSuper(parent, attrs);
                this.fixturesPool = new TrackActivesPool(FixtureView, this);
            },
            
            update: function(fixturesContainerModel) {
                const fixturesPool = this.fixturesPool;
                fixturesPool.putActives();
                
                if (fixturesContainerModel?.size > 0) {
                    for (const [,fixture] of fixturesContainerModel) {
                        fixturesPool.getInstance().update(fixture);
                    }
                }
            }
        }),
        
        FaceView = new JSClass('FaceView', View, {
            include:[ImageSupport],
            
            initNode: function(parent, attrs) {
                attrs.x = attrs.y = -FACE_OVERAGE/2;
                attrs.width = attrs.height = cellSize + FACE_OVERAGE;
                attrs.pointerEvents = 'none';
                attrs.imageSize = 'contain';
                attrs.zIndex ??= 2;
                
                const rotation = attrs.rotation;
                delete attrs.rotation;
                
                this.callSuper(parent, attrs);
                if (rotation) this.getIDS().transform = 'rotate(' + rotation + 'deg)';
                
                this._fixtures = new FixturesView(this, {x:-this.x, y:-cellSize/2 -this.y});
            },
            
            update: function(face) {
                this.setImageUrl(face?.getCompositionObject()?.getTileUrl() ?? null);
                this._fixtures.update(face?.getFixturesMap());
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
                
                this._bFace = new FaceView(this, {zIndex:1});
                this._nFace = new FaceView(this, {});
                this._sFace = new FaceView(this, {rotation:180});
                this._eFace = new FaceView(this, {rotation:90});
                this._wFace = new FaceView(this, {rotation:270});
                
                this._fixtures = new FixturesView(this);
                
                this._observedOverlay = new View(this, {width:cellSize, height:cellSize, bgColor:'#0008', pointerEvents:'none', zIndex:10});
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
                    this.setVisible(true);
                    
                    let compId, fixtures, bFace, nFace, sFace, eFace, wFace;
                    if (cell.hasBeenSeen()) {
                        compId = cell.getComposition();
                        fixtures = cell.getFixturesMap();
                        
                        bFace = cell.getB();
                        nFace = cell.getN();
                        sFace = cell.getS();
                        eFace = cell.getE();
                        wFace = cell.getW();
                    } else {
                        compId = 'unk';
                        const partsSeen = cell.partsSeen;
                        if (partsSeen.size > 0) {
                            for (const part of partsSeen) {
                                switch (part) {
                                    case NORTH:
                                        nFace = cell.getN();
                                        break;
                                    case SOUTH:
                                        sFace = cell.getS();
                                        break;
                                    case EAST:
                                        eFace = cell.getE();
                                        break;
                                    case WEST:
                                        wFace = cell.getW();
                                        break;
                                    case SELF: // Cell composition
                                        compId = cell.getComposition();
                                        fixtures = cell.getFixturesMap();
                                        break;
                                }
                            }
                        }
                    }
                    
                    const comp = getComposition(compId);
                    this.setImageUrl(comp.getTileUrl());
                    this.setBgColor(comp.getMapColor() ?? 'transparent');
                    this._fixtures.update(fixtures);
                    
                    this._bFace.update(bFace);
                    this._nFace.update(nFace);
                    this._sFace.update(sFace);
                    this._eFace.update(eFace);
                    this._wFace.update(wFace);
                    
                    cellViewsByLocId.set(cell.locId, this);
                }
            },
            
            setIsSeen: function(v) {
                const isSeen = this.isSeen = v;
                this._observedOverlay?.setVisible(!isSeen);
            }
        });
    
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
            chatBubblePool = new TrackActivesPool(ChatBubbleView, gameMap);
            
            gameMap.constrain('refreshMap', [
                model, 'cellsChanged', model, 'mapsChanged', model, 'entityChanged'
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
        doCharacterCell: (character, cell) => {},
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
        
        propogateValue: (startLocId, value, threshold, endLocId) => {
            // Succeed Fast when the value originates in the same Cell.
            if (startLocId === endLocId) {
                return value * model.getCell(startLocId).getAffectedValue('damping');
            }
            
            const startCell = model.getCell(startLocId),
                endCell = model.getCell(endLocId);
            
            let retval;
            
            const storeToValue = (to, cell, compassDirection, locArr, value) => {
                value *= cell.getFaceForDirection(compassDirection)?.getAffectedValue('damping') ?? 1;
                if (value > threshold) {
                    const nextCell = model.getCellByLocArr(locArr);
                    if (!nextCell) return;
                    value *= nextCell.getFaceForOppositeDirection(compassDirection)?.getAffectedValue('damping') ?? 1;
                    if (value > threshold) {
                        const existingToEntry = to.get(nextCell);
                        if (existingToEntry == null || existingToEntry < value) {
                            to.set(nextCell, value);
                            if (nextCell === endCell && (retval == null || value > retval)) {
                                retval = value;
                            }
                        }
                    }
                }
            };
            const propogate = from => {
                const to = new Map();
                for (const [cell, fromValue] of from) {
                    const toValue = fromValue * cell.getAffectedValue('damping');
                    if (toValue > threshold) {
                        const locArr = cell.getLocArr(true);
                        locArr[1] -= 1;
                        storeToValue(to, cell, WEST, locArr, toValue);
                        locArr[1] += 2;
                        storeToValue(to, cell, EAST, locArr, toValue);
                        locArr[1] -= 1;
                        locArr[2] -= 1;
                        storeToValue(to, cell, NORTH, locArr, toValue);
                        locArr[2] += 2;
                        storeToValue(to, cell, SOUTH, locArr, toValue);
                    }
                }
                if (to.size > 0) propogate(to);
            };
            
            const from = new Map();
            from.set(startCell, value);
            propogate(from);
            
            return retval ?? 0;
        },
        
        handleSoundMessage: socketMsg => {
            const {locId, from, type, volume, message} = socketMsg,
                AUDIBLE_THRESHOLD = 0.5,
                effectiveVolume = gameMap.propogateValue(locId, volume, AUDIBLE_THRESHOLD, locArrToId(character.getLocArr()));
            
            if (effectiveVolume <= AUDIBLE_THRESHOLD) {
                // Sound to low to hear.
                return;
            }
            
            const isGarbled = effectiveVolume < 1,
                entity = model.getEntityById(from);
            let entityName = '',
                isMyCharacter = false;
            if (entity) {
                if (entity === character) {
                    isMyCharacter = true;
                    entityName = 'You';
                } else {
                    if (!isGarbled) entityName = entity.name ?? '<i>Entity ' + from + '</i>';
                }
            }
            
            let actionLabel = '',
                msgHeard = message;
            switch (type) {
                case 'move':
                    if (isGarbled) {
                        msgHeard = '*' + getRandomArrayValue(QUIET_ADVERBS) + ' ' + getRandomArrayValue(MOVEMENT_SOUND_VERBS) + '*';
                    }
                    break;
                case 'vocalize':
                    if (isGarbled) {
                        msgHeard = '*' + getRandomArrayValue(QUIET_VOCALIZATION_ADVERBS) + ' ' + getRandomArrayValue(VOCALIZATION_SOUND_VERBS) + '*';
                    } else {
                        if (volume >= 1<<7) {
                            actionLabel = isMyCharacter ? 'yell' : 'yells';
                        } else if (volume >= 1<<3) {
                            actionLabel = isMyCharacter ? 'say' : 'says';
                        } else {
                            actionLabel = isMyCharacter ? 'whisper' : 'whispers';
                        }
                        actionLabel = ' ' + actionLabel;
                    }
                    break;
            }
            
            let chatMsg = entityName + actionLabel;
            chatMsg += (chatMsg ? ': ' : '') + msgHeard;
            
            pkg.gamePanel.appendToChatLog(chatMsg);
            if (entity) {
                chatBubblePool.getInstance().configure(chatMsg, type, entity, locId);
            }
        },
        
        refreshMap: debounce(event => {
            if (!character) return;
            
            cellPool.putActives();
            entityPool.putActives();
            
            cellViewsByLocId.clear();
            entityViewsByEntityId.clear();
            observedLocIds.clear();
            obscuredLocIds.clear();
            
            // Make a lookup table of observed cell IDs. These are Cells that are within your
            // sight distance. This produces a "set" of Cells in a circular shape.
            const originArr = character.getLocArr(),
                originCell = model.getCellByLocArr(originArr),
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
                const cell = model.getCell(locId);
                if (cell) {
                    const observedLocArr = cell.getLocArr(),
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
                            yAdj = isNotFlipped ? (isPosY ? 1 : -1) : (isPosX ? 1 : -1),
                            
                            DIR_UP = isNotFlipped ? (isPosY ? SOUTH : NORTH) : (isPosX ? EAST : WEST),
                            DIR_OVER = isNotFlipped ? (isPosX ? EAST : WEST) : (isPosY ? SOUTH : NORTH);
                        
                        let opacityTotal = 0,
                            prevCell = originCell;
                        const isCellObscured = (locArrToCheck, isUp) => {
                            const cellToCheck = model.getCellByLocArr(locArrToCheck);
                            if (cellToCheck) {
                                const direction = isUp ? DIR_UP : DIR_OVER;
                                // Check face in the cell we just left
                                if (prevCell) {
                                    face = prevCell.getFaceForDirection(direction);
                                    if (face) {
                                        opacityTotal += face.getAffectedValue('opacity');
                                        if (opacityTotal >= 1) return true;
                                    }
                                }
                                prevCell = cellToCheck;
                                
                                // Check face within the current cell we are checking
                                face = cellToCheck.getFaceForOppositeDirection(direction);
                                if (face) {
                                    opacityTotal += face.getAffectedValue('opacity');
                                    if (opacityTotal >= 1) {
                                        cellToCheck.partsSeen.add(getOppositeDirection(direction));
                                        return true;
                                    }
                                }
                                
                                // Check cell itself
                                opacityTotal += cellToCheck.getAffectedValue('opacity');
                                if (opacityTotal >= 1) {
                                    cellToCheck.partsSeen.add(SELF); // Indicates we should show the Cell composition
                                    return true;
                                } else {
                                    return false;
                                }
                            }
                            return true;
                        };
                        
                        const isObscured = (depth, firstZZ, zzOptA) => {
                            let retval = false;
                            switch (path[depth]) {
                                case 'up':
                                    // Up only
                                    locArrToCheck[yIdx] += yAdj;
                                    retval = isCellObscured(locArrToCheck, true);
                                    break;
                                case 'uo':
                                    // Up...
                                    locArrToCheck[yIdx] += yAdj;
                                    retval = isCellObscured(locArrToCheck, true);
                                    if (!retval) {
                                        // ...and Over
                                        locArrToCheck[xIdx] += xAdj;
                                        retval = isCellObscured(locArrToCheck, false);
                                    }
                                    break;
                                case 'zz':
                                    // Zig: up and over (option A) OR over and up (option B). 
                                    // Keep the same option once chosen.
                                    if (firstZZ) {
                                        const optBX = locArrToCheck[1],
                                            optBY = locArrToCheck[2],
                                            optBOpacityTotal = opacityTotal,
                                            optBPrevCell = prevCell;
                                        retval = isObscured(depth, false, true);
                                        
                                        // If option A was obscured try option B.
                                        if (retval) {
                                            locArrToCheck[1] = optBX;
                                            locArrToCheck[2] = optBY;
                                            opacityTotal = optBOpacityTotal;
                                            prevCell = optBPrevCell;
                                            retval = isObscured(depth, false, false);
                                        }
                                        return retval;
                                    } else if (zzOptA) {
                                        // Up...
                                        locArrToCheck[yIdx] += yAdj;
                                        retval = isCellObscured(locArrToCheck, true);
                                        if (!retval) {
                                            // ...and Over
                                            locArrToCheck[xIdx] += xAdj;
                                            retval = isCellObscured(locArrToCheck, false);
                                        }
                                    } else {
                                        // Over...
                                        locArrToCheck[xIdx] += xAdj;
                                        retval = isCellObscured(locArrToCheck, false);
                                        if (!retval) {
                                            // ... and Up
                                            locArrToCheck[yIdx] += yAdj;
                                            retval = isCellObscured(locArrToCheck, true);
                                        }
                                    }
                                    break;
                            }
                            
                            if (retval) {
                                return true;
                            } else if (depth < len) {
                                return isObscured(++depth, firstZZ, zzOptA);
                            } else {
                                return false;
                            }
                        };
                        
                        if (isObscured(0, true, true)) obscuredLocIds.add(locId);
                    }
                } else {
                    // Cells that don't exist yet are always considered obscured.
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
                        cell = model.getCell(locId) ?? model.makeUnknownCell(locId),
                        cellView = cellPool.getInstance();
                    
                    if (isSeen) cell.setBeenSeen(true);
                    
                    cellView.callSetters({x:posX, y:posY, cell:cell, isSeen:isSeen});
                    
                    const entities = cell.getEntities(),
                        len = entities?.length;
                    let posCount = len > 1 ? 1 : 0;
                    if (x === 0 && y === 0) {
                        const characterView = entityPool.getInstance();
                        characterView.setEntity(character);
                        characterView.updatePosition(posCount++, cellView);
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
            
            // Update ChatBubbles
            for (const bubble of chatBubblePool.getActives()) {
                bubble.reposition();
            }
            
            // Update available actions for Character's current location
            if (originCell) gameMap.doCharacterCell(character, originCell);
            
            // Have backgroundImage track the map offset so the background image does not drift
            // as the character moves.
            //gameMap.setImagePosition(-baseX * cellSize + 'px ' + -baseY * cellSize + 'px');
        }, 35)
    });
})(orb);
