(() => {
    const EXPORT = {
        permissions:{
            PERM_CREATOR:'creator'
        },
        character:{
            FIELD_ID:'id',
            FIELD_USER_ID:'uid',
            FIELD_NAME:'name',
            FIELD_IS_ZOMBIE:'zombie',
            FIELD_PERMISSIONS:'perms',
            FIELD_IS_IN_WORLD:'inWorld',
            FIELD_LOC:'loc',
            FIELD_MOVEMENT_SPEED:'moveSpeed',
            FIELD_LOCK_MOVEMENT:'lockMove',
            FIELD_LOCK_ACTION:'lockAct',
            FIELD_LOCK_FREE:'lockFree',
            FIELD_LOCK_REACT:'lockReact'
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
