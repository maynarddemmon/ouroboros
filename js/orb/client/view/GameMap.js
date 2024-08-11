(pkg => {
    let gameMap,
        cellPool,
        entityPool,
        character;
    
    const JSClass = JS.Class,
        
        mathRound = Math.round,
        
        {View, Reusable, MouseOverAndDown, TrackActivesPool, debounce} = myt,
        
        {
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
        
        cellViewsByLocId = new Map(),
        getCellViewForLocId = locId => cellViewsByLocId.get(locId),
        
        EntityView = new JSClass('EntityView', View, {
            include:[Reusable, MouseOverAndDown],
            
            initNode: function(parent, attrs) {
                this.mouseOver = this.mouseDown = false;
                
                attrs.zIndex = 2;
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
                const entity = this.entity = v;
                
                this.setWidth(entitySizeM);
                this.setHeight(entitySizeM);
                this.setRoundedCorners(entitySizeM / 2);
                
                let bgColor = '#f00',
                    zIndex = 2;
                if (entity === character) {
                    bgColor = '#ff0';
                    zIndex = 3;
                } else if (entity.isSpirit?.()) {
                    bgColor = '#00f';
                }
                
                this.setVisible(true);
                this.setBgColor(bgColor);
                this.setZIndex(zIndex);
            },
            
            setCellView: function(v) {
                this.cellView = v;
            },
            
            updatePosition: function(position, cellView) {
                if (cellView) {
                    let adjX = 0,
                        adjY = 0;
                    switch (position) {
                        case 'top':
                            break;
                        case 'right':
                            break;
                        case 'bottom':
                            break;
                        case 'left':
                            break;
                        
                        case 'topRight':
                            break;
                        case 'topLeft':
                            break;
                        case 'bottomRight':
                            break;
                        case 'bottomLeft':
                            break;
                        
                        case 'center':
                        default:
                            adjX = halfCellSize - this.width / 2;
                            adjY = halfCellSize - this.height / 2;
                    }
                    this.setX(cellView.x + adjX);
                    this.setY(cellView.y + adjY);
                }
            }
        }),
        
        CellView = new JSClass('CellView', View, {
            include:[Reusable, MouseOverAndDown],
            
            initNode: function(parent, attrs) {
                this.mouseOver = this.mouseDown = false;
                
                attrs.width = attrs.height = cellSize;
                this.callSuper(parent, attrs);
            },
            
            clean: function() {
                this.setVisible(false);
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
                if (cell) {
                    cellViewsByLocId.set(cell.locId, this);
                }
                if (this.inited) this.redraw();
            },
            
            redraw: function() {
                const cell = this.cell,
                    cellComposition = composition[cell[FIELD_COMPOSITION]];
                this.setVisible(true);
                this.setBgColor(cellComposition.mapColor);
            }
        });
    
    pkg.GameMap = new JSClass('GameMap', View, {
        // Life Cycle //////////////////////////////////////////////////////////
        initNode: function(parent, attrs) {
            gameMap = pkg.gameMap = this;
            
            attrs.width = attrs.height = mapSize;
            attrs.bgColor = '#666';
            attrs.overflow = 'hidden';
            
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
        
        refreshMap: debounce(() => {
            if (!character) return;
            
            cellPool.putActives();
            entityPool.putActives();
            cellViewsByLocId.clear();
            
            const centerX = mathRound(gameMap.width / 2),
                centerY = mathRound(gameMap.height / 2),
                locArr = character[FIELD_LOC],
                locArrCopy = locArr.slice(),
                posStartAdj = halfMapSize;
                
            let posX = centerX - posStartAdj,
                posY = centerY - posStartAdj;
            for (let x = -mapRange; x <= mapRange; x++) {
                locArrCopy[1] = locArr[1] + x;
                for (let y = -mapRange; y <= mapRange; y++) {
                    locArrCopy[2] = locArr[2] + y;
                    
                    const locId = locArrToId(locArrCopy),
                        cellDatum = model.getCellDatum(locId) ?? {locId:locId, [FIELD_COMPOSITION]:myt.getRandomInt(1,2) > 1 ? 'v1' : 'v2'},
                        cellView = cellPool.getInstance();
                    
                    cellView.callSetters({x:posX, y:posY, cell:cellDatum});
                    
                    const entities = cellDatum[FIELD_ENTITIES];
                    if (entities) {
                        for (const entityDatum of entities) {
                            const entityView = entityPool.getInstance(),
                                entityModel = model.makeEntityFromData(entityDatum);
                            entityView.setEntity(entityModel);
                            entityView.setCellView(cellView);
                            entityView.updatePosition('center', cellView);
                        }
                    }
                    
                    if (x === 0 && y === 0) {
                        const characterView = entityPool.getInstance();
                        characterView.setEntity(character);
                        characterView.setCellView(cellView);
                        characterView.updatePosition('center', cellView);
                        
                        gameMap.doCharacterCell(character, cellDatum, cellView);
                    }
                    
                    posY += cellSize;
                }
                posX += cellSize;
                posY -= mapSize;
            }
        }, 50)
    });
})(orb);
