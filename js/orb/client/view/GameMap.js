(pkg => {
    let gameMap,
        cellPool,
        entityPool,
        character;
    
    const JSClass = JS.Class,
        
        mathRound = Math.round,
        
        {View, Reusable, TrackActivesPool, debounce} = myt,
        
        {
            character:{FIELD_LOC},
            util:{locArrToId},
            composition
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
        
        Entity = new JSClass('Entity', View, {
            includes:[Reusable],
            
            setEntity: function(v) {
                this.entity = v;
                
                this.setWidth(entitySizeM);
                this.setHeight(entitySizeM);
                this.setRoundedCorners(entitySizeM / 2);
                this.setBgColor('#f00');
            },
            
            updatePosition: function(position) {
                const entityLocId = locArrToId(this.entity[FIELD_LOC]),
                    cell = getCellViewForLocId(entityLocId);
                if (cell) {
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
                    this.setX(cell.x + adjX);
                    this.setY(cell.y + adjY);
                }
            }
        }),
        
        Cell = new JSClass('Cell', View, {
            includes:[Reusable],
            
            initNode: function(parent, attrs) {
                attrs.width = attrs.height = cellSize;
                this.callSuper(parent, attrs);
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
                    cellComposition = composition[cell.c];
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
            
            cellPool = new TrackActivesPool(Cell, gameMap);
            entityPool = new TrackActivesPool(Entity, gameMap);
            
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
        refreshMap: debounce(() => {
            cellPool.putActives();
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
                        cellDatum = model.getCellDatum(locId) ?? {locId:locId, c:myt.getRandomInt(1,2) > 1 ? 'v1' : 'v2'},
                        cellView = cellPool.getInstance();
                    
                    cellView.callSetters({x:posX, y:posY, cell:cellDatum});
                    
                    posY += cellSize;
                }
                posX += cellSize;
                posY -= mapSize;
            }
            
            // Update Entitites
            entityPool.putActives();
            
            const characterView = entityPool.getInstance();
            characterView.setEntity(character);
            characterView.updatePosition('center');
            
            // FIXME other entities
        }, 50)
    });
})(orb);
