(pkg => {
    let gameMap,
        cellPool,
        character;
    
    const JSClass = JS.Class,
        
        mathRound = Math.round,
        
        {View, Reusable, TrackActivesPool, debounce} = myt,
        
        {model} = pkg,
        
        {locArrToId} = common.util,
        
        DISTANCE = 9,
        CELL_SIZE = 32,
        CELL_SIZE_HALF = CELL_SIZE / 2,
        
        Cell = new JS.Class('Cell', View, {
            includes:[Reusable],
            
            
            initNode: function(parent, attrs) {
                const self = this;
                
                attrs.width = attrs.height = CELL_SIZE;
                
                self.callSuper(parent, attrs);
                self.redraw();
            },
            
            setCell: function(v) {
                this.cell = v;
                if (this.inited) this.redraw();
            },
            
            redraw: function() {
                const cell = this.cell || {c:'v1'};
                
                let bgColor;
                switch (cell.c) {
                    case 'v1': bgColor = '#333'; break;
                    case 'a1': bgColor = '#ccf'; break;
                    case 's1': bgColor = '#888'; break;
                    default: bgColor = '#f00'; break;
                }
                
                this.setBgColor(bgColor);
            }
        });
    
    pkg.GameMap = new JS.Class('GameMap', View, {
        // Life Cycle //////////////////////////////////////////////////////////
        initNode: function(parent, attrs) {
            gameMap = this;
            
            attrs.bgColor = '#666';
            attrs.overflow = 'hidden';
            
            gameMap.callSuper(parent, attrs);
            
            cellPool = new TrackActivesPool(Cell, gameMap);
            
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
                        cellDatum = model.getCellDatum(locId),
                        cellView = cellPool.getInstance();
                    
                    cellView.callSetters({x:posX, y:posY, cell:cellDatum});
                    
                    posY += CELL_SIZE;
                }
                posX += CELL_SIZE;
                posY -= CELL_SIZE + 2*DISTANCE*CELL_SIZE;
            }
        }, 50)
    });
})(orb);
