(() => {
    const 
        WORLD_TIME_COUNTS = [
            100, // Spoke
            36,  // Wheel
            24,  // Wolchen
            6,   // Season
            8    // Year
            // Age
        ],
        
        leftPadNumber = (num, length, padChar='0', base=10) => {
            const numStr = num.toString(base);
            return padChar.repeat(Math.max(length - numStr.length, 0)) + numStr;
        },
        
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
            }
        };
    
    if (typeof module === 'object' && module.exports) {
        module.exports = EXPORT;
    } else {
        common.util = EXPORT;
    }
})();
