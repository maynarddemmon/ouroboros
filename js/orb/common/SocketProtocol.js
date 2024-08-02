(() => {
    const TYPE_LOBBY = 'lobby',
        TYPE_CREATE_CHARACTER = 'createCharacter',
        TYPE_DELETE_CHARACTER = 'deleteCharacter',
        TYPE_ENTER_WORLD = 'enterWorld',
        TYPE_EXIT_WORLD = 'exitWorld',
        
        EXPORT = {
            // BiDirectional Types
            TYPE_LOBBY:TYPE_LOBBY,
            TYPE_CREATE_CHARACTER:TYPE_CREATE_CHARACTER,
            TYPE_DELETE_CHARACTER:TYPE_DELETE_CHARACTER,
            TYPE_ENTER_WORLD:TYPE_ENTER_WORLD,
            TYPE_EXIT_WORLD:TYPE_EXIT_WORLD
        };
    
    if (typeof module === 'object' && module.exports) {
        module.exports = EXPORT;
    } else {
        global.greek = EXPORT;
    }
})();
