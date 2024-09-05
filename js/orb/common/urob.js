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
    const 
        WORD_AN = 'an',
        WORD_A = 'a',
        WORD_AND = 'and',
        WORD_OR = 'or',
        
        getConcatenator = (i, len, isOr) => {
            if (i === len - 1) {
                // No concatenator for last item
            } else if (i === len - 2) {
                return ' ' + (isOr ? WORD_OR : WORD_AND) + ' ';
            } else if (len > 1) {
                return ', ';
            }
            return '';
        },
        
        getArticle = phrase => {
            const match = /\w+/.exec(phrase);
            if (!match) return WORD_AN;
            
            // Exceptional word starts that should be preceded by "an".
            const word = match[0].toLowerCase();
            for (const altCase of ['honest', 'hour', 'hono']) {
                if (word.startsWith(altCase)) return WORD_AN;
            }
            
            // Special cases where a word that begins with a vowel should be preceded by "a".
            for (const regex of [/^e[uw]/, /^onc?e\b/, /^uni([^nmd]|mo)/, /^u[bcfhjkqrst][aeiou]/]) {
                if (word.match(regex)) return WORD_A;
            }
            
            // Words that begin with a vowel being preceded by "an".
            if ('aeiou'.includes(word[0])) return WORD_AN;
            
            // Instances where y followed by specific letters is preceded by "an".
            if (word.match(/^y(b[lor]|cl[ea]|fere|gg|p[ios]|rou|tt)/)) return WORD_AN;
            
            return WORD_A;
        },
        
        urob = global.urob = {
            //                    greek: required from greek.js
            //                     time: required from time.js
            //                  account: required from account.js
            //               permission: required from account.js
            //                   facing: required from facing.js
            //              composition: required from composition.js
            //                  fixture: required from fixture.js
            //    cellOffsetsByDistance: required from cellOffsets.js
            //        getVisibilityPath: required from cellOffsets.js
            //                      map: required from MapModel.js
            //                   entity: required from EntityModel.js
            //                     cell: required from CellModel.js
            
            isTraversableSolidityForCorporeal:solidity => solidity >= 0 && solidity < 1,
            
            getCompositionTemplate: compositionTemplateId => urob.composition.getTemplate(compositionTemplateId),
            //getFixtureTemplate: fixtureTemplateId => urob.fixture.getTemplate(fixtureTemplateId),
            
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
            
            // Start: String Manipulation and Formatting
            concatenateList: (list, isOr) => {
                let txt = '';
                if (list) {
                    const len = list.length;
                    for (let i = 0; len > i; i++) txt += list[i] + getConcatenator(i, len, isOr);
                }
                return txt;
            },
            
            pluralize: (() => {
                const vowels = 'aeiou',
                    irregulars = {
                        addendum:'addenda',aircraft:'aircraft',alumna:'alumnae',alumnus:'alumni',analysis:'analyses',antenna:'antennae',antithesis:'antitheses',apex:'apices',appendix:'appendices',axis:'axes',bacillus:'bacilli',bacterium:'bacteria',basis:'bases',beau:'beaux',bison:'bison',bureau:'bureaux',cactus:'cacti',child:'children',château:'châteaux',codex:'codices',concerto:'concerti',corpus:'corpora',crisis:'crises',criterion:'criteria',curriculum:'curricula',datum:'data',deer:'deer',diagnosis:'diagnoses',die:'dice',dwarf:'dwarves',ellipsis:'ellipses',erratum:'errata','faux pas':'faux pas',fez:'fezzes',fish:'fish',focus:'foci',foot:'feet',formula:'formulae',fungus:'fungi',genus:'genera',goose:'geese',graffito:'graffiti',grouse:'grouse',half:'halves',hoof:'hooves',hypothesis:'hypotheses',index:'indices',larva:'larvae',libretto:'libretti',loaf:'loaves',locus:'loci',louse:'lice',man:'men',matrix:'matrices',medium:'media',memorandum:'memoranda',minutia:'minutiae',moose:'moose',mouse:'mice',nebula:'nebulae',nucleus:'nuclei',oasis:'oases',offspring:'offspring',opus:'opera',ovum:'ova',ox:'oxen',parenthesis:'parentheses',person:'people',phenomenon:'phenomena',phylum:'phyla',quiz:'quizzes',radius:'radii',referendum:'referenda',salmon:'salmon',scarf:'scarves',self:'selves',series:'series',sheep:'sheep',shrimp:'shrimp',species:'species',stimulus:'stimuli',stratum:'strata',swine:'swine',syllabus:'syllabi',symposium:'symposia',synopsis:'synopses',tableau:'tableaux',thesis:'theses',thief:'thieves',tooth:'teeth',trout:'trout',tuna:'tuna',vertebra:'vertebrae',vertex:'vertices',vita:'vitae',vortex:'vortices',wharf:'wharves',wife:'wives',wolf:'wolves',woman:'women'
                    };
                return (value, word) => {
                    if (value === 1) {
                        return word;
                    } else {
                        const lcWord = word.toLowerCase();
                        if (irregulars[lcWord]) return irregulars[lcWord];
                        if (word.length >= 2 && vowels.includes(lcWord[lcWord.length - 2])) return word + 's';
                        if (lcWord.endsWith('s') || lcWord.endsWith('sh') || lcWord.endsWith('ch') || lcWord.endsWith('x') || lcWord.endsWith('z')) return word + 'es';
                        if (lcWord.endsWith('y')) return word.slice(0, -1) + 'ies';
                        return word + 's';
                    }
                }
            })(),
            
            getArticle: getArticle,
            getPhraseWithArticle: (phrase, isAppend) => (isAppend ? WORD_AND : getArticle(phrase)) + ' ' + phrase,
            
            getOrdinalNumber: tym.memoize(num => {
                if (num == null || typeof num !== 'number' || isNaN(num)) return '';
                
                const suffix = ['th','st','nd','rd'];
                let v;
                
                if (num >= 0) {
                    num = mathFloor(num);
                    v = num % 100;
                } else {
                    num = mathCeil(num);
                    v = mathAbs(num) % 100;
                }
                
                return num + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
            }),
            
            leftPadNumber: tym.leftPadNumber,
            // End: String Manipulation and Formatting
        };
    
    /** These are handled in the client via manifest.js. */
    if (IS_NODEJS) {
        require('./urob/greek.js');
        require('./urob/time.js');
        require('./urob/account.js');
        require('./urob/cellOffsets.js');
        require('./urob/facing.js');
        require('./urob/StatModel.js');
        require('./urob/composition.js');
        require('./urob/fixture.js');
        require('./urob/MapModel.js');
        require('./urob/EntityModel.js');
        require('./urob/CellModel.js');
    }
})();
