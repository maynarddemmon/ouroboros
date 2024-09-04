let now, // The current tick count of the world clock
    tickLength, // The lenght of a tick of the world clock in millis.
    Interval,
    eventLog;

const orb = global.orb,
    {getEventLog} = require('./LoggingService.js'),
    worldEventHandler = require('./WorldEventHandler.js'),
    {drainOutgoingMessages} = require('./AccountService.js'),
    {ATTR_TIME} = require('../common/SocketProtocol.js'),
    
    FILENAME_WORLD_CLOCK = 'world_clock',
    
    END_RECOVERY_FREQ = 23,
    HP_RECOVERY_FREQ = 293,
    MAGOS_RECOVERY_FREQ = 59,
    PSYCHE_RECOVERY_FREQ = 109,
    
    NOW = -1, // Constant indicating the "now" queue.
    NEXT = -2, // Constant indicating the "next" queue.
    
    queues = {}, // Stores event queues by tick time.
    
    recQueues = {
        end:new Set(),
        hp:new Set(),
        magos:new Set(),
        psyche:new Set()
    },
    
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
        
        // Handle Entity Recovery
        if (now % END_RECOVERY_FREQ === 0) processRecQueue('end');
        if (now % MAGOS_RECOVERY_FREQ === 0) processRecQueue('magos');
        if (now % PSYCHE_RECOVERY_FREQ === 0) processRecQueue('psyche');
        if (now % HP_RECOVERY_FREQ === 0) processRecQueue('hp');
        
        // Send outgoing messages
        drainOutgoingMessages(now);
        
        // Move time forward
        console.log('tick', now, queueLen, Date.now() - start); // DEBUG
        
        now++;
    },
    
    processRecQueue = statNameForRecovery => {
        const queue = recQueues[statNameForRecovery];
        console.log('  process recovery queue:', statNameForRecovery, queue.size); // DEBUG
        for (const entity of queue) {
            if (entity.doStatRecovery(statNameForRecovery)) queue.delete(entity);
        }
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
    
    getTick: () => tickLength,
    getNow: () => now,
    
    startClock: () => {
        // Initialize the tickLength to the configured worldClockTick
        tickLength = orb.worldClockTick;
        
        Interval = setInterval(doTick, tickLength);
        console.log('World Clock started ticking at ' + tickLength + ' millis');
    },
    
    stopClock: () => {
        clearInterval(Interval);
        console.log('World Clock stopped ticking!');
    },
    
    // Event Queue //
    doEventNow: event => {doEventAt(NOW, event);},
    doEventNext: event => {doEventAt(NEXT, event);},
    
    // Recovery Queues //
    addToRecQueue: (entity, statName) => {
        recQueues[statName]?.add(entity);
    },
    removeFromRecQueue: (entity, statName) => {
        recQueues[statName]?.delete(entity);
    },
};