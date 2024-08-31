(() => {
    const IS_NODEJS = typeof module === 'object' && module.exports;
    
    let tym, JS;
    if (IS_NODEJS) {
        const imported = require('../../../lib/tym.js');
        JS = imported.JS;
        tym = imported.tym;
    } else {
        JS = global.JS;
        tym = global.myt;
    }
    
    const {I18N:{get:I18N}, Eventable} = tym,
        {Module:JSModule, Class:JSClass} = JS,
        
        IMAGE_PREFIX = '/img/tile/',
        
        CompositionTemplate = new JSClass('CompositionTemplate', Eventable, {
            setName: function(v) {this.set('name', v, true);},
            getName: function() {return this.name;},
            
            setMapColor: function(v) {this.set('mapColor', v, true);},
            getMapColor: function() {return this.mapColor;},
            setTileUrl: function(v) {this.set('tileUrl', v, true);},
            getTileUrl: function() {return this.tileUrl;},
            
            setSolidity: function(v) {this.set('solidity', v, true);},
            getSolidity: function() {return this.solidity;},
            setOpacity: function(v) {this.set('opacity', v, true);},
            getOpacity: function() {return this.opacity;},
            setDamping: function(v) {this.set('damping', v, true);},
            getDamping: function() {return this.damping;}
        }),
        
        EXPORT = {
            // Matter, Energy, Light lookup table for missing Cells
            // FIXME: there are not enough composition types to fill this out correctly
            MEL_LOOKUP: [
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
            
            templates:{
                // Unknown
                unk:new CompositionTemplate({
                    name:'Unknown',
                    solidity:0,
                    opacity:1,
                    damping:0
                }),
                
                // Void
                v1:new CompositionTemplate({
                    name:'fathomless void',
                    mapColor:'#0f99',
                    tileUrl:IMAGE_PREFIX + 'void.png',
                    solidity:-1,
                    opacity:0.5,
                    damping:0.4
                }),
                v2:new CompositionTemplate({
                    name:'inconceivable nothingness',
                    mapColor:'#09f9',
                    tileUrl:IMAGE_PREFIX + 'null.png',
                    solidity:-1,
                    opacity:0.5,
                    damping:0.4
                }),
                v3:new CompositionTemplate({
                    name:'Æthoid',
                    mapColor:'#9fc6',
                    tileUrl:IMAGE_PREFIX + 'aethoid.png',
                    solidity:0,
                    opacity:0.25,
                    damping:0.45
                }),
                v4:new CompositionTemplate({
                    name:'Æthrull',
                    mapColor:'#9cf6',
                    tileUrl:IMAGE_PREFIX + 'aethrull.png',
                    solidity:0,
                    opacity:0.25,
                    damping:0.45
                }),
                
                // Earth
                s1:new CompositionTemplate({
                    name:'solid stone',
                    mapColor:'#0003',
                    tileUrl:IMAGE_PREFIX + 'stone_solid.png',
                    solidity:1,
                    opacity:1,
                    damping:0
                }),
                
                // Air
                a1:new CompositionTemplate({
                    name:'clear air',
                    solidity:0,
                    opacity:0.01,
                    damping:0.5
                }),
                a2:new CompositionTemplate({
                    name:'dusty air',
                    mapColor:'#fea2',
                    solidity:0,
                    opacity:0.05,
                    damping:0.5
                }),
                
                // Fire
                f1:new CompositionTemplate({
                    name:'swirling flames',
                    mapColor:'#f66',
                    tileUrl:IMAGE_PREFIX + 'fire.png',
                    solidity:0,
                    opacity:0.5,
                    damping:0.45
                }),
                
                // Water
                w1:new CompositionTemplate({
                    name:'solid ice',
                    mapColor:'#ccf',
                    tileUrl:IMAGE_PREFIX + 'ice_solid.png',
                    solidity:1,
                    opacity:0.5,
                    damping:0.25
                }),
                
                
                // Faces
                W1:new CompositionTemplate({
                    name:'smooth stone wall',
                    tileUrl:IMAGE_PREFIX + 'stone_wall.png',
                    solidity:1,
                    opacity:1,
                    damping:0.13
                }),
                W2:new CompositionTemplate({
                    name:'rough stone wall',
                    tileUrl:IMAGE_PREFIX + 'rough_stone_wall.png',
                    solidity:1,
                    opacity:1,
                    damping:0.13
                }),
                W3:new CompositionTemplate({
                    name:'smooth stone wall with an arched door frame',
                    tileUrl:IMAGE_PREFIX + 'stone_wall_door_frame.png',
                    solidity:0.5,
                    opacity:0.25,
                    damping:0.5
                }),
                W4:new CompositionTemplate({
                    name:'rough stone wall with an arched door frame',
                    tileUrl:IMAGE_PREFIX + 'rough_stone_wall_door_frame.png',
                    solidity:0.5,
                    opacity:0.25,
                    damping:0.5
                }),
                
                C1:new CompositionTemplate({
                    name:'vaulted stone ceiling',
                    solidity:1,
                    opacity:1,
                    damping:0.13
                }),
                
                F1:new CompositionTemplate({
                    name:'stone floor',
                    tileUrl:IMAGE_PREFIX + 'stone_floor.png',
                    solidity:1,
                    opacity:1,
                    damping:0.13
                }),
                F2:new CompositionTemplate({
                    name:'dirt floor',
                    tileUrl:IMAGE_PREFIX + 'dirt_floor.png',
                    solidity:1,
                    opacity:1,
                    damping:0.13
                })
            }
        };
    
    if (IS_NODEJS) {
        module.exports = EXPORT;
    } else {
        global.composition = EXPORT;
    }
})();
