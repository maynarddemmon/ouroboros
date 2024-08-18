(() => {
    const IS_NODEJS = typeof module === 'object' && module.exports,
        
        EXPORT = {
            // Socket Message Attributes
            ATTR_TIME:'t',
            ATTR_DIRECTION:'d',
            
            
            // General
            TYPE_WARNING:'warning',
            TYPE_ERROR:'error',
            TYPE_SERVERINFO:'serverInfo',
            
            // Account and Character Management
            TYPE_LOBBY:'lobby',
            TYPE_CREATE_CHARACTER:'createCharacter',
            TYPE_DELETE_CHARACTER:'deleteCharacter',
            
            // Game World
            TYPE_ENTER_WORLD:'enterWorld',
            TYPE_EXIT_WORLD:'exitWorld',
            
            TYPE_NOW:'now',
            
            TYPE_MAP_DATA:'mapData',
            TYPE_CELL_DATA:'cellData',
            
            TYPE_ALTER_CHARACTER:'alterCharacter',
            TYPE_ALTER_ENTITY:'alterEntity',
            
            // Movement
            TYPE_MOVE:'move',
            TYPE_MOVE_FAILED:'moveFailed',
            MOVE_ERROR_CODES:{
                INVALID_LOCATION:1, // Movement to location not allowed.
                LOCATION_NOT_ALLOWED:2 // Movement to invalid location not permitted.
            },
            
            // Actions
            TYPE_ACTION_FAILED:'actionFailed',
            ACTION_ERROR_CODES:{
                ACTION_NOT_ALLOWED:1
            },
            
            // Reactions
            TYPE_REACT_FAILED:'reactFailed',
            REACT_ERROR_CODES:{
                REACT_NOT_ALLOWED:1
            },
            
            // Free Actions
            TYPE_CHANGE_FACING:'changeFacing',
            TYPE_ALTER_CELL:'alterCell',
            TYPE_FREE_FAILED:'freeFailed',
            FREE_ERROR_CODES:{
                INVALID_VALUE:1,
                FREE_NOT_ALLOWED:2,
            },
        };
    
    if (IS_NODEJS) {
        module.exports = EXPORT;
    } else {
        common.greek = EXPORT;
    }
})();
