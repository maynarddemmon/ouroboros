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
            util:{locArrToId},
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
                // Prevent bad positioning from interrupted animations. Might be able to 
                // avoid this by rewriting using a single easing function.
                if (entityView.getActiveAnimators().length > 0) return;
                
                switch (animationType) {
                    case 'shake':
                        Animator.shakeView(entityView, entityView.x + amount, entityView.x);
                        break;
                    case 'bounce':
                        Animator.bounceView(entityView, entityView.y + amount, entityView.y);
                        break;
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
                locArr = character[FIELD_LOC].slice(),
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
                    
                    posY += cellSize;
                }
                posX += cellSize;
                posY -= mapSize;
            }
        }, 50)
    });
})(orb);
