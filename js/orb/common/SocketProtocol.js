(() => {
    const TYPE_WARNING = 'warning',
        TYPE_ERROR = 'error',
        TYPE_SERVERINFO = 'serverInfo',
        
        TYPE_LOBBY = 'lobby',
        TYPE_CREATE_CHARACTER = 'createCharacter',
        TYPE_DELETE_CHARACTER = 'deleteCharacter',
        TYPE_ENTER_WORLD = 'enterWorld',
        TYPE_EXIT_WORLD = 'exitWorld',
        
        // Map
        TYPE_MAP_DATA = 'mapData',
        TYPE_CELL_DATA = 'cellData',
        
        ATTR_TIME = '_t',
        
        EXPORT = {
            TYPE_WARNING:TYPE_WARNING,
            TYPE_ERROR:TYPE_ERROR,
            TYPE_SERVERINFO:TYPE_SERVERINFO,
            
            TYPE_LOBBY:TYPE_LOBBY,
            TYPE_CREATE_CHARACTER:TYPE_CREATE_CHARACTER,
            TYPE_DELETE_CHARACTER:TYPE_DELETE_CHARACTER,
            TYPE_ENTER_WORLD:TYPE_ENTER_WORLD,
            TYPE_EXIT_WORLD:TYPE_EXIT_WORLD,
            
            TYPE_MAP_DATA:TYPE_MAP_DATA,
            TYPE_CELL_DATA:TYPE_CELL_DATA,
            
            // Attributes
            ATTR_TIME:ATTR_TIME
        };
    
    if (typeof module === 'object' && module.exports) {
        module.exports = EXPORT;
    } else {
        common.greek = EXPORT;
    }
})();
