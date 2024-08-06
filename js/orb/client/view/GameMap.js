(pkg => {
    let gameMap,
        cellPool,
        entityPool,
        character;
    
    const JSClass = JS.Class,
        
        mathRound = Math.round,
        
        {View, Reusable, TrackActivesPool, debounce} = myt,
        
        {model} = pkg,
        
        {locArrToId} = common.util,
        
        DISTANCE = 9,
        CELL_SIZE = 32,
        CELL_SIZE_HALF = CELL_SIZE / 2,
        
        ENTITY_SIZE_CHARACTER = 16,
        
        cellViewsByLocId = new Map(),
        
        getCellViewForLocId = locId => {
            return cellViewsByLocId.get(locId);
        },
        
        Entity = new JSClass('Entity', View, {
            includes:[Reusable],
            
            setEntity: function(v) {
                this.entity = v;
                
                this.setWidth(ENTITY_SIZE_CHARACTER);
                this.setHeight(ENTITY_SIZE_CHARACTER);
                this.setRoundedCorners(ENTITY_SIZE_CHARACTER / 2);
                this.setBgColor('#f00');
            },
            
            updatePosition: function(position) {
                const entityLocId = locArrToId(this.entity.loc),
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
                            adjX = CELL_SIZE_HALF - this.width / 2;
                            adjY = CELL_SIZE_HALF - this.height / 2;
                    }
                    this.setX(cell.x + adjX);
                    this.setY(cell.y + adjY);
                }
            }
        }),
        
        Cell = new JSClass('Cell', View, {
            includes:[Reusable],
            
            initNode: function(parent, attrs) {
                attrs.width = attrs.height = CELL_SIZE;
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
                const cell = this.cell || {c:'v1'};
                
                let bgColor;
                switch (cell.c) {
                    case 'v1': bgColor = '#333'; break;
                    case 'a1': bgColor = '#ccf'; break;
                    case 's1': bgColor = '#888'; break;
                    default: bgColor = '#800'; break;
                }
                
                this.setBgColor(bgColor);
            }
        });
    
    pkg.GameMap = new JSClass('GameMap', View, {
        // Life Cycle //////////////////////////////////////////////////////////
        initNode: function(parent, attrs) {
            gameMap = pkg.gameMap = this;
            
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
                locArr = character.loc,
                locArrCopy = locArr.slice(),
                posStartAdj = CELL_SIZE_HALF + (DISTANCE * CELL_SIZE);
                
            let posX = centerX - posStartAdj,
                posY = centerY - posStartAdj;
            for (let x = -DISTANCE; x <= DISTANCE; x++) {
                locArrCopy[1] = locArr[1] + x;
                for (let y = -DISTANCE; y <= DISTANCE; y++) {
                    locArrCopy[2] = locArr[2] + y;
                    
                    const locId = locArrToId(locArrCopy),
                        cellDatum = model.getCellDatum(locId) ?? {locId:locId},
                        cellView = cellPool.getInstance();
                    
                    cellView.callSetters({x:posX, y:posY, cell:cellDatum});
                    
                    posY += CELL_SIZE;
                }
                posX += CELL_SIZE;
                posY -= CELL_SIZE + 2*DISTANCE*CELL_SIZE;
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
