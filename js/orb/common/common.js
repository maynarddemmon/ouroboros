(() => {
    const EXPORT = {
        character:{
            FIELD_ID:'id',
            FIELD_USER_ID:'userId',
            FIELD_NAME:'name',
            FIELD_IS_ZOMBIE:'isZombie',
            FIELD_IS_IN_WORLD:'isInWorld',
            FIELD_LOC:'loc',
            FIELD_LOCK_MOVEMENT:'lockMovement',
            FIELD_MOVEMENT_SPEED:'movementSpeed'
        }
    };
    
    if (typeof module === 'object' && module.exports) {
        module.exports = EXPORT;
    } else {
        global.common = EXPORT;
    }
})();
