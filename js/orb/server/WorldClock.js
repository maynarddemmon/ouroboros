let now, // The current tick count of the world clock
    tickLength, // The lenght of a tick of the world clock in millis.
    Interval,
    eventLog;

const orb = global.orb,
    {getEventLog} = require('./LoggingService.js'),
    worldEventHandler = require('./WorldEventHandler.js'),
    {drainOutgoingMessages} = require('./AccountService.js'),
    
    {
        greek:{ATTR_TIME},
        time:{WORLD_TIME_COUNTS}
    } = global.urob,
    
    FILENAME_WORLD_CLOCK = 'world_clock',
    
    END_RECOVERY_FREQ = 23,
    HP_RECOVERY_FREQ = 293,
    MAGOS_RECOVERY_FREQ = 59,
    PSYCHE_RECOVERY_FREQ = 109,
    
    TIME_COUNT_0 = WORLD_TIME_COUNTS[0],
    TIME_COUNT_1 = TIME_COUNT_0 * WORLD_TIME_COUNTS[1],
    TIME_COUNT_2 = TIME_COUNT_1 * WORLD_TIME_COUNTS[2],
    TIME_COUNT_3 = TIME_COUNT_2 * WORLD_TIME_COUNTS[3],
    TIME_COUNT_4 = TIME_COUNT_3 * WORLD_TIME_COUNTS[4],
    
    NOW = -1, // Constant indicating the "now" queue.
    NEXT = -2, // Constant indicating the "next" queue.
    
    queues = {}, // Stores event queues by tick time.
    
    recQueues = {
        end:new Set(),
        hp:new Set(),
        magos:new Set(),
        psyche:new Set()
    },
    
    periodicQueues = [new Set(), new Set(), new Set(), new Set(), new Set()],
    
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
        
        // Handle Periodic Queues
        if (now % TIME_COUNT_0 === 0) {
            processPeriodicQueue(0, now);
            if (now % TIME_COUNT_1 === 0) {
                processPeriodicQueue(1, now);
                if (now % TIME_COUNT_2 === 0) {
                    processPeriodicQueue(2, now);
                    if (now % TIME_COUNT_3 === 0) {
                        processPeriodicQueue(3, now);
                        if (now % TIME_COUNT_4 === 0) {
                            processPeriodicQueue(4, now);
                        }
                    }
                }
            }
        }
        
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
    
    processPeriodicQueue = (queueIdx, now) => {
        const queue = periodicQueues[queueIdx];
        console.log('  process periodic queue:', queueIdx, queue.size); // DEBUG
        for (const thing of queue) {
            if (thing.notifyPeriodically(queueIdx, now)) queue.delete(thing);
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
    
    // Periodic Queues
    addToPeriodicQueue: (queueId, thing) => {
        periodicQueues[queueId]?.add(thing);
    },
    removeFromPeriodicQueue: (queueId, thing) => {
        periodicQueues[queueId]?.delete(thing);
    },
};