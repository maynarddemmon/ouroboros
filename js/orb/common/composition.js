(() => {
    const IS_NODEJS = typeof module === 'object' && module.exports,
        
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
                unk:{
                    name:'Unknown',
                    solidity:0,
                    opacity:1,
                    damping:0
                },
                
                // Void
                v1:{
                    name:'Void',
                    mapColor:'#0ff9',
                    tileUrl:'/img/tile/void.png',
                    solidity:-1,
                    opacity:0.5,
                    damping:0.4
                },
                v2:{
                    name:'Null',
                    mapColor:'#09f9',
                    tileUrl:'/img/tile/null.png',
                    solidity:-1,
                    opacity:0.5,
                    damping:0.4
                },
                v3:{
                    name:'Æthoid',
                    mapColor:'#9ff9',
                    tileUrl:'/img/tile/aethoid.png',
                    solidity:0,
                    opacity:0.25,
                    damping:0.45
                },
                v4:{
                    name:'Æthrull',
                    mapColor:'#09f9',
                    tileUrl:'/img/tile/aethrull.png',
                    solidity:0,
                    opacity:0.25,
                    damping:0.45
                },
                
                // Earth
                s1:{
                    name:'Solid Stone',
                    mapColor:'#0003',
                    tileUrl:'/img/tile/stone_solid.png',
                    solidity:1,
                    opacity:1,
                    damping:0
                },
                
                // Air
                a1:{
                    name:'Open Air',
                    solidity:0,
                    opacity:0.01,
                    damping:0.5
                },
                a2:{
                    name:'Dusty Air',
                    mapColor:'#fea2',
                    solidity:0,
                    opacity:0.05,
                    damping:0.49
                },
                
                // Fire
                f1:{
                    name:'Fire',
                    mapColor:'#f66',
                    tileUrl:'/img/tile/fire.png',
                    solidity:0,
                    opacity:0.5,
                    damping:0.45
                },
                
                // Water
                w1:{
                    name:'Solid Ice',
                    mapColor:'#ccf',
                    tileUrl:'/img/tile/ice_solid.png',
                    solidity:1,
                    opacity:0.5,
                    damping:0.25
                },
                
                
                // Faces
                W1:{
                    name:'Smooth Stone Wall',
                    tileUrl:'/img/tile/stone_wall.png',
                    solidity:1,
                    opacity:1,
                    damping:0.13
                },
                W2:{
                    name:'Rough Stone Wall',
                    tileUrl:'/img/tile/rough_stone_wall.png',
                    solidity:1,
                    opacity:1,
                    damping:0.13
                },
                W3:{
                    name:'Smooth Stone Wall with Door Frame',
                    tileUrl:'/img/tile/stone_wall_door_frame.png',
                    solidity:0.5,
                    opacity:0.25,
                    damping:0.13
                },
                
                C1:{
                    name:'Vaulted Stone Ceiling',
                    solidity:1,
                    opacity:1,
                    damping:0.13
                },
                
                F1:{
                    name:'Stone Floor',
                    tileUrl:'/img/tile/stone_floor.png',
                    solidity:1,
                    opacity:1,
                    damping:0.13
                },
                F2:{
                    name:'Dirt Floor',
                    tileUrl:'/img/tile/dirt_floor.png',
                    solidity:1,
                    opacity:1,
                    damping:0.13
                }
            }
        };
    
    if (IS_NODEJS) {
        module.exports = EXPORT;
    } else {
        global.composition = EXPORT;
    }
})();
