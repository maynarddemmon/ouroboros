(pkg => {
    const mathAbs = Math.abs,
        
        /*  The following are concentric rings of x,y offsets form an origin cell. The rings and
            circles can be used to find other cells relative to an origin cell.
            
            The numbers below correspond to the RING_X defined afterwards.
            
            |              99999
            |           99988888999
            |          9988777778899
            |         998776666677899
            |        99876655555667899
            |        98766554445566789
            |        98765443334456789
            |       9876554322234556789
            |       9876543221223456789
            |       9876543210123456789
            |       9876543221223456789
            |       9876554322234556789
            |        98765443334456789
            |        98766554445566789
            |        99876655555667899
            |         998776666677899
            |          9988777778899
            |           99988888999
            |              99999
        */
        
        RING_0 = [[0,0]],
        RING_1 = (() => {
            let x = -1, y = 1;
            return [
                [++x,y],
                [++x,--y],
                [--x,--y],
                [--x,++y]
            ];
        })(),
        RING_2 = (() => {
            let x = -1, y = 2;
            return [
                //   r       r       d       r
                [++x,y],[++x,y],[x,--y],[++x,y],
                [x,--y],[x,--y],[--x,y],[x,--y],
                [--x,y],[--x,y],[x,++y],[--x,y],
                [x,++y],[x,++y],[++x,y],[x,++y]
            ];
        })(),
        RING_3 = (() => {
            let x = -1, y = 3;
            return [
                //   r       r        dr        dr
                [++x,y],[++x,y],[++x,--y],[++x,--y],
                [x,--y],[x,--y],[--x,--y],[--x,--y],
                [--x,y],[--x,y],[--x,++y],[--x,++y],
                [x,++y],[x,++y],[++x,++y],[++x,++y]
            ];
        })(),
        RING_4 = (() => {
            let x = -1, y = 4;
            return [
                //   r       r        dr       r       d        dr
                [++x,y],[++x,y],[++x,--y],[++x,y],[x,--y],[++x,--y],
                [x,--y],[x,--y],[--x,--y],[x,--y],[--x,y],[--x,--y],
                [--x,y],[--x,y],[--x,++y],[--x,y],[x,++y],[--x,++y],
                [x,++y],[x,++y],[++x,++y],[x,++y],[++x,y],[++x,++y]
            ];
        })(),
        RING_5 = (() => {
            let x = -1, y = 5;
            return [
                //   r       r       r       d       r        dr       d       r       d
                [++x,y],[++x,y],[++x,y],[x,--y],[++x,y],[++x,--y],[x,--y],[++x,y],[x,--y],
                [x,--y],[x,--y],[x,--y],[--x,y],[x,--y],[--x,--y],[--x,y],[x,--y],[--x,y],
                [--x,y],[--x,y],[--x,y],[x,++y],[--x,y],[--x,++y],[x,++y],[--x,y],[x,++y],
                [x,++y],[x,++y],[x,++y],[++x,y],[x,++y],[++x,++y],[++x,y],[x,++y],[++x,y]
            ];
        })(),
        RING_6 = (() => {
            let x = -1, y = 6;
            return [
                //   r       r       r        dr       r       d       r       d        dr       d
                [++x,y],[++x,y],[++x,y],[++x,--y],[++x,y],[x,--y],[++x,y],[x,--y],[++x,--y],[x,--y],
                [x,--y],[x,--y],[x,--y],[--x,--y],[x,--y],[--x,y],[x,--y],[--x,y],[--x,--y],[--x,y],
                [--x,y],[--x,y],[--x,y],[--x,++y],[--x,y],[x,++y],[--x,y],[x,++y],[--x,++y],[x,++y],
                [x,++y],[x,++y],[x,++y],[++x,++y],[x,++y],[++x,y],[x,++y],[++x,y],[++x,++y],[++x,y]
            ];
        })(),
        RING_7 = (() => {
            let x = -1, y = 7;
            return [
                //   r       r       r        dr       r        dr        dr       d        dr      d
                [++x,y],[++x,y],[++x,y],[++x,--y],[++x,y],[++x,--y],[++x,--y],[x,--y],[++x,--y],[x,--y],
                [x,--y],[x,--y],[x,--y],[--x,--y],[x,--y],[--x,--y],[--x,--y],[--x,y],[--x,--y],[--x,y],
                [--x,y],[--x,y],[--x,y],[--x,++y],[--x,y],[--x,++y],[--x,++y],[x,++y],[--x,++y],[x,++y],
                [x,++y],[x,++y],[x,++y],[++x,++y],[x,++y],[++x,++y],[++x,++y],[++x,y],[++x,++y],[++x,y]
            ];
        })(),
        RING_8 = (() => {
            let x = -1, y = 8;
            return [
                //   r       r       r        dr       r        dr        dr        dr       d        dr      d
                [++x,y],[++x,y],[++x,y],[++x,--y],[++x,y],[++x,--y],[++x,--y],[++x,--y],[x,--y],[++x,--y],[x,--y],
                [x,--y],[x,--y],[x,--y],[--x,--y],[x,--y],[--x,--y],[--x,--y],[--x,--y],[--x,y],[--x,--y],[--x,y],
                [--x,y],[--x,y],[--x,y],[--x,++y],[--x,y],[--x,++y],[--x,++y],[--x,++y],[x,++y],[--x,++y],[x,++y],
                [x,++y],[x,++y],[x,++y],[++x,++y],[x,++y],[++x,++y],[++x,++y],[++x,++y],[++x,y],[++x,++y],[++x,y]
            ];
        })(),
        RING_9 = (() => {
            let x = -1, y = 9;
            return [
                //   r       r       r        dr       r       r       d       r       d       r       d       r       d       d        dr       d
                [++x,y],[++x,y],[++x,y],[++x,--y],[++x,y],[++x,y],[x,--y],[++x,y],[x,--y],[++x,y],[x,--y],[++x,y],[x,--y],[x,--y],[++x,--y],[x,--y],
                [x,--y],[x,--y],[x,--y],[--x,--y],[x,--y],[x,--y],[--x,y],[x,--y],[--x,y],[x,--y],[--x,y],[x,--y],[--x,y],[--x,y],[--x,--y],[--x,y],
                [--x,y],[--x,y],[--x,y],[--x,++y],[--x,y],[--x,y],[x,++y],[--x,y],[x,++y],[--x,y],[x,++y],[--x,y],[x,++y],[x,++y],[--x,++y],[x,++y],
                [x,++y],[x,++y],[x,++y],[++x,++y],[x,++y],[x,++y],[++x,y],[x,++y],[++x,y],[x,++y],[++x,y],[x,++y],[++x,y],[++x,y],[++x,++y],[++x,y]
            ];
        })(),
        
        CIRCLE_0 = RING_0,
        CIRCLE_1 = [...CIRCLE_0, ...RING_1],
        CIRCLE_2 = [...CIRCLE_1, ...RING_2],
        CIRCLE_3 = [...CIRCLE_2, ...RING_3],
        CIRCLE_4 = [...CIRCLE_3, ...RING_4],
        CIRCLE_5 = [...CIRCLE_4, ...RING_5],
        CIRCLE_6 = [...CIRCLE_5, ...RING_6],
        CIRCLE_7 = [...CIRCLE_6, ...RING_7],
        CIRCLE_8 = [...CIRCLE_7, ...RING_8],
        CIRCLE_9 = [...CIRCLE_8, ...RING_9],
        
        /*  These are "paths" to walk from an origin cell that correspond to what a character
            could see. They are used to determine if the character's view is blocked or not.
            The paths are for 1/8 of a circle so the will need to be flipped/translated to cover
            the entire circle. The definitions below are based on arc of the circle between the
            positive y-axis and the line x=y.
            
            There are three types of commands for each "step" in the walk.
            
                up - Walk upwards +y
                uo - Walk up and over +y -> +x
                zz - ZigZag which means walk up and over (option A) OR walk over and up (option B). 
                     Both options may be explored. Subsequent zigzags will be walked using the same 
                     option. Generally zigzags are found on or close to the x=y line.
                     
            These paths are only defined for the 1/8 segment of a CIRCLE_9.
         */
        VISIBILITY_PATHS = [
            [,
                ['up'],
                ['up', 'up'],
                ['up', 'up', 'up'],
                ['up', 'up', 'up', 'up'],
                ['up', 'up', 'up', 'up', 'up'],
                ['up', 'up', 'up', 'up', 'up', 'up'],
                ['up', 'up', 'up', 'up', 'up', 'up', 'up'],
                ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
                ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up']
            ],[,
                ['zz'],
                ['up', 'zz'],
                ['up', 'zz', 'up'],
                ['up', 'zz', 'up', 'up'],
                ['up', 'up', 'up', 'zz', 'up'],
                ['up', 'up', 'up', 'zz', 'up', 'up'],
                ['up', 'up', 'up', 'up', 'uo', 'up', 'up'],
                ['up', 'up', 'up', 'up', 'zz', 'up', 'up', 'up'],
                ['up', 'up', 'up', 'up', 'zz', 'up', 'up', 'up', 'up'],
            ],[,,
                ['zz', 'zz'],
                ['zz', 'up', 'zz'],
                ['up', 'zz', 'up', 'zz'],
                ['up', 'zz', 'up', 'zz', 'up'],
                ['up', 'zz', 'up', 'up', 'zz', 'up'],
                ['up', 'up', 'zz', 'up', 'up', 'zz', 'up'],
                ['up', 'up', 'zz', 'up', 'up', 'up', 'zz', 'up'],
                ['up', 'up', 'up', 'zz', 'up', 'up', 'up', 'zz', 'up'],
            ],[,,,
                ['zz', 'zz', 'zz'],
                ['zz', 'up', 'zz', 'zz'],
                ['up', 'uo', 'up', 'uo', 'zz'],
                ['up', 'uo', 'up', 'uo', 'up', 'uo'],
                ['up', 'up', 'up', 'up', 'uo', 'up', 'uo'],
                ['up', 'zz', 'up', 'up', 'zz', 'up', 'zz', 'up'],
            ],[,,,,
                ['zz', 'zz', 'zz', 'zz'],
                ['zz', 'zz', 'up', 'zz', 'zz'],
                ['up', 'uo', 'zz', 'up', 'uo', 'zz'],
                ['uo', 'up', 'up' ,'uo', 'zz', 'uo', 'up'],
                ['up', 'uo', 'up', 'uo', 'up', 'uo', 'up', 'uo'],
            ],[,,,,,
                ['zz', 'zz', 'zz', 'zz', 'zz'],
                ['zz', 'up', 'uo', 'uo', 'uo' ,'zz'],
                ['zz' ,'up', 'uo' ,'zz', 'up', 'uo' ,'zz'],
                ['zz' ,'up', 'zz' ,'up', 'uo', 'up', 'uo', 'zz'],
            ],[,,,,,,
                ['zz', 'zz' ,'zz' ,'zz' ,'zz' ,'zz'],
                ['zz' ,'up' ,'uo', 'uo', 'uo', 'zz' ,'zz'],
            ]
        ];
        
    /*  Get the visibility path to use based on the x,y offset of the cell to check
        visiblit for relative to an origin cell. The various parameters are used to
        transform the lookup for the appropraite 1/8 segment of the circle. */
    pkg.getVisibilityPath = (x, y, isPosX, isPosY, isYgtX, isYgtNegX) => {
        let lookupX,
            lookupY;
        if (x === y) {
            // origin and diagonal
            lookupX = lookupY = mathAbs(x);
        } else if (x === 0) {
            // horizontal
            lookupX = 0;
            lookupY = mathAbs(y);
        } else if (y === 0) {
            // vertical
            lookupX = 0;
            lookupY = mathAbs(x);
        } else if (isPosX) {
            if (isPosY) {
                if (isYgtX) {
                    lookupX = x;
                    lookupY = y;
                } else {
                    lookupX = y;
                    lookupY = x;
                }
            } else if (isYgtNegX) {
                lookupX = -y;
                lookupY = x;
            } else {
                lookupX = x;
                lookupY = -y;
            }
        } else if (isPosY) {
            if (isYgtNegX) {
                lookupX = -x;
                lookupY = y;
            } else {
                lookupX = y;
                lookupY = -x;
            }
        } else if (isYgtX) {
            lookupX = -y;
            lookupY = -x;
        } else {
            lookupX = -x;
            lookupY = -y;
        }
        
        return VISIBILITY_PATHS[lookupX][lookupY];
    };
    
    pkg.cellOffsetsByDistance = [CIRCLE_0,CIRCLE_1,CIRCLE_2,CIRCLE_3,CIRCLE_4,CIRCLE_5,CIRCLE_6,CIRCLE_7,CIRCLE_8,CIRCLE_9];
})(globalThis.urob);
