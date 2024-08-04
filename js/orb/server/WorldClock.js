let now,
    tick,
    Interval;

const orb = require('./orb.js'),
    
    FILENAME_WORLD_CLOCK = 'world_clock',
    
    NOW = -1, // Constant indicating the "now" queue.
    NEXT = -2, // Constant indicating the "next" queue.
    
    queues = {}, // Stores event queues by tick time.
    
    getQueue = (when, noLazy) => {
        let tickTime;
        if (when === NEXT) {
            tickTime = now + 1;
        } else if (when === NOW) {
            tickTime = now;
        } else if (typeof when === 'number') {
            if (when >= now) {
                tickTime = when;
            } else {
                console.error('No access to past queueus.');
                return null;
            }
        } else {
            console.error('getQueue called with non-number.');
            return null;
        }
        
        if (noLazy) {
            return queues[tickTime];
        } else {
            return queues[tickTime] ?? (queues[tickTime] = []);
        }
    },
    
    doTick = () => {
        const queue = getQueue(NOW, true);
        if (queue) {
            for (let i = 0; i < queue.length; i++) processEvent(queue[i]);
            
            // Clear Queue
            queue.length = 0;
            delete queues[now];
        }
        
        console.log('tick', now);
        
        now++;
    },
    
    processEvent = event => {
        console.log('process event', event);
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
    },
    
    worldClock = module.exports = {
        lifeCycle: isBirth => new Promise((resolve, reject) => {
            if (isBirth) {
                live(resolve, reject);
            } else {
                die(resolve, reject);
            }
        }),
        
        getTick: () => tick,
        getNow: () => now,
        
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
        
        // Event Queue //
        NOW:NOW,
        NEXT:NEXT,
        
        doEventNow: event => {
            worldClock.doEventAt(NOW, event);
        },
        doEventNext: event => {
            worldClock.doEventAt(NEXT, event);
        },
        doEventAt: (when, event) => {
            if (event) {
                const queue = getQueue(when);
                queue.push(event);
            }
        }
    };