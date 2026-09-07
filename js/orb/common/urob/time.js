(pkg => {
    const 
        COUNT_SPOKE = 100,
        COUNT_WHEEL = 36,
        COUNT_WOLCHEN = 24,
        COUNT_SEASON = 6,
        COUNT_YEAR = 8,
        WORLD_TIME_COUNTS = [
            COUNT_SPOKE,
            COUNT_WHEEL,
            COUNT_WOLCHEN,
            COUNT_SEASON,
            COUNT_YEAR
            // Age
        ],
        
        formatWorldTimeParts = parts => {
            const accum = [],
                len = parts.length;
            for (let i = 0; i < len; i++) {
                const part = parts[i];
                if (i === 0) {
                    accum.push(part.toString());
                } else {
                    const count = WORLD_TIME_COUNTS[len - 1 - i];
                    accum.push(pkg.leftPadNumber(part, (count - 1).toString().length));
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
        };
    
    pkg.time = {
        COUNT_SPOKE:COUNT_SPOKE,
        COUNT_WHEEL:COUNT_WHEEL,
        COUNT_WOLCHEN:COUNT_WOLCHEN,
        COUNT_SEASON:COUNT_SEASON,
        COUNT_YEAR:COUNT_YEAR,
        
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
            return format ? formatWorldTimeParts(parts) : parts;
        }
    };
})(globalThis.urob);
