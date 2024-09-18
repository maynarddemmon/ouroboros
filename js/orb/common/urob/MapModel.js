(pkg => {
    const IS_NODEJS = typeof module === 'object' && module.exports;
    
    let tym, JS;
    if (IS_NODEJS) {
        const imported = require('../../../../lib/tym.js');
        JS = imported.JS;
        tym = imported.tym;
    } else {
        JS = global.JS;
        tym = global.myt;
    }
    
    const maps = new Map(),
        
        {getRandomInt} = tym,
        
        // Matter, Energy, Light lookup table for missing Cells
        // FIXME: there are not enough composition types to fill this out correctly
        MEL_LOOKUP = [
            [ // Earth
                [ // Fire
                    ['s1'],['f1'],['v1'] // Light, Shadow, Void
                ],[ // Water
                    ['s1'],['w1'],['v2'] // Light, Shadow, Void
                ],[ // Void
                    ['s1'],['s1'],['v1'] // Light, Shadow, Void
                ]
            ],[ // Air
                [ // Fire
                    ['a1'],['f1'],['v1'] // Light, Shadow, Void
                ],[ // Water
                    ['a2'],['w1'],['v2'] // Light, Shadow, Void
                ],[ // Void
                    ['a1'],['a2'],['v1'] // Light, Shadow, Void
                ]
            ],[ // Void
                [ // Fire
                    ['v1'],['f1'],['v1'] // Light, Shadow, Void
                ],[ // Water
                    ['v2'],['w1'],['v2'] // Light, Shadow, Void
                ],[ // Void
                    ['v1'],['v2'],['v1'] // Light, Shadow, Void
                ]
            ],
        ],
        
        getAsData = cfg => {
            const mapData = {};
            for (const [mapId, mapModel] of maps) {
                mapData[mapId] = mapModel.getAsData(cfg);
            }
            return mapData;
        },
        
        CommonMapModel = new JS.Class('CommonMapModel', tym.Eventable, {
            // Accessors ///////////////////////////////////////////////////////
            setId: function(v) {this.set('id', v, true);},
            getId: function() {return this.id;},
            
            setName: function(v) {this.set('name', v, true);},
            getName: function() {return this.name;},
            
            setDescription: function(v) {this.set('description', v, true);},
            getDescription: function() {return this.description;},
            
            setElements: function(v) {this.set('elements', v, true);},
            getElements: function() {return this.elements;},
            
            
            // Methods /////////////////////////////////////////////////////////
            getMissingCellComposition: function() {
                if (!IS_NODEJS) {
                    console.error('Server only function.');
                    return;
                }
                
                const elements = this.getElements();
                
                let matter = getRandomInt(1,100),
                    energy = getRandomInt(1,100),
                    life = getRandomInt(1,100);
                
                if (matter <= elements.earth) {
                    matter = 0;
                } else if (matter <= elements.earth + elements.air) {
                    matter = 1;
                } else {
                    matter = 2;
                }
                
                if (energy <= elements.fire) {
                    energy = 0;
                } else if (energy <= elements.fire + elements.water) {
                    energy = 1;
                } else {
                    energy = 2;
                }
                
                if (life <= elements.light) {
                    life = 0;
                } else if (life <= elements.light + elements.shadow) {
                    life = 1;
                } else {
                    life = 2;
                }
                
                return MEL_LOOKUP[matter][energy][life];
            },
            
            
            // Persistence and Serialization ///////////////////////////////////
            getAsData: function(cfg) {
                return {
                    name:this.name,
                    description:this.description,
                    elements:this.elements
                };
            },
            
            updateFromData: function(datum) {
                this.setId(datum.id);
                this.setName(datum.name);
                this.setDescription(datum.description);
                this.setElements(datum.elements);
                
                maps.set(this.id, this);
                
                return this;
            }
        });
    
    pkg.map = {
        getMapById:mapId => maps.get('' + mapId),
        clearMapCache: () => {maps.clear();},
        
        // Send all mapData since it doesn't hurt and it's needed when a character changes maps.
        getMapDataForCharacter: character => getAsData({character:character}),
        getAsData:getAsData,
        
        makeMapsFromData: mapData => {
            let count = 0;
            for (const mapId in mapData) {
                const datum = mapData[mapId];
                datum.id = mapId;
                (new CommonMapModel()).updateFromData(datum);
                count++;
            }
            return count;
        },
        
        CommonMapModel:CommonMapModel
    };
})(global.urob);
