let now,
    tick,
    Interval;

const orb = require('./orb.js'),
    
    FILENAME_WORLD_CLOCK = 'world_clock',
    
    doTick = () => {
        console.log('tick', now);
        
        now++;
    },
    
    live = (resolve, reject) => {
        console.log('Restoring World Clock...');
        
        const jsonData = orb.readDataFile(FILENAME_WORLD_CLOCK);
        if (jsonData) {
            now = jsonData.now ?? 0;
        } else {
            now = 0;
        }
        
        console.log('  World Clock Now: ' + now);
        
        resolve();
    },
    
    die = (resolve, reject) => {
        console.log('Save World Clock');
        
        orb.saveDataToFile(FILENAME_WORLD_CLOCK, {
            now:now
        });
        
        resolve();
    };

module.exports = {
    lifeCycle: isBirth => new Promise((resolve, reject) => {
        if (isBirth) {
            live(resolve, reject);
        } else {
            die(resolve, reject);
        }
    }),
    
    startClock: () => {
        // Initialize the tick to the configured worldClockTick
        tick = orb.worldClockTick;
        
        Interval = setInterval(doTick, tick);
        console.log('World Clock started ticking at ' + tick + ' millis');
    },
    
    stopClock: () => {
        clearInterval(Interval);
        console.log('World Clock stopped ticking!');
    },
    
    getWorldClockTick: () => tick
};