(() => {
    const IS_NODEJS = typeof module === 'object' && module.exports,
        tym = IS_NODEJS ? require('../../../lib/tym.js') : null,
        
        WORLD_TIME_COUNTS = [
            100, // Spoke
            36,  // Wheel
            24,  // Wolchen
            6,   // Season
            8    // Year
            // Age
        ],
        
        leftPadNumber = (global.myt ?? tym).leftPadNumber,
        
        EXPORT = {
            leftPadNumber:leftPadNumber,
            
            // World Time Functions
            WORLD_TIME_COUNTS:WORLD_TIME_COUNTS,
            
            worldTimeToParts: (time, format) => {
                const parts = [];
                if (time == null) return format ? '' : parts;
                
                for (const count of WORLD_TIME_COUNTS) {
                    const part = time % count;
                    parts.unshift(part);
                    time = (time - part) / count;
                }
                parts.unshift(time);
                return format ? EXPORT.formatWorldTimeParts(parts) : parts;
            },
            
            formatWorldTimeParts: parts => {
                const accum = [],
                    len = parts.length;
                for (let i = 0; i < len; i++) {
                    const part = parts[i];
                    if (i === 0) {
                        accum.push(part.toString());
                    } else {
                        const count = WORLD_TIME_COUNTS[len - 1 - i];
                        accum.push(leftPadNumber(part, (count - 1).toString().length));
                    }
                    switch(i) {
                        case 0: accum.push('.'); break;
                        case 1: accum.push('.'); break;
                        case 2: accum.push(' / '); break;
                        case 3: accum.push('.'); break;
                        case 4: accum.push('.'); break;
                    }
                }
                return accum.join('');
            },
            
            // Map Functions
            locIdToArr: locId => {
                let locArr;
                if (locId) {
                    locArr = locId.split(',');
                    const len = locArr.length;
                    for (let i = 0; i < len; i++) {
                        locArr[i] = parseInt(locArr[i]);
                    }
                } else {
                    locArr = [];
                }
                return locArr;
            },
            locArrToId: locArr => locArr.join(),
            locArrToMapId: locArr => '' + locArr[0],
            isValidLocArr: locArr => {
                if (locArr.length === 4) {
                    for (const entry of locArr) {
                        if (!Number.isInteger(entry)) return false;
                    }
                    return true;
                }
                return false;
            }
        };
    
    if (IS_NODEJS) {
        module.exports = EXPORT;
    } else {
        common.util = EXPORT;
    }
})();
