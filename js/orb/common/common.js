(() => {
    const EXPORT = {};
    
    if (typeof module === 'object' && module.exports) {
        module.exports = EXPORT;
    } else {
        global.common = EXPORT;
    }
})();
