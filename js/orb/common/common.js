(() => {
    const EXPORT = {
        permissions:{
            PERM_CREATOR:'creator'
        },
        character:{
            FIELD_ID:'id',
            FIELD_USER_ID:'uid',
            FIELD_NAME:'name',
            FIELD_ZOMBIE:'zombie',
            FIELD_PERMISSIONS:'perms',
            FIELD_IN_WORLD:'inWorld',
            FIELD_LOC:'loc',
            FIELD_MOVE_SPEED:'moveSpeed',
            FIELD_LOCK_MOVE:'lockMove',
            FIELD_LOCK_ACTION:'lockAct',
            FIELD_LOCK_FREE:'lockFree',
            FIELD_LOCK_REACT:'lockReact'
        },
        
        composition:{
            // Void
            v1:{
                name:'void',
                mapColor:'#101',
                solidity:0
            },
            v2:{
                name:'nothingness',
                mapColor:'#112',
                solidity:0
            },
            
            // Air
            a1:{
                name:'empty space',
                mapColor:'#ccf',
                solidity:0
            },
            
            // Earth
            s1:{
                name:'stone',
                mapColor:'#888',
                solidity:1
            }
        }
    };
    
    if (typeof module === 'object' && module.exports) {
        module.exports = EXPORT;
    } else {
        global.common = EXPORT;
    }
})();
