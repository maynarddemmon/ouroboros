(() => {
    const IS_NODEJS = typeof module === 'object' && module.exports;
    
    let tym, JS;
    if (IS_NODEJS) {
        const imported = require('../../../lib/tym.js');
        JS = imported.JS;
        tym = imported.tym;
    } else {
        JS = global.JS;
        tym = global.myt;
    }
    
    /* Define functions with no dependencies immediately inside global.urob. */
    const urob = global.urob = {
        //                    greek: required from greek.js
        //                     time: required from time.js
        //                  account: required from account.js
        //               permission: required from account.js
        //                   facing: required from facing.js
        //              composition: required from composition.js
        //    cellOffsetsByDistance: required from cellOffsets.js
        //        getVisibilityPath: required from cellOffsets.js
        
        isTraversableSolidityForCorporeal:solidity => solidity >= 0 && solidity < 1,
        
        getCompositionTemplate: compId => urob.composition.getTemplate(compId),
        
        // Start: loc
        locIdToArr: locId => {
            let locArr;
            if (locId) {
                locArr = locId.split(',');
                const len = locArr.length;
                for (let i = 0; i < len; i++) {
                    locArr[i] = parseInt(locArr[i]);
                }
            } else {
                locArr = [];
            }
            return locArr;
        },
        locArrToId: locArr => locArr.join(),
        locIdToMapId: locId => locId ? locId.split(',')[0] : null,
        locArrToMapId: locArr => '' + locArr[0],
        isValidLocArr: locArr => {
            if (locArr.length === 4) {
                for (const entry of locArr) {
                    if (!Number.isInteger(entry)) return false;
                }
                return true;
            }
            return false;
        },
        /*areLocArrEqual: (locArrA, locArrB) => {
            if (locArrA !== locArrB) {
                if (locArrA == null || locArrB == null) return false;
                if (locArrA[1] !== locArrB[1]) return false;
                if (locArrA[2] !== locArrB[2]) return false;
                if (locArrA[3] !== locArrB[3]) return false;
                if (locArrA[0] !== locArrB[0]) return false;
            }
            return true;
        },*/
        // End: loc
        
        // String Manipulation and Formatting //
        concatenateList: (list, isOr) => {
            let txt = '';
            if (list) {
                for (let i = 0, len = list.length; len > i; i++) {
                    txt += list[i] + urob.getConcatenator(i, len, isOr);
                }
            }
            return txt;
        },
        
        getConcatenator: (i, len, isOr) => {
            if (i === len - 1) {
                // No concatenator for last item
            } else if (i === len - 2) {
                return isOr ? ' or ' : ' and ';
            } else if (len > 1) {
                return ', ';
            }
            return '';
        },
        
        leftPadNumber: tym.leftPadNumber,
    };
    
    /** These are handled in the client via manifest.js. */
    if (IS_NODEJS) {
        require('./urob/greek.js');
        require('./urob/time.js');
        require('./urob/account.js');
        require('./urob/cellOffsets.js');
        require('./urob/facing.js');
        require('./urob/composition.js');
    }
})();
