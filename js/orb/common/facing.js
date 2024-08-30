(() => {
    const IS_NODEJS = typeof module === 'object' && module.exports,
        
        NORTH = 'n',
        SOUTH = 's',
        EAST = 'e',
        WEST = 'w',
        UP = 't',
        DOWN = 'b',
        SELF = 'c',
        
        isValidCompassFacing = v => {
            switch (v) {
                case NORTH:
                case SOUTH:
                case EAST:
                case WEST:
                case UP:
                case DOWN:
                    return true;
            }
            return false;
        },
        
        getOppositeCompassFacing = compassDirection => {
            switch (compassDirection) {
                case NORTH: return SOUTH;
                case SOUTH: return NORTH;
                case EAST: return WEST;
                case WEST: return EAST;
                case UP: return DOWN;
                case DOWN: return UP;
            }
        },
        
        EXPORT = {
            NORTH:NORTH,
            SOUTH:SOUTH,
            EAST:EAST,
            WEST:WEST,
            UP:UP,
            DOWN:DOWN,
            SELF:SELF,
            
            /* Does not contain SELF. */
            COMPASS_FIELDS:[NORTH, SOUTH, EAST, WEST, UP, DOWN],
            
            isValidCompassFacing:isValidCompassFacing,
            isValidFacing: v => v === SELF || isValidCompassFacing(v),
            
            getOppositeCompassFacing:getOppositeCompassFacing,
            getOppositeDirection: compassDirection => {
                if (compassDirection === SELF) return SELF;
                return getOppositeCompassFacing(compassDirection);
            }
        };
    
    if (IS_NODEJS) {
        module.exports = EXPORT;
    } else {
        global.facing = EXPORT;
    }
})();
