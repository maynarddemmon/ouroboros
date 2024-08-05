(pkg => {
    let worldClockIntervalId,
        mapData,
        cellData;
    
    const model = pkg.model = new JS.Singleton('Model', myt.Node, {
        // Characters:start
        setMaxCharacters: v => {
            model.set('maxCharacters', v, true);
        },
        setCharacters: v => {
            model.set('characters', v, true);
        },
        getCharacters: () => {
            return model.characters ?? (model.characters = []);
        },
        getCharacterById: id => {
            const characters = model.getCharacters();
            let i = characters.length;
            while (i) {
                const character = characters[--i];
                if (character.id === id) return character;
            }
        },
        addCharacter: character => {
            const characters = model.getCharacters();
            characters.push(character);
            model.fireEvent('characters', characters);
        },
        replaceCharacter: character => {
            const id = character?.id,
                characters = model.getCharacters();
            let i = characters.length;
            while (i) {
                const existingCharacter = characters[--i];
                if (existingCharacter.id === id) {
                    characters.splice(i, 1, character);
                    return true;
                }
            }
            return false;
        },
        removeCharacterById: id => {
            const characters = model.getCharacters();
            let i = characters.length;
            while (i) {
                if (characters[--i].id === id) {
                    characters.splice(i, 1);
                    break;
                }
            }
            model.fireEvent('characters', characters);
        },
        
        setCharacterInPlay: character => {
            model._characterInPlay = character;
        },
        getCharacterInPlay: () => model._characterInPlay,
        // Characters:end
        
        // Time:start
        setWorldClockTick: v => {
            model.set('worldClockTick', v, true);
        },
        
        setWorldClockTime: v => {
            model.set('worldClockTime', v, true);
        },
        
        updateWorldClockTime: v => {
            if (worldClockIntervalId) clearInterval(worldClockIntervalId);
            model.setWorldClockTime(v);
            worldClockIntervalId = setInterval(() => {
                model.setWorldClockTime(model.worldClockTime + 1);
            }, model.worldClockTick);
        },
        // Time:end
        
        // Map:start
        getMapData: () => mapData ?? (mapData = {}),
        getCellData: () => cellData ?? (cellData = {}),
        
        getCellDatum: locId => cellData[locId],
        
        clearMapAndCellData: () => {
            mapData = {};
            model.fireEvent('mapDataCleared');
            cellData = {};
            model.fireEvent('cellDataCleared');
        },
        
        storeMapData: data => {
            const mapData = model.getMapData();
            for (const key in data) {
                const mapDatum = mapData[key] = data[key];
                model.fireEvent('mapChanged', mapDatum);
            }
        },
        
        storeCellData: data => {
            const cellData = model.getCellData();
            for (const key in data) {
                const cellDatum = cellData[key] = data[key];
                model.fireEvent('cellChanged', cellDatum);
            }
        },
        // Map:end
        
        // Methods /////////////////////////////////////////////////////////////
        wipeClean: () => {
            model.maxCharacters = 0;
            model.characters = [];
            model.clearMapAndCellData();
        }
    });
})(orb);
