(pkg => {
    const WORLD_TIME_COUNTS = [
            100, // Spoke
            36,  // Wheel
            24,  // Wolchen
            6,   // Season
            8    // Year
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
})(global.urob);
