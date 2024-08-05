(() => {
    const TYPE_WARNING = 'warning',
        TYPE_ERROR = 'error',
        
        TYPE_LOBBY = 'lobby',
        TYPE_CREATE_CHARACTER = 'createCharacter',
        TYPE_DELETE_CHARACTER = 'deleteCharacter',
        TYPE_ENTER_WORLD = 'enterWorld',
        TYPE_EXIT_WORLD = 'exitWorld',
        
        ATTR_TIME = '_t',
        
        EXPORT = {
            TYPE_WARNING:TYPE_WARNING,
            TYPE_ERROR:TYPE_ERROR,
            
            // BiDirectional Types
            TYPE_LOBBY:TYPE_LOBBY,
            TYPE_CREATE_CHARACTER:TYPE_CREATE_CHARACTER,
            TYPE_DELETE_CHARACTER:TYPE_DELETE_CHARACTER,
            TYPE_ENTER_WORLD:TYPE_ENTER_WORLD,
            TYPE_EXIT_WORLD:TYPE_EXIT_WORLD,
            
            // Attributes
            ATTR_TIME:ATTR_TIME
        };
    
    if (typeof module === 'object' && module.exports) {
        module.exports = EXPORT;
    } else {
        common.greek = EXPORT;
    }
})();
