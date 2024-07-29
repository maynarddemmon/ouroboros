(pkg => {
    const {View, Canvas, global:{idle:GlobalIdle}} = myt,
        
        {ceil:mathCeil, floor:mathFloor} = Math,
        
        {
            cfg:{cellsWrapX, cellsWrapY, blockWidth, blockHeight}
        } = pkg;
    
    pkg.GameSpace = new JS.Class('GameSpace', Canvas, {
        // Life Cycle //////////////////////////////////////////////////////////
        initNode: function(parent, attrs) {
            const self = this;
            
            self.offsetX = self.offsetY = 0;
            self.offsetXChangedSinceLastDraw = self.offsetYChangedSinceLastDraw = true;
            self.boundsChanged = false;
            
            attrs.willReadFrequently = true;
            attrs.bgColor = '#000';
            
            self.quickSet(['cells'], attrs);
            
            self.callSuper(parent, attrs);
            self.getIDS().imageRendering = 'pixelated';
            
            self.setRunning(true);
            //setTimeout(() => {self.__gameLoop({value:{delta:10}});}, 100);
        },
        
        
        // Accessors ///////////////////////////////////////////////////////////
        setWidth: function(v) {
            if (this.width !== v) {
                this.callSuper(v);
                this.boundsChanged = true;
            }
        },
        
        setHeight: function(v) {
            if (this.width !== v) {
                this.callSuper(v);
                this.boundsChanged = true;
            }
        },
        
        setRunning: function(v) {
            this[v ? 'attachTo' : 'detachFrom'](GlobalIdle, '__gameLoop', 'idle');
        },
        
        setOffsetX: function(v) {
            if (this.offsetX !== v) {
                this.offsetX = v;
                this.offsetXChangedSinceLastDraw = true;
            }
        },
        
        setOffsetY: function(v) {
            if (this.offsetY !== v) {
                this.offsetY = v;
                this.offsetYChangedSinceLastDraw = true;
            }
        },
        
        
        // Methods /////////////////////////////////////////////////////////////
        __gameLoop: function(idleEvent) {
            //const start = Date.now();
            //this.setOffsetX(this.offsetX - idleEvent.value.delta / 50);
            this.cells.update(idleEvent.value.delta);
            this.draw();
            //console.log(Date.now() - start);
        },
        
        draw: function() {
            const self = this,
                {cells, width, height, offsetXChangedSinceLastDraw, offsetYChangedSinceLastDraw} = self,
                mustPaint = self.boundsChanged || offsetXChangedSinceLastDraw || offsetXChangedSinceLastDraw,
                
                offsetX = mathFloor(self.offsetX),
                offsetY = mathFloor(self.offsetY),
                
                colStart = -mathCeil(offsetX / blockWidth),
                rowStart = -mathCeil(offsetY / blockHeight),
                
                colLimit = mathCeil(width / blockWidth) + colStart,
                rowLimit = mathCeil(height / blockHeight) + rowStart;
            
            // Clear canvas if necessary
            if (
                (!cellsWrapY && offsetYChangedSinceLastDraw) ||
                (!cellsWrapX && offsetXChangedSinceLastDraw)
            ) {
                self.clear();
            }
            
            // Draw cells
            for (let row = rowStart; row < rowLimit + 1; row++) {
                for (let col = colStart; col < colLimit + 1; col++) {
                    const cell = cells.getCell(row, col);
                    if (cell) {
                        let imageData;
                        if (mustPaint) {
                            imageData = cell.draw() ?? cell.getImageData();
                        } else {
                            imageData = cell.draw();
                        }
                        if (imageData) {
                            self.putImageData(imageData, 
                                offsetX + col * blockWidth, 
                                offsetY + row * blockHeight
                            );
                        }
                    }
                }
            }
            
            // Reset
            self.offsetXChangedSinceLastDraw = self.offsetYChangedSinceLastDraw = false;
        }
    });
})(cell);
