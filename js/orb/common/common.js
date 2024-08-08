(() => {
    const EXPORT = {
        permissions:{
            PERM_CREATOR:'creator'
        },
        character:{
            FIELD_ID:'id',
            FIELD_USER_ID:'userId',
            FIELD_NAME:'name',
            FIELD_IS_ZOMBIE:'zombie',
            FIELD_PERMISSIONS:'permissions',
            FIELD_IS_IN_WORLD:'inWorld',
            FIELD_LOC:'loc',
            FIELD_LOCK_MOVEMENT:'lockMovement',
            FIELD_MOVEMENT_SPEED:'movementSpeed',
            FIELD_LOCK_ACTION:'lockAction'
        },
        
        composition:{
            // Void
            v1:{
                name:'void',
                mapColor:'#101'
            },
            v2:{
                name:'nothingness',
                mapColor:'#112'
            },
            
            // Air
            a1:{
                name:'empty space',
                mapColor:'#ccf'
            },
            
            // Earth
            s1:{
                name:'stone',
                mapColor:'#888'
            }
        }
    };
    
    if (typeof module === 'object' && module.exports) {
        module.exports = EXPORT;
    } else {
        global.common = EXPORT;
    }
})();
