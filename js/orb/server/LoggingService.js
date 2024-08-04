let accessLog,
    eventLog;

const pino = require('pino'),
    SonicBoom = require('sonic-boom'),
    
    makeLogStream = logName => {
        const dest = './logs/' + logName + '.log';
        console.log('  Make Log Stream File: ' + dest);
        const stream = new SonicBoom({
            dest:dest,
            mkdir:true,
            minLength:1<<14, // 16384 byte buffer
            maxWrite:1<<16, // 64k Must be larger than minLength
            sync:false
        });
        return {
            __dest:dest,
            log:obj => {stream.write(JSON.stringify(obj) + '\n');},
            flush:callback => {
                stream.on('finish', callback);
                stream.on('error', callback);
                if (stream.destroyed) {
                    console.warn('Stream already destroyed: ' + dest);
                } else {
                    stream.end();
                }
            }
        };
    },
    
    makeLog = logName => {
        const dest = './logs/' + logName + '.log';
        console.log('  Make Log File: ' + dest);
        const retval = pino(
            {
                base:undefined,
                level:process.env.PINO_LOG_LEVEL || 'info',
                formatters:{
                    level:label => ({level:label})
                }
            },
            pino.destination({
                dest:dest,
                mkdir:true,
                minLength:1<<14, // 16384 byte buffer
                maxWrite:1<<16, // 64k Must be larger than minLength
                sync:false
            })
        );
        retval.__dest = dest;
        return retval;
    },
    
    flushLog = logObj => new Promise((resolve, reject) => {
        logObj.flush(err => {
            if (err) {
                console.log('  Error Flushing Log: ' + logObj.__dest);
                reject();
            } else {
                console.log('  Flushed Log: ' + logObj.__dest);
                resolve();
            }
        });
    }),
    
    live = (resolve, reject) => {
        console.log('Start Logging Service...');
        accessLog = makeLog('access');
        eventLog = makeLogStream('event');
        resolve();
    },
    
    die = (resolve, reject) => {
        console.log('Flush Logs...');
        Promise.all([
            flushLog(accessLog), flushLog(eventLog)
        ]).then(resolve).catch(reject);
    };

module.exports = {
    lifeCycle: isBirth => new Promise((resolve, reject) => {
        if (isBirth) {
            live(resolve, reject);
        } else {
            die(resolve, reject);
        }
    }),
    
    getAccessLog:() => accessLog,
    getEventLog:() => eventLog
};