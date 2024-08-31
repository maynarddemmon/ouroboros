let now,
    tick,
    Interval,
    eventLog;

const orb = global.orb,
    {getEventLog} = require('./LoggingService.js'),
    worldEventHandler = require('./WorldEventHandler.js'),
    {drainOutgoingMessages} = require('./AccountService.js'),
    {ATTR_TIME} = require('../common/SocketProtocol.js'),
    
    FILENAME_WORLD_CLOCK = 'world_clock',
    
    NOW = -1, // Constant indicating the "now" queue.
    NEXT = -2, // Constant indicating the "next" queue.
    
    queues = {}, // Stores event queues by tick time.
    
    getTickTime = when => {
        let tickTime;
        if (when === NEXT) {
            return now + 1;
        } else if (when === NOW) {
            return now;
        } else if (typeof when === 'number') {
            if (when >= now) {
                return when;
            } else {
                console.error('No access to past queueus.');
                return null;
            }
        } else {
            console.error('getTickTime called with non-number.');
            return null;
        }
    },
    
    getQueue = tickTime => queues[tickTime],
    getQueueLazy = tickTime => queues[tickTime] ??= [],
    
    doEventAt = (when, event) => {
        if (event) {
            const tickTime = getTickTime(when);
            if (tickTime >= 0) {
                event[ATTR_TIME] = tickTime;
                getQueueLazy(tickTime).push(event);
            }
        }
    },
    
    doTick = () => {
        const start = Date.now(); // DEBUG
        let queueLen = 0; // DEBUG
        
        // Handle Events
        const queue = getQueue(now);
        if (queue) {
            const len = queue.length;
            queueLen = len; // DEBUG
            for (let i = 0; i < len; i++) {
                // Handle Event
                const event = queue[i],
                    handler = worldEventHandler[event.type];
                if (handler) {
                    handler(event);
                    eventLog.log(event);
                } else {
                    console.error('Unexpected World Event:', event);
                }
            }
            
            // Clear Queue
            queue.length = 0;
            delete queues[now];
        }
        
        // Send outgoing messages
        drainOutgoingMessages(now);
        
        // Move time forward
        console.log('tick', now, queueLen, Date.now() - start); // DEBUG
        
        now++;
    },
    
    live = (resolve, reject) => {
        eventLog = getEventLog();
        
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
        orb.saveDataToFile(FILENAME_WORLD_CLOCK, {now:now});
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
    doEventNow: event => {doEventAt(NOW, event);},
    doEventNext: event => {doEventAt(NEXT, event);}
};