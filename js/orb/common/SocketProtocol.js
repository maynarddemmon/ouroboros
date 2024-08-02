(() => {
    const TYPE_LOBBY = 'lobby',
        TYPE_CREATE_CHARACTER = 'createCharacter',
        TYPE_DELETE_CHARACTER = 'deleteCharacter',
        
        EXPORT = {
            // BiDirectional Types
            TYPE_LOBBY:TYPE_LOBBY,
            TYPE_CREATE_CHARACTER:TYPE_CREATE_CHARACTER,
            TYPE_DELETE_CHARACTER:TYPE_DELETE_CHARACTER
        };
    
    if (typeof module === 'object' && module.exports) {
        module.exports = EXPORT;
    } else {
        global.greek = EXPORT;
    }
})();
